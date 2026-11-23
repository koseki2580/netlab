/** The `sdwan` concept-check deck: each right answer checked against the SD-WAN lesson's model. */
import { describe, expect, it } from 'vitest';
import { sdwan as en } from '../../src/i18n/locales/en/concept/decks/sdwan';
import { sdwan as ja } from '../../src/i18n/locales/ja/concept/decks/sdwan';
import { DECK } from '../../src/learning/concept-check/lessonDecks/sdwan';
import { POLICIES, UPLINKS, choose, misses } from './sdwan';

const RUSH = 1;
const policy = (id: string) => POLICIES.find((entry) => entry.id === id)!;
const link = (id: string) => UPLINKS.find((entry) => entry.id === id)!;

describe('TC-2319: sdwan deck facts', () => {
  it('q1: in the rush voice goes to LTE, cheaper than MPLS and within its limits', () => {
    expect(link('internet').samples[RUSH]).toEqual({ latencyMs: 120, jitterMs: 40, lossPct: 3 });
    expect(choose(policy('voice'), RUSH)).toBe('lte');
    expect(misses(link('mpls'), policy('voice'), RUSH)).toEqual([]);
    expect(link('lte').cost).toBeLessThan(link('mpls').cost);
  });

  it('q2: in the same rush video goes to MPLS, because LTE’s loss is over its limit', () => {
    expect(choose(policy('video'), RUSH)).toBe('mpls');
    expect(misses(link('lte'), policy('video'), RUSH)).toEqual(['loss 1 > 0.5 %']);
  });

  it('q3: outside the rush voice uses the internet line, the cheapest that fits', () => {
    expect(choose(policy('voice'), 0)).toBe('internet');
    expect(misses(link('mpls'), policy('voice'), 0)).toEqual([]);
    // Nothing pins a kind of traffic to a link: voice and video share it here.
    expect(choose(policy('video'), 0)).toBe('internet');
  });

  it('q4: the backup stays on the internet line even in the rush', () => {
    expect(choose(policy('backup'), RUSH)).toBe('internet');
  });
});

describe('the sdwan deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.sdwan.${q}.${letter}`;

  it('has every key the deck needs in both locales, and no others', () => {
    const want = DECK.answers
      .flatMap(([q, answer]) => [
        `${keyOf(q, 'prompt')}`,
        `${keyOf(q, 'why')}`,
        ...(['a', 'b', 'c'] as const).flatMap((letter) =>
          letter === answer ? [keyOf(q, letter)] : [keyOf(q, letter), `${keyOf(q, letter)}.why`],
        ),
      ])
      .sort();
    expect(Object.keys(en).sort()).toEqual(want);
    expect(Object.keys(ja).sort()).toEqual(want);
  });

  it('the right option is at most 1.6× the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const length = (letter: string) => catalog[keyOf(q, letter)]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const).filter((letter) => letter !== answer).map(length),
        );
        expect(length(answer) / wrong, q).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer is not always in the same slot', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
