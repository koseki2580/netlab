import { describe, expect, it } from 'vitest';
import {
  NETLAB_DARK_THEME,
  NETLAB_DENSITIES,
  NETLAB_LIGHT_THEME,
  NETLAB_PALETTES,
  themeToVars,
} from './index';
import { ACADEMIC_DARK_ACCENTS, CBSAFE_ACCENTS } from './palettes';

describe('themeToVars', () => {
  it('includes node background tokens from the built-in themes', () => {
    expect(NETLAB_DARK_THEME).toMatchObject({
      nodeRouterBg: '#0f2a1a',
      nodeSwitchBg: '#0d1f3c',
      nodeClientBg: '#0d1a2e',
      nodeServerBg: '#0a1f14',
      accentOrange: '#f59e0b',
    });

    expect(NETLAB_LIGHT_THEME).toMatchObject({
      nodeRouterBg: '#f0fdf4',
      nodeSwitchBg: '#eff6ff',
      nodeClientBg: '#f0f9ff',
      nodeServerBg: '#f0fdf4',
      accentOrange: '#9a3412',
    });

    expect(themeToVars(NETLAB_LIGHT_THEME)).toMatchObject({
      '--netlab-node-router-bg': '#f0fdf4',
      '--netlab-node-switch-bg': '#eff6ff',
      '--netlab-node-client-bg': '#f0f9ff',
      '--netlab-node-server-bg': '#f0fdf4',
      '--netlab-accent-orange': '#9a3412',
    });
  });

  it('emits the accent-purple token from base, academic, and cbsafe (P8)', () => {
    expect(themeToVars(NETLAB_DARK_THEME)).toMatchObject({
      '--netlab-accent-purple': '#bfa2fb',
    });
    expect(themeToVars(NETLAB_LIGHT_THEME)).toMatchObject({
      '--netlab-accent-purple': '#6d28d9',
    });
    expect(themeToVars(NETLAB_DARK_THEME, { palette: 'academic' })).toMatchObject({
      '--netlab-accent-purple': ACADEMIC_DARK_ACCENTS.accentPurple,
    });
    expect(themeToVars(NETLAB_LIGHT_THEME, { palette: 'academic' })).toMatchObject({
      '--netlab-accent-purple': NETLAB_PALETTES.academic.accentPurple,
    });
    expect(themeToVars(NETLAB_DARK_THEME, { colorBlindSafe: 'on' })).toMatchObject({
      '--netlab-accent-purple': CBSAFE_ACCENTS.accentPurple,
    });
  });

  it('omits density tokens when no density axis is supplied (backwards compatible)', () => {
    const vars = themeToVars(NETLAB_DARK_THEME) as Record<string, string | undefined>;
    expect(vars['--netlab-pad']).toBeUndefined();
    expect(vars['--netlab-gap']).toBeUndefined();
    expect(vars['--netlab-font']).toBeUndefined();
  });

  it('overrides accent channel when palette = academic', () => {
    const studio = themeToVars(NETLAB_DARK_THEME, { palette: 'studio' });
    const academic = themeToVars(NETLAB_DARK_THEME, { palette: 'academic' });
    expect(studio).toMatchObject({
      '--netlab-accent-green': NETLAB_DARK_THEME.accentGreen,
      '--netlab-accent-cyan': NETLAB_DARK_THEME.accentCyan,
    });
    expect(academic).toMatchObject({
      '--netlab-accent-green': ACADEMIC_DARK_ACCENTS.accentGreen,
      '--netlab-accent-cyan': ACADEMIC_DARK_ACCENTS.accentCyan,
      '--netlab-accent-blue': ACADEMIC_DARK_ACCENTS.accentBlue,
    });
  });

  it('remaps red/green/yellow accents when colorBlindSafe is on (M6)', () => {
    const normal = themeToVars(NETLAB_DARK_THEME) as Record<string, string | undefined>;
    const cbsafe = themeToVars(NETLAB_DARK_THEME, { colorBlindSafe: 'on' }) as Record<
      string,
      string | undefined
    >;
    expect(normal['--netlab-accent-red']).toBe(NETLAB_DARK_THEME.accentRed);
    expect(cbsafe).toMatchObject({
      '--netlab-accent-red': CBSAFE_ACCENTS.accentRed,
      '--netlab-accent-green': CBSAFE_ACCENTS.accentGreen,
      '--netlab-accent-yellow': CBSAFE_ACCENTS.accentYellow,
    });
    // The blue/cyan channel is already CVD-safe and is left untouched.
    expect(cbsafe['--netlab-accent-cyan']).toBe(NETLAB_DARK_THEME.accentCyan);
  });

  it('promotes muted text and solidifies subtle borders when contrast = more (M6)', () => {
    const more = themeToVars(NETLAB_DARK_THEME, { contrast: 'more' });
    expect(more).toMatchObject({
      '--netlab-text-muted': NETLAB_DARK_THEME.textPrimary,
      '--netlab-text-faint': NETLAB_DARK_THEME.textSecondary,
      '--netlab-border-subtle': NETLAB_DARK_THEME.border,
    });
    // Normal contrast keeps the dim tokens.
    const normal = themeToVars(NETLAB_DARK_THEME) as Record<string, string | undefined>;
    expect(normal['--netlab-text-muted']).toBe(NETLAB_DARK_THEME.textMuted);
  });

  it('emits density tokens (pad/gap/font/title/eyebrow) when density is supplied', () => {
    expect(themeToVars(NETLAB_DARK_THEME, { density: 'compact' })).toMatchObject({
      '--netlab-pad': NETLAB_DENSITIES.compact.pad,
      '--netlab-gap': NETLAB_DENSITIES.compact.gap,
      '--netlab-font': NETLAB_DENSITIES.compact.font,
      '--netlab-title': NETLAB_DENSITIES.compact.title,
      '--netlab-eyebrow': NETLAB_DENSITIES.compact.eyebrow,
    });
    expect(themeToVars(NETLAB_DARK_THEME, { density: 'relaxed' })).toMatchObject({
      '--netlab-pad': NETLAB_DENSITIES.relaxed.pad,
      '--netlab-font': NETLAB_DENSITIES.relaxed.font,
    });
  });
});

