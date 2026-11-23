/** The rpki concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { rpki as en } from '../../src/i18n/locales/en/concept/decks/rpki';
import { rpki as ja } from '../../src/i18n/locales/ja/concept/decks/rpki';
import { DECK } from '../../src/learning/concept-check/lessonDecks/rpki';
import { ANNOUNCEMENTS, COMPETING, ROAS, forward, validate } from './rpki';

const announcement = (id: string) => ANNOUNCEMENTS.find((a) => a.id === id)!;

describe('TC-2318: rpki deck facts', () => {
  it('q1: a /25 from another origin under the /24 ROA is Invalid, not NotFound or Valid', () => {
    const result = validate(announcement('other-origin-25'), ROAS);
    expect(result.state).toBe('Invalid');
    expect(result.reason).toBe('wrong-origin');
    expect(result.covering.map((roa) => roa.prefix)).toEqual(['192.0.2.0/24']);
  });

  it('q2: dropping Invalid sends 192.0.2.10 along the holder’s /24; without ROV the /25 wins', () => {
    expect(forward(COMPETING, ROAS, '192.0.2.10', 'drop-invalid').chosen).toMatchObject({
      prefix: '192.0.2.0/24',
      originAs: 64500,
    });
    expect(forward(COMPETING, ROAS, '192.0.2.10', 'accept-all').chosen).toMatchObject({
      prefix: '192.0.2.0/25',
      originAs: 64511,
    });
  });

  it('q3: a prefix with no ROA is NotFound and stays in the table under drop-invalid', () => {
    expect(validate(announcement('no-roa'), ROAS)).toMatchObject({
      state: 'NotFound',
      reason: 'no-roa',
    });
    const result = forward(ANNOUNCEMENTS, ROAS, '203.0.113.5', 'drop-invalid');
    expect(result.installed.map((a) => a.id)).toContain('no-roa');
    expect(result.chosen?.id).toBe('no-roa');
  });

  it('q4: with maxLength 28 a forged-origin /26 is Valid (with 24 it was Invalid)', () => {
    const forged = { id: 'forged-26', prefix: '198.51.100.0/26', originAs: 64501 };
    const loose = ROAS.map((roa) =>
      roa.prefix === '198.51.100.0/22' ? { ...roa, maxLength: 28 } : roa,
    );
    expect(validate(forged, loose).state).toBe('Valid');
    expect(validate(forged, ROAS)).toMatchObject({ state: 'Invalid', reason: 'too-long' });
  });
});

describe('rpki deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.rpki.${q}`;
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
