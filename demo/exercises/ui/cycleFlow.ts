/**
 * Where a learner stands in a before/after cycle, read from the store alone,
 * so leaving the page in the middle and coming back picks up where it was.
 */

import { postSet } from '../store/studyCycle';
import type { AttemptRecord, StudyCycle } from '../store/types';

export type CycleStage =
  /** Still doing the "before" exercises. */
  | {
      readonly stage: 'pre';
      readonly nextId: string;
      readonly done: number;
      readonly total: number;
    }
  /** "Before" is finished and "after" has not begun: time to study. */
  | { readonly stage: 'study'; readonly nextId: string | undefined }
  | {
      readonly stage: 'post';
      readonly nextId: string;
      readonly done: number;
      readonly total: number;
    }
  | { readonly stage: 'done' };

export function cycleSet(cycle: StudyCycle, context: 'pre' | 'post'): readonly string[] {
  return context === 'pre' ? cycle.preExerciseIds : postSet(cycle);
}

function opened(
  cycle: StudyCycle,
  context: 'pre' | 'post',
  attempts: readonly AttemptRecord[],
): Set<string> {
  return new Set(
    attempts
      .filter((attempt) => attempt.cycleId === cycle.id && attempt.context === context)
      .map((attempt) => attempt.exerciseId),
  );
}

export function cycleStage(cycle: StudyCycle, attempts: readonly AttemptRecord[]): CycleStage {
  const pre = cycle.preExerciseIds;
  const preOpened = opened(cycle, 'pre', attempts);
  const nextPre = pre.find((id) => !preOpened.has(id));
  if (nextPre !== undefined) {
    return {
      stage: 'pre',
      nextId: nextPre,
      done: pre.length - pre.filter((id) => !preOpened.has(id)).length,
      total: pre.length,
    };
  }
  const post = postSet(cycle);
  const postOpened = opened(cycle, 'post', attempts);
  const nextPost = post.find((id) => !postOpened.has(id));
  if (postOpened.size === 0) return { stage: 'study', nextId: nextPost };
  if (nextPost === undefined) return { stage: 'done' };
  return {
    stage: 'post',
    nextId: nextPost,
    done: post.length - post.filter((id) => !postOpened.has(id)).length,
    total: post.length,
  };
}

/** The latest cycle of a level, if there is one. */
export function latestCycle(cycles: readonly StudyCycle[], level: number): StudyCycle | undefined {
  return [...cycles].reverse().find((cycle) => cycle.level === level);
}