/**
 * TC-042 — every accent is readable as text on its own theme's backgrounds.
 *
 * The values above are pinned, but pinning a value does not say why it was
 * chosen. Both palettes carried accents that failed here: light amber read
 * 3.04:1 and light faint text 2.08:1, dark blue 2.53:1 on the elevated
 * surface. Nothing caught them, because the only accessibility scan ran in
 * dark mode and the failing colours were reached through hardcoded literals
 * rather than the tokens.
 */
describe('accent legibility', () => {
  const channel = (part: string): number => {
    const v = parseInt(part, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string): number => {
    const h = hex.replace('#', '');
    return (
      0.2126 * channel(h.slice(0, 2)) +
      0.7152 * channel(h.slice(2, 4)) +
      0.0722 * channel(h.slice(4, 6))
    );
  };
  const contrast = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  for (const [name, theme] of [
    ['dark', NETLAB_DARK_THEME],
    ['light', NETLAB_LIGHT_THEME],
  ] as const) {
    it(`${name}: text and accent tokens clear WCAG AA on every background`, () => {
      const backgrounds = [theme.bgPrimary, theme.bgSurface, theme.bgElevated];
      const foregrounds: [string, string][] = [
        ['textPrimary', theme.textPrimary],
        ['textSecondary', theme.textSecondary],
        ['textMuted', theme.textMuted],
        ['textFaint', theme.textFaint],
        ['accentBlue', theme.accentBlue],
        ['accentGreen', theme.accentGreen],
        ['accentRed', theme.accentRed],
        ['accentOrange', theme.accentOrange],
        ['accentYellow', theme.accentYellow],
        ['accentCyan', theme.accentCyan],
        ['accentPurple', theme.accentPurple],
      ];
      const failures: string[] = [];
      for (const [label, fg] of foregrounds) {
        // The dark palette's blue is a fill that carries a white label rather
        // than something read as text; it is checked that way below.
        if (name === 'dark' && label === 'accentBlue') continue;
        for (const bg of backgrounds) {
          const ratio = contrast(fg, bg);
          if (ratio < 4.5) failures.push(`${label} on ${bg}: ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it(`${name}: a white label on the blue fill is readable`, () => {
      expect(contrast('#ffffff', theme.accentBlue)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

/**
 * The strong border is what lesson diagrams draw their links with. It was
 * referenced by a dozen diagrams but emitted by no theme, so every one of
 * those links computed to `stroke: none` and the diagrams showed no lines.
 */
describe('strong border', () => {
  const channel = (part: string): number => {
    const v = parseInt(part, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string): number => {
    const h = hex.replace('#', '');
    return (
      0.2126 * channel(h.slice(0, 2)) +
      0.7152 * channel(h.slice(2, 4)) +
      0.0722 * channel(h.slice(4, 6))
    );
  };
  const contrast = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  const bases = [
    ['dark', NETLAB_DARK_THEME],
    ['light', NETLAB_LIGHT_THEME],
  ] as const;
  const axisSets = (['studio', 'academic'] as const).flatMap((palette) =>
    (['off', 'on'] as const).flatMap((colorBlindSafe) =>
      (['normal', 'more'] as const).map((contrastAxis) => ({
        palette,
        colorBlindSafe,
        contrast: contrastAxis,
      })),
    ),
  );

  it('TC-2280: every theme, palette, colour-blind and contrast setting emits --netlab-border-strong', () => {
    for (const [name, theme] of bases) {
      for (const axes of axisSets) {
        const vars = themeToVars(theme, axes) as Record<string, string | undefined>;
        const value = vars['--netlab-border-strong'];
        expect(value, `${name} ${JSON.stringify(axes)}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    // A custom theme written before the token existed still gets one.
    const { borderStrong: _omitted, ...legacy } = NETLAB_DARK_THEME;
    expect(themeToVars(legacy)).toMatchObject({
      '--netlab-border-strong': NETLAB_DARK_THEME.textSecondary,
    });
  });

  it('TC-2281: the strong border clears 3:1 on every background and is stronger than the plain border', () => {
    const failures: string[] = [];
    for (const [name, theme] of bases) {
      for (const axes of axisSets) {
        const vars = themeToVars(theme, axes) as Record<string, string>;
        const strong = vars['--netlab-border-strong'] as string;
        const plain = vars['--netlab-border'] as string;
        for (const bgVar of [
          '--netlab-bg-primary',
          '--netlab-bg-surface',
          '--netlab-bg-elevated',
        ]) {
          const bg = vars[bgVar] as string;
          const ratio = contrast(strong, bg);
          if (ratio < 3) failures.push(`${name} ${bgVar}: ${ratio.toFixed(2)}`);
          if (ratio <= contrast(plain, bg))
            failures.push(`${name} ${bgVar}: not stronger than border`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

/**
 * TC-2330 (REQ-424a) — the academic palette had one accent set for both
 * themes, tuned for a light page: its cyan read 3.34:1 on the dark page and
 * 2.45:1 on the dark elevated surface. Dark now gets its own set.
 */
describe('TC-2330: academic palette in the dark theme', () => {
  const channel = (part: string): number => {
    const v = parseInt(part, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string): number => {
    const h = hex.replace('#', '');
    return (
      0.2126 * channel(h.slice(0, 2)) +
      0.7152 * channel(h.slice(2, 4)) +
      0.0722 * channel(h.slice(4, 6))
    );
  };
  const contrast = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };
  const ACCENTS = ['green', 'red', 'orange', 'yellow', 'cyan', 'purple'] as const;

  it('every accent read as text reaches 4.5:1 on the dark page, surface and elevated backgrounds', () => {
    const vars = themeToVars(NETLAB_DARK_THEME, { palette: 'academic' }) as Record<string, string>;
    const failures: string[] = [];
    for (const accent of ACCENTS) {
      const fg = vars[`--netlab-accent-${accent}`] as string;
      for (const bg of ['--netlab-bg-primary', '--netlab-bg-surface', '--netlab-bg-elevated']) {
        const ratio = contrast(fg, vars[bg] as string);
        if (ratio < 4.5) failures.push(`${accent} ${fg} on ${bg}: ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('labels on filled accents stay readable: page-colour text on cyan, white text on blue', () => {
    const vars = themeToVars(NETLAB_DARK_THEME, { palette: 'academic' }) as Record<string, string>;
    expect(
      contrast(vars['--netlab-bg-primary'] as string, vars['--netlab-accent-cyan'] as string),
    ).toBeGreaterThanOrEqual(4.5);
    // Blue is a button fill with a white label in both palettes of the dark
    // theme (as in studio), so it is held to the label test, not the text one.
    expect(contrast('#ffffff', vars['--netlab-accent-blue'] as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('the light theme keeps the academic values it had', () => {
    expect(themeToVars(NETLAB_LIGHT_THEME, { palette: 'academic' })).toMatchObject({
      '--netlab-accent-green': '#2f7d62',
      '--netlab-accent-cyan': '#356dab',
      '--netlab-accent-blue': '#4a64b3',
      '--netlab-accent-yellow': '#a26b00',
      '--netlab-accent-orange': '#c45a14',
      '--netlab-accent-red': '#a83a2e',
      '--netlab-accent-purple': '#6b3fcb',
    });
  });
});
