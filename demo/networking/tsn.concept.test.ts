/** The `tsn` concept deck: each right answer is what the TSN lesson model says. */
import { describe, expect, it } from 'vitest';
import { tsn as en } from '../../src/i18n/locales/en/concept/decks/tsn';
import { tsn as ja } from '../../src/i18n/locales/ja/concept/decks/tsn';
import { DECK } from '../../src/learning/concept-check/lessonDecks/tsn';
import { BEST_EFFORT_FRAME_BYTES, bound, cycleShares, frameTimeNs } from './tsn';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2589: tsn deck: the right answers hold in the lesson model', () => {
  it('q1 (b): strict priority at 1 Gb/s: worst case 12.976 µs, bounded', () => {
    expect(answer('q1')).toBe('b');
    expect(bound('priority', 1000).worstPerHopNs).toBe(12_976);
  });
  it('q2 (c): at 10 Gb/s a 1518-byte frame blocks for 1.2304 µs', () => {
    expect(answer('q2')).toBe('c');
    expect(frameTimeNs(BEST_EFFORT_FRAME_BYTES, 10_000)).toBeCloseTo(1_230.4, 6);
  });
  it('q3 (a): the guard band is 12.304 µs, 4.9 % of a 250 µs cycle', () => {
    expect(answer('q3')).toBe('a');
    expect(bound('qbv', 1000).guardBandNs).toBe(12_304);
    expect(cycleShares(1000, false).guardBand).toBeCloseTo(0.049, 3);
  });
  it('q4 (b): with preemption the guard band is the 127-byte piece, 1.176 µs', () => {
    expect(answer('q4')).toBe('b');
    expect(bound('qbv-preempt', 1000).guardBandNs).toBe(1_176);
  });
});

describe('tsn deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, right] of DECK.answers) {
        const base = `learning.concept.tsn.${q}`;
        const length = catalog[`${base}.${right}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== right)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(length / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
