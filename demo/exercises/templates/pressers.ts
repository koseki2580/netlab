/**
 * Learners who do not read: they press what the page offers and press Check.
 * Test support for `levelRule.test.ts` and the probes in `verify.test.ts`;
 * not used by the app.
 *
 * A presser works on exactly what the page shows (`ui/choices.ts`, in the
 * order of the attempt), is graded by the real grader, and is judged by the
 * real level rule (`store/estimate.ts`).
 */

import { gradeExercise } from '../grade/gradeExercise';
import { applyChanges } from '../model/settings';
import type { Exercise, ExerciseLevel, SettingChange } from '../model/types';
import { levelSummary } from '../store/estimate';
import type { AttemptRecord } from '../store/types';
import { attemptOrder, generator } from '../ui/attemptOrder';
import { checksToCount } from '../model/closedSet';
import { orderedOptions, pressCards } from '../ui/choices';
import { exerciseById, nextExerciseId } from './index';

export type Strategy = 'random' | 'first' | 'last' | 'repeat';
export const STRATEGIES: readonly Strategy[] = ['random', 'first', 'last', 'repeat'];

/** One thing a presser can do before Check: a single press, or one design. */
export interface Offer {
  readonly changes: readonly SettingChange[];
  /** What the press shows, for "the same as last time": an address, an option id, a state. */
  readonly value: string;
  /** An option that brings a start of its own. */
  readonly start?: Exercise['start'];
}

function valueOf(change: SettingChange): string {
  switch (change.kind) {
    case 'host-ip':
      return change.ip ?? '';
    case 'iface-address':
      return `${change.ipAddress}/${change.prefixLength}`;
    case 'link-state':
      return change.state;
    case 'port-vlan':
      return change.vlanMode;
    case 'stp-priority':
      return String(change.priority);
    default:
      return change.kind;
  }
}

/** Everything the page offers to press for this attempt, in reading order. */
export function offersOf(exercise: Exercise, attemptIds: readonly string[], id: string): Offer[] {
  const order = attemptOrder(attemptIds, id);
  if (exercise.options) {
    return orderedOptions(exercise, order).map((option) => ({
      changes: option.changes,
      value: option.id,
      ...(option.start ? { start: option.start } : {}),
    }));
  }
  return pressCards(exercise, order).flatMap((card) =>
    card.presses.map((press) => ({ changes: [press.change], value: valueOf(press.change) })),
  );
}

const grades = new Map<string, boolean>();

/** Whether the exercise passes with this one offer applied to its start. Remembered. */
export async function passesWith(exercise: Exercise, offer: Offer | null): Promise<boolean> {
  const key = `${exercise.id}|${JSON.stringify(offer?.changes ?? [])}`;
  const known = grades.get(key);
  if (known !== undefined) return known;
  const start = offer?.start ?? exercise.start;
  const grade = await gradeExercise(
    { ...exercise, start },
    applyChanges(start, offer?.changes ?? []),
  );
  grades.set(key, grade.passed);
  return grade.passed;
}

/** The exercises of a level in the order the level page serves them. */
export function servedOrder(level: ExerciseLevel): string[] {
  const seen: string[] = [];
  let last: string | undefined;
  for (;;) {
    const next = nextExerciseId(level, {
      seenIds: seen,
      avoidTemplateIds: last === undefined ? [] : [last],
    });
    if (next === undefined) return seen;
    seen.push(next);
    last = next.slice(0, next.lastIndexOf('~'));
  }
}

interface Memory {
  index: number | null;
  value: string | null;
}

/** Checks a presser makes before moving on. The level rule counts at most two. */
const MAX_PRESSER_CHECKS = 3;

/**
 * Ten exercises by one presser. Before every Check the presser undoes its
 * last press and makes another one (the kindest reading: nothing it disturbed
 * stays disturbed). Returns the records the store would hold.
 */
