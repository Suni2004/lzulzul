import React from 'react';
import { Linking, View } from 'react-native';

import { useCalendar } from '../calendar/store';
import { useTheme } from '../theme';
import { Button, EmptyState } from './ui';

/**
 * Renders its children once calendar access is granted, and an explanatory
 * prompt otherwise. Every tab wraps its content in this.
 */
export function PermissionGate({ children }: { children: React.ReactNode }) {
  const { permission, requestAccess } = useCalendar();
  const t = useTheme();

  if (permission === 'granted') return <>{children}</>;

  if (permission === 'unknown') {
    // Still checking — render nothing rather than flashing a scary prompt.
    return <View style={{ flex: 1, backgroundColor: t.c.bg }} />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        icon="lock-closed-outline"
        title="Hozzáférés a naptáradhoz"
        message={
          'A Napirend a telefonod meglévő naptáraiból dolgozik – nem hoz létre külön ' +
          'adatbázist, és semmit nem küld el sehova. Ehhez kell egy engedély.'
        }
        action={
          <View style={{ gap: t.spacing.sm, alignSelf: 'stretch' }}>
            <Button
              label="Engedélyezem"
              icon="checkmark-circle-outline"
              onPress={() => {
                void requestAccess();
              }}
            />
            <Button
              label="Megnyitás a beállításokban"
              variant="ghost"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          </View>
        }
      />
    </View>
  );
}
