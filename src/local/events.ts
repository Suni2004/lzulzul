/**
 * Storage for events the app owns.
 *
 * These never touch the Android calendar database, so nothing created here
 * appears in the Samsung or Google calendar — which is exactly what makes
 * them private. The trade-off is that they do not sync anywhere and are gone
 * if the app is uninstalled.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LOCAL_CALENDAR_ID, type CalEvent, type EventDraft } from '../calendar/types';

const STORAGE_KEY = 'napirend.events.v1';

/** Colour the app's own events are drawn with. */
export const LOCAL_COLOR = '#4F46E5';

/** The on-disk shape. Dates are ISO strings so the record is plain JSON. */
export type StoredEvent = {
  id: string;
  title: string;
  notes: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Time-ordered, random-suffixed ID. The timestamp keeps records roughly
 * sorted on disk; the suffix makes a collision within the same millisecond
 * effectively impossible.
 */
export function newId(now: number = Date.now()): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${LOCAL_CALENDAR_ID}:${now.toString(36)}-${suffix}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith(`${LOCAL_CALENDAR_ID}:`);
}

/** Turns a stored record into the shape the rest of the app renders. */
export function toCalEvent(stored: StoredEvent): CalEvent {
  return {
    id: stored.id,
    source: 'local',
    calendarId: LOCAL_CALENDAR_ID,
    calendarTitle: 'Napirend',
    color: LOCAL_COLOR,
    title: stored.title || '(névtelen esemény)',
    notes: stored.notes,
    location: stored.location,
    start: new Date(stored.start),
    end: new Date(stored.end),
    allDay: stored.allDay,
    recurring: false,
  };
}

/** Drops anything that would crash the UI, rather than failing the whole read. */
export function parseStored(raw: unknown): StoredEvent[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((item): item is StoredEvent => {
    if (typeof item !== 'object' || item === null) return false;
    const e = item as Record<string, unknown>;
    return (
      typeof e.id === 'string' &&
      typeof e.title === 'string' &&
      typeof e.start === 'string' &&
      typeof e.end === 'string' &&
      !Number.isNaN(new Date(e.start).getTime()) &&
      !Number.isNaN(new Date(e.end).getTime())
    );
  });
}

async function readAll(): Promise<StoredEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseStored(JSON.parse(raw));
  } catch {
    // A corrupt store must not take the whole calendar down; the device
    // calendars still render.
    return [];
  }
}

async function writeAll(events: StoredEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export async function listLocalEvents(): Promise<CalEvent[]> {
  return (await readAll()).map(toCalEvent);
}

/** Builds the record for a draft, reusing `id` when editing. */
export function draftToStored(
  draft: EventDraft,
  existing?: StoredEvent,
  now: Date = new Date(),
): StoredEvent {
  return {
    id: existing?.id ?? newId(now.getTime()),
    title: draft.title.trim(),
    notes: draft.notes.trim(),
    location: draft.location.trim(),
    start: draft.start.toISOString(),
    end: draft.end.toISOString(),
    allDay: draft.allDay,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function createLocalEvent(draft: EventDraft): Promise<string> {
  const events = await readAll();
  const record = draftToStored(draft);
  await writeAll([...events, record]);
  return record.id;
}

export async function updateLocalEvent(id: string, draft: EventDraft): Promise<void> {
  const events = await readAll();
  const existing = events.find((e) => e.id === id);
  if (!existing) return;

  const updated = draftToStored(draft, existing);
  await writeAll(events.map((e) => (e.id === id ? updated : e)));
}

export async function deleteLocalEvent(id: string): Promise<void> {
  const events = await readAll();
  await writeAll(events.filter((e) => e.id !== id));
}

export async function getLocalEvent(id: string): Promise<CalEvent | null> {
  const found = (await readAll()).find((e) => e.id === id);
  return found ? toCalEvent(found) : null;
}
