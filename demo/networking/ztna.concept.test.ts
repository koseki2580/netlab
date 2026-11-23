/** The ztna concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { ztna as en } from '../../src/i18n/locales/en/concept/decks/ztna';
import { ztna as ja } from '../../src/i18n/locales/ja/concept/decks/ztna';
import { DECK } from '../../src/learning/concept-check/lessonDecks/ztna';
import { APPS, USERS, decide, exposure, vpnReachable } from './ztna';

const user = (id: (typeof USERS)[number]['id']) => USERS.find((u) => u.id === id)!;

describe('TC-2325: ztna deck facts', () => {
  it('q1: on the VPN the contractor’s laptop reaches all five apps and all of 10.0.0.0/8', () => {
    expect(vpnReachable()).toHaveLength(5);
    expect(exposure('vpn', user('contractor'))).toEqual({ apps: 5, addresses: 16_777_216 });
  });

  it('q2: under ZTNA it reaches only the code repository and no internal address', () => {
    expect(exposure('ztna', user('contractor'))).toEqual({ apps: 1, addresses: 0 });
    const contractor = user('contractor');
    const allowed = APPS.filter((app) => decide(contractor, app.id).allow).map((app) => app.id);
    expect(allowed).toEqual(['code-repo']);
  });

  it('q3: an out-of-date OS is refused on the next request and allowed after updating', () => {
    const engineer = user('engineer');
    expect(decide(engineer, 'code-repo', { managed: true, osUpToDate: false })).toMatchObject({
      allow: false,
      reason: 'os-out-of-date',
    });
    expect(decide(engineer, 'code-repo', { managed: true, osUpToDate: true }).allow).toBe(true);
  });
});

describe('ztna deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.ztna.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, `${base}`).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
