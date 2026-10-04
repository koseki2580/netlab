/**
 * From the list of attempts to "which level can this learner solve": a rule
 * simple enough to say back to the learner in one sentence.
 */

import type { ExerciseLevel } from '../model/types';
import type { AttemptLocale, AttemptRecord, PlacementResult } from './types';

/** A level is judged on the last this-many distinct exercises. */
export const WINDOW_SIZE = 10;
/** Below this many distinct exercises there is no verdict yet. */
export const MIN_ATTEMPTED = 5;
/** Solved without help, out of the window, to clear a level. */
export const CLEAR_MIN_SOLVED = 7;
/** The solved exercises must come from at least this many templates. */
export const CLEAR_MIN_TEMPLATES = 3;

export const EXERCISE_LEVELS: readonly ExerciseLevel[] = [1, 2, 3, 4];

export type LevelStatus = 'not-enough' | 'in-progress' | 'cleared';

export interface LevelSummary {
  readonly level: ExerciseLevel;
  /** Distinct exercises in the window (at most `WINDOW_SIZE`). */
  readonly counted: number;
  /** Passed with no hint and no reveal. */
  readonly solved: number;
  /** Passed after opening a hint. */
  readonly solvedWithHelp: number;
  /** Everything else: left, given up, or passed only after the answer was shown. */
  readonly notSolved: number;
  /** Distinct templates among the solved. */
  readonly solvedTemplates: number;
  readonly status: LevelStatus;
  /** The template with the most unsolved exercises in the window; `null` when none is unsolved. */
  readonly weakestTemplateId: string | null;
}

export function isSolved(attempt: AttemptRecord): boolean {
  return attempt.outcome === 'passed' && attempt.hintsUsed === 0 && !attempt.revealed;
}

function isSolvedWithHelp(attempt: AttemptRecord): boolean {
  return attempt.outcome === 'passed' && attempt.hintsUsed > 0 && !attempt.revealed;
}

/**
 * The attempts a level is judged on: the latest attempt at each of the last
 * `WINDOW_SIZE` distinct exercises, newest first. `pre` attempts never count.
 */
function windowFor(attempts: readonly AttemptRecord[], level: ExerciseLevel): AttemptRecord[] {
  const newestFirst = attempts
    .map((attempt, index) => ({ attempt, index }))
    .filter(({ attempt }) => attempt.level === level && attempt.context !== 'pre')
    .sort((a, b) => b.attempt.startedAt - a.attempt.startedAt || b.index - a.index);

  const seen = new Set<string>();
  const window: AttemptRecord[] = [];
  for (const { attempt } of newestFirst) {
    if (seen.has(attempt.exerciseId)) continue;
    seen.add(attempt.exerciseId);
    window.push(attempt);
    if (window.length === WINDOW_SIZE) break;
  }
  return window;
}

export function levelSummary(
  attempts: readonly AttemptRecord[],
  level: ExerciseLevel,
): LevelSummary {
  const window = windowFor(attempts, level);
  const solved = window.filter(isSolved);
  const solvedWithHelp = window.filter(isSolvedWithHelp).length;
  const solvedTemplates = new Set(solved.map((attempt) => attempt.templateId)).size;

  // `window` is newest first, so the first template to reach the highest count
  // of unsolved exercises is also the one that failed most recently.
  const failures = new Map<string, number>();
  for (const attempt of window) {
    if (attempt.outcome === 'passed' && !attempt.revealed) continue;
    failures.set(attempt.templateId, (failures.get(attempt.templateId) ?? 0) + 1);
  }
  let weakestTemplateId: string | null = null;
  let most = 0;
  for (const [templateId, count] of failures) {
    if (count > most) {
      most = count;
      weakestTemplateId = templateId;
    }
  }

  let status: LevelStatus = 'in-progress';
  if (window.length < MIN_ATTEMPTED) status = 'not-enough';
  else if (solved.length >= CLEAR_MIN_SOLVED && solvedTemplates >= CLEAR_MIN_TEMPLATES) {
    status = 'cleared';
  }

  return {
    level,
    counted: window.length,
    solved: solved.length,
    solvedWithHelp,
    notSolved: window.length - solved.length - solvedWithHelp,
    solvedTemplates,
    status,
    weakestTemplateId,
  };
}

/**
 * The highest cleared level whose lower levels are all cleared too, or were
 * covered by placement (every level up to the placement result). 0 when none.
 */
export function estimatedLevel(
  attempts: readonly AttemptRecord[],
  placement?: PlacementResult,
): 0 | ExerciseLevel {
  const placed = placement?.level ?? 0;
  let estimate: 0 | ExerciseLevel = 0;
  for (const level of EXERCISE_LEVELS) {
    const cleared = levelSummary(attempts, level).status === 'cleared';
    if (cleared) estimate = level;
    else if (level > placed) break;
  }
  return estimate;
}

/** The sentence shown to the learner under a level: where they stand and what is still needed. */
export function explain(summary: LevelSummary, locale: AttemptLocale): string {
  const { level, counted, solved, solvedWithHelp, solvedTemplates, status } = summary;
  const ja = locale === 'ja';

  if (status === 'not-enough') {
    const more = MIN_ATTEMPTED - counted;
    return ja
      ? `レベル ${level} で取り組んだのは、まだ ${counted} 問です。あと ${more} 問取り組むと、判定できます。`
      : `You have tried ${counted} ${counted === 1 ? 'exercise' : 'exercises'} at level ${level} so far. Try ${more} more and this level can be judged.`;
  }

  if (status === 'cleared') {
    return ja
      ? `直近 ${counted} 問のうち ${solved} 問を、ヒントなしで解けました（${solvedTemplates} 種類）。レベル ${level} は達成です。`
      : `You solved ${solved} of your last ${counted} exercises without a hint, across ${solvedTemplates} kinds of exercise. Level ${level} is cleared.`;
  }

  if (ja) {
    const help =
      solvedWithHelp > 0 ? `ヒントを使って解けた ${solvedWithHelp} 問は数えていません。` : '';
    return `直近 ${counted} 問のうち、ヒントなしで解けたのは ${solved} 問（${solvedTemplates} 種類）です。${help}レベル ${level} は、直近 ${WINDOW_SIZE} 問のうち ${CLEAR_MIN_SOLVED} 問を、${CLEAR_MIN_TEMPLATES} 種類以上にわたってヒントなしで解けると達成です。`;
  }
  const help =
    solvedWithHelp === 0
      ? ''
      : solvedWithHelp === 1
        ? ' The 1 you solved with a hint is not counted.'
        : ` The ${solvedWithHelp} you solved with a hint are not counted.`;
  return `You solved ${solved} of your last ${counted} exercises without a hint, across ${solvedTemplates} ${solvedTemplates === 1 ? 'kind' : 'kinds'} of exercise.${help} Level ${level} is cleared at ${CLEAR_MIN_SOLVED} of the last ${WINDOW_SIZE}, across at least ${CLEAR_MIN_TEMPLATES} kinds.`;
}