export async function runOf(
  level: ExerciseLevel,
  strategy: Strategy,
  run: number,
  served: readonly string[],
): Promise<AttemptRecord[]> {
  const random = generator(run * 7919 + STRATEGIES.indexOf(strategy) * 104729 + level);
  const offset = run === 0 ? 0 : Math.floor(random() * Math.max(1, served.length - 10));
  const records: AttemptRecord[] = [];
  const memory: Memory = { index: null, value: null };

  for (const [turn, exerciseId] of served.slice(offset, offset + 10).entries()) {
    const exercise = exerciseById(exerciseId);
    if (!exercise) continue;
    const startedAt = run * 100_000 + turn * 1000 + 1;
    const id = `${exerciseId}@${startedAt}`;
    const offers = offersOf(
      exercise,
      records.map((record) => record.id),
      id,
    );
    let presses = 0;
    let passed = false;
    // Two steps: the presser first points at a device. A wrong one costs a
    // Check; once it is right, only that device's card can be pressed.
    let open = offers;
    if (exercise.pickFirst) {
      const cards = pressCards(
        exercise,
        attemptOrder(
          records.map((record) => record.id),
          id,
        ),
      );
      const left = cards.map((_, index) => index);
      open = [];
      while (left.length > 0 && presses < MAX_PRESSER_CHECKS) {
        const at =
          strategy === 'first'
            ? 0
            : strategy === 'last'
              ? left.length - 1
              : Math.floor(random() * left.length);
        const card = cards[left.splice(at, 1)[0] ?? 0];
        if (
          card &&
          card.ref.kind !== 'link-state' &&
          exercise.pickFirst.faulty.includes(card.ref.nodeId)
        ) {
          open = card.presses.map((press) => ({
            changes: [press.change],
            value: valueOf(press.change),
          }));
          break;
        }
        presses += 1;
      }
    }
    const offered = open;
    const untried = offered.map((_, index) => index);

    while (!passed && presses < MAX_PRESSER_CHECKS) {
      let pick: number | undefined;
      if (untried.length > 0) {
        if (strategy === 'first') pick = untried[0];
        else if (strategy === 'last') pick = untried[untried.length - 1];
        else if (strategy === 'repeat' && presses === 0 && memory.index !== null) {
          const same = offered.findIndex((offer) => offer.value === memory.value);
          pick = same !== -1 ? same : untried[Math.min(memory.index, untried.length - 1)];
        } else pick = untried[Math.floor(random() * untried.length)];
      }
      if (pick !== undefined) untried.splice(untried.indexOf(pick), 1);
      const offer = pick === undefined ? null : (offered[pick] ?? null);
      presses += 1;
      passed = await passesWith(exercise, offer);
      if (passed && pick !== undefined && offer) {
        memory.index = pick;
        memory.value = offer.value;
      }
      // Nothing to press and nothing passed: pressing Check again changes nothing.
      if (offer === null) break;
    }

    records.push({
      id,
      exerciseId,
      templateId: exercise.templateId,
      level,
      kind: exercise.kind,
      context: 'practice',
      startedAt,
      endedAt: startedAt + 500,
      outcome: passed ? 'passed' : 'abandoned',
      checkPresses: presses,
      firstCheckPassed: passed && presses === 1,
      failedCheckIds: [],
      hintsUsed: 0,
      revealed: false,
      changedSettings: 1,
      locale: 'ja',
      generatorVersion: exercise.generatorVersion,
      ...recordExtras(exercise),
    });
  }
  return records;
}

/** What `store.open` adds to a record from the exercise itself. */
export function recordExtras(exercise: Exercise): Partial<AttemptRecord> {
  return checksToCount(exercise) === 1 ? { checksToCount: 1 } : {};
}

/** The share of `runs` runs after which the level reads "cleared". */
export async function clearRate(
  level: ExerciseLevel,
  strategy: Strategy,
  runs: number,
): Promise<number> {
  const served = servedOrder(level);
  let cleared = 0;
  for (let run = 0; run < runs; run += 1) {
    const records = await runOf(level, strategy, run, served);
    if (levelSummary(records, level).status === 'cleared') cleared += 1;
  }
  return cleared / runs;
}
