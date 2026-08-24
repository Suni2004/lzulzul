export type ThemePreference = 'system' | 'light' | 'dark';

export type Settings = {
  theme: ThemePreference;
  /** Calendars the user has switched off; everything else is shown. */
  hiddenCalendarIds: string[];
  /** Calendar new events are created in. Empty means "ask the OS for a default". */
  defaultCalendarId: string;
  /** Minutes before the start to fire a reminder. Several are allowed. */
  reminderLeadMinutes: number[];
  /** Hour of day at which all-day events are announced. */
  allDayReminderHour: number;
  /**
   * Extra head start for events that have a location — the "leave now" nudge
   * fires this many minutes before the start. 0 turns the feature off.
   */
  travelBufferMinutes: number;
  morningBriefEnabled: boolean;
  morningBriefHour: number;
  morningBriefMinute: number;
  eveningPreviewEnabled: boolean;
  eveningPreviewHour: number;
  eveningPreviewMinute: number;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  hiddenCalendarIds: [],
  defaultCalendarId: '',
  reminderLeadMinutes: [60, 10],
  allDayReminderHour: 8,
  travelBufferMinutes: 0,
  morningBriefEnabled: true,
  morningBriefHour: 7,
  morningBriefMinute: 30,
  eveningPreviewEnabled: true,
  eveningPreviewHour: 21,
  eveningPreviewMinute: 0,
};

/** Lead times the user can pick from, in minutes. */
export const LEAD_TIME_CHOICES = [0, 5, 10, 15, 30, 60, 120, 24 * 60, 48 * 60];
