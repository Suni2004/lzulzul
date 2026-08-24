/**
 * Hungarian date formatting and calendar-grid maths.
 *
 * Everything here is deliberately dependency-free: the app only needs a
 * handful of operations and hand-rolling them keeps the Hungarian wording
 * (`aug. 24., hétfő`, `2 óra múlva`) fully under our control.
 */

export const MONTHS = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
];

export const MONTHS_SHORT = [
  'jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.',
  'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.',
];

/** Weekday names, Monday first — the Hungarian convention. */
export const WEEKDAYS_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

export const WEEKDAYS_LONG = [
  'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat', 'vasárnap',
];

export const MS_MINUTE = 60_000;
export const MS_HOUR = 60 * MS_MINUTE;
export const MS_DAY = 24 * MS_HOUR;

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * MS_MINUTE);
}

export function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth() + months, 1);
  // Clamp the day so that 31 January + 1 month lands on 28/29 February.
  const lastDay = daysInMonth(out.getFullYear(), out.getMonth());
  out.setDate(Math.min(d.getDate(), lastDay));
  out.setHours(d.getHours(), d.getMinutes(), 0, 0);
  return out;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Monday-based weekday index: 0 = Monday … 6 = Sunday. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function isWeekend(d: Date): boolean {
  return weekdayIndex(d) >= 5;
}

export function startOfWeek(d: Date): Date {
  return startOfDay(addDays(d, -weekdayIndex(d)));
}

/**
 * Builds the 6x7 grid a month view needs, padded with the trailing days of the
 * previous month and the leading days of the next one. Always six rows so the
 * grid does not change height as you swipe between months.
 */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** A stable `2026-08-24` key, safe to use for grouping and as a React key. */
export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatTime(d: Date): string {
  const h = `${d.getHours()}`.padStart(2, '0');
  const m = `${d.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

/** `2026. augusztus` — the month-view header. */
export function formatMonthYear(d: Date): string {
  return `${d.getFullYear()}. ${MONTHS[d.getMonth()]}`;
}

/** `aug. 24.` */
export function formatShortDate(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}.`;
}

/** `2026. augusztus 24., hétfő` */
export function formatLongDate(d: Date): string {
  return `${d.getFullYear()}. ${MONTHS[d.getMonth()]} ${d.getDate()}., ${WEEKDAYS_LONG[weekdayIndex(d)]}`;
}

/** `Ma`, `Holnap`, `Tegnap`, otherwise `aug. 24., hétfő`. */
export function formatRelativeDay(d: Date): string {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / MS_DAY);
  if (diff === 0) return 'Ma';
  if (diff === 1) return 'Holnap';
  if (diff === -1) return 'Tegnap';
  if (diff === 2) return 'Holnapután';
  return `${formatShortDate(d)}, ${WEEKDAYS_LONG[weekdayIndex(d)]}`;
}

/** `9:00 – 10:30`, or `Egész nap` for all-day events. */
export function formatEventTime(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return 'Egész nap';
  if (start.getTime() === end.getTime()) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** `1 ó 30 p`, `45 perc`, `2 nap`. */
export function formatDuration(ms: number): string {
  if (ms < MS_MINUTE) return 'pillanatnyi';
  if (ms < MS_HOUR) return `${Math.round(ms / MS_MINUTE)} perc`;
  if (ms < MS_DAY) {
    const hours = Math.floor(ms / MS_HOUR);
    const minutes = Math.round((ms % MS_HOUR) / MS_MINUTE);
    return minutes ? `${hours} ó ${minutes} p` : `${hours} óra`;
  }
  return `${Math.round(ms / MS_DAY)} nap`;
}

/**
 * `12 perc múlva`, `2 óra múlva`, `most`, `1 órája`.
 * Used on cards and inside notification bodies.
 */
export function formatCountdown(target: Date, from: Date = new Date()): string {
  const diff = target.getTime() - from.getTime();
  const abs = Math.abs(diff);
  if (abs < MS_MINUTE) return 'most';

  // Hungarian marks the past with a possessive suffix that differs per unit
  // ("10 perce", "1 órája", "2 napja"), so each unit carries both forms.
  const [count, unit, pastForm] =
    abs < MS_HOUR
      ? [Math.round(abs / MS_MINUTE), 'perc', 'perce']
      : abs < MS_DAY
        ? [Math.round(abs / MS_HOUR), 'óra', 'órája']
        : [Math.round(abs / MS_DAY), 'nap', 'napja'];

  return diff >= 0 ? `${count} ${unit} múlva` : `${count} ${pastForm}`;
}

/** `10 perccel`, `1 nappal` — the lead-in of a reminder label. */
export function formatLeadTime(minutes: number): string {
  if (minutes === 0) return 'Az esemény kezdetekor';
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days} nappal előtte`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60} órával előtte`;
  }
  return `${minutes} perccel előtte`;
}

/** Clamps a date to the given day, keeping the time of day intact. */
export function withDate(time: Date, day: Date): Date {
  const out = new Date(day);
  out.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return out;
}

/** Rounds up to the next half hour — a sensible default start for a new event. */
export function nextHalfHour(from: Date = new Date()): Date {
  const out = new Date(from);
  out.setSeconds(0, 0);
  out.setMinutes(out.getMinutes() > 30 ? 60 : 30);
  return out;
}
