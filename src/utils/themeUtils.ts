export type NetlabColorMode = 'light' | 'dark';

/**
 * Derives the React Flow color mode from a hex background token.
 * Invalid or unsupported values fall back to dark mode.
 */
export function resolveColorMode(bgPrimary: string): NetlabColorMode {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(bgPrimary.trim());

  if (!match) {
    return 'dark';
  }

  const hex = match[1];
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 128 ? 'light' : 'dark';
}
