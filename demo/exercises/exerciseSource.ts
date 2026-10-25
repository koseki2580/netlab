/**
 * Where the pages get their exercises: the templates module.
 */

import * as templates from './templates';
import { checksToCount } from './model/closedSet';
import type { AttemptMeta } from './store/attemptStore';
import { isAttempted, levelSummary } from './store/estimate';
import type { AttemptRecord } from './store/types';
import type {
  Exercise,
  ExerciseKind,
  ExerciseLevel,
  ExerciseTemplate,
  Localised,
} from './model/types';

interface NextOptions {
  readonly avoidTemplateIds?: readonly string[];
  readonly seenIds?: readonly string[];
  /** Something of the learner's own, so the order of the kinds of task is theirs (`learnerSalt`). */
  readonly salt?: string;
  /** The kinds of task the level still waits for (`LevelSummary.missingKinds`): served before the others. */
  readonly needKinds?: readonly string[];
}

/**
 * What the store needs to open an attempt at this exercise. How many Checks a
 * solve may take and still count comes from the shape of its answer
 * (`model/closedSet.ts`), as the packet track's does (`packetMeta`).
 */
export function exerciseMeta(exercise: Exercise, locale: 'en' | 'ja'): AttemptMeta {
  return {
    id: exercise.id,
    templateId: exercise.templateId,
    level: exercise.level,
    kind: exercise.kind,
    generatorVersion: exercise.generatorVersion,
    locale,
    ...(checksToCount(exercise) === 1 ? { checksToCount: 1 as const } : {}),
    ...(exercise.practiceOnly === true ? { practiceOnly: true } : {}),
  };
}

/** `l1-host-address~12` → `l1-host-address`. */
export function templateIdOf(exerciseId: string): string {
  const cut = exerciseId.lastIndexOf('~');
  return cut === -1 ? exerciseId : exerciseId.slice(0, cut);
}

/**
 * The exercise with this id, its devices named in `locale`. The returned
 * exercise is the one to draw AND to grade against: the grader compares the
 * learner's topology with `start`, labels included.
 */
export function exerciseById(id: string, locale: 'en' | 'ja'): Exercise | undefined {
  const exercise = templates.exerciseById(id);
  return exercise && templates.localiseExercise(exercise, locale);
}

function templatesAt(level: ExerciseLevel): readonly ExerciseTemplate[] {
  return templates.TEMPLATES.filter((template) => template.level === level);
}

export interface TemplateInfo {
  readonly id: string;
  readonly title: Localised;
  /** Configure, switch, choose a design, or find and repair. */
  readonly kind: ExerciseKind;
  /** The lessons of the template's first instance: a template itself lists none. */
  readonly lessons: readonly string[];
}

const infoCache = new Map<string, TemplateInfo>();

function infoOf(template: ExerciseTemplate): TemplateInfo {
  const cached = infoCache.get(template.id);
  if (cached) return cached;
  const info = {
    id: template.id,
    title: template.title,
    kind: template.kind,
    lessons: template.generate(0).lessons,
  };
  infoCache.set(template.id, info);
  return info;
}

/** The kinds of task a level has, in the order the templates module lists them. */
export function levelTemplates(level: ExerciseLevel): readonly TemplateInfo[] {
  return templatesAt(level).map(infoOf);
}

/** Every exercise id of a level. */
export function exercisePool(level: ExerciseLevel): readonly string[] {
  return templates.buildPool(level);
}

/**
 * The exercise to do next at a level: not from a template to avoid (the one
 * just done), and not one already seen, as far as the pool allows.
 */
export function nextExerciseId(level: ExerciseLevel, opts: NextOptions = {}): string | undefined {
  const real = templates.nextExerciseId(level, opts);
  if (real !== undefined) return real;
  const pool = exercisePool(level);
  const avoid = opts.avoidTemplateIds ?? [];
  const seen = opts.seenIds ?? [];
  const fresh = (id: string) => !seen.includes(id);
  const other = (id: string) => !avoid.includes(templateIdOf(id));
  return (
    pool.find((id) => fresh(id) && other(id)) ?? pool.find(other) ?? pool.find(fresh) ?? pool[0]
  );
}

/**
 * What opens when the learner asks for `exerciseId` in practice: the exercise
 * itself, or, once they have been judged on it, another instance of the same
 * kind of task that they have not met. (The estimate counts an exercise by its
 * first judged visit, so the same one again would prove nothing either way.)
 */
export function reopenedExerciseId(
  exerciseId: string,
  judgedIds: readonly string[],
  seenIds: readonly string[],
): string {
  if (!judgedIds.includes(exerciseId)) return exerciseId;
  if (templates.exerciseById(exerciseId)) {
    return templates.reopenedExerciseId(exerciseId, judgedIds, seenIds);
  }
  return exerciseId;
}

/**
 * An exercise of this level the learner opened in practice and left without
 * being judged on it (no Check, no answer shown, not skipped): the one to
 * offer again. Leaving used to give another exercise for free, so a kind of
 * task could be dodged by walking away from it. The latest such one, or
 * undefined.
 */
export function pendingExerciseId(
  level: ExerciseLevel,
  attempts: readonly AttemptRecord[],
): string | undefined {
  const judged = new Set(attempts.filter(isAttempted).map((attempt) => attempt.exerciseId));
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (!attempt || attempt.level !== level || attempt.context !== 'practice') continue;
    if (judged.has(attempt.exerciseId)) continue;
    return attempt.exerciseId;
  }
  return undefined;
}

/**
 * What "next exercise" opens for this learner at this level, wherever it is
 * pressed (the hub, the level page, the exercise page): the exercise they left
 * unjudged, else one of a kind the level still waits for, else the next unseen
 * one. Never the kind just done twice in a row while another is open.
 */
export function nextForLearner(
  level: ExerciseLevel,
  attempts: readonly AttemptRecord[],
): string | undefined {
  const pending = pendingExerciseId(level, attempts);
  if (pending !== undefined) return pending;
  const mine = attempts.filter((attempt) => attempt.level === level);
  const last = mine[mine.length - 1];
  return nextExerciseId(level, {
    ...(last ? { avoidTemplateIds: [last.templateId] } : {}),
    seenIds: attempts.map((attempt) => attempt.exerciseId),
    salt: learnerSalt(attempts),
    needKinds: levelSummary(attempts, level).missingKinds,
  });
}

/** An unseen exercise of one kind of task, for "do this kind": one that can settle the kind. */
export function nextOfKind(
  level: ExerciseLevel,
  templateId: string,
  attempts: readonly AttemptRecord[],
): string | undefined {
  const pending = pendingExerciseId(level, attempts);
  if (pending !== undefined && templateIdOf(pending) === templateId) return pending;
  const next = nextExerciseId(level, {
    seenIds: attempts.map((attempt) => attempt.exerciseId),
    salt: learnerSalt(attempts),
    needKinds: [templateId],
  });
  return next !== undefined && templateIdOf(next) === templateId ? next : undefined;
}

/**
 * What makes the order of the kinds of task a learner's own: the id of their
 * first attempt, which carries the moment it began. Empty before any attempt.
 */
export function learnerSalt(attempts: readonly { readonly id: string }[]): string {
  return attempts[0]?.id ?? '';
}
