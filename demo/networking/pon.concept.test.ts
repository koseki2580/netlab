/** The pon concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { pon as en } from '../../src/i18n/locales/en/concept/decks/pon';
import { pon as ja } from '../../src/i18n/locales/ja/concept/decks/pon';
import { DECK } from '../../src/learning/concept-check/lessonDecks/pon';
import { CLASSES, FRAME_US, TECHS, budget, dbaGrants, share, splitterLoss } from './pon';

const cls = (id: string) => CLASSES.find((c) => c.id === id)!;

describe('TC-2559: pon deck facts', () => {
  it('q1: 32 busy homes on XGS-PON get 311.04 Mb/s each of the 9953.28 Mb/s line rate', () => {
    expect(TECHS.xgspon.downMbps).toBe(9953.28);
    expect(share('xgspon', 32).downMbps).toBe(311.04);
  });

  it('q2: XGS-PON sends downstream on one wavelength for every ONU', () => {
    // One downstream wavelength per technology: every ONU receives the same light.
    expect(TECHS.xgspon.downNm).toBe(1577);
    expect(share('xgspon', 1).downMbps).toBe(TECHS.xgspon.downMbps);
  });

  it('q3: 1:64 (21 dB) + 20 km (7 dB) + 4 connectors (2 dB) = 30 dB: 1 dB over N1, within N2', () => {
    expect(splitterLoss(64).typicalDb).toBe(21);
    const plant = { split: 64, km: 20, connectors: 4 };
    expect(budget(plant, cls('N1'))).toMatchObject({
      splitterDb: 21,
      fibreDb: 7,
      connectorDb: 2,
      totalDb: 30,
      marginDb: -1,
      verdict: 'over',
    });
    expect(cls('N2')).toMatchObject({ minDb: 16, maxDb: 31 });
    expect(budget(plant, cls('N2')).verdict).toBe('ok');
  });

  it('q4: the OLT’s grants place the bursts one after another in each 125 µs frame', () => {
    const grants = dbaGrants('xgspon', [8000, 500, 4000, 6000]);
    expect(grants[0]!.startUs).toBe(0);
    for (let i = 1; i < grants.length; i++) {
      expect(grants[i]!.startUs).toBe(grants[i - 1]!.endUs);
    }
    expect(grants[grants.length - 1]!.endUs).toBe(FRAME_US);
  });
});

describe('pon deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.pon.${q}`;
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
