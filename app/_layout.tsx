import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CalendarProvider } from '../src/calendar/store';
import { UpdateGate } from '../src/components/UpdateGate';
import { configureHandler } from '../src/notifications';
import { SettingsProvider, useSettings } from '../src/settings/store';
import { ThemeProvider, useTheme } from '../src/theme';
import { UpdateProvider } from '../src/update/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Reminders should surface even while the app is in the foreground.
configureHandler();

/**
 * Everything below the providers, so it can read the resolved theme.
 * Also owns the "user tapped a notification" -> "open that event" routing.
 */
function Shell() {
  const t = useTheme();
  const { loading } = useSettings();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.c.bg).catch(() => {});
  }, [t.c.bg]);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; eventId?: string }
        | undefined;
      if (data?.type === 'event' && data.eventId) {
        router.push({ pathname: '/event/[id]', params: { id: data.eventId } });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <UpdateGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.c.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="event/[id]" />
          <Stack.Screen
            name="event/edit"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </UpdateGate>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <UpdateProvider>
              <CalendarProvider>
                <Shell />
              </CalendarProvider>
            </UpdateProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
