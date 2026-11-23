/** The pim concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { pim as en } from '../../src/i18n/locales/en/concept/decks/pim';
import { pim as ja } from '../../src/i18n/locales/ja/concept/decks/pim';
import { DECK } from '../../src/learning/concept-check/lessonDecks/pim';
import { rpfCheck, ssmTree, viaSharedTree, viaSourceTree } from './pim';

const delivery = (result: ReturnType<typeof viaSourceTree>, receiver: string) =>
  result.deliveries.find((d) => d.receiver === receiver)!;

describe('TC-2313: pim deck facts', () => {
  it('q1: with the RP on R3, after the switch only R6’s traffic still crosses R3', () => {
    const after = viaSourceTree('R3');
    expect(after.deliveries.map((d) => [d.receiver, d.viaRp])).toEqual([
      ['R5', false],
      ['R6', true],
      ['R7', false],
    ]);
    expect(delivery(after, 'R6').path).toEqual(['R1', 'R2', 'R3', 'R6']);
  });

  it('q2: on the source tree R5 accepts only from R4, so a copy from R3 fails RPF', () => {
    expect(rpfCheck('R5', 'R3', { tree: 'source' })).toEqual({
      rpfNeighbour: 'R4',
      accepted: false,
    });
    expect(rpfCheck('R5', 'R4', { tree: 'source' }).accepted).toBe(true);
  });

  it('q3: with the RP on R6, R5’s traffic climbs to R6 and back via R3 (13 ms against 5 ms)', () => {
    const before = delivery(viaSharedTree('R6'), 'R5');
    expect(before.path).toEqual(['R1', 'R2', 'R3', 'R6', 'R3', 'R5']);
    expect(before.delayMs).toBe(13);
    expect(delivery(viaSourceTree('R6'), 'R5').delayMs).toBe(5);
  });

  it('q4: SSM builds the source tree at once and nothing passes an RP', () => {
    const ssm = ssmTree();
    expect(ssm.deliveries.every((d) => !d.viaRp)).toBe(true);
    expect(ssm.deliveries.map((d) => d.path)).toEqual(
      viaSourceTree('R3').deliveries.map((d) => d.path),
    );
  });
});

describe('pim deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.pim.${q}`;
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
