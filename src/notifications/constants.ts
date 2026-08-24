/**
 * Channel identifiers, kept free of any native import so the scheduling
 * logic that references them stays pure and testable.
 */
export const CHANNEL = {
  /** "Your meeting starts in 10 minutes." */
  reminder: 'event-reminders',
  /** "Leave now to make it on time." */
  leave: 'leave-now',
  /** Morning summary and evening preview. */
  brief: 'daily-brief',
} as const;

/** Brand colour used for the notification accent and LED. */
export const NOTIFICATION_ACCENT = '#4F46E5';
