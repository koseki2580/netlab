/** The routereflector concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { routereflector as en } from '../../src/i18n/locales/en/concept/decks/routereflector';
import { routereflector as ja } from '../../src/i18n/locales/ja/concept/decks/routereflector';
import { DECK } from '../../src/learning/concept-check/lessonDecks/routereflector';
import { EBGP_NEXT_HOP, SCENARIOS, propagate, reachesC, sessionCounts } from './routeReflector';

describe('TC-2439: routereflector deck facts', () => {
  it('q1: 20 routers need 190 full-mesh sessions, about four times the 45 of 10 routers', () => {
    expect(sessionCounts(20).fullMesh).toBe(190);
    expect(sessionCounts(10).fullMesh).toBe(45);
  });

  it('q2: with a plain B and sessions A–B, B–C only, C never learns the route', () => {
    expect(reachesC('plain')).toBe(false);
    expect(propagate(SCENARIOS.plain).installed.has('B')).toBe(true);
  });

  it('q3: the reflected route reaches C with NEXT_HOP unchanged', () => {
    const atC = propagate(SCENARIOS['one-rr']).installed.get('C')!;
    expect(atC.nextHop).toBe(EBGP_NEXT_HOP);
    expect(atC.nextHop).not.toBe(atC.originatorId);
  });

  it('q4: the copy RR2 reflects back to A is dropped by ORIGINATOR_ID, not CLUSTER_LIST', () => {
    const back = propagate(SCENARIOS['two-rr-split']).deliveries.find(
      (d) => d.to === 'A' && d.copy.from === 'RR2',
    )!;
    expect(back.verdict).toBe('originator-id');
    expect(back.copy.originatorId).toBe('10.0.0.1');
    expect(back.copy.clusterList).toEqual(['10.0.0.12', '10.0.0.11']);
  });
});

describe('routereflector deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.routereflector.${q}`;
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
