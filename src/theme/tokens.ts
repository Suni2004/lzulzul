/**
 * The single source of truth for colour, spacing and type in the app.
 *
 * Everything is expressed as a token so that the light and dark palettes stay
 * structurally identical — a screen only ever asks for `c.text` or `c.surface`
 * and gets the right value for the active scheme.
 */

export type ColorScheme = 'light' | 'dark';

export type Colors = {
  /** Page background, behind everything else. */
  bg: string;
  /** Slightly raised background used behind the month grid. */
  bgAlt: string;
  /** Cards, sheets and list rows. */
  surface: string;
  /** Pressed / secondary fills inside a surface. */
  surfaceAlt: string;
  /** Hairlines and dividers. */
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Brand colour: today, primary buttons, active tab. */
  primary: string;
  /** Text and icons drawn on top of `primary`. */
  onPrimary: string;
  /** Tinted background for selected states. */
  primarySoft: string;
  accent: string;
  danger: string;
  /** Colour of a weekend column heading. */
  weekend: string;
  /** Shadow colour for elevated surfaces. */
  shadow: string;
};

const light: Colors = {
  bg: '#F6F6FB',
  bgAlt: '#EFEFF6',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F8',
  border: 'rgba(18, 18, 43, 0.08)',
  text: '#14142B',
  textMuted: '#63637D',
  textFaint: '#9A9AB0',
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  primarySoft: '#ECEAFE',
  accent: '#FB7185',
  danger: '#E11D48',
  weekend: '#E11D48',
  shadow: '#1B1B3A',
};

const dark: Colors = {
  bg: '#0B0B14',
  bgAlt: '#101019',
  surface: '#171722',
  surfaceAlt: '#22222F',
  border: 'rgba(255, 255, 255, 0.09)',
  text: '#F3F3F8',
  textMuted: '#A0A0B8',
  textFaint: '#6E6E88',
  primary: '#8B84FF',
  onPrimary: '#0B0B14',
  primarySoft: '#252143',
  accent: '#FB7185',
  danger: '#FB7185',
  weekend: '#FB7185',
  shadow: '#000000',
};

export const palettes: Record<ColorScheme, Colors> = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
} as const;

/** Cross-platform elevation. `level` roughly matches Android's dp elevation. */
export function elevation(level: number, shadow: string) {
  return {
    shadowColor: shadow,
    shadowOpacity: 0.14,
    shadowRadius: level * 1.6,
    shadowOffset: { width: 0, height: level * 0.6 },
    elevation: level,
  };
}
