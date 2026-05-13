import type { NetlabTheme } from './index';

/**
 * Palette axis — chooses a flavor of the semantic accent colors.
 *
 * The base theme (dark/light) drives backgrounds, borders, and text.
 * The palette only redefines the `accent*` channel: studio is the current
 * saturated NetlabApp default, academic is a desaturated set tuned for
 * projector and print-friendly use.
 */
export type NetlabPalette = 'studio' | 'academic';

type AccentOverrides = Partial<
  Pick<
    NetlabTheme,
    'accentBlue' | 'accentGreen' | 'accentRed' | 'accentOrange' | 'accentYellow' | 'accentCyan'
  >
>;

/**
 * Palette → accent overrides. The studio palette is empty (it keeps the
 * accents from the base theme — i.e. the current behavior before the
 * palette axis existed). The academic palette muts the saturated set
 * toward primary-color territory.
 */
export const NETLAB_PALETTES: Record<NetlabPalette, AccentOverrides> = {
  studio: {},
  academic: {
    accentGreen: '#2f7d62',
    accentCyan: '#356dab',
    accentBlue: '#4a64b3',
    accentYellow: '#a26b00',
    accentOrange: '#c45a14',
    accentRed: '#a83a2e',
  },
};

export function paletteOverrides(palette: NetlabPalette): AccentOverrides {
  return NETLAB_PALETTES[palette] ?? {};
}
