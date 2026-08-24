import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCalendar } from '../../src/calendar/store';
import { EventCard } from '../../src/components/EventCard';
import { MonthGrid } from '../../src/components/MonthGrid';
import { PermissionGate } from '../../src/components/PermissionGate';
import { Screen } from '../../src/components/Screen';
import { EmptyState, FadeIn, Touch, Txt } from '../../src/components/ui';
import { useNow } from '../../src/hooks/useNow';
import { useTheme } from '../../src/theme';
import {
  addMonths,
  dayKey,
  formatMonthYear,
  formatRelativeDay,
  isToday,
  startOfDay,
  startOfWeek,
} from '../../src/utils/date';

export default function MonthScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { eventsForDay, ensureRange, refresh, refreshing } = useCalendar();

  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  // Make sure the store has data for the month on screen plus its neighbours.
  useEffect(() => {
    ensureRange(startOfWeek(addMonths(month, -1)), addMonths(month, 2));
  }, [month, ensureRange]);

  const goToMonth = useCallback((delta: number) => {
    setMonth((prev) => addMonths(prev, delta));
  }, []);

  const goToToday = useCallback(() => {
    const today = startOfDay(new Date());
    setMonth(today);
    setSelected(today);
  }, []);

  // Horizontal swipe flips months, matching what the grid looks like it does.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          if (e.translationX <= -60) goToMonth(1);
          else if (e.translationX >= 60) goToMonth(-1);
        })
        .runOnJS(true),
    [goToMonth],
  );

  const selectedEvents = eventsForDay(selected);
  const showTodayButton = !isToday(selected) || month.getMonth() !== new Date().getMonth();

  return (
    <Screen>
      <PermissionGate>
        {/* ------------------------------------------------------- header -- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.spacing.lg,
            paddingBottom: t.spacing.md,
            gap: t.spacing.sm,
          }}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" tone="faint" style={{ letterSpacing: 1 }}>
              {formatRelativeDay(now).toUpperCase()}
            </Txt>
            <Txt variant="display">{formatMonthYear(month)}</Txt>
          </View>

          {showTodayButton ? (
            <Touch
              onPress={goToToday}
              style={{
                paddingHorizontal: t.spacing.md,
                paddingVertical: 7,
                borderRadius: t.radius.pill,
                backgroundColor: t.c.primarySoft,
              }}>
              <Txt variant="label" tone="primary">
                Ma
              </Txt>
            </Touch>
          ) : null}

          <Touch onPress={() => goToMonth(-1)} scaleTo={0.85} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={22} color={t.c.textMuted} />
          </Touch>
          <Touch onPress={() => goToMonth(1)} scaleTo={0.85} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={22} color={t.c.textMuted} />
          </Touch>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={t.c.primary}
              colors={[t.c.primary]}
            />
          }>
          {/* --------------------------------------------------- the grid -- */}
          <GestureDetector gesture={swipe}>
            <View
              style={{
                marginHorizontal: t.spacing.md,
                padding: t.spacing.md,
                borderRadius: t.radius.xl,
                backgroundColor: t.c.surface,
                ...t.elevate(1),
              }}>
              {/* Remounting on month change replays the fade, which reads as
                  a page turn without the cost of a real pager. */}
              <FadeIn key={dayKey(month)}>
                <MonthGrid
                  month={month}
                  selected={selected}
                  onSelect={(day) => {
                    setSelected(day);
                    if (day.getMonth() !== month.getMonth()) setMonth(day);
                  }}
                  eventsForDay={eventsForDay}
                />
              </FadeIn>
            </View>
          </GestureDetector>

          {/* ----------------------------------------- the selected day -- */}
          <View style={{ paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.xl }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: t.spacing.sm,
                marginBottom: t.spacing.md,
              }}>
              <Txt variant="title">{formatRelativeDay(selected)}</Txt>
              <Txt variant="label" tone="faint">
                {selectedEvents.length > 0 ? `${selectedEvents.length} program` : ''}
              </Txt>
            </View>

            {selectedEvents.length === 0 ? (
              <EmptyState
                icon="sunny-outline"
                title="Szabad nap"
                message="Erre a napra nincs beírt programod."
              />
            ) : (
              <View style={{ gap: t.spacing.sm }}>
                {selectedEvents.map((event, i) => (
                  <FadeIn key={`${event.id}-${event.start.getTime()}`} delay={i * 28}>
                    <EventCard
                      event={event}
                      now={now}
                      day={selected}
                      onPress={() =>
                        router.push({ pathname: '/event/[id]', params: { id: event.id } })
                      }
                    />
                  </FadeIn>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* ---------------------------------------------------------- FAB -- */}
        <Touch
          haptic="medium"
          onPress={() =>
            router.push({
              pathname: '/event/edit',
              params: { date: selected.toISOString() },
            })
          }
          style={{
            position: 'absolute',
            right: t.spacing.lg,
            bottom: insets.bottom + t.spacing.lg,
            width: 58,
            height: 58,
            borderRadius: 29,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.c.primary,
            ...t.elevate(6),
          }}>
          <Ionicons name="add" size={30} color={t.c.onPrimary} />
        </Touch>
      </PermissionGate>
    </Screen>
  );
}
