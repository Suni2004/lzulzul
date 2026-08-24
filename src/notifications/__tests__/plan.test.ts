import type { CalEvent } from '../../calendar/types';
import { DEFAULT_SETTINGS, type Settings } from '../../settings/types';
import { CHANNEL } from '../constants';
import { planNotifications, planSignature } from '../plan';

const NOW = new Date(2026, 7, 24, 9, 0); // Monday 24 August 2026, 09:00

function makeEvent(overrides: Partial<CalEvent> = {}): CalEvent {
  return {
    id: 'e1',
    calendarId: 'cal1',
    calendarTitle: 'Munka',
    color: '#4F46E5',
    title: 'Csapatmegbeszélés',
    notes: '',
    location: '',
    start: new Date(2026, 7, 24, 14, 0),
    end: new Date(2026, 7, 24, 15, 0),
    allDay: false,
    recurring: false,
    ...overrides,
  };
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    morningBriefEnabled: false,
    eveningPreviewEnabled: false,
    ...overrides,
  };
}

describe('per-event reminders', () => {
  it('schedules one notification per configured lead time', () => {
    const plan = planNotifications(
      [makeEvent()],
      settings({ reminderLeadMinutes: [60, 10] }),
      NOW,
    );

    expect(plan.map((n) => n.fireAt)).toEqual([
      new Date(2026, 7, 24, 13, 0),
      new Date(2026, 7, 24, 13, 50),
    ]);
    expect(plan.every((n) => n.channelId === CHANNEL.reminder)).toBe(true);
  });

  it('names the event and spells out how long is left', () => {
    const plan = planNotifications([makeEvent()], settings({ reminderLeadMinutes: [10] }), NOW);

    expect(plan[0].title).toBe('Csapatmegbeszélés');
    expect(plan[0].body).toBe('14:00 – 15:00 · 10 perc múlva');
  });

  it('includes the location when there is one', () => {
    const plan = planNotifications(
      [makeEvent({ location: 'Iroda' })],
      settings({ reminderLeadMinutes: [10] }),
      NOW,
    );

    expect(plan[0].body).toBe('14:00 – 15:00 · Iroda · 10 perc múlva');
  });

  it('drops lead times that have already passed', () => {
    // A 24-hour lead for an event later today fired yesterday.
    const plan = planNotifications(
      [makeEvent()],
      settings({ reminderLeadMinutes: [24 * 60, 10] }),
      NOW,
    );

    expect(plan).toHaveLength(1);
    expect(plan[0].fireAt).toEqual(new Date(2026, 7, 24, 13, 50));
  });

  it('ignores events that already ended', () => {
    const past = makeEvent({
      start: new Date(2026, 7, 24, 7, 0),
      end: new Date(2026, 7, 24, 8, 0),
    });

    expect(planNotifications([past], settings(), NOW)).toEqual([]);
  });

  it('ignores events beyond the two-week horizon', () => {
    const distant = makeEvent({
      start: new Date(2026, 8, 30, 10, 0),
      end: new Date(2026, 8, 30, 11, 0),
    });

    expect(planNotifications([distant], settings(), NOW)).toEqual([]);
  });

  it('carries the event id so a tap can open it', () => {
    const plan = planNotifications([makeEvent()], settings({ reminderLeadMinutes: [10] }), NOW);
    expect(plan[0].data).toMatchObject({ type: 'event', eventId: 'e1' });
  });
});

describe('all-day events', () => {
  const allDay = makeEvent({
    allDay: true,
    title: 'Szabadság',
    start: new Date(2026, 7, 26, 0, 0),
    end: new Date(2026, 7, 26, 23, 59, 59, 999),
  });

  it('announces the evening before and on the morning of', () => {
    const plan = planNotifications([allDay], settings({ allDayReminderHour: 8 }), NOW);

    expect(plan).toHaveLength(2);
    expect(plan[0].fireAt).toEqual(new Date(2026, 7, 25, 8, 0));
    expect(plan[0].title).toBe('Holnap: Szabadság');
    expect(plan[1].fireAt).toEqual(new Date(2026, 7, 26, 8, 0));
    expect(plan[1].title).toBe('Ma: Szabadság');
  });

  it('does not use the minute-based lead times', () => {
    const plan = planNotifications(
      [allDay],
      settings({ allDayReminderHour: 8, reminderLeadMinutes: [10, 30, 60] }),
      NOW,
    );

    expect(plan).toHaveLength(2);
  });
});

