/** Builders shared by the store tests. Not used by the app. */

import type { ExerciseLevel } from '../model/types';
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

/** `count` solved attempts at distinct exercises, spread over `templates` templates. */
export function solvedRun(level: ExerciseLevel, count: number, templates: number, seedBase = 0) {
  return Array.from({ length: count }, (_, i) =>
    solved(`l${level}-t${i % templates}`, seedBase + i, level),
  );
}
