/**
 * Resolves the active colour scheme from the user's preference plus the OS
 * setting, and hands the matching palette to the tree.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '../settings/store';
import {
  type ColorScheme,
  type Colors,
  elevation,
  font,
  palettes,
  radius,
  spacing,
} from './tokens';

export type Theme = {
  scheme: ColorScheme;
  isDark: boolean;
  c: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  font: typeof font;
  elevate: (level: number) => ReturnType<typeof elevation>;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const theme = useMemo<Theme>(() => {
    const scheme: ColorScheme =
      settings.theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.theme;
    const c = palettes[scheme];
    return {
      scheme,
      isDark: scheme === 'dark',
      c,
      spacing,
      radius,
      font,
      elevate: (level: number) => elevation(level, c.shadow),
    };
  }, [settings.theme, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

export * from './tokens';
