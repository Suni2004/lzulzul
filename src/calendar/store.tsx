/**
 * The app's single source of calendar data.
 *
 * Events are loaded for a rolling window that widens as the user swipes into
 * new months, indexed by day for the grid and the agenda, and kept in step with
 * the OS — both on refresh and whenever the app returns to the foreground,
 * since the system calendar can change while we are in the background.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { syncNotifications } from '../notifications';
import { useSettings } from '../settings/store';
import { addDays, addMonths, dayKey, startOfDay, startOfWeek } from '../utils/date';
import * as api from './api';
import { compareEvents } from './api';
import type { CalEvent, CalendarInfo, EventDraft } from './types';

export type PermissionState = 'unknown' | 'granted' | 'denied';

/** A multi-day event is indexed on every day it touches, up to this many. */
const MAX_SPAN_DAYS = 90;

type Range = { from: Date; to: Date };

function initialRange(): Range {
  const today = startOfDay(new Date());
  return {
    from: startOfWeek(addMonths(today, -1)),
    to: addMonths(today, 3),
  };
}

type CalendarContextValue = {
  permission: PermissionState;
  requestAccess: () => Promise<boolean>;
  calendars: CalendarInfo[];
  /** Calendars the user has not hidden. */
  visibleCalendars: CalendarInfo[];
  /** Every loaded event from the visible calendars, sorted. */
  events: CalEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  eventsForDay: (day: Date) => CalEvent[];
  /** Widens the loaded window if `from`/`to` fall outside it. */
  ensureRange: (from: Date, to: Date) => void;
  refresh: () => Promise<void>;
  saveEvent: (draft: EventDraft, existingId?: string) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();

  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [allEvents, setAllEvents] = useState<CalEvent[]>([]);
  const [range, setRange] = useState<Range>(initialRange);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kept in a ref so the load callback can read the newest range without
  // being re-created (and re-triggering the effect) on every widen.
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const granted = await api.hasPermission();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setCalendars([]);
        setAllEvents([]);
        return;
      }

      const cals = await api.listCalendars();
      setCalendars(cals);

      const { from, to } = rangeRef.current;
      const events = await api.listEvents(cals.map((c) => c.id), from, to);
      setAllEvents(events);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nem sikerült beolvasni a naptárat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // First load, plus a reload whenever the window widens.
  useEffect(() => {
    void load('initial');
  }, [load, range]);

  // The system calendar can change while we are backgrounded, so re-read on
  // every return to the foreground.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void load('refresh');
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [load]);

  const requestAccess = useCallback(async () => {
    const granted = await api.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) await load('refresh');
    return granted;
  }, [load]);

  const ensureRange = useCallback((from: Date, to: Date) => {
    setRange((prev) => {
      const nextFrom = from < prev.from ? startOfWeek(addMonths(from, -1)) : prev.from;
      const nextTo = to > prev.to ? addMonths(to, 1) : prev.to;
      if (nextFrom.getTime() === prev.from.getTime() && nextTo.getTime() === prev.to.getTime()) {
        return prev;
      }
      return { from: nextFrom, to: nextTo };
    });
  }, []);

  const hidden = useMemo(
    () => new Set(settings.hiddenCalendarIds),
    [settings.hiddenCalendarIds],
  );

  const events = useMemo(
    () => allEvents.filter((e) => !hidden.has(e.calendarId)).sort(compareEvents),
    [allEvents, hidden],
  );

  const visibleCalendars = useMemo(
    () => calendars.filter((c) => !hidden.has(c.id)),
    [calendars, hidden],
  );

  /** Day-keyed index so the grid and the agenda are both O(1) lookups. */
  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const event of events) {
      let cursor = startOfDay(event.start);
      const last = startOfDay(event.end);
      for (let i = 0; cursor <= last && i < MAX_SPAN_DAYS; i++) {
        const key = dayKey(cursor);
        const bucket = map.get(key);
        if (bucket) bucket.push(event);
        else map.set(key, [event]);
        cursor = addDays(cursor, 1);
      }
    }
    for (const bucket of map.values()) bucket.sort(compareEvents);
    return map;
  }, [events]);

  const eventsForDay = useCallback(
    (day: Date) => byDay.get(dayKey(day)) ?? [],
    [byDay],
  );

  const saveEvent = useCallback(
    async (draft: EventDraft, existingId?: string) => {
      if (existingId) await api.updateEvent(existingId, draft);
      else await api.createEvent(draft);
      await load('refresh');
    },
    [load],
  );

  const removeEvent = useCallback(
    async (id: string) => {
      await api.deleteEvent(id);
      await load('refresh');
    },
    [load],
  );

  // Keep the OS notification queue in step with what is actually in the
  // calendar. Runs after every load and after any settings change.
  useEffect(() => {
    if (settingsLoading || permission !== 'granted' || loading) return;
    void syncNotifications(events, settings).catch(() => {});
  }, [events, settings, settingsLoading, permission, loading]);

  const value = useMemo<CalendarContextValue>(
    () => ({
      permission,
      requestAccess,
      calendars,
      visibleCalendars,
      events,
      loading,
      refreshing,
      error,
      eventsForDay,
      ensureRange,
      refresh: () => load('refresh'),
      saveEvent,
      removeEvent,
    }),
    [
      permission, requestAccess, calendars, visibleCalendars, events, loading,
      refreshing, error, eventsForDay, ensureRange, load, saveEvent, removeEvent,
    ],
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used inside <CalendarProvider>');
  return ctx;
}
