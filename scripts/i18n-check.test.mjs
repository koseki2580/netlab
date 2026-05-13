import { describe, expect, it } from 'vitest';
import { compareCatalogs, extractPlaceholders, formatI18nReport } from './i18n-check.mjs';

describe('i18n parity check', () => {
  it('extracts double-brace placeholders in stable order', () => {
    expect(extractPlaceholders('Step {{current}} / {{total}} / {{current}}')).toEqual([
      'current',
      'total',
    ]);
  });

  it('reports missing, extra, and placeholder-drift keys', () => {
    const report = compareCatalogs(
      {
        a: 'hello {{name}}',
        b: 'count {{count}}',
      },
      {
        a: 'こんにちは {{user}}',
        c: 'extra',
      },
    );

    expect(report.ok).toBe(false);
    expect(report.missingKeys).toEqual(['b']);
    expect(report.extraKeys).toEqual(['c']);
    expect(report.placeholderMismatches).toEqual([
      {
        key: 'a',
        en: ['name'],
        target: ['user'],
      },
    ]);
    expect(formatI18nReport(report)).toContain('Missing keys');
  });

  it('passes identical key and placeholder sets', () => {
    expect(compareCatalogs({ a: 'x {{id}}' }, { a: 'y {{id}}' }).ok).toBe(true);
  });
});
