/**
 * The short diagnostic: one question, then two exercises per level. A pure
 * state machine; the page supplies the exercises and reports how each went.
 *
 * It ends because a level is never visited twice: there are four levels and
 * two exercises at each, so eight exercises at most.
 */

import type { ExerciseLevel } from '../model/types';

/** Exercises per level; both must be solved to move up. */
export const PLACEMENT_PER_LEVEL = 2;
export const PLACEMENT_MAX_EXERCISES = 8;

export interface PlacementAnswer {
  readonly level: ExerciseLevel;
  /** Absent when the page did not say which template the exercise came from. */
  readonly templateId?: string;
  /** Passed with no hint and no reveal. */
  readonly solved: boolean;
}

export interface PlacementState {
  /** The level the next exercise comes from. Meaningless once `done`. */
  readonly level: ExerciseLevel;
  readonly answers: readonly PlacementAnswer[];
  readonly done: boolean;
}

/** What `nextStep` picks from: an `Exercise` fits. */
export interface PlacementPoolEntry {
  readonly id: string;
  readonly templateId: string;
  readonly level: ExerciseLevel;
}

export interface PlacementStep<T extends PlacementPoolEntry = PlacementPoolEntry> {
  readonly level: ExerciseLevel;
  /** Templates already used at this level: the second exercise must differ from the first. */
  readonly avoidTemplateIds: readonly string[];
  /** The pool entries that fit, in pool order. Empty when the pool has none; the page then stops. */
  readonly candidates: readonly T[];
}

/**
 * The opening question: has the learner ever set an address on a device?
 * "No" starts at level 1, "yes" at level 2.
 */
export function startPlacement(hasSetAnAddress: boolean): PlacementState {
  return { level: hasSetAnAddress ? 2 : 1, answers: [], done: false };
}

/** What to ask next, or `null` when the diagnostic is over. */
export function nextStep<T extends PlacementPoolEntry>(
  state: PlacementState,
  pool: readonly T[],
): PlacementStep<T> | null {
  if (state.done) return null;
  const avoidTemplateIds = state.answers
    .filter((answer) => answer.level === state.level)
    .flatMap((answer) => (answer.templateId === undefined ? [] : [answer.templateId]));
  return {
    level: state.level,
    avoidTemplateIds,
    candidates: pool.filter(
      (entry) => entry.level === state.level && !avoidTemplateIds.includes(entry.templateId),
    ),
  };
}

/**
 * Record how the exercise at `state.level` went. After the second exercise of
 * a level: both solved moves up, none solved moves down, one solved stops. A
 * move to a level already visited, or past either end, stops as well.
 */
export function recordPlacementResult(
  state: PlacementState,
  solved: boolean,
  templateId?: string,
): PlacementState {
  if (state.done) return state;
  const answer: PlacementAnswer =
    templateId === undefined
      ? { level: state.level, solved }
      : { level: state.level, templateId, solved };
  const answers = [...state.answers, answer];
  const here = answers.filter((entry) => entry.level === state.level);
  if (here.length < PLACEMENT_PER_LEVEL) return { ...state, answers };

  const solvedHere = here.filter((entry) => entry.solved).length;
  const target =
    solvedHere === PLACEMENT_PER_LEVEL ? state.level + 1 : solvedHere === 0 ? state.level - 1 : 0;
  const next = ([1, 2, 3, 4] as const).find((level) => level === target);
  const stop =
    next === undefined ||
    answers.some((entry) => entry.level === next) ||
    answers.length >= PLACEMENT_MAX_EXERCISES;
  return stop ? { level: state.level, answers, done: true } : { level: next, answers, done: false };
}

/** The highest level at which both exercises were solved; 0 when there is none. */
export function placementResult(state: PlacementState): 0 | ExerciseLevel {
  let result: 0 | ExerciseLevel = 0;
  for (const level of [1, 2, 3, 4] as const) {
    const solvedHere = state.answers.filter((entry) => entry.level === level && entry.solved);
    if (solvedHere.length >= PLACEMENT_PER_LEVEL) result = level;
  }
  return result;
}
