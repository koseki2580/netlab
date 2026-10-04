/**
 * Every attempt at an exercise, kept per learner in browser storage.
 *
 * Unlike the progress store, which keeps one record per item and only
 * successes, this keeps each attempt — failed and abandoned ones included —
 * because "which level can this learner solve" cannot be answered without them.
 *
 * Nothing here throws. When storage cannot be used the store keeps working in
 * memory and says so through `status()`, so the page can show a notice.
 */

import {
  createSafeProgressStorage,
  isValidLearnerId,
  type SafeProgressStorage,
} from '../../../src/progress/storage';
import type { ExerciseKind, ExerciseLevel } from '../model/types';
import type {
  AttemptContext,
  AttemptLocale,
  AttemptPrediction,
  AttemptRecord,
  ExerciseStoreState,
  PlacementResult,
  StudyCycle,
} from './types';

export const EXERCISE_STORE_VERSION = 1;
export const EXERCISE_STORE_KEY_PREFIX = 'netlab-exercises:v1:';
/** The oldest attempts are dropped beyond this many. */
export const MAX_ATTEMPTS = 2000;

export function exerciseStoreKey(learnerId: string): string {
  return `${EXERCISE_STORE_KEY_PREFIX}${learnerId}`;
}

/** What `open` needs to know about the exercise; an `Exercise` plus the page locale fits. */
export interface AttemptMeta {
  /** `${templateId}~${seed}`. */
  readonly id: string;
  readonly templateId: string;
  readonly level: ExerciseLevel;
  readonly kind: ExerciseKind;
  readonly generatorVersion: number;
  readonly locale: AttemptLocale;
}

export interface CheckOutcome {
  readonly passed: boolean;
  readonly failedCheckIds: readonly string[];
  /** How many settings differ from the start state. */
  readonly changedSettings: number;
}

export type MemoryReason =
  /** No learner id, or one that cannot be part of a storage key. */
  | 'no-learner'
  /** There is no storage, or reading it failed. */
  | 'unavailable'
  /** The stored data was written by a newer version; it is left as it is. */
  | 'future-version'
  /** The last write failed (storage full, or blocked). */
  | 'write-failed';

export type StoreStatus =
  | { readonly persistence: 'storage' }
  | { readonly persistence: 'memory'; readonly reason: MemoryReason };

export type ImportResult =
  | { readonly ok: true; readonly attempts: number; readonly dropped: number }
  | {
      readonly ok: false;
      readonly reason: 'invalid-json' | 'not-exercise-data' | 'future-version';
    };

export interface AttemptStoreOptions {
  /** As resolved by the page (`resolveLearnerId`); `null` when there is none. */
  readonly learnerId: string | null;
  /** `null` means "no storage". Defaults to the browser's `localStorage`. */
  readonly storage?: SafeProgressStorage | null;
  readonly now?: () => number;
}

// --- Parsing -----------------------------------------------------------------

const EMPTY_STATE: ExerciseStoreState = { version: 1, attempts: [], cycles: [] };

const LEVELS: readonly unknown[] = [1, 2, 3, 4];
const KINDS: readonly unknown[] = ['configure', 'switch', 'choose-design', 'diagnose-repair'];
const CONTEXTS: readonly unknown[] = ['practice', 'placement', 'pre', 'post'];
const OUTCOMES: readonly unknown[] = ['passed', 'gave-up', 'abandoned'];
const PREDICTIONS: readonly unknown[] = ['reach', 'no-reach', 'detour'];

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

function isPrediction(value: unknown): value is AttemptPrediction {
  return (
    isObject(value) &&
    isText(value.optionId) &&
    PREDICTIONS.includes(value.predicted) &&
    typeof value.correct === 'boolean'
  );
}

