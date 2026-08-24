import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { CURRENT_BUILD } from '../update';
import { useUpdate } from '../update/store';
import { Button, Txt } from './ui';

/**
 * Elavult build esetén mindent eltakaró, nem elutasítható képernyő.
 *
 * Szándékosan nincs rajta „Később" gomb: a felhasználó ezt kérte kötelező
 * frissítésként. Cserébe a mögötte lévő ellenőrzés hibatűrő — hálózati hiba
 * vagy hiányos verzióleíró soha nem hozza elő ezt a képernyőt.
 */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { latest, outdated } = useUpdate();

  if (!outdated || !latest) return <>{children}</>;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.c.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: t.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.spacing.lg,
      }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.c.primarySoft,
        }}>
        <Ionicons name="cloud-download-outline" size={38} color={t.c.primary} />
      </View>

      <Txt variant="display" style={{ textAlign: 'center' }}>
        Új verzió érhető el
      </Txt>

      <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
        A Napirend használatához frissítened kell a legújabb változatra.
      </Txt>

      {latest.notes ? (
        <View
          style={{
            alignSelf: 'stretch',
            padding: t.spacing.lg,
            borderRadius: t.radius.md,
            backgroundColor: t.c.surfaceAlt,
          }}>
          <Txt variant="label" tone="muted">
            {latest.notes}
          </Txt>
        </View>
      ) : null}

      <View style={{ alignSelf: 'stretch', gap: t.spacing.sm, marginTop: t.spacing.md }}>
        <Button
          label="Frissítés letöltése"
          icon="download-outline"
          onPress={() => {
            Linking.openURL(latest.apkUrl).catch(() => {});
          }}
        />
      </View>

      <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        Jelenlegi: 1.0.{CURRENT_BUILD} · Elérhető: {latest.version}
      </Txt>

      <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        A letöltés után nyisd meg a fájlt; a régi verzió fölé települ.
      </Txt>
    </View>
  );
}
