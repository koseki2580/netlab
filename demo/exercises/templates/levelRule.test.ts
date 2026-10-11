// @vitest-environment node
/**
 * The level rule, tried on learners who do not read. Four of them press their
 * way through ten exercises of the real pool, 200 times each, graded by the
 * real grader and judged by the real rule. None may reach "cleared" in more
 * than 2% of the runs; a learner who solves nearly everything on the first
 * Check must.
 */

import { describe, expect, it } from 'vitest';
import type { ExerciseLevel } from '../model/types';
import { levelSummary, REQUIRED_KINDS } from '../store/estimate';
import type { AttemptRecord } from '../store/types';
import { exerciseById, TEMPLATES } from './index';
import { clearRate, recordExtras, servedOrder, STRATEGIES } from './pressers';

const RUNS = Number(process.env.EXERCISE_PRESSER_RUNS ?? 200);
const LIMIT = 0.02;

/** A learner who knows the material: `miss` (a turn, or none) is the one exercise not solved. */
function carefulRun(level: ExerciseLevel, offset: number, miss: number | null): AttemptRecord[] {
  return servedOrder(level)
    .slice(offset, offset + 10)
    .flatMap((exerciseId, turn) => {
      const exercise = exerciseById(exerciseId);
      if (!exercise) return [];
      const startedAt = turn * 1000 + 1;
      const solved = turn !== miss;
      return [
        {
          id: `${exerciseId}@${startedAt}`,
          exerciseId,
          templateId: exercise.templateId,
          level,
          kind: exercise.kind,
          context: 'practice' as const,
          startedAt,
          endedAt: startedAt + 500,
          outcome: solved ? ('passed' as const) : ('abandoned' as const),
          checkPresses: solved ? 1 : 3,
          firstCheckPassed: solved,
          failedCheckIds: [],
          hintsUsed: 0 as const,
          revealed: false,
          changedSettings: 1,
          locale: 'ja' as const,
          generatorVersion: exercise.generatorVersion,
          ...recordExtras(exercise),
        },
      ];
    });
}

// TC-585
describe.each([1, 2] as const)('level %i: learners who only press', (level) => {
  it.each(STRATEGIES)(
    `"%s" clears the level in under ${LIMIT * 100}% of ${RUNS} runs of ten exercises`,
    async (strategy) => {
      const rate = await clearRate(level, strategy, RUNS);
      console.log(
        `level ${level}, ${strategy}: cleared in ${(rate * 100).toFixed(1)}% of ${RUNS} runs`,
      );
      expect(rate).toBeLessThan(LIMIT);
    },
    900_000,
  );
});

// TC-584
describe('the kinds of task a level requires', () => {
  it.each([1, 2] as const)('level %i: exactly the kinds its templates have', (level) => {
    const kinds = new Set(
      TEMPLATES.filter((template) => template.level === level).map((template) => template.kind),
    );
    expect([...REQUIRED_KINDS[level]].sort()).toEqual([...kinds].sort());
  });
});

// TC-586
describe.each([1, 2] as const)('level %i: a learner who knows the material', (level) => {
  it('clears it with ten clean solves, wherever in the pool the ten begin', () => {
    for (const offset of [0, 3, 11, 40]) {
      expect(levelSummary(carefulRun(level, offset, null), level).status).toBe('cleared');
    }
  });

  it('clears it with nine clean solves and one miss, when that kind of exercise was solved elsewhere', () => {
    const served = servedOrder(level).slice(0, 10);
    const kinds = served.map((id) => exerciseById(id)?.kind);
    for (const [miss, kind] of kinds.entries()) {
      const others = kinds.filter((other, turn) => turn !== miss && other === kind).length;
      const status = levelSummary(carefulRun(level, 0, miss), level).status;
      if (others > 0) expect(status, `missing turn ${miss}`).toBe('cleared');
    }
  });
});
