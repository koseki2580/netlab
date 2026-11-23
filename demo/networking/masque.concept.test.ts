/** The `masque` concept-check deck: each right answer checked against the MASQUE lesson's model. */
import { describe, expect, it } from 'vitest';
import { masque as en } from '../../src/i18n/locales/en/concept/decks/masque';
import { masque as ja } from '../../src/i18n/locales/ja/concept/decks/masque';
import { DECK } from '../../src/learning/concept-check/lessonDecks/masque';
import { ADDRESS, anyoneLinks, knows, segments } from './masque';

describe('TC-2308: masque deck facts', () => {
  it('q1: with two relays nobody but you knows both who and where', () => {
    expect(anyoneLinks('two-hop')).toBeNull();
    expect(knows('two-hop', 'relay1')).toMatchObject({ clientIp: true, site: false });
    expect(knows('two-hop', 'relay2')).toMatchObject({ clientIp: false, site: true });
  });

  it('q2: a single proxy knows both your address and the site', () => {
    expect(knows('one-proxy', 'relay2')).toMatchObject({ clientIp: true, site: true });
    expect(anyoneLinks('one-proxy')).toBe('relay2');
  });

  it('q3: the egress relay cannot read the content; only the site can', () => {
    expect(knows('two-hop', 'relay2').content).toBe(false);
    expect(knows('two-hop', 'site').content).toBe(true);
  });

  it('q4: the site sees traffic from the egress relay’s address', () => {
    const hops = segments('two-hop');
    const last = hops[hops.length - 1]!;
    expect(last.to).toBe('site');
    expect(last.srcIp).toBe(ADDRESS.relay2);
    expect(knows('two-hop', 'site').clientIp).toBe(false);
  });
});

describe('the masque deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.masque.${q}.${letter}`;

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
