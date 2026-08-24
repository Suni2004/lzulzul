/** Small colour helpers — no dependency, just enough for event chips. */

const FALLBACK_HUES = [
  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B',
  '#FB7185', '#8B5CF6', '#14B8A6', '#EF4444',
];

/** Normalises whatever the OS hands back into `#rrggbb`, or `null`. */
export function normalizeHex(input?: string | number | null): string | null {
  if (input == null) return null;

  // Android sometimes reports calendar colours as a signed 32-bit ARGB int.
  if (typeof input === 'number') {
    const rgb = (input >>> 0) & 0xffffff;
    return `#${rgb.toString(16).padStart(6, '0')}`;
  }

  const value = input.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(value)) return `#${value.slice(3).toLowerCase()}`;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [r, g, b] = value.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/** A stable colour for a calendar that did not report one. */
export function fallbackColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return FALLBACK_HUES[Math.abs(hash) % FALLBACK_HUES.length];
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Perceived brightness, 0–255. Used to pick readable text on a chip. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function readableTextOn(hex: string): string {
  return luminance(hex) > 150 ? '#14142B' : '#FFFFFF';
}

/** `#4f46e5` + 0.14 → `rgba(79, 70, 229, 0.14)`, for tinted backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Lightens or darkens a colour so a calendar's own hue stays legible against
 * the current background. `amount` is -1 (black) … 1 (white).
 */
export function shift(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const [r, g, b] = channels(hex).map((c) => Math.round(c + (target - c) * t));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
