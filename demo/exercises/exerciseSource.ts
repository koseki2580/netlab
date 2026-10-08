/**
 * Where the pages get their exercises: the templates module, and the three dev
 * fixtures wherever that module has nothing.
 *
 * The templates are being written in parallel with these pages, so the module
 * is looked up with a glob: a file that is not there yet is an empty result,
 * not a failed import.
 *
 * To remove the fallback once the templates have landed: replace the glob with
 * `import * as templates from './templates'`, delete `FIXTURE_TEMPLATES` from
 * the four functions below, and delete `devFixtures.ts`.
 */

import { FIXTURE_TEMPLATES } from './devFixtures';
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
}

interface TemplatesModule {
  readonly TEMPLATES: readonly ExerciseTemplate[];
  readonly exerciseById: (id: string) => Exercise | undefined;
  readonly localiseExercise: (exercise: Exercise, locale: 'en' | 'ja') => Exercise;
  readonly buildPool: (level: ExerciseLevel) => readonly string[];
  readonly nextExerciseId: (level: ExerciseLevel, opts: NextOptions) => string | undefined;
}

type GlobMeta = ImportMeta & {
  readonly glob: <T>(pattern: string, options: { readonly eager: true }) => Record<string, T>;
};

const templates: Partial<TemplatesModule> =
  (import.meta as GlobMeta).glob<Partial<TemplatesModule>>('./templates/index.ts', {
    eager: true,
  })['./templates/index.ts'] ?? {};

/** How many seeds of each fixture stand in for a pool. */
const FIXTURE_SEEDS = 10;

/** `l1-host-address~12` → `l1-host-address`. */
export function templateIdOf(exerciseId: string): string {
  const cut = exerciseId.lastIndexOf('~');
  return cut === -1 ? exerciseId : exerciseId.slice(0, cut);
}

function fixtureById(id: string): Exercise | undefined {
  const seed = Number(id.slice(id.lastIndexOf('~') + 1));
  if (!id.includes('~') || !Number.isInteger(seed) || seed < 0) return undefined;
  return FIXTURE_TEMPLATES.find((template) => template.id === templateIdOf(id))?.generate(seed);
}

/**
 * The exercise with this id, its devices named in `locale`. The returned
 * exercise is the one to draw AND to grade against: the grader compares the
 * learner's topology with `start`, labels included.
 */
export function exerciseById(id: string, locale: 'en' | 'ja'): Exercise | undefined {
  const exercise = templates.exerciseById?.(id) ?? fixtureById(id);
  return exercise && (templates.localiseExercise?.(exercise, locale) ?? exercise);
}

function templatesAt(level: ExerciseLevel): readonly ExerciseTemplate[] {
  const real = (templates.TEMPLATES ?? []).filter((template) => template.level === level);
  return real.length > 0 ? real : FIXTURE_TEMPLATES.filter((template) => template.level === level);
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
  const real = templates.buildPool?.(level) ?? [];
  if (real.length > 0) return real;
  return FIXTURE_TEMPLATES.filter((template) => template.level === level).flatMap((template) =>
    Array.from({ length: FIXTURE_SEEDS }, (_, seed) => `${template.id}~${seed}`),
  );
}

/**
 * The exercise to do next at a level: not from a template to avoid (the one
 * just done), and not one already seen, as far as the pool allows.
 */
export function nextExerciseId(level: ExerciseLevel, opts: NextOptions = {}): string | undefined {
  const real = templates.nextExerciseId?.(level, opts);
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
