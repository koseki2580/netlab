import { describe, expect, it } from 'vitest';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME } from '../theme';
import { resolveColorMode } from './themeUtils';

describe('resolveColorMode', () => {
  it('returns dark for the built-in dark theme background', () => {
    expect(resolveColorMode(NETLAB_DARK_THEME.bgPrimary)).toBe('dark');
  });

  it('returns light for the built-in light theme background', () => {
    expect(resolveColorMode(NETLAB_LIGHT_THEME.bgPrimary)).toBe('light');
  });

  it('returns dark for malformed or unsupported inputs', () => {
    expect(resolveColorMode('rgba(248, 250, 252, 1)')).toBe('dark');
    expect(resolveColorMode('#fff')).toBe('dark');
    expect(resolveColorMode('not-a-color')).toBe('dark');
  });

  it('classifies pure white as light and pure black as dark', () => {
    expect(resolveColorMode('#ffffff')).toBe('light');
    expect(resolveColorMode('#000000')).toBe('dark');
  });
});
