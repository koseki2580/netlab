/**
 * What the exercise pages remember about a learner. Plain JSON only, so the
 * stored state round-trips exactly through `JSON.stringify` / `JSON.parse`.
 */

import type { ExerciseKind, ExerciseLevel } from '../model/types';

export type AttemptContext = 'practice' | 'placement' | 'pre' | 'post';

/**
 * `abandoned` is what an attempt starts as: it is written when the exercise is
 * opened, so leaving without ever pressing Check still leaves a record.
 */
export type AttemptOutcome = 'passed' | 'gave-up' | 'abandoned';

export type AttemptLocale = 'en' | 'ja';

/** What the learner said would happen before a `choose-design` option was run. */
export interface AttemptPrediction {
  readonly optionId: string;
  readonly predicted: 'reach' | 'no-reach' | 'detour';
  readonly correct: boolean;
}

export interface AttemptRecord {
  /** Unique within the store: `${exerciseId}@${startedAt}`, with `#n` on a collision. */
  readonly id: string;
  /** `${templateId}~${seed}`. */
  readonly exerciseId: string;
  readonly templateId: string;
  readonly level: ExerciseLevel;
  readonly kind: ExerciseKind;
  readonly context: AttemptContext;
  /** The study cycle this attempt belongs to (`pre` and `post` attempts). */
  readonly cycleId?: string;
  /** Epoch milliseconds. */
  readonly startedAt: number;
  /** Epoch milliseconds of the last counted Check or of the reveal. Absent when nothing was pressed. */
  readonly endedAt?: number;
  readonly outcome: AttemptOutcome;
  /** Check presses up to and including the one that passed. */
  readonly checkPresses: number;
  readonly firstCheckPassed: boolean;
  /** Every check id that failed at some press, in the order first seen. */
  readonly failedCheckIds: readonly string[];
  /** The highest hint tier opened; 0 when none. */
  readonly hintsUsed: 0 | 1 | 2 | 3;
  readonly revealed: boolean;
  /** How many settings differed from the start state at the last counted Check. */
  readonly changedSettings: number;
  readonly prediction?: AttemptPrediction;
  readonly locale: AttemptLocale;
  readonly generatorVersion: number;
}

/** One before/after comparison around studying. */
export interface StudyCycle {
  readonly id: string;
  readonly level: ExerciseLevel;
  readonly templateIds: readonly string[];
  /** Epoch milliseconds. */
  readonly startedAt: number;
  /** The fixed "before" instances (seed block A). */
  readonly preExerciseIds: readonly string[];
  /** Lesson paths the learner opened after the cycle began, in order, without repeats. */
  readonly lessonsOpened: readonly string[];
}

export interface PlacementResult {
  /** The highest level at which both exercises were solved without a hint; 0 when none. */
  readonly level: 0 | ExerciseLevel;
  /** How many exercises the diagnostic used. */
  readonly exercises: number;
  /** Epoch milliseconds. */
  readonly completedAt: number;
}

export interface ExerciseStoreState {
  readonly version: 1;
  /** Oldest first. */
  readonly attempts: readonly AttemptRecord[];
  readonly cycles: readonly StudyCycle[];
  readonly placement?: PlacementResult;
}
