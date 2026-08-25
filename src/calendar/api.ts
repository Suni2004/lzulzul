/**
 * Thin wrapper over `expo-calendar`.
 *
 * The native module hands back shared objects whose date fields may be either
 * `Date` or ISO strings. Everything crossing into the app is converted to
 * plain, fully-typed data here so no screen has to think about it.
 */

import * as Calendar from 'expo-calendar';

import { fallbackColor, normalizeHex } from '../utils/color';
import { endOfDay, startOfDay } from '../utils/date';
import type { CalEvent, CalendarInfo, EventDraft } from './types';

function toDate(value: string | Date | undefined | null, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

export async function hasPermission(): Promise<boolean> {
  const status = await Calendar.getCalendarPermissions();
  return status.granted;
}

export async function requestPermission(): Promise<boolean> {
  const status = await Calendar.requestCalendarPermissions();
  return status.granted;
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  const raw = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return raw
    .map((cal): CalendarInfo => ({
      id: cal.id,
      title: cal.title || cal.name || 'Névtelen naptár',
      color: normalizeHex(cal.color) ?? fallbackColor(cal.id),
      writable: cal.allowsModifications !== false,
      account: cal.ownerAccount ?? cal.source?.name,
      isPrimary: cal.isPrimary === true,
    }))
    // Primary calendars first, then alphabetically — a stable, predictable order.
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.title.localeCompare(b.title, 'hu');
    });
}

/**
 * Reads every event between two instants across the given calendars.
 * All-day events are snapped to local day boundaries, because the OS reports
 * their end as exclusive midnight, which would otherwise bleed into the next
 * day in the UI.
 */
export async function listEvents(
  calendarIds: string[],
  from: Date,
  to: Date,
): Promise<CalEvent[]> {
  if (calendarIds.length === 0) return [];

  const calendars = await listCalendars();
  const byId = new Map(calendars.map((c) => [c.id, c]));
  const raw = await Calendar.listEvents(calendarIds, from, to);

  return raw
    .map((event): CalEvent => {
      const source = byId.get(event.calendarId);
      const start = toDate(event.startDate, from);
      let end = toDate(event.endDate, start);

      if (event.allDay) {
        // Exclusive midnight end -> inclusive end of the previous day.
        const snapped = new Date(end.getTime() - 1);
        end = endOfDay(snapped < start ? start : snapped);
      } else if (end < start) {
        end = start;
      }

      return {
        id: event.id,
        source: 'device',
        instanceId: event.instanceId,
        calendarId: event.calendarId,
        calendarTitle: source?.title ?? 'Naptár',
        color: source?.color ?? fallbackColor(event.calendarId),
        title: event.title?.trim() || '(névtelen esemény)',
        notes: event.notes ?? '',
        location: event.location ?? '',
        start: event.allDay ? startOfDay(start) : start,
        end,
        allDay: event.allDay === true,
        recurring: event.recurrenceRule != null,
      };
    })
    .sort(compareEvents);
}

/** All-day first, then by start time, then alphabetically. */
export function compareEvents(a: CalEvent, b: CalEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  const byStart = a.start.getTime() - b.start.getTime();
  if (byStart !== 0) return byStart;
  return a.title.localeCompare(b.title, 'hu');
}

export async function getEvent(id: string): Promise<CalEvent | null> {
  try {
    const event = await Calendar.ExpoCalendarEvent.get(id);
    const calendars = await listCalendars();
    const source = calendars.find((c) => c.id === event.calendarId);
    const start = toDate(event.startDate, new Date());
    let end = toDate(event.endDate, start);
    if (event.allDay) {
      const snapped = new Date(end.getTime() - 1);
      end = endOfDay(snapped < start ? start : snapped);
    }

    return {
      id: event.id,
      source: 'device',
      instanceId: event.instanceId,
      calendarId: event.calendarId,
      calendarTitle: source?.title ?? 'Naptár',
      color: source?.color ?? fallbackColor(event.calendarId),
      title: event.title?.trim() || '(névtelen esemény)',
      notes: event.notes ?? '',
      location: event.location ?? '',
      start: event.allDay ? startOfDay(start) : start,
      end,
      allDay: event.allDay === true,
      recurring: event.recurrenceRule != null,
    };
  } catch {
    // The event was deleted underneath us, or the ID is no longer valid.
    return null;
  }
}

/** Converts our editor draft back into the shape the OS expects. */
function toNativeDetails(draft: EventDraft) {
  return {
    title: draft.title.trim(),
    notes: draft.notes.trim(),
    location: draft.location.trim(),
    startDate: draft.allDay ? startOfDay(draft.start) : draft.start,
    // The OS treats an all-day end as exclusive, so push it past midnight.
    endDate: draft.allDay ? new Date(endOfDay(draft.end).getTime() + 1) : draft.end,
    allDay: draft.allDay,
  };
}

export async function createEvent(draft: EventDraft): Promise<string> {
  const calendar = await Calendar.ExpoCalendar.get(draft.calendarId);
  const created = await calendar.createEvent(toNativeDetails(draft));
  return created.id;
}

export async function updateEvent(id: string, draft: EventDraft): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(id);
  await event.update(toNativeDetails(draft));
}

export async function deleteEvent(id: string): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(id);
  await event.delete();
}
