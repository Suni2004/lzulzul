import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readEvent } from '../../src/calendar/read';
import { useCalendar } from '../../src/calendar/store';
import { LOCAL_CALENDAR_ID, type EventDraft } from '../../src/calendar/types';
import { isLocalId } from '../../src/local/events';
import { DateTimeField } from '../../src/components/DateTimeField';
import { Screen } from '../../src/components/Screen';
import { Row, Section } from '../../src/components/Settings';
import { Button, Chip, Touch, Txt } from '../../src/components/ui';
import { useTheme } from '../../src/theme';
import { addMinutes, formatDuration, nextHalfHour, withDate } from '../../src/utils/date';

/** Default length of a freshly created event. */
const DEFAULT_DURATION_MINUTES = 60;

export default function EventEditScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { calendars, saveEvent } = useCalendar();

  const editing = Boolean(id);

  /** True while editing an event that lives in one of the phone's calendars. */
  const editingDeviceEvent = editing && id != null && !isLocalId(id);

  /** Only offered when moving an existing device event between calendars. */
  const deviceCalendars = useMemo(
    () => calendars.filter((c) => c.writable && c.id !== LOCAL_CALENDAR_ID),
    [calendars],
  );

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EventDraft | null>(null);

  // The form is seeded exactly once. This guard matters: the calendar store
  // hands back a fresh array on every reload, and Android fires an app-state
  // change whenever a native date picker opens — without it, re-seeding would
  // wipe whatever the user had already typed.
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    if (editing && id) {
      readEvent(id)
        .then((event) => {
          if (event) {
            setDraft({
              title: event.title,
              notes: event.notes,
              location: event.location,
              start: event.start,
              end: event.end,
              allDay: event.allDay,
              calendarId: event.calendarId,
            });
          }
        })
        .finally(() => setLoading(false));
      return;
    }

    const anchor = date ? new Date(date) : new Date();
    const start = withDate(nextHalfHour(), anchor);

    // The target calendar is filled in by the effect below, once the list
    // has actually loaded.
    setDraft({
      title: '',
      notes: '',
      location: '',
      start,
      end: addMinutes(start, DEFAULT_DURATION_MINUTES),
      allDay: false,
      calendarId: LOCAL_CALENDAR_ID,
    });
  }, [editing, id, date]);

  const patch = (changes: Partial<EventDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev));

  /** Moving the start drags the end with it, keeping the duration intact. */
  const setStart = (next: Date) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const delta = next.getTime() - prev.start.getTime();
      return { ...prev, start: next, end: new Date(prev.end.getTime() + delta) };
    });
  };

  const setEnd = (next: Date) => {
    setDraft((prev) => {
      if (!prev) return prev;
      // Never let the end fall before the start; nudge the start instead.
      if (next < prev.start) return { ...prev, start: next, end: next };
      return { ...prev, end: next };
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      Alert.alert('Hiányzó cím', 'Adj nevet az eseménynek.');
      return;
    }
    if (!draft.calendarId) {
      Alert.alert('Nincs írható naptár', 'A telefonodon nincs olyan naptár, amibe írni lehetne.');
      return;
    }

    setSaving(true);
    try {
      await saveEvent(draft, editing ? id : undefined);
      router.back();
    } catch (e) {
      Alert.alert('Nem sikerült menteni', e instanceof Error ? e.message : 'Ismeretlen hiba.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ------------------------------------------------------- header -- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.spacing.md,
            paddingBottom: t.spacing.md,
            gap: t.spacing.sm,
          }}>
          <Touch onPress={() => router.back()} scaleTo={0.85} style={{ padding: t.spacing.sm }}>
            <Ionicons name="close" size={26} color={t.c.text} />
          </Touch>
          <Txt variant="title" style={{ flex: 1 }}>
            {editing ? 'Esemény szerkesztése' : 'Új esemény'}
          </Txt>
          <Button
            label="Mentés"
            onPress={save}
            loading={saving}
            disabled={!draft?.title.trim()}
            style={{ minHeight: 40, paddingHorizontal: t.spacing.lg }}
          />
        </View>

        {loading || !draft ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.c.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.spacing.lg,
              paddingBottom: insets.bottom + t.spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled">
            {/* ------------------------------------------------------ title -- */}
            <TextInput
              value={draft.title}
              onChangeText={(title) => patch({ title })}
              placeholder="Mi lesz a program?"
              placeholderTextColor={t.c.textFaint}
              autoFocus={!editing}
              style={{
                color: t.c.text,
                fontSize: 24,
                fontWeight: '700',
                paddingVertical: t.spacing.md,
                marginBottom: t.spacing.lg,
              }}
            />

            {/* ------------------------------------------------------- when -- */}
            <Section
              title="Mikor"
              footer={
                draft.allDay
                  ? undefined
                  : `Hossza: ${formatDuration(draft.end.getTime() - draft.start.getTime())}`
              }>
              <Row
                label="Egész nap"
                right={
                  <Switch
                    value={draft.allDay}
                    onValueChange={(allDay) => patch({ allDay })}
                    trackColor={{ true: t.c.primary, false: t.c.surfaceAlt }}
                  />
                }
              />
              <Row
                label="Kezdés"
                right={
                  <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                    <DateTimeField value={draft.start} mode="date" onChange={setStart} />
                    {!draft.allDay ? (
                      <DateTimeField value={draft.start} mode="time" onChange={setStart} />
                    ) : null}
                  </View>
                }
              />
              <Row
                label="Vége"
                right={
                  <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                    <DateTimeField
                      value={draft.end}
                      mode="date"
                      onChange={setEnd}
                      minimumDate={draft.start}
                    />
                    {!draft.allDay ? (
                      <DateTimeField value={draft.end} mode="time" onChange={setEnd} />
                    ) : null}
                  </View>
                }
              />
            </Section>

            {/* ------------------------------------------------------ where -- */}
            <Section
              title="Részletek"
              footer="Ha megadsz helyszínt, az indulási figyelmeztetés is működik ennél az eseménynél.">
              <Row label="Helyszín">
                <TextInput
                  value={draft.location}
                  onChangeText={(location) => patch({ location })}
                  placeholder="Például: Iroda, Budapest"
                  placeholderTextColor={t.c.textFaint}
                  style={{
                    color: t.c.text,
                    fontSize: 15,
                    paddingVertical: t.spacing.sm,
                    paddingHorizontal: t.spacing.md,
                    borderRadius: t.radius.sm,
                    backgroundColor: t.c.surfaceAlt,
                  }}
                />
              </Row>
              <Row label="Jegyzet">
                <TextInput
                  value={draft.notes}
                  onChangeText={(notes) => patch({ notes })}
                  placeholder="Bármi, amire emlékezned kell"
                  placeholderTextColor={t.c.textFaint}
                  multiline
                  style={{
                    color: t.c.text,
                    fontSize: 15,
                    minHeight: 84,
                    textAlignVertical: 'top',
                    paddingVertical: t.spacing.sm,
                    paddingHorizontal: t.spacing.md,
                    borderRadius: t.radius.sm,
                    backgroundColor: t.c.surfaceAlt,
                  }}
                />
              </Row>
            </Section>

            {/* --------------------------------------------------- calendar -- */}
            {editingDeviceEvent && deviceCalendars.length > 1 ? (
              <Section
                title="Naptár"
                footer="Ez az esemény a telefonod naptárában van, ezért a módosítás ott is látszani fog.">
                <Row label="Melyik naptárban?">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
                    {deviceCalendars.map((calendar) => (
                      <Chip
                        key={calendar.id}
                        label={calendar.title}
                        color={calendar.color}
                        selected={draft.calendarId === calendar.id}
                        onPress={() => patch({ calendarId: calendar.id })}
                      />
                    ))}
                  </View>
                </Row>
              </Section>
            ) : !editingDeviceEvent ? (
              <Section title="Hova kerül">
                <Row
                  label="Csak a Napirendben"
                  hint="Ez az esemény az app saját tárolójában marad – a Samsung és a Google naptár nem látja."
                  right={<Ionicons name="lock-closed" size={18} color={t.c.primary} />}
                />
              </Section>
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
