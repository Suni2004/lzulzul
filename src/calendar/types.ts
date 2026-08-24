/** The plain-data shapes the UI works with. */

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
