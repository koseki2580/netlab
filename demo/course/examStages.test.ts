import { describe, expect, it } from 'vitest';
import { EXAM_LEVELS } from './examLevels';
import { EXAM_STAGE_1 } from './examStage1';
import { EXAM_STAGE_2 } from './examStage2';
import { EXAM_STAGE_3 } from './examStage3';
import { EXAM_STAGE_7 } from './examStage7';
import { STAGES } from './stages';

const STAGE_TESTS = [
  { stage: 1, level: EXAM_STAGE_1 },
  { stage: 2, level: EXAM_STAGE_2 },
  { stage: 3, level: EXAM_STAGE_3 },
  { stage: 7, level: EXAM_STAGE_7 },
] as const;

// TC-963
describe('the stage tests do not give their answers away (TC-963)', () => {
  for (const { stage, level } of STAGE_TESTS) {
    for (const locale of ['en', 'ja'] as const) {
      it(`stage ${stage}: the right option is never the single longest (${locale})`, () => {
        for (const q of level.questions) {
          const lengths = q.options.map((option) => option[locale].length);
          const others = lengths.filter((_, index) => index !== q.answer);
          expect(lengths[q.answer], `${q.id}`).toBeLessThanOrEqual(Math.max(...others));
        }
      });

      it(`stage ${stage}: the four options are of similar length (${locale})`, () => {
        for (const q of level.questions) {
          const lengths = q.options.map((option) => option[locale].length);
          expect(Math.max(...lengths), `${q.id}`).toBeLessThanOrEqual(2 * Math.min(...lengths));
        }
      });
    }

    it(`stage ${stage}: the right answer is not always in the same written place`, () => {
      expect(new Set(level.questions.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
    });

    it(`stage ${stage}: every explanation names the lesson that shows it`, () => {
      for (const q of level.questions) {
        expect(q.explanation.en, `${q.id}`).toMatch(/lesson|course|practice|drill/);
        expect(q.explanation.ja, `${q.id}`).toMatch(/レッスン|コース|練習/);
      }
    });
  }

  it('uses no question id twice across every level', () => {
    const ids = EXAM_LEVELS.flatMap((level) => level.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// TC-964
describe('a stage test asks only about its own stage (TC-964)', () => {
  for (const { stage, level } of STAGE_TESTS) {
    it(`stage ${stage}: every lesson on the test's path is a lesson of that stage`, () => {
      const own = STAGES.find((entry) => entry.number === stage)!;
      const lessons = new Set<string>([...own.lessons, ...(own.withCourse ? ['/course'] : [])]);
      for (const stop of level.path) expect(lessons.has(stop.path), stop.path).toBe(true);
    });
  }

  it('stage 7 asks nothing about a topic it lists as coming soon', () => {
    const stage7 = STAGES.find((entry) => entry.number === 7)!;
    const text = EXAM_STAGE_7.questions
      .flatMap((q) => [q.prompt.en, ...q.options.map((o) => o.en)])
      .join(' ');
    for (const topic of ['VPC', 'SD-WAN', 'telemetry', 'L4S', 'MASQUE', 'ECH']) {
      expect(text, topic).not.toContain(topic);
    }
    expect(stage7.comingSoon.length).toBeGreaterThan(0);
  });
});
