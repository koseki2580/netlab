import { describe, expect, it } from 'vitest';
// The concept-check strings are a lazy-loaded sub-catalog (kept out of the root
// bundle), so they live in their own files rather than the assembled en/ja.
import { conceptCheck as en } from '../../i18n/locales/en/conceptCheck';
import { conceptCheck as ja } from '../../i18n/locales/ja/conceptCheck';
import { CONCEPT_DECKS } from './decks';
import {
  correctOption,
  deckMastery,
  decksByLayer,
  getDeck,
  isCorrectChoice,
  questionItemId,
} from './grade';

describe('concept-check decks', () => {
  it('every deck has a unique id, a name key, and at least one question', () => {
    const ids = CONCEPT_DECKS.map((deck) => deck.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const deck of CONCEPT_DECKS) {
      expect(deck.nameKey).toMatch(/^learning\.concept\./);
      expect(deck.questions.length).toBeGreaterThan(0);
    }
  });

  it('every question has exactly one correct option among three choices', () => {
    for (const deck of CONCEPT_DECKS) {
      for (const question of deck.questions) {
        expect(question.options).toHaveLength(3);
        const correct = question.options.filter((option) => option.correct);
        expect(correct, `${deck.id}/${question.id}`).toHaveLength(1);
      }
    }
  });

  it('the correct answer is not always in the same slot (varied positions)', () => {
    const slots = new Set<number>();
    for (const deck of CONCEPT_DECKS) {
      for (const question of deck.questions) {
        slots.add(question.options.findIndex((option) => option.correct));
      }
    }
    expect(slots.size).toBeGreaterThan(1);
  });

  it('every catalog key referenced by a deck exists in both en and ja', () => {
    for (const deck of CONCEPT_DECKS) {
      const keys = [
        deck.nameKey,
        ...deck.questions.flatMap((question) => [
          question.promptKey,
          question.explanationKey,
          ...question.options.flatMap((option) =>
            option.whyKey ? [option.key, option.whyKey] : [option.key],
          ),
        ]),
      ];
      for (const key of keys) {
        expect(en, `en missing ${key}`).toHaveProperty([key]);
        expect(ja, `ja missing ${key}`).toHaveProperty([key]);
      }
    }
  });

  // Enforce the distractor-explanation schema invariants so a future deck cannot
  // silently regress the feature (a missing whyKey would fall back to the general
  // explanation; a typo'd whyKey could point at a different existing key).
  it('every wrong option has whyKey === key + ".why"; correct options have none', () => {
    for (const deck of CONCEPT_DECKS) {
      for (const question of deck.questions) {
        for (const option of question.options) {
          if (option.correct) {
            expect(
              option.whyKey,
              `${option.key} is correct and must not carry a whyKey`,
            ).toBeUndefined();
          } else {
            expect(option.whyKey, `${option.key} (wrong) must have its whyKey`).toBe(
              `${option.key}.why`,
            );
          }
        }
      }
    }
  });

  it('grading helpers identify the correct choice', () => {
    const arp = getDeck('arp');
    expect(arp).toBeDefined();
    const q1 = arp!.questions[0]!;
    const right = correctOption(q1)!;
    expect(isCorrectChoice(q1, right.key)).toBe(true);
    const wrong = q1.options.find((option) => !option.correct)!;
    expect(isCorrectChoice(q1, wrong.key)).toBe(false);
  });

  it('deckMastery counts seen and mastered questions from the supplied predicates', () => {
    const arp = getDeck('arp')!;
    const ids = arp.questions.map((question) => questionItemId(arp.id, question.id));

    // Nothing answered yet.
    expect(
      deckMastery(
        arp,
        () => false,
        () => false,
      ),
    ).toEqual({
      seen: 0,
      mastered: 0,
      total: arp.questions.length,
    });

    // First two seen, the first one mastered.
    const seen = new Set([ids[0]!, ids[1]!]);
    const mastered = new Set([ids[0]!]);
    const progress = deckMastery(
      arp,
      (id) => seen.has(id),
      (id) => mastered.has(id),
    );
    expect(progress.seen).toBe(2);
    expect(progress.mastered).toBe(1);
    expect(progress.total).toBe(arp.questions.length);
  });

  it('groups decks by layer in stack order, covering several layers', () => {
    const groups = decksByLayer();
    expect(groups.length).toBeGreaterThanOrEqual(4);
    expect(groups.map((group) => group.layer)).toEqual([
      ...new Set(groups.map((group) => group.layer)),
    ]);
  });
});
