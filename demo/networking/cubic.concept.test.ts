/** The cubic concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { cubic as en } from '../../src/i18n/locales/en/concept/decks/cubic';
import { cubic as ja } from '../../src/i18n/locales/ja/concept/decks/cubic';
import { DECK } from '../../src/learning/concept-check/lessonDecks/cubic';
import { cubicRecovery, renoRecovery, tailLoss, windowPackets } from './tcpCubic';

describe('TC-2479: cubic deck facts', () => {
  it('q1: on 10 Gb/s, 100 ms Reno needs over an hour (41,667 round trips); CUBIC about 40 s', () => {
    const w = windowPackets(10e9, 100);
    expect(w).toBe(83_333);
    expect(renoRecovery(w, 100).seconds).toBeGreaterThan(3600);
    expect(Math.round(renoRecovery(w, 100).seconds / 60)).toBe(69);
    expect(Math.round(cubicRecovery(w, 100).seconds)).toBe(40);
  });

  it('q2: for the same W_max, CUBIC’s recovery time is the same at 50 ms and 200 ms; Reno’s is 4 times longer', () => {
    const w = 83_333;
    expect(cubicRecovery(w, 200).seconds).toBeCloseTo(cubicRecovery(w, 50).seconds, 9);
    expect(renoRecovery(w, 200).seconds).toBeCloseTo(4 * renoRecovery(w, 50).seconds, 6);
  });

  it('q3: SRTT 50 ms, last 2 of 10 lost: TLP first resends at 150 ms, an RTO only at 1,050 ms', () => {
    const result = tailLoss(50, 2);
    expect(result.ptoMs).toBe(100);
    expect(result.tlp.firstResendMs).toBe(150);
    expect(result.rtoOnly.firstResendMs).toBe(1050);
  });

  it('q4: after an RTO the window is 1 segment; after a probe-found loss it is 7 of 10', () => {
    const result = tailLoss(50, 2);
    expect(result.rtoOnly.windowAfter).toBe(1);
    expect(result.tlp.windowAfter).toBe(7);
  });
});

describe('cubic deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.cubic.${q}`;
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

  it('every wrong option has its own why, and the right one has none', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.cubic.${q}`;
        expect(catalog[`${base}.why`], base).toBeTruthy();
        for (const letter of ['a', 'b', 'c'] as const) {
          expect(catalog[`${base}.${letter}.why`] !== undefined, `${base}.${letter}`).toBe(
            letter !== answer,
          );
        }
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
