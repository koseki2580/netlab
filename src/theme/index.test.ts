import { describe, expect, it } from 'vitest';
import {
  NETLAB_DARK_THEME,
  NETLAB_DENSITIES,
  NETLAB_LIGHT_THEME,
  NETLAB_PALETTES,
  themeToVars,
} from './index';
import { CBSAFE_ACCENTS } from './palettes';

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
      accentOrange: '#f59e0b',
    });

    expect(themeToVars(NETLAB_LIGHT_THEME)).toMatchObject({
      '--netlab-node-router-bg': '#f0fdf4',
      '--netlab-node-switch-bg': '#eff6ff',
      '--netlab-node-client-bg': '#f0f9ff',
      '--netlab-node-server-bg': '#f0fdf4',
      '--netlab-accent-orange': '#f59e0b',
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
      '--netlab-accent-green': NETLAB_PALETTES.academic.accentGreen,
      '--netlab-accent-cyan': NETLAB_PALETTES.academic.accentCyan,
      '--netlab-accent-blue': NETLAB_PALETTES.academic.accentBlue,
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
