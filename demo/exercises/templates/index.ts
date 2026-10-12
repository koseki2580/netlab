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

/** FNV-1a, as an unsigned 32-bit number. */
function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  return (hash ^ (hash >>> 13)) >>> 0;
}

/**
 * The next exercise of a level the learner has not seen.
 *
 * The kinds of task used to come in the order of `TEMPLATES`, round after
 * round, so "one of every kind" was done by doing seven in a row and a learner
 * could know what came next. Now:
 *
 * - the very first exercise of a level is the pool's first (the level's
 *   introduction);
 * - after that the kind is drawn among those done the fewest times, so every
 *   kind comes once per round, in an order that differs from round to round
 *   and from learner to learner (`salt`: something of the learner's own, like
 *   the id of their first attempt);
 * - never a kind in `avoidTemplateIds` (the ones done lately, most recent
 *   last) while another has an unseen instance, and never the most recent one.
 *
 * The same record and the same salt give the same answer, so the hub, the
 * level page and "next" agree.
 */
export function nextExerciseId(
  level: ExerciseLevel,
  opts: {
    avoidTemplateIds?: readonly string[];
    seenIds?: readonly string[];
    salt?: string;
  },
): string | undefined {
  const seenIds = opts.seenIds ?? [];
  const seen = new Set(seenIds);
  const avoid = opts.avoidTemplateIds ?? [];
  const last = avoid[avoid.length - 1];
  const pool = buildPool(level);
  const unseen = pool.filter((id) => !seen.has(id));
  const [first] = unseen;
  if (first === undefined) return undefined;
  const poolTemplates = new Set(pool.map(templateIdOf));
  // How often each kind was met, instances from outside the pool (an exercise opened again) included.
  const done = new Map<string, number>();
  for (const id of seen) {
    const templateId = templateIdOf(id);
    if (poolTemplates.has(templateId)) done.set(templateId, (done.get(templateId) ?? 0) + 1);
  }
  if (done.size === 0 && avoid.length === 0) return first;

  const next = new Map<string, string>();
  for (const id of unseen) if (!next.has(templateIdOf(id))) next.set(templateIdOf(id), id);
  const open = [...next.keys()];
  const allowed =
    [
      open.filter((templateId) => !avoid.includes(templateId)),
      open.filter((templateId) => templateId !== last),
      open,
    ].find((list) => list.length > 0) ?? open;
  const fewest = Math.min(...allowed.map((templateId) => done.get(templateId) ?? 0));
  const round = allowed.filter((templateId) => (done.get(templateId) ?? 0) === fewest);
  const pick = round[hashOf(`${opts.salt ?? ''}|${seen.size}|${last ?? ''}`) % round.length];
  return (pick !== undefined ? next.get(pick) : undefined) ?? first;
}

const instances = new Map<string, readonly string[]>();

/**
 * What the page opens when the learner asks for `exerciseId` in practice: the
 * exercise itself, or, once the learner has been judged on it (`judgedIds`),
 * another instance of the same template that the learner has not met
 * (`seenIds`). The same task with other values and other things to press: what
 * was learnt from the first visit still helps, what was memorised does not.
 *
 * Taken from the far end of the template's instances, so that it is not the
 * one the level would serve next anyway. When every instance has been met the
 * exercise itself is returned; the estimate counts it by its first visit.
 */
export function reopenedExerciseId(
  exerciseId: string,
  judgedIds: readonly string[],
  seenIds: readonly string[],
): string {
  if (!judgedIds.includes(exerciseId)) return exerciseId;
  const template = templateById(templateIdOf(exerciseId));
  if (!template) return exerciseId;
  let all = instances.get(template.id);
  if (!all) {
    all = instancesOf(template);
    instances.set(template.id, all);
  }
  const met = new Set([...judgedIds, ...seenIds]);
  for (let index = all.length - 1; index >= 0; index -= 1) {
    const id = all[index];
    if (id !== undefined && !met.has(id)) return id;
  }
  return exerciseId;
}
