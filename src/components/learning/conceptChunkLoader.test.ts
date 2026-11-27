/**
 * The concept checks' strings load chunk by chunk, per locale, on demand:
 * a loaded chunk is kept, and a chunk that fails to load falls back to its
 * English strings with one warning, leaving every other chunk as it was.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('../../i18n/locales/ja/concept/concept-ja-l2');
  vi.doUnmock('../../i18n/locales/en/concept/concept-en-l2');
  vi.restoreAllMocks();
});

async function freshLoader() {
  vi.resetModules();
  const { logger } = await import('../../utils/logger');
  const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  const loader = await import('./conceptCatalog');
  return { ...loader, warn };
}

describe('loadConceptChunk', () => {
  it('TC-2274: loads a chunk in the asked locale, then keeps it', async () => {
    const { conceptChunk, loadConceptChunk, CONCEPT_CHUNKS, warn } = await freshLoader();
    expect(CONCEPT_CHUNKS).toEqual([
      'core',
      'fundamentals',
      'l2',
      'l2infra',
      'l3',
      'l4',
      'l5',
      'l7web',
      'l7apps',
      'routing',
    ]);
    expect(conceptChunk('ja', 'l4')).toBeUndefined();
    const ja = await loadConceptChunk('ja', 'l4');
    expect(ja['learning.concept.tcp.q1.prompt']).toBe('TCP 3ウェイハンドシェイクの順序は…');
    expect(conceptChunk('ja', 'l4')).toBe(ja);
    expect(await loadConceptChunk('ja', 'l4')).toBe(ja);
    // Each locale and chunk is its own: loading one loads no other.
    expect(conceptChunk('en', 'l4')).toBeUndefined();
    expect(conceptChunk('ja', 'l3')).toBeUndefined();
    const en = await loadConceptChunk('en', 'core');
    expect(en['learning.concept.title']).toBe('Protocol Concept Checks');
    expect(en['learning.concept.bgp.name']).toBe('BGP');
    expect(warn).not.toHaveBeenCalled();
  });

  it('TC-2275: a chunk that fails falls back to English with one warning; the others still load', async () => {
    vi.doMock('../../i18n/locales/ja/concept/concept-ja-l2', () => {
      throw new Error('offline');
    });
    const { conceptChunk, loadConceptChunk, warn } = await freshLoader();
    const l2 = await loadConceptChunk('ja', 'l2');
    expect(l2['learning.concept.arp.q1.prompt']).toBe('What does ARP resolve?');
    expect(await loadConceptChunk('ja', 'l2')).toBe(l2);
    expect(conceptChunk('ja', 'l2')).toBe(l2);
    expect(warn).toHaveBeenCalledTimes(1);
    const l3 = await loadConceptChunk('ja', 'l3');
    expect(l3['learning.concept.nat.q1.prompt']).not.toBe(
      (await loadConceptChunk('en', 'l3'))['learning.concept.nat.q1.prompt'],
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('TC-2275: an English chunk that fails leaves an empty catalog, with one warning', async () => {
    vi.doMock('../../i18n/locales/en/concept/concept-en-l2', () => {
      throw new Error('offline');
    });
    const { loadConceptChunk, warn } = await freshLoader();
    expect(await loadConceptChunk('en', 'l2')).toEqual({});
    expect(await loadConceptChunk('en', 'l2')).toEqual({});
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
