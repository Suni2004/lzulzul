import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Txt } from './ui';

/** A titled group of rows, rendered as one rounded card. */
export function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={{ marginBottom: t.spacing.xl }}>
      <Txt
        variant="caption"
        tone="faint"
        style={{ letterSpacing: 1, marginBottom: t.spacing.sm, marginLeft: t.spacing.xs }}>
        {title.toUpperCase()}
      </Txt>

      <View
        style={{
          borderRadius: t.radius.lg,
          backgroundColor: t.c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.c.border,
          overflow: 'hidden',
        }}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: t.c.border,
                  marginLeft: t.spacing.lg,
                }}
              />
            ) : null}
            {row}
          </View>
        ))}
      </View>

      {footer ? (
        <Txt
          variant="label"
          tone="faint"
          style={{ marginTop: t.spacing.sm, marginHorizontal: t.spacing.xs }}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

/** One line inside a `Section`: label on the left, a control on the right. */
export function Row({
  label,
  hint,
  right,
  children,
}: {
  /** Omit for a row that is nothing but a full-width control. */
  label?: string;
  hint?: string;
  right?: React.ReactNode;
  /** Rendered under the label — for chip groups and other wide controls. */
  children?: React.ReactNode;
}) {
  const t = useTheme();
  const hasHeader = Boolean(label || hint || right);

  return (
    <View style={{ paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md }}>
      {hasHeader ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            {label ? (
              <Txt variant="body" weight="500">
                {label}
              </Txt>
            ) : null}
            {hint ? (
              <Txt variant="label" tone="faint" style={{ marginTop: label ? 2 : 0 }}>
                {hint}
              </Txt>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children ? (
        <View style={{ marginTop: hasHeader ? t.spacing.md : 0 }}>{children}</View>
      ) : null}
    </View>
  );
}
