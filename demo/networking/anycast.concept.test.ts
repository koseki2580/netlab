/** The anycast concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { anycast as en } from '../../src/i18n/locales/en/concept/decks/anycast';
import { anycast as ja } from '../../src/i18n/locales/ja/concept/decks/anycast';
import { DECK } from '../../src/learning/concept-check/lessonDecks/anycast';
import { dnsSteer, lowestLatency, routeFor } from './anycast';

describe('TC-2300: anycast deck facts', () => {
  it('q1: Singapore reaches Frankfurt by the shorter AS path, though Tokyo has the lower RTT', () => {
    const chosen = routeFor('isp-sg')!;
    expect(chosen.site).toBe('site-fra');
    expect(chosen.rttMs).toBe(162);
    // The global carrier's AS path: straight from Frankfurt, 2 ASes.
    expect(chosen.asPath).toEqual([64540, 64500]);
    const nearest = lowestLatency('isp-sg')!;
    expect(nearest.site).toBe('site-tyo');
    expect(nearest.rttMs).toBe(74);
  });

  it('q2: when Frankfurt withdraws, the same prefix takes Singapore to Tokyo with no other change', () => {
    expect(routeFor('isp-sg', ['site-tyo', 'site-nyc'])?.site).toBe('site-tyo');
  });

  it('q3: via a London resolver without ECS, Osaka is given Frankfurt (252 ms) instead of Tokyo (12 ms)', () => {
    expect(dnsSteer('isp-osaka', 'public-london')).toMatchObject({
      seenFrom: 'isp-london',
      server: 'site-fra',
      rttMs: 252,
    });
    expect(dnsSteer('isp-osaka', 'public-london-ecs')).toMatchObject({
      server: 'site-tyo',
      rttMs: 12,
    });
  });

  it('q4: a withdrawal moves an established flow to a different site', () => {
    const before = routeFor('isp-sg')!.site;
    const after = routeFor('isp-sg', ['site-tyo', 'site-nyc'])!.site;
    expect(after).not.toBe(before);
  });
});

describe('anycast deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.anycast.${q}`;
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
