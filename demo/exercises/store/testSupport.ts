/** Builders shared by the store tests. Not used by the app. */

import type { ExerciseKind, ExerciseLevel } from '../model/types';
import { LEVEL_KINDS } from './estimate';
import type { AttemptRecord } from './types';

let clock = 0;

/** An attempt at `${templateId}~${seed}`; each call is later than the one before. */
export function attempt(
  templateId: string,
  seed: number,
  level: ExerciseLevel,
  overrides: Partial<AttemptRecord> = {},
): AttemptRecord {
  clock += 1000;
  const exerciseId = `${templateId}~${seed}`;
  return {
    id: `${exerciseId}@${clock}`,
    exerciseId,
    templateId,
    level,
    kind: 'configure',
    context: 'practice',
    startedAt: clock,
    endedAt: clock + 500,
    outcome: 'passed',
    checkPresses: 1,
    firstCheckPassed: true,
    failedCheckIds: [],
    hintsUsed: 0,
    revealed: false,
    changedSettings: 1,
    locale: 'ja',
    generatorVersion: 1,
    ...overrides,
  };
}

export const solved = (templateId: string, seed: number, level: ExerciseLevel) =>
  attempt(templateId, seed, level);

export const helped = (templateId: string, seed: number, level: ExerciseLevel) =>
  attempt(templateId, seed, level, { hintsUsed: 2 });

export const failed = (templateId: string, seed: number, level: ExerciseLevel) =>
  attempt(templateId, seed, level, {
    outcome: 'abandoned',
    firstCheckPassed: false,
    failedCheckIds: ['c1'],
  });

/** The kinds of task a run takes turns at: every kind a level can ask for. */
const KINDS: readonly ExerciseKind[] = ['configure', 'diagnose-repair', 'choose-design', 'switch'];

/**
 * `count` solved attempts at distinct exercises, spread over `templates` kinds
 * of task of the level (its real ones, where it has any) and every kind of
 * exercise. A level is cleared by `solvedRun(level, n, every kind)`.
 */
export function solvedRun(level: ExerciseLevel, count: number, templates: number, seedBase = 0) {
  const kinds = LEVEL_KINDS[level];
  return Array.from({ length: count }, (_, i) =>
    attempt(
      kinds[i % Math.min(templates, kinds.length)] ?? `l${level}-t${i % templates}`,
      seedBase + i,
      level,
      {
        kind: KINDS[i % KINDS.length] ?? 'configure',
      },
    ),
  );
}

/** Clean solves that clear the level: one of every kind of task it has, and seven at least. */
export function clearingRun(level: ExerciseLevel, seedBase = 0) {
  const kinds = LEVEL_KINDS[level].length;
  return solvedRun(level, Math.max(7, kinds), Math.max(3, kinds), seedBase);
}
