/**
 * Before and after studying: the same templates, different instances. The
 * "before" set uses seed block A and the "after" set seed block B, so the
 * learner cannot pass the second time by remembering the first.
 */

import type { ExerciseLevel } from '../model/types';
import { isSolved } from './estimate';
import type { AttemptRecord, StudyCycle } from './types';

/** Instances in each of the two sets. */
export const CYCLE_SET_SIZE = 4;
/** Seed block A: the "before" instances use seeds 0 to 3. */
export const PRE_SEED_BASE = 0;
/** Seed block B: the "after" instances use seeds 1000 to 1003. */
export const POST_SEED_BASE = 1000;

/** Instance `i` comes from template `i mod n`, with seed `base + i`. */
function instanceIds(templateIds: readonly string[], seedBase: number): string[] {
  if (templateIds.length === 0) return [];
  return Array.from(
    { length: CYCLE_SET_SIZE },
    (_, i) => `${templateIds[i % templateIds.length]}~${seedBase + i}`,
  );
}

/**
 * Begin a cycle over these templates (repeats are dropped, order is kept).
 * `now` is the start time; it also makes the cycle id.
 */
export function startCycle(
  level: ExerciseLevel,
  templateIds: readonly string[],
  now: number,
): StudyCycle {
  const distinct = [...new Set(templateIds)];
  return {
    id: `cycle-${level}-${now}`,
    level,
    templateIds: distinct,
    startedAt: now,
    preExerciseIds: instanceIds(distinct, PRE_SEED_BASE),
    lessonsOpened: [],
  };
}

/** The "after" exercise ids: the same templates in the same order, seed block B. */
export function postSet(cycle: StudyCycle): string[] {
  return instanceIds(cycle.templateIds, POST_SEED_BASE);
}

/** Note that the learner opened a lesson during the cycle. A lesson is listed once. */
export function recordLessonOpened(cycle: StudyCycle, lessonPath: string): StudyCycle {
  if (cycle.lessonsOpened.includes(lessonPath)) return cycle;
  return { ...cycle, lessonsOpened: [...cycle.lessonsOpened, lessonPath] };
}

/** How one set of instances of one template went. */
export interface CycleSetCount {
  /** Instances of this template in the set. */
  readonly total: number;
  /** Instances the learner opened. */
  readonly attempted: number;
  /** Passed with no hint and no reveal. */
  readonly solved: number;
  /** Hint tiers opened, added up over the instances. */
  readonly hintsUsed: number;
}

export interface CycleTemplateComparison {
  readonly templateId: string;
  readonly before: CycleSetCount;
  readonly after: CycleSetCount;
}

/**
 * What was observed before and after, side by side. It is a comparison and
 * nothing more: the instances differ, the sets are small, and the lessons are
 * the ones opened in between, not the ones shown to have helped. The page must
 * not word it as proof that studying caused the change.
 */
export interface CycleComparison {
  readonly cycleId: string;
  readonly level: ExerciseLevel;
  readonly templates: readonly CycleTemplateComparison[];
  readonly before: CycleSetCount;
  readonly after: CycleSetCount;
  /** Lessons opened between the two sets. */
  readonly lessonsOpenedBetween: readonly string[];
  /** False until every "after" instance has been opened; `after` is partial before that. */
  readonly afterComplete: boolean;
}

function templateOf(exerciseId: string): string {
  return exerciseId.slice(0, exerciseId.lastIndexOf('~'));
}

function count(
  exerciseIds: readonly string[],
  context: 'pre' | 'post',
  cycle: StudyCycle,
  attempts: readonly AttemptRecord[],
): CycleSetCount {
  let attempted = 0;
  let solved = 0;
  let hintsUsed = 0;
  for (const exerciseId of exerciseIds) {
    // The latest attempt at an instance is the one that counts.
    const latest = attempts
      .filter(
        (attempt) =>
          attempt.cycleId === cycle.id &&
          attempt.context === context &&
          attempt.exerciseId === exerciseId,
      )
      .reduce<
        AttemptRecord | undefined
      >((best, attempt) => (best && best.startedAt > attempt.startedAt ? best : attempt), undefined);
    if (!latest) continue;
    attempted += 1;
    if (isSolved(latest)) solved += 1;
    hintsUsed += latest.hintsUsed;
  }
  return { total: exerciseIds.length, attempted, solved, hintsUsed };
}

/** Per template and overall: solved and hints used, before and after. */
export function cycleReport(
  cycle: StudyCycle,
  attempts: readonly AttemptRecord[],
): CycleComparison {
  const pre = cycle.preExerciseIds;
  const post = postSet(cycle);
  const after = count(post, 'post', cycle, attempts);
  return {
    cycleId: cycle.id,
    level: cycle.level,
    templates: cycle.templateIds.map((templateId) => ({
      templateId,
      before: count(
        pre.filter((id) => templateOf(id) === templateId),
        'pre',
        cycle,
        attempts,
      ),
      after: count(
        post.filter((id) => templateOf(id) === templateId),
        'post',
        cycle,
        attempts,
      ),
    })),
    before: count(pre, 'pre', cycle, attempts),
    after,
    lessonsOpenedBetween: cycle.lessonsOpened,
    afterComplete: after.total > 0 && after.attempted === after.total,
  };
}
