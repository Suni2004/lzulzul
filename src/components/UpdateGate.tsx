import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { CURRENT_BUILD } from '../update';
import {
  downloadAndInstall,
  formatBytes,
  openInBrowser,
  type DownloadProgress,
} from '../update/installer';
import { useUpdate } from '../update/store';
import { Button, Touch, Txt } from './ui';

type Phase =
  | { kind: 'idle' }
  | { kind: 'downloading'; progress: DownloadProgress }
  | { kind: 'installing' }
  | { kind: 'error'; message: string };

/** Vékony folyamatsáv; határozatlan állapotban teljesen kitölt. */
function ProgressBar({ ratio }: { ratio: number | null }) {
  const t = useTheme();
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: t.c.surfaceAlt,
        overflow: 'hidden',
      }}>
      <View
        style={{
          height: '100%',
          width: ratio == null ? '100%' : `${Math.round(ratio * 100)}%`,
          borderRadius: 3,
          backgroundColor: t.c.primary,
          opacity: ratio == null ? 0.5 : 1,
        }}
      />
    </View>
  );
}

/**
 * Elavult build esetén mindent eltakaró, nem elutasítható képernyő.
 *
 * A letöltést az app maga végzi, mert a böngészőre bízva több Android
 * böngésző elhasal az APK mentésénél. Ha a beépített út mégsem járható,
 * marad a böngészős tartalék.
 *
 * Szándékosan nincs „Később" gomb: a felhasználó ezt kérte kötelező
 * frissítésként. Cserébe a mögötte lévő ellenőrzés hibatűrő — hálózati hiba
 * vagy hiányos verzióleíró soha nem hozza elő ezt a képernyőt.
 */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { latest, outdated } = useUpdate();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  if (!outdated || !latest) return <>{children}</>;

  const start = async () => {
    setPhase({ kind: 'downloading', progress: { ratio: null, bytesWritten: 0, bytesTotal: 0 } });

    const outcome = await downloadAndInstall(latest.apkUrl, latest.build, (progress) =>
      setPhase({ kind: 'downloading', progress }),
    );

    if (outcome.status === 'installer-opened') setPhase({ kind: 'installing' });
    else setPhase({ kind: 'error', message: outcome.reason });
  };

  const busy = phase.kind === 'downloading';

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
        <Ionicons
          name={phase.kind === 'installing' ? 'checkmark-circle-outline' : 'cloud-download-outline'}
          size={38}
          color={t.c.primary}
        />
      </View>

      <Txt variant="display" style={{ textAlign: 'center' }}>
        {phase.kind === 'installing' ? 'Letöltve' : 'Új verzió érhető el'}
      </Txt>

      <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {phase.kind === 'installing'
          ? 'Megnyílt az Android telepítője. Ha nem látod, húzd le az értesítési sávot.'
          : 'A Napirend használatához frissítened kell a legújabb változatra.'}
      </Txt>

      {latest.notes && phase.kind === 'idle' ? (
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

      {busy ? (
        <View style={{ alignSelf: 'stretch', gap: t.spacing.sm }}>
          <ProgressBar ratio={phase.progress.ratio} />
          <Txt variant="label" tone="muted" style={{ textAlign: 'center' }}>
            {phase.progress.bytesTotal > 0
              ? `${formatBytes(phase.progress.bytesWritten)} / ${formatBytes(phase.progress.bytesTotal)} MB`
              : 'Letöltés…'}
          </Txt>
        </View>
      ) : null}

      {phase.kind === 'error' ? (
        <View
          style={{
            alignSelf: 'stretch',
            padding: t.spacing.lg,
            borderRadius: t.radius.md,
            backgroundColor: t.c.surfaceAlt,
            borderLeftWidth: 3,
            borderLeftColor: t.c.danger,
          }}>
          <Txt variant="label" tone="danger">
            A letöltés nem sikerült
          </Txt>
          <Txt variant="label" tone="muted" style={{ marginTop: 4 }}>
            {phase.message}
          </Txt>
        </View>
      ) : null}

      <View style={{ alignSelf: 'stretch', gap: t.spacing.sm, marginTop: t.spacing.md }}>
        {phase.kind !== 'installing' ? (
          <Button
            label={phase.kind === 'error' ? 'Újra' : 'Frissítés letöltése'}
            icon="download-outline"
            loading={busy}
            onPress={() => {
              void start();
            }}
          />
        ) : (
          <Button
            label="Telepítő újranyitása"
            icon="open-outline"
            onPress={() => {
              void start();
            }}
          />
        )}

        {/* Tartalék, ha a beépített telepítés bármiért nem járható. */}
        {phase.kind === 'error' ? (
          <Touch
            onPress={() => {
              void openInBrowser(latest.apkUrl);
            }}
            style={{ alignItems: 'center', padding: t.spacing.md }}>
            <Txt variant="label" tone="primary">
              Megnyitás böngészőben
            </Txt>
          </Touch>
        ) : null}
      </View>

      <Txt variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        Jelenlegi: 1.0.{CURRENT_BUILD} · Elérhető: {latest.version}
      </Txt>
    </View>
  );
}
