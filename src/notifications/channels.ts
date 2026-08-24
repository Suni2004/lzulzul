/**
 * Android notification channels.
 *
 * Splitting reminders from the daily digest matters: the user can silence the
 * morning summary in the OS settings without losing the alarm-like nudge that
 * an event is about to start.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { CHANNEL, NOTIFICATION_ACCENT as ACCENT } from './constants';

export { CHANNEL };

export async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL.reminder, {
    name: 'Esemény-emlékeztetők',
    description: 'Szól, mielőtt egy programod elkezdődik.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 120, 220],
    lightColor: ACCENT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL.leave, {
    name: 'Indulási figyelmeztetés',
    description: 'Szól, amikor el kell indulnod, hogy időben odaérj.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 150, 400],
    lightColor: '#FB7185',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL.brief, {
    name: 'Napi összefoglaló',
    description: 'Reggeli áttekintés és esti előzetes a másnapról.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    lightColor: ACCENT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    enableVibrate: true,
  });
}