/** A valid record rebuilt from its known fields, or `null`. Unknown fields are not kept. */
function parseAttempt(value: unknown): AttemptRecord | null {
  if (!isObject(value)) return null;
  const valid =
    isText(value.id) &&
    isText(value.exerciseId) &&
    isText(value.templateId) &&
    LEVELS.includes(value.level) &&
    KINDS.includes(value.kind) &&
    CONTEXTS.includes(value.context) &&
    (value.cycleId === undefined || isText(value.cycleId)) &&
    isCount(value.startedAt) &&
    (value.endedAt === undefined || isCount(value.endedAt)) &&
    OUTCOMES.includes(value.outcome) &&
    isCount(value.checkPresses) &&
    typeof value.firstCheckPassed === 'boolean' &&
    isTextList(value.failedCheckIds) &&
    [0, 1, 2, 3].includes(value.hintsUsed as number) &&
    typeof value.revealed === 'boolean' &&
    isCount(value.changedSettings) &&
    (value.prediction === undefined || isPrediction(value.prediction)) &&
    (value.locale === 'en' || value.locale === 'ja') &&
    isCount(value.generatorVersion);
  if (!valid) return null;
  const record = value as unknown as AttemptRecord;
  return {
    id: record.id,
    exerciseId: record.exerciseId,
    templateId: record.templateId,
    level: record.level,
    kind: record.kind,
    context: record.context,
    ...(record.cycleId === undefined ? {} : { cycleId: record.cycleId }),
    startedAt: record.startedAt,
    ...(record.endedAt === undefined ? {} : { endedAt: record.endedAt }),
    outcome: record.outcome,
    checkPresses: record.checkPresses,
    firstCheckPassed: record.firstCheckPassed,
    failedCheckIds: [...record.failedCheckIds],
    hintsUsed: record.hintsUsed,
    revealed: record.revealed,
    changedSettings: record.changedSettings,
    ...(record.prediction === undefined
      ? {}
      : {
          prediction: {
            optionId: record.prediction.optionId,
            predicted: record.prediction.predicted,
            correct: record.prediction.correct,
          },
        }),
    locale: record.locale,
    generatorVersion: record.generatorVersion,
  };
}

function parseCycle(value: unknown): StudyCycle | null {
  if (
    !isObject(value) ||
    !isText(value.id) ||
    !LEVELS.includes(value.level) ||
    !isTextList(value.templateIds) ||
    !isCount(value.startedAt) ||
    !isTextList(value.preExerciseIds) ||
    !isTextList(value.lessonsOpened)
  ) {
    return null;
  }
  return {
    id: value.id,
    level: value.level as ExerciseLevel,
    templateIds: [...value.templateIds],
    startedAt: value.startedAt,
    preExerciseIds: [...value.preExerciseIds],
    lessonsOpened: [...value.lessonsOpened],
  };
}

function parsePlacement(value: unknown): PlacementResult | null {
  if (
    !isObject(value) ||
    !(value.level === 0 || LEVELS.includes(value.level)) ||
    !isCount(value.exercises) ||
    !isCount(value.completedAt)
  ) {
    return null;
  }
  return {
    level: value.level as PlacementResult['level'],
    exercises: value.exercises,
    completedAt: value.completedAt,
  };
}

export type ParsedExerciseState =
  /** `dropped` counts the attempts, cycles and placement that were not valid. */
  | { readonly kind: 'ok'; readonly state: ExerciseStoreState; readonly dropped: number }
  | { readonly kind: 'future-version' }
  | { readonly kind: 'invalid-json' }
  | { readonly kind: 'not-exercise-data' };

/**
 * Read stored or imported text. Invalid records are dropped one by one, and a
 * second record with an id already seen is dropped too; the rest is kept.
 */
