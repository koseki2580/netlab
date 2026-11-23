/** The `spineleaf` concept deck: each right answer is what the spine-leaf lesson model says. */
import { describe, expect, it } from 'vitest';
import { spineleaf as en } from '../../src/i18n/locales/en/concept/decks/spineleaf';
import { spineleaf as ja } from '../../src/i18n/locales/ja/concept/decks/spineleaf';
import { DECK } from '../../src/learning/concept-check/lessonDecks/spineleaf';
import {
  HOST_GBPS,
  HOST_PORTS,
  capacityLeftPct,
  leafToLeafHops,
  leafToLeafPaths,
  oversubscription,
  uplinkGbps,
} from './spineLeaf';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2321: spineleaf deck: the right answers hold in the lesson model', () => {
  it('q1 (b): any two leaves are three switches apart, in a small or a large fabric', () => {
    expect(answer('q1')).toBe('b');
    expect(leafToLeafHops({ leaves: 8, spines: 4, failed: 0 })).toBe(3);
    expect(leafToLeafHops({ leaves: 32, spines: 6, failed: 0 })).toBe(3);
  });
  it('q2 (c): one of four spines down leaves 75 % of the capacity and three paths', () => {
    expect(answer('q2')).toBe('c');
    const hurt = { leaves: 8, spines: 4, failed: 1 };
    expect(capacityLeftPct(hurt)).toBe(75);
    expect(leafToLeafPaths(hurt)).toBe(3);
    expect(leafToLeafHops(hurt)).toBe(3);
  });
  it('q3 (a): 1200 Gbit/s of hosts over 400 Gbit/s of uplinks is 3:1', () => {
    expect(answer('q3')).toBe('a');
    const fabric = { leaves: 8, spines: 4, failed: 0 };
    expect(HOST_PORTS * HOST_GBPS).toBe(1200);
    expect(uplinkGbps(fabric)).toBe(400);
    expect(oversubscription(fabric)).toBe(3);
  });
  it('q4 (b): a leaf with four spines has four equal-cost paths to another leaf', () => {
    expect(answer('q4')).toBe('b');
    expect(leafToLeafPaths({ leaves: 8, spines: 4, failed: 0 })).toBe(4);
  });
});

describe('spineleaf deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.spineleaf.${question}.${key}`];
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
