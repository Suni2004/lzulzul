import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getEvent } from '../../src/calendar/api';
import { useCalendar } from '../../src/calendar/store';
import type { CalEvent } from '../../src/calendar/types';
import { Screen } from '../../src/components/Screen';
import { Button, EmptyState, Touch, Txt } from '../../src/components/ui';
import { useNow } from '../../src/hooks/useNow';
import { useTheme } from '../../src/theme';
import { withAlpha } from '../../src/utils/color';
import {
  formatCountdown,
  formatDuration,
  formatEventTime,
  formatLongDate,
  isSameDay,
} from '../../src/utils/date';

/** One labelled fact about the event. */
function Fact({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', gap: t.spacing.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.c.surfaceAlt,
        }}>
        <Ionicons name={icon} size={17} color={t.c.textMuted} />
      </View>
      <View style={{ flex: 1, paddingTop: 2 }}>
        <Txt variant="caption" tone="faint" style={{ letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </Txt>
        <Txt variant="body" style={{ marginTop: 2 }}>
          {value}
        </Txt>
      </View>
      {onPress ? <Ionicons name="open-outline" size={17} color={t.c.primary} /> : null}
    </View>
  );

  if (!onPress) return <View style={{ paddingVertical: t.spacing.md }}>{body}</View>;
  return (
    <Touch onPress={onPress} scaleTo={0.98} style={{ paddingVertical: t.spacing.md }}>
      {body}
    </Touch>
  );
}

export default function EventDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { removeEvent, events } = useCalendar();

  const [event, setEvent] = useState<CalEvent | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-read whenever the store refreshes, so an edit is reflected on return.
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    getEvent(id)
      .then((found) => {
        if (!cancelled) setEvent(found);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, events]);

  const confirmDelete = () => {
    if (!event) return;
    Alert.alert(
      'Esemény törlése',
      event.recurring
        ? `A(z) „${event.title}” ismétlődő esemény minden előfordulása törlődik.`
        : `A(z) „${event.title}” esemény véglegesen törlődik.`,
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEvent(event.id);
              router.back();
            } catch {
              Alert.alert('Hiba', 'Az eseményt nem sikerült törölni.');
            }
          },
        },
      ],
    );
  };

  const openMap = (location: string) => {
    const query = encodeURIComponent(location);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen>
      {/* --------------------------------------------------------- header -- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.sm,
          paddingBottom: t.spacing.sm,
        }}>
        <Touch onPress={() => router.back()} scaleTo={0.85} style={{ padding: t.spacing.sm }}>
          <Ionicons name="chevron-back" size={26} color={t.c.text} />
        </Touch>
        <View style={{ flex: 1 }} />
        {event ? (
          <>
            <Touch
              onPress={() =>
                router.push({ pathname: '/event/edit', params: { id: event.id } })
              }
              scaleTo={0.85}
              style={{ padding: t.spacing.sm }}>
              <Ionicons name="create-outline" size={23} color={t.c.text} />
            </Touch>
            <Touch onPress={confirmDelete} scaleTo={0.85} style={{ padding: t.spacing.sm }}>
              <Ionicons name="trash-outline" size={22} color={t.c.danger} />
            </Touch>
          </>
        ) : null}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.c.primary} />
        </View>
      ) : !event ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="help-circle-outline"
            title="Az esemény nem található"
            message="Lehet, hogy időközben törölték a naptáradból."
            action={<Button label="Vissza" variant="secondary" onPress={() => router.back()} />}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingBottom: insets.bottom + t.spacing.xxl,
          }}>
          {/* Calendar colour as a wash behind the title. */}
          <View
            style={{
              padding: t.spacing.lg,
              borderRadius: t.radius.lg,
              backgroundColor: withAlpha(event.color, t.isDark ? 0.2 : 0.12),
              borderLeftWidth: 4,
              borderLeftColor: event.color,
              marginBottom: t.spacing.xl,
            }}>
            <Txt variant="title">{event.title}</Txt>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.sm,
                marginTop: t.spacing.sm,
              }}>
              <Txt variant="label" tone="muted">
                {event.calendarTitle}
              </Txt>
              {event.recurring ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="repeat" size={13} color={t.c.textFaint} />
                  <Txt variant="label" tone="faint">
                    ismétlődő
                  </Txt>
                </View>
              ) : null}
            </View>

            {event.end.getTime() >= now.getTime() ? (
              <Txt variant="heading" tone="primary" style={{ marginTop: t.spacing.md }}>
                {event.start <= now
                  ? `Folyamatban · ${formatCountdown(event.end, now)} ér véget`
                  : formatCountdown(event.start, now)}
              </Txt>
            ) : null}
          </View>

          <Fact icon="calendar-outline" label="Nap" value={formatLongDate(event.start)} />

          <Fact
            icon="time-outline"
            label="Időpont"
            value={
              event.allDay
                ? isSameDay(event.start, event.end)
                  ? 'Egész nap'
                  : `Egész nap · ${formatLongDate(event.end)}-ig`
                : `${formatEventTime(event.start, event.end, false)} · ${formatDuration(
                    event.end.getTime() - event.start.getTime(),
                  )}`
            }
          />

          {event.location ? (
            <Fact
              icon="location-outline"
              label="Helyszín"
              value={event.location}
              onPress={() => openMap(event.location)}
            />
          ) : null}

          {event.notes ? (
            <Fact icon="document-text-outline" label="Jegyzet" value={event.notes} />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
