/** The lossless concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { lossless as en } from '../../src/i18n/locales/en/concept/decks/lossless';
import { lossless as ja } from '../../src/i18n/locales/ja/concept/decks/lossless';
import { DECK } from '../../src/learning/concept-check/lessonDecks/lossless';
import { DEFAULT_CONFIG, headroomFrames, simulate } from './losslessDc';

describe('TC-2469: lossless deck facts', () => {
  it('q1: plain Ethernet tail-drops 257 of the 512 frames', () => {
    expect(simulate('plain')).toMatchObject({ offered: 512, drops: 257 });
  });

  it('q2: with PFC nothing is dropped, yet V gets only 174 of its 350 turns', () => {
    expect(simulate('pfc')).toMatchObject({ drops: 0, innocentSent: 174, innocentMax: 350 });
  });

  it('q3: at 192 m the estimate is 18 frames, and 10 frames of headroom drop 65', () => {
    expect(headroomFrames(192)).toBe(18);
    expect(simulate('pfc', { ...DEFAULT_CONFIG, cableMetres: 192, headroomFrames: 10 }).drops).toBe(
      65,
    );
  });

  it('q4: with ECN, PFC fires once instead of 6 times, with no drops', () => {
    expect(simulate('pfc-ecn')).toMatchObject({ pauses: 1, drops: 0 });
    expect(simulate('pfc').pauses).toBe(6);
  });
});

describe('lossless deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.lossless.${q}`;
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
