import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../Gallery';
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
