/** The `encdns` concept-check deck: each right answer checked against the encrypted-DNS lesson's model. */
import { describe, expect, it } from 'vitest';
import { encdns as en } from '../../src/i18n/locales/en/concept/decks/encdns';
import { encdns as ja } from '../../src/i18n/locales/ja/concept/decks/encdns';
import { DECK } from '../../src/learning/concept-check/lessonDecks/encdns';
import { METHODS, TRANSPORT, networkCan } from './encryptedDns';

describe('TC-2303: encdns deck facts', () => {
  it('q1: DoH, on TCP 443, is the one method port blocking cannot stop alone', () => {
    const encrypted = METHODS.filter((method) => TRANSPORT[method].encrypted);
    expect(encrypted.filter((method) => !networkCan(method).blockByPortAlone)).toEqual(['doh']);
    expect(TRANSPORT.doh).toMatchObject({ proto: 'tcp', port: 443 });
  });

  it('q2: on classic DNS the network reads the name and can forge the answer', () => {
    expect(networkCan('do53')).toMatchObject({ readName: true, forgeAnswer: true });
  });

  it('q3: DoT is encrypted only up to the resolver, so the café cannot read the name', () => {
    // The model's encryption runs “between the client and its resolver”: the resolver reads it.
    expect(TRANSPORT.dot.encrypted).toBe(true);
    expect(networkCan('dot').readName).toBe(false);
  });
});

describe('the encdns deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.encdns.${q}.${letter}`;

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
