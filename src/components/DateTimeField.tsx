import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { useTheme } from '../theme';
import { formatShortDate, formatTime, WEEKDAYS_LONG, weekdayIndex } from '../utils/date';
import { Touch, Txt } from './ui';

/**
 * A date or time button that opens the platform picker.
 *
 * Both halves of a start/end pair use this, so a full timestamp is edited as
 * two obvious taps rather than one fiddly combined control.
 */
export function DateTimeField({
  value,
  mode,
  onChange,
  minimumDate,
}: {
  value: Date;
  mode: 'date' | 'time';
  onChange: (next: Date) => void;
  minimumDate?: Date;
}) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);

  const handle = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type !== 'set' || !picked) return;

    // Only take the half of the timestamp this field is responsible for.
    const next = new Date(value);
    if (mode === 'date') {
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    } else {
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    }
    onChange(next);
  };

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        minimumDate,
        onChange: handle,
      });
    } else {
      setIosOpen(true);
    }
  };

  const label =
    mode === 'date'
      ? `${formatShortDate(value)} ${WEEKDAYS_LONG[weekdayIndex(value)].slice(0, 3)}.`
      : formatTime(value);

  return (
    <View>
      <Touch
        onPress={open}
        scaleTo={0.95}
        style={{
          paddingHorizontal: t.spacing.md,
          paddingVertical: 9,
          borderRadius: t.radius.sm,
          backgroundColor: t.c.surfaceAlt,
          minWidth: mode === 'time' ? 74 : 0,
          alignItems: 'center',
        }}>
        <Txt variant="body" weight="600">
          {label}
        </Txt>
      </Touch>

      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display={mode === 'date' ? 'inline' : 'spinner'}
          locale="hu-HU"
          minimumDate={minimumDate}
          onChange={(event, picked) => {
            handle(event, picked);
            setIosOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
