/** The `ech` concept-check deck: each right answer checked against the Encrypted Client Hello lesson's model. */
import { describe, expect, it } from 'vitest';
import { ech as en } from '../../src/i18n/locales/en/concept/decks/ech';
import { ech as ja } from '../../src/i18n/locales/ja/concept/decks/ech';
import { DECK } from '../../src/learning/concept-check/lessonDecks/ech';
import { PUBLIC_NAME, SITE, firstFlight, openSealed, readable } from './ech';

describe('TC-2302: ech deck facts', () => {
  it('q1: without ECH the site’s name is readable in the ClientHello', async () => {
    expect(readable((await firstFlight(false)).onTheWire)).toContain(SITE);
  });

  it('q2: with ECH only the provider’s public name is readable', async () => {
    const seen = readable((await firstFlight(true)).onTheWire);
    expect(seen).toContain(PUBLIC_NAME);
    expect(seen.join(' ')).not.toContain(SITE);
  });

  it('q3: the provider, with its key, opens the sealed hello and finds the real site', async () => {
    expect(readable(await openSealed(await firstFlight(true)))).toEqual([SITE]);
  });

  it('q4: one changed byte of the outer hello makes opening fail', async () => {
    const flight = await firstFlight(true);
    const tampered = flight.onTheWire.slice();
    tampered[20] = (tampered[20] ?? 0) ^ 1;
    await expect(openSealed({ onTheWire: tampered, sealed: flight.sealed })).rejects.toThrow();
  });
});

describe('the ech deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.ech.${q}.${letter}`;

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
