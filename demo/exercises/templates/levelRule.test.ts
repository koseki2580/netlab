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
import { LEVEL_KINDS, levelSummary } from '../store/estimate';
import type { AttemptRecord } from '../store/types';
import { exerciseById, TEMPLATES } from './index';
import {
  clearRate,
  learnerRun,
  recordExtras,
  REOPEN_STRATEGIES,
  servedNext,
  STRATEGIES,
  type Learner,
} from './pressers';

const RUNS = Number(process.env.EXERCISE_PRESSER_RUNS ?? 200);
const LIMIT = 0.02;

/**
 * A learner who knows the material, through `count` exercises as the page
 * serves them to that learner's record: `miss` (a turn, or none) is the one not solved.
 */
function carefulRun(level: ExerciseLevel, count: number, miss: number | null): AttemptRecord[] {
  const records: AttemptRecord[] = [];
  const seen: string[] = [];
  let lastKind: string | undefined;
  for (let turn = 0; turn < count; turn += 1) {
    const exerciseId = servedNext(level, '', seen, records, lastKind);
    const exercise = exerciseId === undefined ? undefined : exerciseById(exerciseId);
    if (exerciseId === undefined || !exercise) break;
    seen.push(exerciseId);
    lastKind = exercise.templateId;
    const startedAt = turn * 1000 + 1;
    const solved = turn !== miss;
    records.push({
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
    });
  }
  return records;
}

// TC-585
// TC-791 (level 3)
describe.each([1, 2, 3] as const)('level %i: learners who only press', (level) => {
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

// TC-599
// TC-792 (level 3)
describe.each([1, 2, 3] as const)('level %i: learners who open an exercise again', (level) => {
  it.each(REOPEN_STRATEGIES)(
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

/** Runs of a learner: how often the level read "cleared" after `count` exercises, and at any point within them. */
async function learnerRates(level: ExerciseLevel, learner: Learner, count: number, slip = 0) {
  let atEnd = 0;
  let within = 0;
  const solvedBy: Record<string, [number, number]> = {};
  for (let run = 0; run < RUNS; run += 1) {
    const result = await learnerRun(level, learner, run, count, slip);
    atEnd += result.clearedAtEnd ? 1 : 0;
    within += result.clearedAt !== null ? 1 : 0;
    for (const [templateId, [solved, met]] of Object.entries(result.solvedBy)) {
      const tally = (solvedBy[templateId] ??= [0, 0]);
      tally[0] += solved;
      tally[1] += met;
    }
  }
  const perKind = Object.entries(solvedBy)
    .map(([templateId, [solved, met]]) => `${templateId} ${Math.round((solved / met) * 100)}%`)
    .join(', ');
  return { atEnd: atEnd / RUNS, within: within / RUNS, perKind };
}

// TC-607, TC-913
describe('learners who know something', () => {
  it('a learner who only copies a neighbour’s first three numbers clears level 1 in under 10% of runs of ten exercises', async () => {
    const rates = await learnerRates(1, 'neighbour-habit', 10);
    console.log(
      `level 1, neighbour-habit: cleared after ten in ${(rates.atEnd * 100).toFixed(1)}%, at any point in ${(rates.within * 100).toFixed(1)}% of ${RUNS} runs [${rates.perKind}]`,
    );
    expect(rates.within).toBeLessThan(0.1);
  }, 900_000);

  it('the same learner clears level 2 never: nothing there is answered by that habit', async () => {
    const rates = await learnerRates(2, 'neighbour-habit', 10);
    console.log(
      `level 2, neighbour-habit: cleared at any point in ${(rates.within * 100).toFixed(1)}% of ${RUNS} runs`,
    );
    expect(rates.within).toBeLessThan(LIMIT);
  }, 900_000);

  it('a learner who applies every rule of level 1 clears it within twelve exercises in over 95% of runs', async () => {
    const rates = await learnerRates(1, 'knows-level-1', 12);
    console.log(
      `level 1, knows-level-1: cleared within twelve in ${(rates.within * 100).toFixed(1)}% of ${RUNS} runs [${rates.perKind}]`,
    );
    expect(rates.within).toBeGreaterThan(0.95);
  }, 900_000);

  // TC-813
  it('a learner who knows level 3 (writes what the task needs) clears it within twelve in over 95% of runs', async () => {
    const rates = await learnerRates(3, 'knows-level-3', 12);
    console.log(
      `level 3, knows-level-3: cleared within twelve in ${(rates.within * 100).toFixed(1)}% of ${RUNS} runs [${rates.perKind}]`,
    );
    expect(rates.within).toBeGreaterThan(0.95);
  }, 900_000);

  // TC-814
  it('a learner who knows only level 1 and 2 habits never clears level 3', async () => {
    const rates = await learnerRates(3, 'neighbour-habit', 10);
    console.log(
      `level 3, neighbour-habit: cleared at any point in ${(rates.within * 100).toFixed(1)}% of ${RUNS} runs [${rates.perKind}]`,
    );
    expect(rates.within).toBeLessThan(LIMIT);
  }, 900_000);

  it('and still clears it within twenty when one exercise in ten goes wrong, in most runs', async () => {
    const rates = await learnerRates(1, 'knows-level-1', 20, 0.1);
    console.log(
      `level 1, knows-level-1 with a slip in ten: cleared within twenty in ${(rates.within * 100).toFixed(1)}% of ${RUNS} runs`,
    );
    expect(rates.within).toBeGreaterThan(0.6);
  }, 900_000);
});

// TC-584
describe('the kinds of task a level requires', () => {
  // TC-794 (level 3)
  it.each([1, 2, 3] as const)('level %i: exactly its templates, in their order', (level) => {
    expect(LEVEL_KINDS[level]).toEqual(
      TEMPLATES.filter((template) => template.level === level).map((template) => template.id),
    );
  });
});

// TC-586
// TC-793 (level 3)
describe.each([1, 2, 3] as const)('level %i: a learner who knows the material', (level) => {
  const kinds = LEVEL_KINDS[level].length;

  it('clears it by solving one round: one exercise of every kind of task', () => {
    expect(levelSummary(carefulRun(level, kinds - 1, null), level).status).not.toBe('cleared');
    expect(levelSummary(carefulRun(level, Math.max(7, kinds), null), level).status).toBe('cleared');
    expect(levelSummary(carefulRun(level, 40, null), level).status).toBe('cleared');
  });

  it('after a miss, clears it by solving the next two exercises of that kind, and not before', () => {
    for (const miss of [0, 2, kinds - 1]) {
      const whole = carefulRun(level, 3 * kinds, miss);
      const missed = whole[miss]?.templateId;
      const turns = whole.flatMap((entry, turn) =>
        turn > miss && entry.templateId === missed ? [turn] : [],
      );
      const [again = -1, second = -1] = turns;
      expect(again).toBeGreaterThan(miss);
      // TC-658: the kind that was missed comes back as soon as the round is over, not a round later.
      expect(again).toBeLessThanOrEqual(Math.max(miss + 2, kinds + 1));
      expect(second).toBeLessThanOrEqual(again + 2);
      // One solve of that kind does not make the miss good; the second does.
      expect(
        levelSummary(carefulRun(level, second, miss), level).status,
        `miss at ${miss}`,
      ).not.toBe('cleared');
      expect(
        levelSummary(carefulRun(level, second + 1, miss), level).status,
        `miss at ${miss}`,
      ).toBe('cleared');
    }
  });
});
