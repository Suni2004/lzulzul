/** The plain-data shapes the UI works with. */

/**
 * Pseudo-calendar for events the app owns itself.
 *
 * These live in the app's own storage, never in the Android calendar
 * database — which is the whole point: nothing the user adds here shows up
 * in the Samsung or Google calendar.
 */
export const LOCAL_CALENDAR_ID = 'napirend:local';

/** Where an event came from, and therefore who is allowed to change it. */
export type EventSource = 'local' | 'device';

export type CalendarInfo = {
  id: string;
  title: string;
  /** Always a resolved `#rrggbb` value, even if the OS reported none. */
  color: string;
  /** False for read-only subscriptions such as holiday calendars. */
  writable: boolean;
  /** Account the calendar syncs with, for example a Google address. */
  account?: string;
  isPrimary: boolean;
};

export type CalEvent = {
  /** The event's own ID — use this when loading, editing or deleting. */
  id: string;
  /** `local` for events this app owns, `device` for the phone's calendars. */
  source: EventSource;
  /** Android-only volatile ID for one occurrence of a repeating event. */
  instanceId?: string;
  calendarId: string;
  calendarTitle: string;
  color: string;
  title: string;
  notes: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  recurring: boolean;
};

/** What the editor screen hands back when saving. */
export type EventDraft = {
  /** `LOCAL_CALENDAR_ID` keeps the event private to this app. */
  title: string;
  notes: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarId: string;
};

/** A React-friendly key that is unique even across repeating occurrences. */
export function eventKey(event: CalEvent): string {
  return `${event.instanceId ?? event.id}@${event.start.getTime()}`;
}
