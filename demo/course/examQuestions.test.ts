import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../Gallery';
import { EXAM_LEVELS } from './examLevels';
import {
  EXAM_PASS_MARK,
  EXAM_PATH,
  EXAM_QUESTIONS,
  scoreExam,
  type ExamAnswer,
} from './examQuestions';

const allRight = Object.fromEntries(EXAM_QUESTIONS.map((q) => [q.id, q.answer as ExamAnswer]));

describe('final test (TC-196)', () => {
  it('has ten questions', () => {
    expect(EXAM_QUESTIONS).toHaveLength(10);
  });

  it('gives ten for ten right answers, and passes', () => {
    expect(scoreExam(allRight)).toMatchObject({ score: 10, passed: true });
  });

  it('scores "not learned" and blanks as wrong', () => {
    const honest = Object.fromEntries(EXAM_QUESTIONS.map((q) => [q.id, 'not-learned' as const]));
    expect(scoreExam(honest).score).toBe(0);
    expect(scoreExam({}).score).toBe(0);
  });

  it('passes at the pass mark and not below it', () => {
    const missing = (n: number) => {
      const answers: Record<string, ExamAnswer> = { ...allRight };
      for (const q of EXAM_QUESTIONS.slice(0, n)) answers[q.id] = 'not-learned';
      return scoreExam(answers);
    };
    expect(missing(10 - EXAM_PASS_MARK).passed).toBe(true);
    expect(missing(10 - EXAM_PASS_MARK + 1).passed).toBe(false);
  });

  it('sends every question to a lesson that exists', () => {
    const routes = new Set(CATEGORIES.flatMap((c) => c.demos.map((d) => d.path)));
    routes.add('/course');
    for (const q of EXAM_QUESTIONS) {
      const stop = EXAM_PATH.find((s) => s.id === q.taughtBy);
      expect(stop, `${q.id} names a stop on the path`).toBeDefined();
      expect(routes.has(stop!.path), `${stop!.path} is a real lesson`).toBe(true);
    }
  });
});

describe('every test level (TC-202)', () => {
  const routes = new Set(CATEGORIES.flatMap((c) => c.demos.map((d) => d.path)));
  routes.add('/course');

  it('numbers its levels 1, 2, 3… in order', () => {
    expect(EXAM_LEVELS.map((level) => level.level)).toEqual(EXAM_LEVELS.map((_, i) => i + 1));
  });

  for (const level of EXAM_LEVELS) {
    it(`level ${level.level} has ten questions, each taught by a real lesson on its path`, () => {
      expect(level.questions).toHaveLength(10);
      expect(new Set(level.questions.map((q) => q.id)).size, 'question ids are unique').toBe(10);
      for (const q of level.questions) {
        const stop = level.path.find((s) => s.id === q.taughtBy);
        expect(stop, `${q.id} names a stop on level ${level.level}'s path`).toBeDefined();
        expect(routes.has(stop!.path), `${stop!.path} is a real lesson`).toBe(true);
        expect(new Set(q.options.map((o) => o.ja)).size, `${q.id} has four different answers`).toBe(
          4,
        );
      }
    });
  }
});

describe('level 1 questions do not give their answers away (TC-322)', () => {
  for (const locale of ['en', 'ja'] as const) {
    it(`never makes the right option the single longest (${locale})`, () => {
      for (const q of EXAM_QUESTIONS) {
        const lengths = q.options.map((option) => option[locale].length);
        const others = lengths.filter((_, index) => index !== q.answer);
        expect(lengths[q.answer], `${q.id}: the right option stands out by length`).toBeLessThan(
          Math.max(...others) + 1,
        );
      }
    });

    it(`keeps the four options of similar length (${locale})`, () => {
      for (const q of EXAM_QUESTIONS) {
        const lengths = q.options.map((option) => option[locale].length);
        expect(
          Math.max(...lengths),
          `${q.id}: one option is more than twice the shortest`,
        ).toBeLessThanOrEqual(2 * Math.min(...lengths));
      }
    });
  }

  it('explains without the terms the beginner lessons do not teach', () => {
    for (const q of EXAM_QUESTIONS) {
      for (const term of ['ビット', '次ホップ', 'ESTABLISHED', 'フレームに書く']) {
        expect(q.explanation.ja, `${q.id} uses ${term}`).not.toContain(term);
        expect(q.explanation.en, `${q.id} uses ${term}`).not.toContain(term);
      }
    }
  });

  it('does not put the right answer in the same written position throughout', () => {
    expect(new Set(EXAM_QUESTIONS.map((q) => q.answer)).size).toBe(4);
  });
});
