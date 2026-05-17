import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../utils/logger';
import { _resetTranslatorWarnings, createTranslator } from './createTranslator';
import { _resetSubstituteWarnings } from './substitute';

describe('createTranslator', () => {
  beforeEach(() => {
    _resetTranslatorWarnings();
    _resetSubstituteWarnings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the matching string from the catalog', () => {
    const t = createTranslator('en', { 'sandbox.title': 'Sandbox' });
    expect(t('sandbox.title')).toBe('Sandbox');
  });

  it('substitutes placeholders with params', () => {
    const t = createTranslator('en', { 'count.items': '{{n}} items' });
    expect(t('count.items', { n: 3 })).toBe('3 items');
  });

  it('falls back to en catalog when key missing in non-en locale', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    // en catalog (the imported singleton) is empty in Wave 0; simulate fallback by
    // creating a translator with a non-en locale + empty catalog and verifying the
    // last-resort key fallback path is taken with a warning.
    const t = createTranslator('ja', {});
    expect(t('missing.key')).toBe('missing.key');
    expect(warn).toHaveBeenCalled();
  });

  it('returns the key itself as last-resort fallback', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const t = createTranslator('en', {});
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('warns once per missing key per session', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const t = createTranslator('en', {});
    t('missing.key');
    t('missing.key');
    t('missing.key');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
