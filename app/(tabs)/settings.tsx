import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCalendar } from '../../src/calendar/store';
import { Row, Section } from '../../src/components/Settings';
import { Screen } from '../../src/components/Screen';
import { TimeField } from '../../src/components/TimeField';
import { Button, Chip, Touch, Txt } from '../../src/components/ui';
import {
  countScheduled,
  getPermissionStatus,
  requestPermission,
  sendTestNotification,
  syncNotifications,
} from '../../src/notifications';
import { useSettings } from '../../src/settings/store';
import { LEAD_TIME_CHOICES, type ThemePreference } from '../../src/settings/types';
import { useTheme } from '../../src/theme';
import { formatLeadTime } from '../../src/utils/date';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Rendszer' },
  { value: 'light', label: 'Világos' },
  { value: 'dark', label: 'Sötét' },
];

/** Builds a Date carrying only the hour/minute the pickers care about. */
function timeOf(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export default function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, reset } = useSettings();
  const { calendars, events } = useCalendar();

  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [queued, setQueued] = useState<number | null>(null);

  const refreshNotificationState = useCallback(async () => {
    const granted = await getPermissionStatus();
    setNotifGranted(granted);
    setQueued(granted ? await countScheduled() : 0);
  }, []);

  useEffect(() => {
    void refreshNotificationState();
  }, [refreshNotificationState, settings, events]);

  const toggleLead = (minutes: number) => {
    const current = settings.reminderLeadMinutes;
    const next = current.includes(minutes)
      ? current.filter((m) => m !== minutes)
      : [...current, minutes].sort((a, b) => b - a);
    update({ reminderLeadMinutes: next });
  };

  const toggleCalendar = (id: string) => {
    const hidden = settings.hiddenCalendarIds;
    update({
      hiddenCalendarIds: hidden.includes(id)
        ? hidden.filter((c) => c !== id)
        : [...hidden, id],
    });
  };

  const writableCalendars = calendars.filter((c) => c.writable);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.lg,
          paddingBottom: insets.bottom + t.spacing.xxl,
        }}>
        <Txt variant="display" style={{ marginBottom: t.spacing.xl }}>
          Beállítások
        </Txt>

        {/* ---------------------------------------------------- appearance -- */}
        <Section title="Megjelenés">
          <Row label="Téma">
            <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
              {THEME_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={settings.theme === option.value}
                  onPress={() => update({ theme: option.value })}
                />
              ))}
            </View>
          </Row>
        </Section>

        {/* ----------------------------------------------------- reminders -- */}
        <Section
          title="Emlékeztetők"
          footer="Minden kiválasztott időpontban külön értesítést kapsz az esemény előtt.">
          <Row label="Mikor szóljon?" hint={
            settings.reminderLeadMinutes.length === 0
              ? 'Nincs kiválasztva – nem kapsz esemény-emlékeztetőt.'
              : settings.reminderLeadMinutes.map(formatLeadTime).join(', ')
          }>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
              {LEAD_TIME_CHOICES.map((minutes) => (
                <Chip
                  key={minutes}
                  label={
                    minutes === 0
                      ? 'Kezdéskor'
                      : minutes < 60
                        ? `${minutes} p`
                        : minutes < 24 * 60
                          ? `${minutes / 60} ó`
                          : `${minutes / (24 * 60)} nap`
                  }
                  selected={settings.reminderLeadMinutes.includes(minutes)}
                  onPress={() => toggleLead(minutes)}
                />
              ))}
            </View>
          </Row>

          <Row
            label="Egész napos események"
            hint="Ilyenkor szól az előző este és aznap reggel."
            right={
              <TimeField
                value={timeOf(settings.allDayReminderHour, 0)}
                onChange={(hour) => update({ allDayReminderHour: hour })}
              />
            }
          />

          <Row
            label="Indulási figyelmeztetés"
            hint={
              settings.travelBufferMinutes === 0
                ? 'Kikapcsolva.'
                : `Helyszínnel rendelkező eseményeknél ${settings.travelBufferMinutes} perccel előbb szól, hogy indulj el.`
            }>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
              {[0, 10, 15, 20, 30, 45, 60].map((minutes) => (
                <Chip
                  key={minutes}
                  label={minutes === 0 ? 'Ki' : `${minutes} p`}
                  selected={settings.travelBufferMinutes === minutes}
                  onPress={() => update({ travelBufferMinutes: minutes })}
                />
              ))}
            </View>
          </Row>
        </Section>

        {/* --------------------------------------------------------- brief -- */}
        <Section
          title="Napi összefoglaló"
          footer="Egyetlen értesítés a nap programjairól, a szokásos zaj helyett.">
          <Row
            label="Reggeli áttekintés"
            hint="Mi vár rád ma."
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
                <TimeField
                  value={timeOf(settings.morningBriefHour, settings.morningBriefMinute)}
                  disabled={!settings.morningBriefEnabled}
                  onChange={(hour, minute) =>
                    update({ morningBriefHour: hour, morningBriefMinute: minute })
                  }
                />
                <Switch
                  value={settings.morningBriefEnabled}
                  onValueChange={(v) => update({ morningBriefEnabled: v })}
                  trackColor={{ true: t.c.primary, false: t.c.surfaceAlt }}
                />
              </View>
            }
          />
          <Row
            label="Esti előzetes"
            hint="Mi jön holnap."
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
                <TimeField
                  value={timeOf(settings.eveningPreviewHour, settings.eveningPreviewMinute)}
                  disabled={!settings.eveningPreviewEnabled}
                  onChange={(hour, minute) =>
                    update({ eveningPreviewHour: hour, eveningPreviewMinute: minute })
                  }
                />
                <Switch
                  value={settings.eveningPreviewEnabled}
                  onValueChange={(v) => update({ eveningPreviewEnabled: v })}
                  trackColor={{ true: t.c.primary, false: t.c.surfaceAlt }}
                />
              </View>
            }
          />
        </Section>

        {/* ----------------------------------------------------- calendars -- */}
        <Section
          title="Naptárak"
          footer="A kikapcsolt naptárak eseményei nem jelennek meg, és nem is szólnak.">
          {calendars.length === 0 ? (
            <Row label="Nincs elérhető naptár" hint="Ellenőrizd a naptár-hozzáférést." />
          ) : (
            calendars.map((calendar) => (
              <Row
                key={calendar.id}
                label={calendar.title}
                hint={calendar.account}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: calendar.color,
                      }}
                    />
                    <Switch
                      value={!settings.hiddenCalendarIds.includes(calendar.id)}
                      onValueChange={() => toggleCalendar(calendar.id)}
                      trackColor={{ true: t.c.primary, false: t.c.surfaceAlt }}
                    />
                  </View>
                }
              />
            ))
          )}
        </Section>

        {writableCalendars.length > 1 ? (
          <Section
            title="Új események"
            footer="Ide kerülnek az itt létrehozott programok.">
            <Row label="Alapértelmezett naptár">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
                {writableCalendars.map((calendar) => (
                  <Chip
                    key={calendar.id}
                    label={calendar.title}
                    color={calendar.color}
                    selected={settings.defaultCalendarId === calendar.id}
                    onPress={() => update({ defaultCalendarId: calendar.id })}
                  />
                ))}
              </View>
            </Row>
          </Section>
        ) : null}

        {/* ---------------------------------------------------- diagnostic -- */}
        <Section
          title="Értesítések állapota"
          footer={
            notifGranted === false
              ? 'Az értesítési engedély nélkül semmi nem fog szólni.'
              : `${queued ?? 0} értesítés van előjegyezve. A lista magától frissül, ahogy változik a naptárad.`
          }>
          <Row
            label="Engedély"
            hint={notifGranted ? 'Megadva' : notifGranted === false ? 'Hiányzik' : 'Ellenőrzés…'}
            right={
              <Ionicons
                name={notifGranted ? 'checkmark-circle' : 'alert-circle'}
                size={22}
                color={notifGranted ? t.c.primary : t.c.danger}
              />
            }
          />
          {!notifGranted ? (
            <Row>
              <View style={{ gap: t.spacing.sm }}>
                <Button
                  label="Értesítések engedélyezése"
                  icon="notifications-outline"
                  onPress={async () => {
                    const granted = await requestPermission();
                    if (!granted) {
                      Alert.alert(
                        'Nem sikerült',
                        'Az engedélyt a rendszerbeállításokban tudod megadni.',
                        [
                          { text: 'Mégse', style: 'cancel' },
                          { text: 'Beállítások', onPress: () => void Linking.openSettings() },
                        ],
                      );
                    }
                    await syncNotifications(events, settings, { force: true });
                    await refreshNotificationState();
                  }}
                />
              </View>
            </Row>
          ) : (
            <Row>
              <View style={{ gap: t.spacing.sm }}>
                <Button
                  label="Teszt értesítés küldése"
                  icon="volume-medium-outline"
                  variant="secondary"
                  onPress={() => void sendTestNotification()}
                />
                <Button
                  label="Emlékeztetők újraütemezése"
                  icon="refresh-outline"
                  variant="ghost"
                  onPress={async () => {
                    const result = await syncNotifications(events, settings, { force: true });
                    await refreshNotificationState();
                    Alert.alert('Kész', `${result.scheduled} értesítés előjegyezve.`);
                  }}
                />
              </View>
            </Row>
          )}
        </Section>

        <Touch
          onPress={() =>
            Alert.alert('Visszaállítás', 'Minden beállítás visszaáll az alapértékre.', [
              { text: 'Mégse', style: 'cancel' },
              { text: 'Visszaállítás', style: 'destructive', onPress: reset },
            ])
          }
          style={{ alignSelf: 'center', padding: t.spacing.md }}>
          <Txt variant="label" tone="danger">
            Beállítások visszaállítása
          </Txt>
        </Touch>

        <Txt variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: t.spacing.md }}>
          Napirend · a telefonod naptáraiból dolgozik
        </Txt>
      </ScrollView>
    </Screen>
  );
}