describe('leave-now nudge', () => {
  it('fires only for events that have a location', () => {
    const withPlace = makeEvent({ id: 'a', location: 'Iroda' });
    const withoutPlace = makeEvent({ id: 'b', location: '' });

    const plan = planNotifications(
      [withPlace, withoutPlace],
      settings({ reminderLeadMinutes: [], travelBufferMinutes: 30 }),
      NOW,
    );

    expect(plan).toHaveLength(1);
    expect(plan[0].channelId).toBe(CHANNEL.leave);
    expect(plan[0].fireAt).toEqual(new Date(2026, 7, 24, 13, 30));
    expect(plan[0].title).toBe('Indulj el – Csapatmegbeszélés');
  });

  it('stays off when the travel buffer is zero', () => {
    const plan = planNotifications(
      [makeEvent({ location: 'Iroda' })],
      settings({ reminderLeadMinutes: [], travelBufferMinutes: 0 }),
      NOW,
    );

    expect(plan).toEqual([]);
  });
});

describe('daily summaries', () => {
  it('counts the day and names the first item', () => {
    const plan = planNotifications(
      [makeEvent(), makeEvent({ id: 'e2', start: new Date(2026, 7, 24, 16, 0) })],
      settings({
        reminderLeadMinutes: [],
        morningBriefEnabled: true,
        morningBriefHour: 10,
        morningBriefMinute: 0,
      }),
      NOW,
    );

    const today = plan.find((n) => n.fireAt.getTime() === new Date(2026, 7, 24, 10, 0).getTime());
    expect(today?.title).toBe('Jó reggelt!');
    expect(today?.body).toBe('Ma 2 program vár rád. Az első: Csapatmegbeszélés 14:00-kor');
  });

  it('says so plainly when a day is empty', () => {
    const plan = planNotifications(
      [],
      settings({
        morningBriefEnabled: true,
        morningBriefHour: 10,
        morningBriefMinute: 0,
      }),
      NOW,
    );

    expect(plan[0].body).toBe('Ma nincs beírt programod. Szép napot!');
  });

  it('previews tomorrow in the evening', () => {
    const tomorrow = makeEvent({
      start: new Date(2026, 7, 25, 9, 30),
      end: new Date(2026, 7, 25, 10, 0),
      title: 'Fogorvos',
    });

    const plan = planNotifications(
      [tomorrow],
      settings({
        reminderLeadMinutes: [],
        eveningPreviewEnabled: true,
        eveningPreviewHour: 21,
        eveningPreviewMinute: 0,
      }),
      NOW,
    );

    const tonight = plan.find(
      (n) => n.fireAt.getTime() === new Date(2026, 7, 24, 21, 0).getTime(),
    );
    expect(tonight?.title).toBe('Mi vár holnap?');
    expect(tonight?.body).toBe('Holnap 1 program vár rád. Az első: Fogorvos 09:30-kor');
  });

  it('skips a summary whose time already passed today', () => {
    const plan = planNotifications(
      [],
      settings({ morningBriefEnabled: true, morningBriefHour: 7, morningBriefMinute: 30 }),
      NOW,
    );

    // 07:30 today is behind us at 09:00, so the first one is tomorrow's.
    expect(plan[0].fireAt).toEqual(new Date(2026, 7, 25, 7, 30));
  });
});

describe('queue budget', () => {
  it('stays within the platform limit even with a packed calendar', () => {
    const many: CalEvent[] = [];
    for (let day = 0; day < 14; day++) {
      for (let hour = 8; hour < 18; hour++) {
        many.push(
          makeEvent({
            id: `e-${day}-${hour}`,
            start: new Date(2026, 7, 24 + day, hour, 0),
            end: new Date(2026, 7, 24 + day, hour + 1, 0),
          }),
        );
      }
    }

    const plan = planNotifications(
      many,
      settings({
        reminderLeadMinutes: [60, 30, 10],
        morningBriefEnabled: true,
        eveningPreviewEnabled: true,
      }),
      NOW,
    );

    expect(plan.length).toBeLessThanOrEqual(58);
    // The soonest reminders are the ones worth keeping.
    expect(plan[0].fireAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('returns the queue in chronological order', () => {
    const plan = planNotifications(
      [makeEvent(), makeEvent({ id: 'e2', start: new Date(2026, 7, 25, 11, 0) })],
      settings({ reminderLeadMinutes: [60, 10], morningBriefEnabled: true }),
      NOW,
    );

    const times = plan.map((n) => n.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('planSignature', () => {
  it('is stable for an unchanged plan and differs when content changes', () => {
    const base = planNotifications([makeEvent()], settings({ reminderLeadMinutes: [10] }), NOW);
    const same = planNotifications([makeEvent()], settings({ reminderLeadMinutes: [10] }), NOW);
    const moved = planNotifications(
      [makeEvent({ title: 'Másik cím' })],
      settings({ reminderLeadMinutes: [10] }),
      NOW,
    );

    expect(planSignature(base)).toBe(planSignature(same));
    expect(planSignature(base)).not.toBe(planSignature(moved));
  });
});
