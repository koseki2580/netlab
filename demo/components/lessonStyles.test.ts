import type { CSSProperties } from 'react';
import { describe, expect, it } from 'vitest';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from '../../src/theme';
import * as lessonStyles from './lessonStyles';
import { LESSON_TEAL_BUTTON, lessonChoice } from './lessonStyles';

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

const THEMES = [
  ['dark', themeToVars(NETLAB_DARK_THEME) as Record<string, string>],
  ['light', themeToVars(NETLAB_LIGHT_THEME) as Record<string, string>],
] as const;
const BACKGROUNDS = ['--netlab-bg-primary', '--netlab-bg-surface', '--netlab-bg-elevated'];

/** Resolves every `var(--netlab-*)` in a style value against a theme's emitted variables. */
function resolve(value: unknown, vars: Record<string, string>): string {
  return String(value).replace(/var\((--netlab-[a-z0-9-]+)\)/g, (_m, name: string) => {
    const v = vars[name];
    if (v === undefined) throw new Error(`${name} is not emitted by the theme`);
    return v;
  });
}

/** The colour named in a `1px solid <colour>` border or outline. */
const lineColour = (value: unknown, vars: Record<string, string>): string =>
  resolve(value, vars).split(' ').pop() as string;

describe('lesson styles', () => {
  it('TC-2282: every --netlab-* variable the lesson styles use is emitted by the theme', () => {
    const styles: [string, CSSProperties][] = [
      ...Object.entries(lessonStyles).filter(
        (entry): entry is [string, CSSProperties] => typeof entry[1] === 'object',
      ),
      ['lessonChoice(false)', lessonChoice(false)],
      ['lessonChoice(true)', lessonChoice(true)],
    ];
    const missing: string[] = [];
    for (const [, vars] of THEMES) {
      for (const [name, style] of styles) {
        for (const value of Object.values(style)) {
          for (const [, variable] of String(value).matchAll(/var\((--netlab-[a-z0-9-]+)\)/g)) {
            if (vars[variable as string] === undefined) missing.push(`${name}: ${variable}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  for (const [name, vars] of THEMES) {
    it(`TC-2283: ${name}: an unchosen option is outlined, the chosen one filled and ringed, both readable`, () => {
      const off = lessonChoice(false);
      const on = lessonChoice(true);

      // Unchosen: no fill, accent border and text — a button, but the quieter one.
      expect(off.background).toBe('transparent');
      expect(lineColour(off.border, vars)).toBe(vars['--netlab-accent-cyan']);
      const offText = resolve(off.color, vars);
      for (const bg of BACKGROUNDS) {
        expect(contrast(offText, vars[bg] as string), `unchosen on ${bg}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }

      // Chosen: accent fill, readable label, and a ring the unchosen one lacks.
      const onBg = resolve(on.background, vars);
      expect(onBg).toBe(vars['--netlab-accent-cyan']);
      expect(contrast(resolve(on.color, vars), onBg)).toBeGreaterThanOrEqual(4.5);
      expect(lineColour(on.outline, vars)).toBe(vars['--netlab-accent-cyan']);
      expect(Number(on.outlineOffset)).toBeGreaterThan(0);
      expect(off.outline ?? 'none').toBe('none');
    });
  }

  it('TC-2284: choices and the teal reveal button are at least 44 px tall', () => {
    expect(lessonChoice(false).minHeight).toBe(44);
    expect(lessonChoice(true).minHeight).toBe(44);
    expect(LESSON_TEAL_BUTTON.minHeight).toBe(44);
  });
});
