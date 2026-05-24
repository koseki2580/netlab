import { describe, expect, it } from 'vitest';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from './index';
import {
  ACADEMIC_LEARNING_SURFACE_OVERRIDES,
  DARK_LEARNING_SURFACE,
  LIGHT_LEARNING_SURFACE,
  RADIUS_SCALE,
} from './learningSurface';

const LEARNING_VARS = [
  '--netlab-learning-surface-bg',
  '--netlab-learning-surface-border',
  '--netlab-learning-shadow',
  '--netlab-learning-hero-bg',
  '--netlab-learning-glass-bg',
  '--netlab-learning-glass-blur',
] as const;

const RADIUS_VARS = [
  '--netlab-radius-sm',
  '--netlab-radius-md',
  '--netlab-radius-lg',
  '--netlab-radius-pill',
] as const;

describe('learning-surface tokens', () => {
  it('the built-in themes carry every learning-surface field', () => {
    for (const theme of [NETLAB_DARK_THEME, NETLAB_LIGHT_THEME]) {
      expect(theme).toMatchObject({
        learningSurfaceBg: expect.any(String),
        learningSurfaceBorder: expect.any(String),
        learningSurfaceShadow: expect.any(String),
        learningSurfaceHeroBg: expect.any(String),
        learningSurfaceGlassBg: expect.any(String),
        learningSurfaceGlassBlur: expect.any(String),
      });
    }
    expect(NETLAB_DARK_THEME).toMatchObject(DARK_LEARNING_SURFACE);
    expect(NETLAB_LIGHT_THEME).toMatchObject(LIGHT_LEARNING_SURFACE);
  });

  it.each([
    ['dark / studio', () => themeToVars(NETLAB_DARK_THEME)],
    ['light / studio', () => themeToVars(NETLAB_LIGHT_THEME)],
    ['dark / academic', () => themeToVars(NETLAB_DARK_THEME, { palette: 'academic' })],
    ['light / academic', () => themeToVars(NETLAB_LIGHT_THEME, { palette: 'academic' })],
    ['dark / cbsafe', () => themeToVars(NETLAB_DARK_THEME, { colorBlindSafe: 'on' })],
    ['dark / contrast=more', () => themeToVars(NETLAB_DARK_THEME, { contrast: 'more' })],
  ])('emits all learning + radius vars for %s', (_label, build) => {
    const vars = build() as Record<string, string | undefined>;
    for (const key of [...LEARNING_VARS, ...RADIUS_VARS]) {
      expect(vars[key], `${key} should be present`).toBeTruthy();
    }
  });

  it('uses the fixed 8/16/24/999 radius scale', () => {
    const vars = themeToVars(NETLAB_DARK_THEME) as Record<string, string>;
    expect(vars['--netlab-radius-sm']).toBe(RADIUS_SCALE.sm);
    expect(vars['--netlab-radius-md']).toBe(RADIUS_SCALE.md);
    expect(vars['--netlab-radius-lg']).toBe(RADIUS_SCALE.lg);
    expect(vars['--netlab-radius-pill']).toBe(RADIUS_SCALE.pill);
    expect([RADIUS_SCALE.sm, RADIUS_SCALE.md, RADIUS_SCALE.lg, RADIUS_SCALE.pill]).toEqual([
      '8px',
      '16px',
      '24px',
      '999px',
    ]);
  });

  it('desaturates the learning washes under the academic palette', () => {
    const studio = themeToVars(NETLAB_DARK_THEME) as Record<string, string>;
    const academic = themeToVars(NETLAB_DARK_THEME, { palette: 'academic' }) as Record<
      string,
      string
    >;
    expect(academic['--netlab-learning-surface-bg']).toBe(
      ACADEMIC_LEARNING_SURFACE_OVERRIDES.learningSurfaceBg,
    );
    expect(academic['--netlab-learning-surface-bg']).not.toBe(
      studio['--netlab-learning-surface-bg'],
    );
  });

  it('leaves terminal-surface tokens unchanged (frozen)', () => {
    const vars = themeToVars(NETLAB_DARK_THEME) as Record<string, string>;
    expect(vars['--netlab-bg-primary']).toBe(NETLAB_DARK_THEME.bgPrimary);
    expect(vars['--netlab-border']).toBe(NETLAB_DARK_THEME.border);
  });
});
