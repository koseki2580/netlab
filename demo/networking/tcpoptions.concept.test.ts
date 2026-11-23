/** The tcpoptions concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { tcpoptions as en } from '../../src/i18n/locales/en/concept/decks/tcpoptions';
import { tcpoptions as ja } from '../../src/i18n/locales/ja/concept/decks/tcpoptions';
import { DECK } from '../../src/learning/concept-check/lessonDecks/tcpoptions';
import {
  DEFAULT_LOST,
  LINK_BPS,
  MAX_UNSCALED_WINDOW,
  maxSackBlocks,
  recovery,
  scalingInUse,
  transfer,
} from './tcpOptions';

describe('TC-2322: tcpoptions deck facts', () => {
  it('q1: unscaled, 1 Gbit/s at 150 ms gives about 3.5 Mbit/s', () => {
    const result = transfer(LINK_BPS, 150, { offered: false, stripped: false });
    expect(result.windowBytes).toBe(65_535);
    expect(result.throughputBps / 1e6).toBeCloseTo(3.5, 1);
    expect(result.bdpBytes).toBe(18_750_000);
  });

  it('q2: a stripped SYN option leaves the connection working but unscaled', () => {
    const result = transfer(LINK_BPS, 150, { offered: true, stripped: true });
    expect(result.windowBytes).toBe(MAX_UNSCALED_WINDOW);
    expect(result.throughputBps).toBeGreaterThan(0);
    expect(scalingInUse(false, false)).toBe(false);
  });

  it('q3: losing 5, 9 and 14 takes NewReno 3 round trips and SACK 1', () => {
    expect(DEFAULT_LOST).toEqual([5, 9, 14]);
    expect(recovery(DEFAULT_LOST, false).roundTrips).toBe(3);
    expect(recovery(DEFAULT_LOST, true)).toEqual({ roundTrips: 1, perRound: [[5, 9, 14]] });
  });

  it('q4: next to timestamps an ACK holds at most 3 SACK blocks', () => {
    expect(maxSackBlocks(true)).toBe(3);
    expect(maxSackBlocks(false)).toBe(4);
  });
});

describe('tcpoptions deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.tcpoptions.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, `${base}`).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
