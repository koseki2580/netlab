/**
 * The packet track: the exercises of `demo/packet-lab`, as the pages and the
 * attempt store see them.
 *
 * The store is the device exercises' own. A packet attempt is kept apart by
 * the track prefix on its exercise id and template id (`packet:p1-send-to~0`),
 * so the device levels never count it and the packet levels count nothing else
 * (`LevelScope`). The address bar carries the packet-lab id without the prefix.
 */

import type { AttemptMeta } from '../store/attemptStore';
import {
  isAttempted,
  isPacketAttempt,
  levelSummary,
  PACKET_TRACK_PREFIX,
  type LevelScope,
  type LevelSummary,
} from '../store/estimate';
import type { AttemptLocale, AttemptRecord } from '../store/types';
import type {
  ExerciseLevel,
  Localised,
  PacketExercise,
  PacketTemplate,
} from '../../packet-lab/model';
import {
  exerciseById as packetLabExercise,
  nextExerciseId,
  TEMPLATES,
} from '../../packet-lab/templates';
import { localiseTopology } from '../model/text';

export const PACKET_LEVELS: readonly ExerciseLevel[] = [1, 2, 3, 4];

export const tracked = (id: string): string => `${PACKET_TRACK_PREFIX}${id}`;
export const untracked = (id: string): string =>
  id.startsWith(PACKET_TRACK_PREFIX) ? id.slice(PACKET_TRACK_PREFIX.length) : id;

export const packetPath = (exerciseId: string): string =>
  `/exercises/packet/do/${encodeURIComponent(untracked(exerciseId))}`;
export const packetLevelPath = (level: ExerciseLevel): string => `/exercises/packet/level/${level}`;

export function packetTemplates(level: ExerciseLevel): readonly PacketTemplate[] {
  return TEMPLATES.filter((template) => template.level === level);
}

/** The kinds of task of each packet level, as the store knows them (prefixed template ids). */
export const PACKET_SCOPE: LevelScope = {
  track: 'packet',
  templates: TEMPLATES.map((template) => ({ id: tracked(template.id), level: template.level })),
};

export function packetSummary(
  attempts: readonly AttemptRecord[],
  level: ExerciseLevel,
): LevelSummary {
  return levelSummary(attempts, level, PACKET_SCOPE);
}

/** The title of a packet template, by its stored (prefixed) id. */
export function packetTitle(templateId: string): Localised | undefined {
  return TEMPLATES.find((template) => template.id === untracked(templateId))?.title;
}

/**
 * The exercise with this packet-lab id (prefixed or not), with the devices on
 * the diagram named in `locale`. `undefined` for an id that is not one.
 */
export function packetExercise(id: string, locale: AttemptLocale): PacketExercise | undefined {
  const exercise = packetLabExercise(untracked(id));
  if (!exercise) return undefined;
  return {
    ...exercise,
    topology: localiseTopology(exercise.topology, exercise.nodeLabels, locale),
  } as PacketExercise;
}

/**
 * Whether the answer is all picks among a few things offered (candidates,
 * questions): then a solve counts on the first Check only, as for the device
 * exercises' chips (`model/closedSet.ts`). A typed value or a fragment table
 * counts within two Checks.
 */
export function answeredByPicks(exercise: PacketExercise): boolean {
  if (exercise.kind === 'fragment') return false;
  const fields = exercise.kind === 'build-packet' ? exercise.fields : (exercise.fix?.fields ?? []);
  return fields.every((field) => field.candidates !== undefined);
}

/** What the store needs to open an attempt at this exercise. */
export function packetMeta(exercise: PacketExercise, locale: AttemptLocale): AttemptMeta {
  return {
    id: tracked(exercise.id),
    templateId: tracked(exercise.templateId),
    level: exercise.level,
    kind: exercise.kind,
    generatorVersion: exercise.generatorVersion,
    locale,
    ...(answeredByPicks(exercise) ? { checksToCount: 1 as const } : {}),
  };
}

/**
 * The next packet exercise of a level for this learner: the one they opened
 * and left without a Check, unless it is the one they are leaving by "next";
 * else one not met yet, not of the kind just done while another kind has one
 * left, in an order of the learner's own (packet-lab `nextExerciseId`).
 * Returns a packet-lab id.
 */
export function nextPacketFor(
  level: ExerciseLevel,
  attempts: readonly AttemptRecord[],
  leaving?: string,
): string | undefined {
  const mine = attempts.filter((attempt) => isPacketAttempt(attempt));
  const atLevel = mine.filter((attempt) => attempt.level === level);
  const judged = new Set(atLevel.filter(isAttempted).map((attempt) => attempt.exerciseId));
  const pending = [...atLevel]
    .reverse()
    .find(
      (attempt) =>
        attempt.context === 'practice' &&
        !judged.has(attempt.exerciseId) &&
        untracked(attempt.exerciseId) !== leaving,
    );
  if (pending) return untracked(pending.exerciseId);
  return nextExerciseId(level, {
    seenIds: atLevel.map((attempt) => untracked(attempt.exerciseId)),
    avoidTemplateIds: atLevel.slice(-3).map((attempt) => untracked(attempt.templateId)),
    salt: mine[0]?.id ?? '',
  });
}
