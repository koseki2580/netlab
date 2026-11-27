/** The sctp concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { sctp as en } from '../../src/i18n/locales/en/concept/decks/sctp';
import { sctp as ja } from '../../src/i18n/locales/ja/concept/decks/sctp';
import { DECK } from '../../src/learning/concept-check/lessonDecks/sctp';
import { defaultFailoverParams, delayed, failover } from './sctp';

describe('TC-2569: sctp deck facts', () => {
  it('q1: with the defaults new data moves to the secondary after six doubling timeouts, 63 s', () => {
    const result = failover(defaultFailoverParams());
    expect(result.startRtoMs).toBe(1000);
    expect(result.timeouts).toHaveLength(6);
    expect(result.failoverMs).toBe(63_000);
  });

  it('q2: A1 lost on stream 1 delays only A1, A2 and A3', () => {
    expect(delayed('sctp', 'A1')).toEqual(['A1', 'A2', 'A3']);
  });

  it('q3: Path.Max.Retrans = 2 fails over after 1 + 2 + 4 = 7 s', () => {
    expect(failover({ ...defaultFailoverParams(), pathMaxRetrans: 2 }).failoverMs).toBe(7000);
  });

  it('q4: over one TCP connection all six messages are late', () => {
    expect(delayed('tcp', 'A1')).toHaveLength(6);
  });
});

describe('sctp deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.sctp.${q}`;
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
