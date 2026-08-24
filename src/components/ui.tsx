/**
 * The small set of primitives every screen is built from.
 * Keeping them here is what makes the app feel like one piece of software
 * rather than a pile of screens.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';

/* ------------------------------------------------------------------ text -- */

type Variant = keyof ReturnType<typeof useTheme>['font'];
type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'danger' | 'onPrimary';

export type TxtProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Convenience for the very common "make this one bolder" case. */
  weight?: TextStyle['fontWeight'];
};

export function Txt({ variant = 'body', tone = 'default', weight, style, ...rest }: TxtProps) {
  const t = useTheme();
  const toneColor: Record<Tone, string> = {
    default: t.c.text,
    muted: t.c.textMuted,
    faint: t.c.textFaint,
    primary: t.c.primary,
    danger: t.c.danger,
    onPrimary: t.c.onPrimary,
  };
  return (
    <Text
      style={[
        t.font[variant] as TextStyle,
        { color: toneColor[tone] },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    />
  );
}

/* -------------------------------------------------------------- pressable -- */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TouchProps = PressableProps & {
  /** Haptic feedback on press-in. `false` for high-frequency taps. */
  haptic?: false | 'light' | 'medium';
  /** How far the surface dips while held. */
  scaleTo?: number;
  style?: ViewStyle | ViewStyle[];
};

/** A pressable that dips and springs back — used for every tappable surface. */
export function Touch({
  haptic = 'light',
  scaleTo = 0.97,
  style,
  onPressIn,
  children,
  ...rest
}: TouchProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[style as ViewStyle, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        if (haptic) {
          const strength =
            haptic === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
          Haptics.impactAsync(strength).catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
      }}
      {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}

/* ------------------------------------------------------------------ card -- */

export type CardProps = ViewProps & {
  /** 0 renders flat, higher values lift the card off the background. */
  level?: number;
  padded?: boolean;
};

export function Card({ level = 1, padded = true, style, ...rest }: CardProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.c.surface,
          borderRadius: t.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.c.border,
          padding: padded ? t.spacing.lg : 0,
        },
        level > 0 ? t.elevate(level) : null,
        style,
      ]}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ chip -- */

export function Chip({
  label,
  color,
  selected = false,
  onPress,
}: {
  label: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const tint = color ?? t.c.primary;
  const Wrapper: React.ElementType = onPress ? Touch : View;

  return (
    <Wrapper
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: t.spacing.md,
        paddingVertical: 7,
        borderRadius: t.radius.pill,
        backgroundColor: selected ? tint : t.c.surfaceAlt,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? tint : t.c.border,
      }}>
      {color ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: selected ? t.c.onPrimary : tint,
          }}
        />
      ) : null}
      <Txt variant="label" style={{ color: selected ? t.c.onPrimary : t.c.textMuted }}>
        {label}
      </Txt>
    </Wrapper>
  );
}

/* ---------------------------------------------------------------- button -- */

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();

  const skin = {
    primary: { bg: t.c.primary, fg: t.c.onPrimary, border: 'transparent' },
    secondary: { bg: t.c.surfaceAlt, fg: t.c.text, border: t.c.border },
    ghost: { bg: 'transparent', fg: t.c.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: t.c.danger, border: t.c.border },
  }[variant];

  const inactive = disabled || loading;

  return (
    <Touch
      onPress={inactive ? undefined : onPress}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.spacing.sm,
          minHeight: 50,
          paddingHorizontal: t.spacing.xl,
          borderRadius: t.radius.md,
          backgroundColor: skin.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: skin.border,
          opacity: inactive ? 0.5 : 1,
        },
        style as ViewStyle,
      ]}>
      {loading ? (
        <ActivityIndicator color={skin.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={skin.fg} /> : null}
          <Txt variant="heading" style={{ color: skin.fg }}>
            {label}
          </Txt>
        </>
      )}
    </Touch>
  );
}

/* ------------------------------------------------------------------ misc -- */

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: t.c.border,
        marginLeft: inset,
      }}
    />
  );
}

/** Centred icon + copy, used for every "nothing here" and error state. */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: t.spacing.xxl, paddingHorizontal: t.spacing.xl, gap: t.spacing.sm }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.c.primarySoft,
          marginBottom: t.spacing.xs,
        }}>
        <Ionicons name={icon} size={28} color={t.c.primary} />
      </View>
      <Txt variant="heading">{title}</Txt>
      {message ? (
        <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {message}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: t.spacing.md }}>{action}</View> : null}
    </View>
  );
}

/** Fades and slides its children in — used for list content after a load. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 260 }));
  }, [progress, delay]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
