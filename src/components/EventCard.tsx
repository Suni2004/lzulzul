import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { CalEvent } from '../calendar/types';
import { useTheme } from '../theme';
import { withAlpha } from '../utils/color';
import { formatCountdown, formatEventTime, formatTime, isSameDay } from '../utils/date';
import { Touch, Txt } from './ui';

/** Is `now` inside the event? Drives the "folyamatban" treatment. */
function isRunning(event: CalEvent, now: Date): boolean {
  return event.start <= now && event.end >= now;
}

export function EventCard({
  event,
  onPress,
  now = new Date(),
  /** The day this card is being shown under, for multi-day events. */
  day,
}: {
  event: CalEvent;
  onPress: () => void;
  now?: Date;
  day?: Date;
}) {
  const t = useTheme();
  const running = isRunning(event, now);
  const past = event.end < now;
  const spansDays = !isSameDay(event.start, event.end);

  // A multi-day event shown on a middle day should not claim it starts today.
  const timeLabel = (() => {
    if (event.allDay) return 'Egész nap';
    if (!spansDays || !day) return formatEventTime(event.start, event.end, event.allDay);
    if (isSameDay(event.start, day)) return `${formatTime(event.start)}-tól`;
    if (isSameDay(event.end, day)) return `${formatTime(event.end)}-ig`;
    return 'Egész nap';
  })();

  const upcomingSoon =
    !past && !running && !event.allDay && event.start.getTime() - now.getTime() < 3 * 3600_000;

  return (
    <Touch
      onPress={onPress}
      haptic="light"
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: t.spacing.md,
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: running ? withAlpha(event.color, t.isDark ? 0.18 : 0.1) : t.c.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: running ? withAlpha(event.color, 0.5) : t.c.border,
        opacity: past ? 0.55 : 1,
      }}>
      {/* Colour rail identifying the source calendar at a glance. */}
      <View
        style={{
          width: 4,
          borderRadius: 2,
          backgroundColor: event.color,
        }}
      />

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Txt variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {event.title}
          </Txt>
          {event.recurring ? (
            <Ionicons name="repeat" size={14} color={t.c.textFaint} />
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Txt variant="label" tone="muted">
            {timeLabel}
          </Txt>
          {running ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: t.radius.pill,
                backgroundColor: event.color,
              }}>
              <Txt variant="caption" style={{ color: '#FFFFFF' }}>
                MOST
              </Txt>
            </View>
          ) : null}
          {upcomingSoon ? (
            <Txt variant="label" tone="primary">
              {formatCountdown(event.start, now)}
            </Txt>
          ) : null}
        </View>

        {event.location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="location-outline" size={13} color={t.c.textFaint} />
            <Txt variant="label" tone="faint" numberOfLines={1} style={{ flex: 1 }}>
              {event.location}
            </Txt>
          </View>
        ) : null}
      </View>
    </Touch>
  );
}
