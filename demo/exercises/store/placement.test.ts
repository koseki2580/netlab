import { describe, expect, it } from 'vitest';
import {
  PLACEMENT_MAX_EXERCISES,
  nextStep,
  placementResult,
  recordPlacementResult,
  startPlacement,
  type PlacementPoolEntry,
  type PlacementState,
} from './placement';

const pool: PlacementPoolEntry[] = ([1, 2, 3, 4] as const).flatMap((level) =>
  ['a', 'b', 'c'].map((name) => ({
    id: `l${level}-${name}~0`,
    templateId: `l${level}-${name}`,
    level,
  })),
);

/** Run a diagnostic to its end, answering from `results` in order. */
function run(hasSetAnAddress: boolean, results: readonly boolean[]) {
  let state = startPlacement(hasSetAnAddress);
  const levels: number[] = [];
  for (const solved of results) {
    const step = nextStep(state, pool);
    if (!step) break;
    levels.push(step.level);
    state = recordPlacementResult(state, solved, step.candidates[0]?.templateId);
  }
  return { state, levels };
}

describe('startPlacement', () => {
  it('starts at level 1 for a learner who has never set an address', () => {
    expect(nextStep(startPlacement(false), pool)?.level).toBe(1);
  });

  it('starts at level 2 for a learner who has', () => {
    expect(nextStep(startPlacement(true), pool)?.level).toBe(2);
  });
});

describe('nextStep', () => {
  it('offers the pool entries of the level', () => {
    const step = nextStep(startPlacement(false), pool);
    expect(step?.avoidTemplateIds).toEqual([]);
    expect(step?.candidates.map((entry) => entry.templateId)).toEqual(['l1-a', 'l1-b', 'l1-c']);
  });

  it('asks for a different template for the second exercise of a level', () => {
    const state = recordPlacementResult(startPlacement(false), true, 'l1-a');
    const step = nextStep(state, pool);
    expect(step?.level).toBe(1);
    expect(step?.avoidTemplateIds).toEqual(['l1-a']);
    expect(step?.candidates.map((entry) => entry.templateId)).toEqual(['l1-b', 'l1-c']);
  });

  it('has no candidates when the pool has nothing left at the level', () => {
    const state = recordPlacementResult(startPlacement(false), true, 'l1-a');
    const step = nextStep(state, [{ id: 'l1-a~1', templateId: 'l1-a', level: 1 }]);
    expect(step?.candidates).toEqual([]);
  });

  it('is null once the diagnostic is over', () => {
    expect(nextStep(run(false, [true, false]).state, pool)).toBeNull();
  });
});

describe('recordPlacementResult', () => {
  it('moves up after both exercises of a level are solved', () => {
    expect(run(false, [true, true, true]).levels).toEqual([1, 1, 2]);
  });

  it('moves down after neither is solved', () => {
    expect(run(true, [false, false, true]).levels).toEqual([2, 2, 1]);
  });

  it('stops after one of the two is solved', () => {
    const { state } = run(true, [true, false]);
    expect(state.done).toBe(true);
    expect(placementResult(state)).toBe(0);
  });

  it('stops at level 1 when neither is solved there', () => {
    const { state } = run(false, [false, false]);
    expect(state.done).toBe(true);
    expect(placementResult(state)).toBe(0);
  });

  it('stops at the top level', () => {
    const { state, levels } = run(false, Array<boolean>(8).fill(true));
    expect(levels).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(state.done).toBe(true);
    expect(placementResult(state)).toBe(4);
  });

  it('does not go back to a level it has already asked', () => {
    // Level 2 solved, level 3 not at all: going down would repeat level 2.
    const up = run(true, [true, true, false, false]);
    expect(up.state.done).toBe(true);
    expect(placementResult(up.state)).toBe(2);

    // Level 2 not at all, level 1 solved: going up would repeat level 2.
    const down = run(true, [false, false, true, true]);
    expect(down.state.done).toBe(true);
    expect(placementResult(down.state)).toBe(1);
  });

  it('changes nothing once the diagnostic is over', () => {
    const { state } = run(true, [true, false]);
    expect(recordPlacementResult(state, true, 'l2-c')).toBe(state);
  });

  it('keeps the state plain data', () => {
    const { state } = run(false, [true, true, true, false]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('every sequence of results', () => {
  /** The result by the rule as stated, worked out without the state machine. */
  function expected(state: PlacementState): number {
    let best = 0;
    for (const level of [1, 2, 3, 4]) {
      const here = state.answers.filter((answer) => answer.level === level);
      if (here.length === 2 && here.every((answer) => answer.solved)) best = level;
    }
    return best;
  }

  /** Walk both answers from `state`; returns the finished states. */
  function walk(state: PlacementState, depth: number, finished: PlacementState[]): void {
    const step = nextStep(state, pool);
    if (!step) {
      finished.push(state);
      return;
    }
    // One step past the limit: a machine that failed to stop is caught here
    // rather than recursing for ever.
    expect(depth).toBeLessThan(PLACEMENT_MAX_EXERCISES);
    expect(step.candidates.length).toBeGreaterThan(0);
    for (const solved of [true, false]) {
      walk(
        recordPlacementResult(state, solved, step.candidates[0]?.templateId),
        depth + 1,
        finished,
      );
    }
  }

  it.each([false, true])('terminates within eight exercises (opening answer %s)', (answer) => {
    const finished: PlacementState[] = [];
    walk(startPlacement(answer), 0, finished);

    expect(finished.length).toBeGreaterThan(0);
    for (const state of finished) {
      expect(state.done).toBe(true);
      expect(state.answers.length).toBeLessThanOrEqual(PLACEMENT_MAX_EXERCISES);
      expect(state.answers.length % 2).toBe(0);
      expect(placementResult(state)).toBe(expected(state));

      // Two exercises per level, from different templates, and no level twice.
      const levels = state.answers.map((entry) => entry.level);
      for (const level of new Set(levels)) {
        const here = state.answers.filter((entry) => entry.level === level);
        expect(here).toHaveLength(2);
        expect(here[0]?.templateId).not.toBe(here[1]?.templateId);
        expect(levels.lastIndexOf(level) - levels.indexOf(level)).toBe(1);
      }
    }
  });

  it('reaches every result from 0 to 4', () => {
    const finished: PlacementState[] = [];
    walk(startPlacement(false), 0, finished);
    walk(startPlacement(true), 0, finished);
    expect([...new Set(finished.map(placementResult))].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
