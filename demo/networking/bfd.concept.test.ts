/** The `bfd` concept deck: each right answer is what the BFD lesson model says. */
import { describe, expect, it } from 'vitest';
import { bfd as en } from '../../src/i18n/locales/en/concept/decks/bfd';
import { bfd as ja } from '../../src/i18n/locales/ja/concept/decks/bfd';
import { DECK } from '../../src/learning/concept-check/lessonDecks/bfd';
import { DETECTORS, bfdDetector, detectionMs, detectionRange, outage } from './bfd';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];
const detector = (id: string) => DETECTORS.find((entry) => entry.id === id)!;

describe('TC-2301: bfd deck: the right answers hold in the lesson model', () => {
  it('q1 (b): default OSPF, failure just after a hello: 40 s to detect, about 40 s lost', () => {
    expect(answer('q1')).toBe('b');
    expect(outage(detector('ospf-default'), 0)).toMatchObject({
      detectMs: 40_000,
      outageMs: 40_200,
    });
  });
  it('q2 (c): BFD 50 ms × 3 detects in 150 ms', () => {
    expect(answer('q2')).toBe('c');
    expect(detectionMs(detector('bfd-50'), 0)).toBe(150);
    expect(detectionMs(bfdDetector(50, 3), 0)).toBe(150);
  });
  it('q3 (a): a failure 9 s after the last hello is noticed 31 s later; always between 30 and 40 s', () => {
    expect(answer('q3')).toBe('a');
    expect(detectionMs(detector('ospf-default'), 9_000)).toBe(31_000);
    expect(detectionRange(detector('ospf-default'))).toEqual({ worst: 40_000, best: 30_001 });
  });
});

describe('bfd deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.bfd.${question}.${key}`];
        const wrong = (['a', 'b', 'c'] as const).filter((letter) => letter !== right);
        for (const key of ['prompt', 'why', 'a', 'b', 'c', ...wrong.map((l) => `${l}.why`)])
          expect(text(key), `${question}.${key}`).toBeTruthy();
        const longestWrong = Math.max(...wrong.map((letter) => text(letter)!.length));
        expect(text(right)!.length / longestWrong, question).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer is not always the same letter', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
