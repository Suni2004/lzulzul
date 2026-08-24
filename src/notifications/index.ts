/**
 * The bridge between the notification plan and the operating system.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { CalEvent } from '../calendar/types';
import type { Settings } from '../settings/types';
import { ensureChannels } from './channels';
import { planNotifications, planSignature, type PlannedNotification } from './plan';

const SIGNATURE_KEY = 'napirend.notifications.signature.v1';

export { CHANNEL, ensureChannels } from './channels';
export { planNotifications } from './plan';
export type { PlannedNotification } from './plan';

/**
 * Show reminders even while the app is open — a calendar alert the user misses
 * because they happened to be looking at the calendar would be absurd.
 */
export function configureHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getPermissionStatus(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

export async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const status = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status.granted;
}

async function schedule(item: PlannedNotification): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: item.body,
      data: item.data,
      sound: true,
      ...(Platform.OS === 'android' ? { color: '#4F46E5' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.fireAt,
      channelId: item.channelId,
    },
  });
}

export type SyncResult = {
  /** How many notifications are queued after the sync. */
  scheduled: number;
  /** False when the queue already matched the plan and was left alone. */
  changed: boolean;
};

/**
 * Rebuilds the pending notification queue from the current events.
 *
 * The queue is a rolling window, so this runs on launch, whenever the app comes
 * back to the foreground, and after any edit. If the freshly computed plan is
 * byte-for-byte what is already queued we skip the work entirely — otherwise
 * we clear and re-arm, which is the only way to keep the OS queue exactly in
 * step with a calendar that can change behind our back.
 */
export async function syncNotifications(
  events: CalEvent[],
  settings: Settings,
  options: { force?: boolean } = {},
): Promise<SyncResult> {
  if (!(await getPermissionStatus())) {
    return { scheduled: 0, changed: false };
  }

  await ensureChannels();

  const plan = planNotifications(events, settings);
  const signature = planSignature(plan);

  if (!options.force) {
    const previous = await AsyncStorage.getItem(SIGNATURE_KEY).catch(() => null);
    if (previous === signature) {
      return { scheduled: plan.length, changed: false };
    }
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of plan) {
    try {
      await schedule(item);
    } catch {
      // One bad item (a date the OS rejects, a full queue) must not take the
      // rest of the reminders down with it.
    }
  }

  await AsyncStorage.setItem(SIGNATURE_KEY, signature).catch(() => {});
  return { scheduled: plan.length, changed: true };
}

/** Used by the settings screen to show what is actually armed right now. */
export async function countScheduled(): Promise<number> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.length;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(SIGNATURE_KEY).catch(() => {});
}

/** Fires a sample reminder a few seconds out so the user can hear it. */
export async function sendTestNotification(): Promise<void> {
  await ensureChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Így fog kinézni',
      body: 'Csapatmegbeszélés · 14:00 – 15:00 · Iroda · 10 perc múlva',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      channelId: 'event-reminders',
    },
  });
}