export function parseExerciseState(raw: string): ParsedExerciseState {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: 'invalid-json' };
  }
  if (!isObject(value) || typeof value.version !== 'number') return { kind: 'not-exercise-data' };
  if (value.version > EXERCISE_STORE_VERSION) return { kind: 'future-version' };
  if (value.version !== EXERCISE_STORE_VERSION) return { kind: 'not-exercise-data' };

  let dropped = 0;
  function keep<T extends { readonly id: string }>(
    list: unknown,
    parse: (entry: unknown) => T | null,
  ): T[] {
    const kept: T[] = [];
    const ids = new Set<string>();
    for (const entry of Array.isArray(list) ? list : []) {
      const parsed = parse(entry);
      if (!parsed || ids.has(parsed.id)) {
        dropped += 1;
        continue;
      }
      ids.add(parsed.id);
      kept.push(parsed);
    }
    return kept;
  }

  const attempts = keep(value.attempts, parseAttempt);
  const cycles = keep(value.cycles, parseCycle);
  const placement = value.placement === undefined ? null : parsePlacement(value.placement);
  if (value.placement !== undefined && !placement) dropped += 1;

  return {
    kind: 'ok',
    state: {
      version: 1,
      attempts: attempts.slice(-MAX_ATTEMPTS),
      cycles,
      ...(placement ? { placement } : {}),
    },
    dropped,
  };
}

// --- Store -------------------------------------------------------------------

function browserStorage(): SafeProgressStorage | null {
  try {
    return typeof window === 'undefined' ? null : createSafeProgressStorage(window.localStorage);
  } catch {
    return null;
  }
}

/** An attempt whose result is settled: later presses change nothing. */
function isSettled(attempt: AttemptRecord): boolean {
  return attempt.outcome === 'passed' || attempt.revealed;
}

export type AttemptStore = ReturnType<typeof createAttemptStore>;

