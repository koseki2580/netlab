/** The `timesync` concept deck: each right answer is what the time-sync lesson model says. */
import { describe, expect, it } from 'vitest';
import { timesync as en } from '../../src/i18n/locales/en/concept/decks/timesync';
import { timesync as ja } from '../../src/i18n/locales/ja/concept/decks/timesync';
import { DECK } from '../../src/learning/concept-check/lessonDecks/timesync';
import { PTP_SCENE, estimate, measure, ptp } from './timeSync';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];
const path = { trueOffset: 0, hold: 0, t1: 0 };

describe('TC-2459: timesync deck: the right answers hold in the lesson model', () => {
  it('q1 (b): t1 0, t2 110, t3 112, t4 22 give offset +100 ms and delay 20 ms', () => {
    expect(answer('q1')).toBe('b');
    expect(estimate({ t1: 0, t2: 110, t3: 112, t4: 22 })).toEqual({ offset: 100, delay: 20 });
  });
  it('q2 (c): 30 ms out and 10 ms back leave a 10 ms error', () => {
    expect(answer('q2')).toBe('c');
    expect(measure({ ...path, forward: 30, backward: 10 })).toMatchObject({ delay: 40, error: 10 });
  });
  it('q3 (a): with a 40 ms delay the error is at most 20 ms, reached when it is all one way', () => {
    expect(answer('q3')).toBe('a');
    expect(measure({ ...path, forward: 40, backward: 0 })).toMatchObject({ error: 20, bound: 20 });
  });
  it('q4 (b): a transparent clock leaves no error from the queues; an ordinary switch 190 µs', () => {
    expect(answer('q4')).toBe('b');
    const equalFibres = { ...PTP_SCENE, linkBackwardNs: PTP_SCENE.linkForwardNs };
    expect(ptp(equalFibres, 'transparent').errorNs).toBe(0);
    expect(ptp(equalFibres, 'ordinary').errorNs).toBe(190_000);
  });
});

describe('timesync deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, right] of DECK.answers) {
        const base = `learning.concept.timesync.${q}`;
        const length = catalog[`${base}.${right}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== right)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(length / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
