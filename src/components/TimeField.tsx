import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { useTheme } from '../theme';
import { formatTime } from '../utils/date';
import { Touch, Txt } from './ui';

/**
 * A tappable `08:30` that opens the platform's own picker.
 *
 * Android gets the imperative dialog, iOS the inline compact picker — both are
 * the control people already know, which beats anything custom we could draw.
 */
export function TimeField({
  value,
  onChange,
  disabled = false,
}: {
  /** Only the hour and minute are read; the date part is ignored. */
  value: Date;
  onChange: (hour: number, minute: number) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);

  const handle = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) return;
    onChange(date.getHours(), date.getMinutes());
  };

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        is24Hour: true,
        display: 'clock',
        onChange: handle,
      });
    } else {
      setIosOpen((prev) => !prev);
    }
  };

  if (Platform.OS === 'ios' && iosOpen) {
    return (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        locale="hu-HU"
        onChange={(event, date) => {
          handle(event, date);
          if (event.type === 'dismissed') setIosOpen(false);
        }}
      />
    );
  }

  return (
    <Touch
      onPress={open}
      scaleTo={0.94}
      style={{
        paddingHorizontal: t.spacing.md,
        paddingVertical: 6,
        borderRadius: t.radius.sm,
        backgroundColor: t.c.surfaceAlt,
        opacity: disabled ? 0.4 : 1,
      }}>
      <View>
        <Txt variant="heading" tone={disabled ? 'faint' : 'primary'}>
          {formatTime(value)}
        </Txt>
      </View>
    </Touch>
  );
}
