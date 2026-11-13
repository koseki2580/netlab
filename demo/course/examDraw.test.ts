import { describe, expect, it } from 'vitest';
import { drawQuestions, questionsOf } from './examDraw';
import { EXAM_LEVELS, examLevel } from './examLevels';
import { EXAM_PASS_MARK, scoreQuestions } from './examQuestions';

const POOLED = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => examLevel(level)!);
const SEEDS = Array.from({ length: 200 }, (_, seed) => seed);

// TC-1350
describe('every level holds a pool of thirty in ten slots of three (TC-1350, TC-1357)', () => {
  for (const level of POOLED) {
    it(`level ${level.level}`, () => {
      const slots = level.slots!;
      expect(slots).toHaveLength(10);
      for (const slot of slots) {
        expect(slot).toHaveLength(3);
        expect(new Set(slot.map((q) => q.taughtBy)).size, slot[0]!.id).toBe(1);
        expect(level.path.some((stop) => stop.id === slot[0]!.taughtBy)).toBe(true);
      }
    });
  }
});

// TC-1351
describe('a draw asks one question from each slot (TC-1351)', () => {
  for (const level of POOLED) {
    it(`level ${level.level}`, () => {
      const stops = new Set(level.slots!.map((slot) => slot[0]!.taughtBy));
      for (const seed of SEEDS) {
        const drawn = drawQuestions(level, seed);
        expect(drawn).toHaveLength(10);
        drawn.forEach((q, index) => expect(level.slots![index]).toContain(q));
        expect(new Set(drawn.map((q) => q.taughtBy))).toEqual(stops);
        expect(drawQuestions(level, seed)).toEqual(drawn);
      }
      // Different seeds do not all draw the same ten.
      expect(
        new Set(
          SEEDS.map((seed) =>
            drawQuestions(level, seed)
              .map((q) => q.id)
              .join(),
          ),
        ).size,
      ).toBeGreaterThan(10);
    });
  }
});

// TC-1352
describe('the attempt after a failed one is mostly different (TC-1352)', () => {
  for (const level of POOLED) {
    it(`level ${level.level}: at most two of ten repeat`, () => {
      for (const seed of SEEDS) {
        const first = drawQuestions(level, seed).map((q) => q.id);
        const next = drawQuestions(level, seed + 1, first).map((q) => q.id);
        expect(next.filter((id) => first.includes(id)).length).toBeLessThanOrEqual(2);
      }
    });

    // TC-1358: the attempt after that avoids both of the last two.
    it(`level ${level.level}: attempt N+2 repeats at most two of attempt N`, () => {
      for (const seed of SEEDS) {
        const first = drawQuestions(level, seed).map((q) => q.id);
        const second = drawQuestions(level, seed + 1, first).map((q) => q.id);
        const third = drawQuestions(level, seed + 2, [...second, ...first]).map((q) => q.id);
        expect(third.filter((id) => first.includes(id)).length).toBeLessThanOrEqual(2);
        expect(third.filter((id) => second.includes(id)).length).toBeLessThanOrEqual(2);
      }
    });
  }
});

// TC-1353
describe('every pooled question meets the stage-test rules (TC-1353)', () => {
  for (const level of POOLED) {
    const pool = level.slots!.flat();
    // TC-1428: every question of every level meets the length rules (REQ-199).
    const ruled = pool;
    for (const locale of ['en', 'ja'] as const) {
      it(`level ${level.level}: the right option is never the single longest, and none is twice another (${locale})`, () => {
        for (const q of ruled) {
          const lengths = q.options.map((option) => option[locale].length);
          const others = lengths.filter((_, index) => index !== q.answer);
          expect(lengths[q.answer], q.id).toBeLessThanOrEqual(Math.max(...others));
          expect(Math.max(...lengths), q.id).toBeLessThanOrEqual(2 * Math.min(...lengths));
        }
      });
    }
    it(`level ${level.level}: the right place varies and each explanation names its lesson`, () => {
      expect(new Set(pool.map((q) => q.answer)).size).toBe(4);
      // The original ten of levels 1–4 predate the rule; every question added to a pool meets it.
      const named = level.level <= 4 ? level.slots!.flatMap((slot) => slot.slice(1)) : pool;
      for (const q of named) {
        expect(q.prompt.ja.length, q.id).toBeGreaterThan(0);
        expect(q.explanation.en, q.id).toMatch(/lesson|course|practice|drill/);
        expect(q.explanation.ja, q.id).toMatch(/レッスン|コース|練習/);
      }
    });
  }

  it('uses no question id twice across every level and pool', () => {
    const ids = EXAM_LEVELS.flatMap((level) => (level.slots ?? [level.questions]).flat()).map(
      (q) => q.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// TC-1354
describe('a stored attempt from before the pools keeps its meaning (TC-1354)', () => {
  it('asks the original ten, and passes at eight', () => {
    for (const level of POOLED) {
      expect(questionsOf(level, undefined)).toEqual(level.questions);
      const ids = drawQuestions(level, 3).map((q) => q.id);
      expect(questionsOf(level, ids).map((q) => q.id)).toEqual(ids);
    }
    const ten = questionsOf(POOLED[1]!, undefined);
    const answers = Object.fromEntries(
      ten.slice(0, EXAM_PASS_MARK).map((q) => [q.id, q.answer] as const),
    );
    expect(scoreQuestions(ten, answers).passed).toBe(true);
    expect(EXAM_PASS_MARK).toBe(8);
  });
});
