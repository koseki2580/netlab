/** The maclearning concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { maclearning as en } from '../../src/i18n/locales/en/concept/decks/maclearning';
import { maclearning as ja } from '../../src/i18n/locales/ja/concept/decks/maclearning';
import { DECK } from '../../src/learning/concept-check/lessonDecks/maclearning';
import { AGEING_TIME_S, HOSTS, SCENE_ONE, agedScene, movedScene, replay } from './macLearning';

describe('TC-2409: maclearning deck facts', () => {
  it('q1: on an empty table, A → B is flooded out of ports 2, 3 and 4', () => {
    expect(replay(SCENE_ONE)[0]).toMatchObject({
      egress: [2, 3, 4],
      kind: 'flood',
      reason: 'unknown',
    });
  });

  it('q2: the first frame teaches the switch only that A is on port 1', () => {
    expect(replay(SCENE_ONE)[0]!.tableAfter).toEqual([{ mac: HOSTS.A.mac, port: 1, lastSeenS: 0 }]);
  });

  it('q3: after A silently moves to port 3, B → A leaves by port 1 alone and A misses it', () => {
    expect(movedScene()[0]).toMatchObject({ egress: [1], kind: 'forward', delivered: false });
  });

  it('q4: with the 300 s default, 400 s of silence ages A out and B → A floods out of 1, 3 and 4', () => {
    expect(AGEING_TIME_S).toBe(300);
    expect(agedScene(400)).toMatchObject({ egress: [1, 3, 4], kind: 'flood', delivered: true });
  });
});

describe('maclearning deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.maclearning.${q}`;
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
        const base = `learning.concept.maclearning.${q}`;
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
