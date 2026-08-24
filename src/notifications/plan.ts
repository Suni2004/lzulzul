/**
 * Works out *what* should be delivered and *when*.
 *
 * This module is deliberately pure — it takes events, settings and the current
 * time and returns a list of notifications. Nothing here touches the OS, which
 * makes the scheduling rules easy to read and to reason about.
 */

import type { CalEvent } from '../calendar/types';
import type { Settings } from '../settings/types';
import {
  addDays,
  formatCountdown,
  formatEventTime,
  formatTime,
  startOfDay,
} from '../utils/date';
import { CHANNEL } from './constants';

/** How far ahead individual event reminders are scheduled. */
export const REMINDER_HORIZON_DAYS = 14;
/** How many daily summaries are queued up at a time. */
export const BRIEF_HORIZON_DAYS = 7;

/**
 * iOS only keeps 64 pending notifications per app, so we stay comfortably
 * under that and let the rolling refresh top the queue back up.
 */
const MAX_EVENT_REMINDERS = 40;
const MAX_TOTAL = 58;

/** A notification we intend to hand to the OS. */
export type PlannedNotification = {
  /** Stable identity for a given notification, used to diff against the queue. */
  key: string;
  fireAt: Date;
  title: string;
  body: string;
  channelId: string;
  data: Record<string, unknown>;
};

function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 86_399_999;
  return events.filter(
    (e) => e.start.getTime() <= dayEnd && e.end.getTime() >= dayStart,
  );
}

/** "Csapatmegbeszélés 9:00-kor" — the headline item of a summary. */
function firstItemLabel(events: CalEvent[]): string | null {
  const timed = events.find((e) => !e.allDay);
  if (timed) return `${timed.title} ${formatTime(timed.start)}-kor`;
  if (events.length > 0) return events[0].title;
  return null;
}

function summaryBody(events: CalEvent[], when: 'ma' | 'holnap'): string {
  if (events.length === 0) {
    return when === 'ma'
      ? 'Ma nincs beírt programod. Szép napot!'
      : 'Holnapra nincs beírt programod. Pihend ki magad!';
  }

  const lead = firstItemLabel(events);
  const count = `${when === 'ma' ? 'Ma' : 'Holnap'} ${events.length} program vár rád.`;
  return lead ? `${count} Az első: ${lead}` : count;
}

function reminderBody(event: CalEvent, fireAt: Date): string {
  const parts = [formatEventTime(event.start, event.end, event.allDay)];
  if (event.location) parts.push(event.location);
  if (!event.allDay) parts.push(formatCountdown(event.start, fireAt));
  return parts.join(' · ');
}

function plannedForEvent(event: CalEvent, settings: Settings, now: Date): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const data = { type: 'event', eventId: event.id, startsAt: event.start.toISOString() };

  if (event.allDay) {
    // All-day items have no meaningful "30 minutes before", so announce them
    // at a fixed hour the evening before and again on the morning of.
    const dayOf = startOfDay(event.start);
    dayOf.setHours(settings.allDayReminderHour, 0, 0, 0);
    const dayBefore = addDays(dayOf, -1);

    out.push({
      key: `event:${event.id}:allday-before:${dayBefore.getTime()}`,
      fireAt: dayBefore,
      title: `Holnap: ${event.title}`,
      body: `Egész napos · ${event.calendarTitle}`,
      channelId: CHANNEL.reminder,
      data,
    });
    out.push({
      key: `event:${event.id}:allday-of:${dayOf.getTime()}`,
      fireAt: dayOf,
      title: `Ma: ${event.title}`,
      body: `Egész napos · ${event.calendarTitle}`,
      channelId: CHANNEL.reminder,
      data,
    });
  } else {
    const leads = [...new Set(settings.reminderLeadMinutes)].sort((a, b) => b - a);
    for (const minutes of leads) {
      const fireAt = new Date(event.start.getTime() - minutes * 60_000);
      out.push({
        key: `event:${event.id}:lead-${minutes}:${fireAt.getTime()}`,
        fireAt,
        title: event.title,
        body: reminderBody(event, fireAt),
        channelId: CHANNEL.reminder,
        data,
      });
    }

    // The "leave now" nudge only makes sense when we know where to go.
    if (settings.travelBufferMinutes > 0 && event.location.trim().length > 0) {
      const fireAt = new Date(event.start.getTime() - settings.travelBufferMinutes * 60_000);
      out.push({
        key: `event:${event.id}:leave:${fireAt.getTime()}`,
        fireAt,
        title: `Indulj el – ${event.title}`,
        body: `${formatTime(event.start)}-kor kezdődik itt: ${event.location}`,
        channelId: CHANNEL.leave,
        data,
      });
    }
  }

  return out.filter((n) => n.fireAt.getTime() > now.getTime() + 10_000);
}

function plannedBriefs(events: CalEvent[], settings: Settings, now: Date): PlannedNotification[] {
  const out: PlannedNotification[] = [];

  for (let i = 0; i < BRIEF_HORIZON_DAYS; i++) {
    const day = startOfDay(addDays(now, i));

    if (settings.morningBriefEnabled) {
      const fireAt = new Date(day);
      fireAt.setHours(settings.morningBriefHour, settings.morningBriefMinute, 0, 0);
      if (fireAt.getTime() > now.getTime() + 10_000) {
        const todays = eventsOnDay(events, day);
        out.push({
          key: `brief:morning:${fireAt.getTime()}`,
          fireAt,
          title: 'Jó reggelt!',
          body: summaryBody(todays, 'ma'),
          channelId: CHANNEL.brief,
          data: { type: 'brief', day: day.toISOString() },
        });
      }
    }

    if (settings.eveningPreviewEnabled) {
      const fireAt = new Date(day);
      fireAt.setHours(settings.eveningPreviewHour, settings.eveningPreviewMinute, 0, 0);
      if (fireAt.getTime() > now.getTime() + 10_000) {
        const tomorrows = eventsOnDay(events, addDays(day, 1));
        out.push({
          key: `brief:evening:${fireAt.getTime()}`,
          fireAt,
          title: 'Mi vár holnap?',
          body: summaryBody(tomorrows, 'holnap'),
          channelId: CHANNEL.brief,
          data: { type: 'brief', day: addDays(day, 1).toISOString() },
        });
      }
    }
  }

  return out;
}

/**
 * Builds the full queue: per-event reminders first (they are the ones the user
 * would actually miss), then as many daily summaries as the budget allows.
 */
export function planNotifications(
  events: CalEvent[],
  settings: Settings,
  now: Date = new Date(),
): PlannedNotification[] {
  const horizonEnd = addDays(now, REMINDER_HORIZON_DAYS);

  const inHorizon = events.filter(
    (e) => e.end.getTime() >= now.getTime() && e.start.getTime() <= horizonEnd.getTime(),
  );

  const reminders = inHorizon
    .flatMap((event) => plannedForEvent(event, settings, now))
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_EVENT_REMINDERS);

  const briefs = plannedBriefs(events, settings, now).sort(
    (a, b) => a.fireAt.getTime() - b.fireAt.getTime(),
  );

  const seen = new Set<string>();
  return [...reminders, ...briefs]
    .filter((n) => {
      if (seen.has(n.key)) return false;
      seen.add(n.key);
      return true;
    })
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_TOTAL);
}

/** Cheap identity for a whole plan, so an unchanged queue is left untouched. */
export function planSignature(plan: PlannedNotification[]): string {
  return plan.map((n) => `${n.key}|${n.title}|${n.body}`).join('\n');
}
