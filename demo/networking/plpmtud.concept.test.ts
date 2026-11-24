/** The plpmtud concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { plpmtud as en } from '../../src/i18n/locales/en/concept/decks/plpmtud';
import { plpmtud as ja } from '../../src/i18n/locales/ja/concept/decks/plpmtud';
import { DECK } from '../../src/learning/concept-check/lessonDecks/plpmtud';
import { classic, fits, search } from './plpmtud';

describe('TC-2519: plpmtud deck facts', () => {
  it('q1: with ICMP filtered, classic PMTUD learns nothing and resends only the full size', () => {
    expect(classic(1400, false)).toEqual({ delivers: false, learnedMtu: null, sizes: [1452] });
  });

  it('q2: the search starts from 1200 bytes, which fits even the 1280-byte IPv6 minimum', () => {
    expect(fits(1200, 1280)).toBe(true);
    const result = search(1280);
    expect(result.plpmtu).toBeGreaterThanOrEqual(1200);
    expect(result.probes.every((probe) => probe.size > 1200)).toBe(true);
  });

  it('q3: on a 1400 path the 1389 probe is lost, sent 3 times, and the search moves below it', () => {
    const result = search(1400);
    const index = result.probes.findIndex((probe) => probe.size === 1389);
    expect(result.probes[index]).toEqual({ size: 1389, acked: false, sent: 3 });
    expect(result.probes.slice(index + 1).every((probe) => probe.size < 1389)).toBe(true);
  });

  it('q4: on a 1400-byte path it settles at 1349 after 6 sizes, while 1352 would fit', () => {
    const result = search(1400);
    expect(result.plpmtu).toBe(1349);
    expect(result.probes).toHaveLength(6);
    expect(result.largestFitting).toBe(1352);
  });
});

describe('plpmtud deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.plpmtud.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
