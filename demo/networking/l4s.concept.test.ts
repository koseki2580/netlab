/** The `l4s` concept-check deck: each right answer checked against the L4S lesson's model. */
import { describe, expect, it } from 'vitest';
import { l4s as en } from '../../src/i18n/locales/en/concept/decks/l4s';
import { l4s as ja } from '../../src/i18n/locales/ja/concept/decks/l4s';
import { DECK } from '../../src/learning/concept-check/lessonDecks/l4s';
import { BASE_RTT_MS, simulate } from './l4s';

describe('TC-2306: l4s deck facts', () => {
  it('q1: a deep buffer keeps the line nearly full, but delay climbs to the whole buffer', () => {
    const deep = simulate('classic-deep');
    expect(deep.utilisationPct).toBeGreaterThan(95);
    expect(deep.maxDelayMs).toBe(BASE_RTT_MS);
  });

  it('q2: a shallow buffer keeps delay low but leaves the line partly idle', () => {
    const deep = simulate('classic-deep');
    const shallow = simulate('classic-shallow');
    expect(shallow.maxDelayMs).toBeLessThan(deep.maxDelayMs);
    expect(shallow.utilisationPct).toBeLessThan(90);
    expect(shallow.utilisationPct).toBeLessThan(deep.utilisationPct);
  });

  it('q3: the L4S sender is told by CE marks, not drops', () => {
    const l4s = simulate('l4s');
    expect(l4s.marks).toBeGreaterThan(0);
    expect(l4s.drops).toBe(0);
  });

  it('q4: it backs off by a fraction, never halving, and the line stays full', () => {
    const l4s = simulate('l4s');
    expect(l4s.utilisationPct).toBe(100);
    const steady = l4s.rounds.slice(20);
    for (let index = 1; index < steady.length; index++) {
      expect(steady[index]!.window).toBeGreaterThan(steady[index - 1]!.window / 2);
    }
    expect(l4s.maxDelayMs).toBeLessThan(simulate('classic-deep').maxDelayMs);
  });
});

describe('the l4s deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.l4s.${q}.${letter}`;

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