export function createAttemptStore(options: AttemptStoreOptions) {
  const now = options.now ?? (() => Date.now());
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const key =
    options.learnerId !== null && isValidLearnerId(options.learnerId)
      ? exerciseStoreKey(options.learnerId)
      : null;

  let state: ExerciseStoreState = EMPTY_STATE;
  let status: StoreStatus = { persistence: 'storage' };
  /** Set when the stored data must be left alone: nothing is written or removed. */
  let readOnly = false;
  const listeners = new Set<() => void>();

  if (key === null || storage === null) {
    readOnly = true;
    status = { persistence: 'memory', reason: key === null ? 'no-learner' : 'unavailable' };
  } else {
    const read = storage.get(key);
    if (!read.ok) {
      readOnly = true;
      status = { persistence: 'memory', reason: 'unavailable' };
    } else if (read.value !== null) {
      const parsed = parseExerciseState(read.value);
      if (parsed.kind === 'future-version') {
        readOnly = true;
        status = { persistence: 'memory', reason: 'future-version' };
      } else if (parsed.kind === 'ok') {
        state = parsed.state;
      }
      // Anything else is not our data: start empty and overwrite it on the first change.
    }
  }

  function commit(next: ExerciseStoreState): void {
    state = next;
    if (!readOnly && key !== null && storage !== null) {
      // A failed write is tried again on the next change, with the whole state.
      status = storage.set(key, JSON.stringify(state)).ok
        ? { persistence: 'storage' }
        : { persistence: 'memory', reason: 'write-failed' };
    }
    for (const listener of [...listeners]) listener();
  }

  /** Replace one attempt. Does nothing for an unknown id, or when `change` returns `null`. */
  function update(id: string, change: (attempt: AttemptRecord) => AttemptRecord | null): void {
    const index = state.attempts.findIndex((attempt) => attempt.id === id);
    const current = state.attempts[index];
    if (!current) return;
    const changed = change(current);
    if (!changed) return;
    const attempts = [...state.attempts];
    attempts[index] = changed;
    commit({ ...state, attempts });
  }

  return {
    /**
     * The learner opened an exercise. The record starts as `abandoned`, so
     * leaving without pressing Check is still counted. Returns the attempt id.
     */
    open(meta: AttemptMeta, context: AttemptContext, cycleId?: string): string {
      const startedAt = now();
      const base = `${meta.id}@${startedAt}`;
      let id = base;
      for (let n = 2; state.attempts.some((attempt) => attempt.id === id); n += 1) {
        id = `${base}#${n}`;
      }
      const record: AttemptRecord = {
        id,
        exerciseId: meta.id,
        templateId: meta.templateId,
        level: meta.level,
        kind: meta.kind,
        context,
        ...(cycleId === undefined ? {} : { cycleId }),
        startedAt,
        outcome: 'abandoned',
        checkPresses: 0,
        firstCheckPassed: false,
        failedCheckIds: [],
        hintsUsed: 0,
        revealed: false,
        changedSettings: 0,
        locale: meta.locale,
        generatorVersion: meta.generatorVersion,
      };
      commit({ ...state, attempts: [...state.attempts, record].slice(-MAX_ATTEMPTS) });
      return id;
    },

    /** The learner pressed Check. Ignored once the attempt has passed or the answer was shown. */
    recordCheck(id: string, check: CheckOutcome): void {
      update(id, (attempt) => {
        if (isSettled(attempt)) return null;
        const failed = [...attempt.failedCheckIds];
        for (const checkId of check.failedCheckIds) {
          if (!failed.includes(checkId)) failed.push(checkId);
        }
        return {
          ...attempt,
          endedAt: now(),
          outcome: check.passed ? 'passed' : attempt.outcome,
          checkPresses: attempt.checkPresses + 1,
          firstCheckPassed: attempt.checkPresses === 0 ? check.passed : attempt.firstCheckPassed,
          failedCheckIds: failed,
          changedSettings: check.changedSettings,
        };
      });
    },

    /** The learner opened a hint. The highest tier is kept. Ignored once the attempt is settled. */
    recordHint(id: string, tier: 1 | 2 | 3): void {
      update(id, (attempt) =>
        isSettled(attempt) || tier <= attempt.hintsUsed ? null : { ...attempt, hintsUsed: tier },
      );
    },

    /** The learner asked for the answer. Ignored after a pass: looking afterwards costs nothing. */
    recordReveal(id: string): void {
      update(id, (attempt) =>
        isSettled(attempt)
          ? null
          : { ...attempt, revealed: true, outcome: 'gave-up', endedAt: now() },
      );
    },

    /** What the learner predicted for a design option. The latest prediction is kept. */
    recordPrediction(id: string, prediction: AttemptPrediction): void {
      update(id, (attempt) =>
        isSettled(attempt)
          ? null
          : {
              ...attempt,
              prediction: {
                optionId: prediction.optionId,
                predicted: prediction.predicted,
                correct: prediction.correct,
              },
            },
      );
    },

    /** Add a study cycle, or replace the one with the same id. */
    saveCycle(cycle: StudyCycle): void {
      const index = state.cycles.findIndex((entry) => entry.id === cycle.id);
      const cycles = [...state.cycles];
      if (index === -1) cycles.push(cycle);
      else cycles[index] = cycle;
      commit({ ...state, cycles });
    },

    setPlacement(placement: PlacementResult): void {
      commit({ ...state, placement });
    },

    /** The same object until something changes, so it can back `useSyncExternalStore`. */
    getState(): ExerciseStoreState {
      return state;
    },

    status(): StoreStatus {
      return status;
    },

    /** Called after every change. Returns the function that stops it. */
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    exportJson(): string {
      return JSON.stringify(state, null, 2);
    },

    /**
     * Replace everything with an exported file. Invalid records in it are
     * dropped and counted; a file that is not exercise data changes nothing.
     */
    importJson(text: string): ImportResult {
      const parsed = parseExerciseState(text);
      if (parsed.kind !== 'ok') return { ok: false, reason: parsed.kind };
      commit(parsed.state);
      return { ok: true, attempts: parsed.state.attempts.length, dropped: parsed.dropped };
    },

    /** Forget everything, in memory and in storage. */
    clear(): void {
      state = EMPTY_STATE;
      if (!readOnly && key !== null && storage !== null) {
        status = storage.remove(key).ok
          ? { persistence: 'storage' }
          : { persistence: 'memory', reason: 'write-failed' };
      }
      for (const listener of [...listeners]) listener();
    },
  };
}
