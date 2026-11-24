/** The optical concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { optical as en } from '../../src/i18n/locales/en/concept/decks/optical';
import { optical as ja } from '../../src/i18n/locales/ja/concept/decks/optical';
import { DECK } from '../../src/learning/concept-check/lessonDecks/optical';
import { ASKED_LINK, FIBRES, budget, dwdmGrid } from './optical';

describe('TC-2489: optical deck facts', () => {
  it('q1: 30 km at 1310 nm loses 12 dB in all and leaves a thin 2 dB margin', () => {
    expect(budget(ASKED_LINK)).toMatchObject({
      totalLossDb: 12,
      rxDbm: -12,
      marginDb: 2,
      verdict: 'thin',
    });
  });

  it('q2: at 1550 nm the fibre costs 7.5 dB instead of 10.5, with the same connectors, leaving 5 dB', () => {
    const at1310 = budget(ASKED_LINK);
    const at1550 = budget({ ...ASKED_LINK, fibre: 'smf-1550' });
    expect(FIBRES['smf-1550'].txDbm).toBe(FIBRES['smf-1310'].txDbm);
    expect(at1310.fibreLossDb - at1550.fibreLossDb).toBe(3);
    expect(at1550.connectorLossDb).toBe(at1310.connectorLossDb);
    expect(at1550.marginDb).toBe(5);
  });

  it('q3: 500 m of OM3 loses 2.5 dB and keeps over 6 dB of margin, but is past the 300 m reach', () => {
    const result = budget({ fibre: 'mmf-850', km: 0.5, connectors: 2 });
    expect(result.totalLossDb).toBe(2.5);
    expect(result.marginDb).toBeGreaterThan(6);
    expect(result).toMatchObject({ verdict: 'down', limit: 'reach' });
    expect(FIBRES['mmf-850'].reachKm).toBe(0.3);
  });

  it('q4: the 100 GHz grid fits 44 channels in 1530–1565 nm, 0.8 nm apart', () => {
    const grid = dwdmGrid(100);
    expect(grid.count).toBe(44);
    expect(grid.spacingNmAt1550).toBeCloseTo(0.8, 1);
  });
});

describe('optical deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.optical.${q}`;
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

  it('every question has a prompt, three options, a why and a why for each wrong option', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.optical.${q}`;
        for (const key of ['prompt', 'a', 'b', 'c', 'why'])
          expect(catalog[`${base}.${key}`], `${base}.${key}`).toBeTruthy();
        for (const letter of ['a', 'b', 'c'].filter((l) => l !== answer))
          expect(catalog[`${base}.${letter}.why`], `${base}.${letter}.why`).toBeTruthy();
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
