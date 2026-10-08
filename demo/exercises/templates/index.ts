/**
 * The exercise templates and the pools drawn from them.
 *
 * A level has only so many genuinely different tasks (seven at level 1, ten at
 * level 2). The pool exists so that placement, retests and before/after sets
 * never show a learner the same instance twice, not as a hundred things to finish.
 */

import type { Exercise, ExerciseLevel, ExerciseTemplate } from '../model/types';
import { l1CableOff } from './level1/l1-cable-off';
import { l1ChooseAddress } from './level1/l1-choose-address';
import { l1HostAddress } from './level1/l1-host-address';
import { l1HostBlank } from './level1/l1-host-blank';
import { l1PrefixFit } from './level1/l1-prefix-fit';
import { l1RouterAddress } from './level1/l1-router-address';
import { l1WhichPc } from './level1/l1-which-pc';
import { l2AclPermit } from './level2/l2-acl-permit';
import { l2ChooseRoot } from './level2/l2-choose-root';
import { l2ChooseStaticDefault } from './level2/l2-choose-static-default';
import { l2StaticMissing } from './level2/l2-static-missing';
import { l2StaticNexthop } from './level2/l2-static-nexthop';
import { l2StaticReturn } from './level2/l2-static-return';
import { l2StpRoot } from './level2/l2-stp-root';
import { l2TrunkAllowed } from './level2/l2-trunk-allowed';
import { l2VlanAccess } from './level2/l2-vlan-access';
import { l2VlanSeparate } from './level2/l2-vlan-separate';

export { GENERATOR_VERSION } from './shared/version';

/**
 * In the order a level introduces them.
 *
 * Level 3 and 4 templates are not written yet. When they are: the first time a
 * brief or a hint says コスト / "cost", gloss it —
 * 「コスト（回線ごとの点数。合計が小さい道が選ばれます）」 /
 * "cost (a score per link; the path with the lowest total is chosen)". The
 * placement fixture used the bare word and a learner could not read it.
 */
export const TEMPLATES: readonly ExerciseTemplate[] = [
  l1HostAddress,
  l1HostBlank,
  l1CableOff,
  l1RouterAddress,
  l1PrefixFit,
  l1ChooseAddress,
  l1WhichPc,
  l2VlanAccess,
  l2VlanSeparate,
  l2TrunkAllowed,
  l2StpRoot,
  l2StaticMissing,
  l2StaticReturn,
  l2StaticNexthop,
  l2AclPermit,
  l2ChooseRoot,
  l2ChooseStaticDefault,
];

export function templateById(id: string): ExerciseTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

/** `undefined` for an unknown template or a seed that is not a whole number from 0 up. */
export function generateExercise(templateId: string, seed: number): Exercise | undefined {
  if (!Number.isSafeInteger(seed) || seed < 0) return undefined;
  return templateById(templateId)?.generate(seed);
}

/** The exercise with id `${templateId}~${seed}`. */
export function exerciseById(id: string): Exercise | undefined {
  const cut = id.lastIndexOf('~');
  const seedText = id.slice(cut + 1);
  if (cut <= 0 || !/^\d+$/.test(seedText)) return undefined;
  return generateExercise(id.slice(0, cut), Number(seedText));
}

/**
 * `exercise` with the devices named in `locale`. `start` carries Japanese
 * names; the grader compares a learner's topology with `start`, so use the
 * returned exercise for BOTH the canvas and the grade.
 */
export function localiseExercise(exercise: Exercise, locale: 'en' | 'ja'): Exercise {
  const labels = exercise.nodeLabels;
  if (!labels) return exercise;
  return {
    ...exercise,
    start: {
      ...exercise.start,
      nodes: exercise.start.nodes.map((node) => ({
        ...node,
        data: { ...node.data, label: labels[node.id]?.[locale] ?? node.data.label },
      })),
    },
  };
}

// --- Pools -------------------------------------------------------------------

/** Pool instances come from seeds below this, so `EXERCISE_VERIFY_SEEDS=100` verifies all of them. */
export const POOL_SEEDS = 100;
/** A pool holds this many ids when the templates of the level can supply them. */
const POOL_SIZE = 120;

/**
 * The instances of one template worth putting in a pool, best first: one per
 * fingerprint (a different task), then the rest that still differ in what the
 * learner reads or sees.
 */
function instancesOf(template: ExerciseTemplate): string[] {
  const fingerprints = new Set<string>();
  const seen = new Set<string>();
  const fresh: string[] = [];
  const repeats: string[] = [];
  for (let seed = 0; seed < POOL_SEEDS; seed += 1) {
    const exercise = template.generate(seed);
    const look = `${exercise.brief.ja}\n${JSON.stringify(exercise.start)}`;
    if (seen.has(look)) continue;
    seen.add(look);
    if (fingerprints.has(exercise.fingerprint)) repeats.push(exercise.id);
    else {
      fingerprints.add(exercise.fingerprint);
      fresh.push(exercise.id);
    }
  }
  return [...fresh, ...repeats];
}

const pools = new Map<ExerciseLevel, readonly string[]>();

/**
 * The exercise ids of a level, in a stable order: the templates take turns, and
 * each template gives its different tasks before any repeat of one.
 */
export function buildPool(level: ExerciseLevel): readonly string[] {
  const cached = pools.get(level);
  if (cached) return cached;
  const queues = TEMPLATES.filter((template) => template.level === level).map(instancesOf);
  const pool: string[] = [];
  for (let round = 0; pool.length < POOL_SIZE; round += 1) {
    const turn = queues.flatMap((queue) => queue[round] ?? []);
    if (turn.length === 0) break;
    pool.push(...turn.slice(0, POOL_SIZE - pool.length));
  }
  pools.set(level, pool);
  return pool;
}

const templateIdOf = (exerciseId: string): string =>
  exerciseId.slice(0, exerciseId.lastIndexOf('~'));

/**
 * The next exercise of a level the learner has not seen. `avoidTemplateIds` are
 * the templates done lately, most recent last: one of another template is
 * preferred, and the most recent template is never repeated while any other
 * template still has an unseen instance.
 */
export function nextExerciseId(
  level: ExerciseLevel,
  opts: { avoidTemplateIds?: readonly string[]; seenIds?: readonly string[] },
): string | undefined {
  const seen = new Set(opts.seenIds ?? []);
  const avoid = opts.avoidTemplateIds ?? [];
  const last = avoid[avoid.length - 1];
  const unseen = buildPool(level).filter((id) => !seen.has(id));
  return (
    unseen.find((id) => !avoid.includes(templateIdOf(id))) ??
    unseen.find((id) => templateIdOf(id) !== last) ??
    unseen[0]
  );
}
