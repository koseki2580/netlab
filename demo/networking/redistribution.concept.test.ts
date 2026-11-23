/** The redistribution concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { redistribution as en } from '../../src/i18n/locales/en/concept/decks/redistribution';
import { redistribution as ja } from '../../src/i18n/locales/ja/concept/decks/redistribution';
import { DECK } from '../../src/learning/concept-check/lessonDecks/redistribution';
import {
  DEFAULT_AD,
  RAISED_OSPF_EXTERNAL_AD,
  RIP_TAG,
  chooseSource,
  simulate,
} from './redistribution';

describe('TC-2316: redistribution deck facts', () => {
  it('q1: OSPF (AD 110) beats RIP (AD 120) whatever the metrics', () => {
    expect(chooseSource(['ospf-r8', 'rip-r9'])).toBe('ospf-r8');
    expect([DEFAULT_AD.ospf, DEFAULT_AD.rip]).toEqual([110, 120]);
  });

  it('q2: with no fix R2 goes through O2, O1 and R1: 4 hops instead of 1', () => {
    expect(simulate('none').pathFromR2).toEqual({
      routers: ['R2', 'O2', 'O1', 'R1', 'RA'],
      hops: 4,
      loop: false,
      reached: true,
    });
  });

  it('q3: with tags R2 filters the tagged OSPF route and installs RIP via RA', () => {
    const r2 = simulate('tag').tables.R2;
    expect(r2.candidates.find((c) => c.protocol === 'ospf')).toMatchObject({
      tag: RIP_TAG,
      filtered: true,
    });
    expect(r2.installed).toMatchObject({ protocol: 'rip', via: 'RA' });
  });

  it('q4: with distance 125 R2 keeps RIP and reaches RA in 1 hop', () => {
    const outcome = simulate('distance');
    expect(RAISED_OSPF_EXTERNAL_AD).toBe(125);
    expect(outcome.tables.R2.installed).toMatchObject({ protocol: 'rip', via: 'RA', ad: 120 });
    expect(outcome.pathFromR2).toMatchObject({ hops: 1, reached: true });
    // OSPF still knows the prefix: O1 has it.
    expect(outcome.tables.O1.installed?.protocol).toBe('ospf');
  });
});

describe('redistribution deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.redistribution.${q}`;
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
