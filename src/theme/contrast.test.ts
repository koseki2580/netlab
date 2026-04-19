import { describe, expect, it } from 'vitest';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME } from './index';

// ---------------------------------------------------------------------------
// WCAG 2.1 relative luminance and contrast ratio helpers
// ---------------------------------------------------------------------------

/** Convert a single sRGB channel value (0–255) to linear light. */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Parse a #rrggbb hex color and return relative luminance (0–1). */
function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 2.1 contrast ratio for two hex colors.
 * Handles rgba() by ignoring alpha (worst-case alpha = 1 assumed).
 */
export function contrastRatio(fg: string, bg: string): number {
  // Strip rgba prefix if present (take only the rgb channels, ignore alpha)
  const clean = (c: string) =>
    c.startsWith('rgba')
      ? `#${c.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+).*\)/, (_m, r, g, b) => [r, g, b].map((x) => parseInt(x).toString(16).padStart(2, '0')).join(''))}`
      : c;
  const L1 = luminance(clean(fg));
  const L2 = luminance(clean(bg));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.each([
  ['dark', NETLAB_DARK_THEME],
  ['light', NETLAB_LIGHT_THEME],
] as const)('%s theme', (_name, theme) => {
  // WCAG AA: ≥ 4.5 for normal text, ≥ 3 for large text / UI components
  it.each([
    ['textPrimary on bgPrimary (normal text, ≥4.5)', theme.textPrimary, theme.bgPrimary, 4.5],
    ['textSecondary on bgPrimary (normal text, ≥4.5)', theme.textSecondary, theme.bgPrimary, 4.5],
    ['textPrimary on bgSurface (normal text, ≥4.5)', theme.textPrimary, theme.bgSurface, 4.5],
    // textMuted is used for hint/secondary text — WCAG AA normal text (≥4.5)
    ['textMuted on bgPrimary (normal text, ≥4.5)', theme.textMuted, theme.bgPrimary, 4.5],
    ['textMuted on bgSurface (normal text, ≥4.5)', theme.textMuted, theme.bgSurface, 4.5],
  ])('%s', (_label, fg, bg, minRatio) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minRatio);
  });
});
