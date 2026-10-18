/**
 * The frame every packet template shares, as `defineTemplate` is for the
 * device exercises: draw from the seed, build a draft, and turn it into an
 * exercise (labels on the devices, the id, the hints' tiers, the fingerprint).
 */

import type { TopologySnapshot } from '../../../../src/types/topology';
import type { Draw } from '../../../exercises/templates/shared/draw';
import { defineSeeded, tierAt } from '../../../exercises/templates/shared/frame';
import type {
  BuildExercise,
  ExerciseLevel,
  FragmentExercise,
  Localised,
  PacketExercise,
  PacketKind,
  PacketTemplate,
  ReadExercise,
} from '../../model';
import type { Names } from './nets';

/** Bumped when a template's output changes. */
export const PACKET_GENERATOR_VERSION = 2;

type Base =
  | 'id'
  | 'templateId'
  | 'seed'
  | 'generatorVersion'
  | 'level'
  | 'nodeLabels'
  | 'hints'
  | 'fingerprint'
  | 'kind';

interface DraftCommon {
  readonly topology: TopologySnapshot;
  readonly names: Names;
  /** Where to look; what rule applies; almost the answer (never the value). */
  readonly hints: readonly [Localised, Localised, Localised];
  /** What makes this instance a different task. No raw numbers that only change the digits. */
  readonly fingerprint: readonly (string | number)[];
}

export type Draft =
  | (Omit<BuildExercise, Base> & DraftCommon & { readonly kind: 'build-packet' })
  | (Omit<FragmentExercise, Base> & DraftCommon & { readonly kind: 'fragment' })
  | (Omit<ReadExercise, Base> & DraftCommon & { readonly kind: 'read-packet' });

export interface Meta {
  readonly id: string;
  readonly level: ExerciseLevel;
  readonly kind: PacketKind;
  readonly title: Localised;
}

export function definePacketTemplate(
  meta: Meta,
  build: (draw: Draw, seed: number) => Draft,
): PacketTemplate {
  return defineSeeded(
    meta,
    PACKET_GENERATOR_VERSION,
    build,
    ({ names, hints, fingerprint, topology, ...draft }, frameOf): PacketExercise => {
      const frame = frameOf({ topology, names, fingerprint });
      return {
        ...draft,
        ...frame.identity,
        topology: frame.topology,
        nodeLabels: frame.nodeLabels,
        hints: hints.map((text, index) => ({ tier: tierAt(index), text })),
        fingerprint: frame.fingerprint,
      } as PacketExercise;
    },
  );
}
