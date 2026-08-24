import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CalEvent } from '../calendar/types';
import { useTheme } from '../theme';
import {
  WEEKDAYS_SHORT,
  dayKey,
  isSameDay,
  isToday,
  isWeekend,
  monthGrid,
} from '../utils/date';
import { Touch, Txt } from './ui';

/** How many colour dots a cell shows before switching to a "+n" marker. */
const MAX_DOTS = 3;

function DayCell({
  day,
  inMonth,
  selected,
  events,
  onPress,
}: {
  day: Date;
  inMonth: boolean;
  selected: boolean;
  events: CalEvent[];
  onPress: (day: Date) => void;
}) {
  const t = useTheme();
  const today = isToday(day);

  // Distinct calendar colours read better than one dot per event.
  const dots = useMemo(() => {
    const seen: string[] = [];
    for (const e of events) {
      if (!seen.includes(e.color)) seen.push(e.color);
      if (seen.length >= MAX_DOTS) break;
    }
    return seen;
  }, [events]);

  const numberColor = selected
    ? t.c.onPrimary
    : !inMonth
      ? t.c.textFaint
      : today
        ? t.c.primary
        : isWeekend(day)
          ? t.c.weekend
          : t.c.text;

  return (
    <Touch
      onPress={() => onPress(day)}
      haptic="light"
      scaleTo={0.9}
      style={{
        flex: 1,
        aspectRatio: 0.92,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? t.c.primary : 'transparent',
          borderWidth: today && !selected ? 1.5 : 0,
          borderColor: t.c.primary,
        }}>
        <Txt
          variant="body"
          weight={today || selected ? '700' : '500'}
          style={{ color: numberColor }}>
          {day.getDate()}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' }}>
        {dots.map((color, i) => (
          <View
            key={`${color}-${i}`}
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: selected ? t.c.primary : color,
              opacity: inMonth ? 1 : 0.4,
            }}
          />
        ))}
      </View>
    </Touch>
  );
}

export function MonthGrid({
  month,
  selected,
  onSelect,
  eventsForDay,
}: {
  /** Any date inside the month to render. */
  month: Date;
  selected: Date;
  onSelect: (day: Date) => void;
  eventsForDay: (day: Date) => CalEvent[];
}) {
  const t = useTheme();
  const days = useMemo(
    () => monthGrid(month.getFullYear(), month.getMonth()),
    [month],
  );

  const weeks = useMemo(() => {
    const out: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', paddingBottom: t.spacing.xs }}>
        {WEEKDAYS_SHORT.map((label, i) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Txt
              variant="caption"
              style={{ color: i >= 5 ? t.c.weekend : t.c.textFaint, letterSpacing: 0.6 }}>
              {label.toUpperCase()}
            </Txt>
          </View>
        ))}
      </View>

      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: t.c.border,
          marginBottom: t.spacing.xs,
        }}
      />

      {weeks.map((week) => (
        <View key={dayKey(week[0])} style={{ flexDirection: 'row' }}>
          {week.map((day) => (
            <DayCell
              key={dayKey(day)}
              day={day}
              inMonth={day.getMonth() === month.getMonth()}
              selected={isSameDay(day, selected)}
              events={eventsForDay(day)}
              onPress={onSelect}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
