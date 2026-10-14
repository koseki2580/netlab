/**
 * The packet-exercise templates and the pools drawn from them, with the same
 * interface as the device exercises' `templates/index.ts`.
 */

import type { ExerciseLevel, PacketExercise, PacketTemplate } from '../model';
import { p1SendTo } from './level1/p1-send-to';
import { p1Where } from './level1/p1-where';
import { p1Which } from './level1/p1-which';
import { p2TtlWhere } from './level2/p2-ttl-where';
import { p3DfRead } from './level3/p3-df-read';
import { p4Capture } from './level4/p4-capture';
import { p4TwoFaults } from './level4/p4-two-faults';
import { p2FirstMac } from './level2/p2-first-mac';
import { p2Port } from './level2/p2-port';
import { p2SmallestTtl } from './level2/p2-smallest-ttl';
import { p3Df } from './level3/p3-df';
import { p3Fragment } from './level3/p3-fragment';
import { p4Fragment } from './level4/p4-fragment';

export { PACKET_GENERATOR_VERSION } from './shared/define';

/** In the order a level introduces them. */
export const TEMPLATES: readonly PacketTemplate[] = [
  p1SendTo,
  p1Where,
  p1Which,
  p2SmallestTtl,
  p2FirstMac,
  p2Port,
  p2TtlWhere,
  p3Df,
  p3Fragment,
  p3DfRead,
  p4Fragment,
  p4Capture,
  p4TwoFaults,
];

export function templateById(id: string): PacketTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

/** `undefined` for an unknown template or a seed that is not a whole number from 0 up. */
export function generateExercise(templateId: string, seed: number): PacketExercise | undefined {
  if (!Number.isSafeInteger(seed) || seed < 0) return undefined;
  return templateById(templateId)?.generate(seed);
}

/** The exercise with id `${templateId}~${seed}`. */
export function exerciseById(id: string): PacketExercise | undefined {
  const cut = id.lastIndexOf('~');
  const seedText = id.slice(cut + 1);
  if (cut <= 0 || !/^\d+$/.test(seedText)) return undefined;
  return generateExercise(id.slice(0, cut), Number(seedText));
}

// --- Pools -------------------------------------------------------------------------

/** Pool instances come from seeds below this. */
export const POOL_SEEDS = 100;
const POOL_SIZE = 120;

/** What the learner reads and sees: two instances alike in this are the same to them. */
const lookOf = (exercise: PacketExercise): string => {
  const { id: _id, seed: _seed, ...rest } = exercise;
  return JSON.stringify(rest);
};

/** One per fingerprint first (a different task), then the rest that still look different. */
export function instancesOf(template: PacketTemplate): string[] {
  const fingerprints = new Set<string>();
  const seen = new Set<string>();
  const fresh: string[] = [];
  const repeats: string[] = [];
  for (let seed = 0; seed < POOL_SEEDS; seed += 1) {
    const exercise = template.generate(seed);
    const look = lookOf(exercise);
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

/** The exercise ids of a level: the templates take turns, each giving its different tasks first. */
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
 * The next unseen exercise of a level, as the device exercises choose it: the
 * pool's first to begin with; then a kind among those done the fewest times,
 * never the one just done while another has an unseen instance, in an order
 * `salt` (something of the learner's own) makes differ between learners.
 */
export function nextExerciseId(
  level: ExerciseLevel,
  opts: { avoidTemplateIds?: readonly string[]; seenIds?: readonly string[]; salt?: string },
): string | undefined {
  const seen = new Set(opts.seenIds ?? []);
  const avoid = opts.avoidTemplateIds ?? [];
  const last = avoid[avoid.length - 1];
  const pool = buildPool(level);
  const unseen = pool.filter((id) => !seen.has(id));
  const [first] = unseen;
  if (first === undefined) return undefined;
  const done = new Map<string, number>();
  for (const id of seen) done.set(templateIdOf(id), (done.get(templateIdOf(id)) ?? 0) + 1);
  if (done.size === 0 && avoid.length === 0) return first;
  const next = new Map<string, string>();
  for (const id of unseen) if (!next.has(templateIdOf(id))) next.set(templateIdOf(id), id);
  const open = [...next.keys()];
  const allowed =
    [open.filter((id) => !avoid.includes(id)), open.filter((id) => id !== last), open].find(
      (list) => list.length > 0,
    ) ?? open;
  const fewest = Math.min(...allowed.map((id) => done.get(id) ?? 0));
  const round = allowed.filter((id) => (done.get(id) ?? 0) === fewest);
  const pick = round[hashOf(`${opts.salt ?? ''}|${seen.size}|${last ?? ''}`) % round.length];
  return (pick !== undefined ? next.get(pick) : undefined) ?? first;
}
