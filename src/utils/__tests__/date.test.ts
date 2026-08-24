import {
  addMonths,
  formatCountdown,
  formatDuration,
  formatEventTime,
  formatLeadTime,
  formatLongDate,
  formatRelativeDay,
  monthGrid,
  startOfWeek,
  weekdayIndex,
} from '../date';

describe('weekdayIndex', () => {
  it('treats Monday as the first day of the week', () => {
    // 2026-08-24 is a Monday, 2026-08-30 a Sunday.
    expect(weekdayIndex(new Date(2026, 7, 24))).toBe(0);
    expect(weekdayIndex(new Date(2026, 7, 30))).toBe(6);
  });
});

describe('startOfWeek', () => {
  it('walks back to the preceding Monday', () => {
    const sunday = new Date(2026, 7, 30, 15, 30);
    expect(startOfWeek(sunday)).toEqual(new Date(2026, 7, 24, 0, 0, 0, 0));
  });
});

describe('monthGrid', () => {
  it('always returns six full weeks', () => {
    expect(monthGrid(2026, 7)).toHaveLength(42);
  });

  it('starts on the Monday on or before the first of the month', () => {
    // 1 August 2026 is a Saturday, so the grid opens on 27 July.
    const grid = monthGrid(2026, 7);
    expect(grid[0]).toEqual(new Date(2026, 6, 27, 0, 0, 0, 0));
  });

  it('covers every day of the month', () => {
    const grid = monthGrid(2026, 1); // February 2026, 28 days
    const inMonth = grid.filter((d) => d.getMonth() === 1);
    expect(inMonth).toHaveLength(28);
  });
});

describe('addMonths', () => {
  it('clamps the day when the target month is shorter', () => {
    const jan31 = new Date(2026, 0, 31);
    expect(addMonths(jan31, 1).getDate()).toBe(28);
    expect(addMonths(jan31, 1).getMonth()).toBe(1);
  });

  it('rolls over the year boundary', () => {
    const dec = new Date(2026, 11, 5);
    const next = addMonths(dec, 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });
});

describe('formatRelativeDay', () => {
  const today = new Date(2026, 7, 24, 10, 0);

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(today);
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('names the days around today', () => {
    expect(formatRelativeDay(new Date(2026, 7, 24, 23, 0))).toBe('Ma');
    expect(formatRelativeDay(new Date(2026, 7, 25))).toBe('Holnap');
    expect(formatRelativeDay(new Date(2026, 7, 23))).toBe('Tegnap');
  });

  it('falls back to a dated label further out', () => {
    expect(formatRelativeDay(new Date(2026, 7, 31))).toBe('aug. 31., hétfő');
  });
});

describe('formatLongDate', () => {
  it('uses the Hungarian year-month-day order', () => {
    expect(formatLongDate(new Date(2026, 7, 24))).toBe('2026. augusztus 24., hétfő');
  });
});

describe('formatEventTime', () => {
  it('renders a range for timed events', () => {
    const start = new Date(2026, 7, 24, 9, 0);
    const end = new Date(2026, 7, 24, 10, 30);
    expect(formatEventTime(start, end, false)).toBe('09:00 – 10:30');
  });

  it('ignores the times for all-day events', () => {
    const start = new Date(2026, 7, 24, 9, 0);
    expect(formatEventTime(start, start, true)).toBe('Egész nap');
  });
});

describe('formatDuration', () => {
  it('picks a sensible unit', () => {
    expect(formatDuration(45 * 60_000)).toBe('45 perc');
    expect(formatDuration(60 * 60_000)).toBe('1 óra');
    expect(formatDuration(90 * 60_000)).toBe('1 ó 30 p');
    expect(formatDuration(2 * 86_400_000)).toBe('2 nap');
  });
});

describe('formatCountdown', () => {
  const now = new Date(2026, 7, 24, 12, 0);

  it('counts forwards and backwards', () => {
    expect(formatCountdown(new Date(2026, 7, 24, 12, 10), now)).toBe('10 perc múlva');
    expect(formatCountdown(new Date(2026, 7, 24, 14, 0), now)).toBe('2 óra múlva');
    expect(formatCountdown(new Date(2026, 7, 24, 11, 0), now)).toBe('1 órája');
    expect(formatCountdown(new Date(2026, 7, 24, 11, 50), now)).toBe('10 perce');
    expect(formatCountdown(new Date(2026, 7, 22, 12, 0), now)).toBe('2 napja');
  });

  it('collapses to "most" inside a minute', () => {
    expect(formatCountdown(new Date(2026, 7, 24, 12, 0, 30), now)).toBe('most');
  });
});

describe('formatLeadTime', () => {
  it('describes each unit in Hungarian', () => {
    expect(formatLeadTime(0)).toBe('Az esemény kezdetekor');
    expect(formatLeadTime(10)).toBe('10 perccel előtte');
    expect(formatLeadTime(120)).toBe('2 órával előtte');
    expect(formatLeadTime(1440)).toBe('1 nappal előtte');
  });
});
