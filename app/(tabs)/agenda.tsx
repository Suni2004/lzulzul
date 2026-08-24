import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, SectionList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCalendar } from '../../src/calendar/store';
import type { CalEvent } from '../../src/calendar/types';
import { EventCard } from '../../src/components/EventCard';
import { PermissionGate } from '../../src/components/PermissionGate';
import { Screen } from '../../src/components/Screen';
import { EmptyState, Touch, Txt } from '../../src/components/ui';
import { useNow } from '../../src/hooks/useNow';
import { useTheme } from '../../src/theme';
import {
  addDays,
  dayKey,
  formatRelativeDay,
  formatShortDate,
  isToday,
  startOfDay,
} from '../../src/utils/date';
import { matches } from '../../src/utils/text';

/** How far ahead the agenda looks. */
const HORIZON_DAYS = 60;

type Section = { key: string; day: Date; data: CalEvent[] };

export default function AgendaScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { eventsForDay, refresh, refreshing } = useCalendar();

  const [query, setQuery] = useState('');

  const sections = useMemo<Section[]>(() => {
    const today = startOfDay(now);
    const out: Section[] = [];

    for (let i = 0; i < HORIZON_DAYS; i++) {
      const day = addDays(today, i);
      const events = eventsForDay(day)
        // On today, everything already finished is noise.
        .filter((e) => (i > 0 ? true : e.end.getTime() >= now.getTime()))
        .filter((e) => matches(`${e.title} ${e.location} ${e.notes}`, query));

      if (events.length > 0) out.push({ key: dayKey(day), day, data: events });
    }
    return out;
  }, [eventsForDay, now, query]);

  const total = sections.reduce((sum, s) => sum + s.data.length, 0);

  return (
    <Screen>
      <PermissionGate>
        <View style={{ paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.md }}>
          <Txt variant="display">Napirend</Txt>
          <Txt variant="label" tone="faint">
            {query.trim()
              ? `${total} találat`
              : total > 0
                ? `${total} program a következő ${HORIZON_DAYS} napban`
                : 'A következő két hónapod szabad'}
          </Txt>
        </View>

        {/* ------------------------------------------------------- search -- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            marginHorizontal: t.spacing.lg,
            marginBottom: t.spacing.md,
            paddingHorizontal: t.spacing.md,
            height: 42,
            borderRadius: t.radius.md,
            backgroundColor: t.c.surfaceAlt,
          }}>
          <Ionicons name="search" size={17} color={t.c.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Keresés a programok között"
            placeholderTextColor={t.c.textFaint}
            style={{ flex: 1, color: t.c.text, fontSize: 15, padding: 0 }}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Touch onPress={() => setQuery('')} scaleTo={0.85} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={17} color={t.c.textFaint} />
            </Touch>
          ) : null}
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.id}-${item.start.getTime()}`}
          stickySectionHeadersEnabled
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingBottom: insets.bottom + t.spacing.xxl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={t.c.primary}
              colors={[t.c.primary]}
            />
          }
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: t.spacing.sm,
                paddingTop: t.spacing.lg,
                paddingBottom: t.spacing.sm,
                backgroundColor: t.c.bg,
              }}>
              <Txt
                variant="heading"
                tone={isToday(section.day) ? 'primary' : 'default'}>
                {formatRelativeDay(section.day)}
              </Txt>
              <Txt variant="label" tone="faint">
                {formatShortDate(section.day)}
              </Txt>
            </View>
          )}
          renderItem={({ item, section }) => (
            <View style={{ paddingBottom: t.spacing.sm }}>
              <EventCard
                event={item}
                now={now}
                day={section.day}
                onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={query.trim() ? 'search-outline' : 'cafe-outline'}
              title={query.trim() ? 'Nincs találat' : 'Tiszta a naptárad'}
              message={
                query.trim()
                  ? 'Próbálj más kifejezést, vagy töröld a keresést.'
                  : 'A következő két hónapban nincs beírt programod.'
              }
            />
          }
        />
      </PermissionGate>
    </Screen>
  );
}
