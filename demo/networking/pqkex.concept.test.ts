/** The `pqkex` concept-check deck: each right answer checked against the post-quantum key-exchange lesson's model. */
import { describe, expect, it } from 'vitest';
import { pqkex as en } from '../../src/i18n/locales/en/concept/decks/pqkex';
import { pqkex as ja } from '../../src/i18n/locales/ja/concept/decks/pqkex';
import { DECK } from '../../src/learning/concept-check/lessonDecks/pqkex';
import { ATTACKERS, GROUPS, MSS, SHARE, clientHelloBytes, segmentsFor, staysSecret } from './pqKex';

describe('TC-2315: pqkex deck facts', () => {
  it('q1: only the hybrid keeps the key secret against all three attackers', () => {
    expect(GROUPS.filter((group) => ATTACKERS.every((who) => staysSecret(group, who)))).toEqual([
      'x25519mlkem768',
    ]);
  });

  it('q2: X25519 alone falls to a future quantum computer', () => {
    expect(staysSecret('x25519', 'quantum')).toBe(false);
    expect(staysSecret('x25519', 'classical')).toBe(true);
  });

  it('q3: the hybrid ClientHello spills into a second segment; X25519’s fits in one', () => {
    expect(SHARE.x25519mlkem768.client).toBe(1216);
    expect(MSS).toBe(1460);
    expect(clientHelloBytes('x25519mlkem768')).toBe(1696);
    expect(segmentsFor(clientHelloBytes('x25519mlkem768'))).toBe(2);
    expect(segmentsFor(clientHelloBytes('x25519'))).toBe(1);
  });
});

describe('the pqkex deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.pqkex.${q}.${letter}`;

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
