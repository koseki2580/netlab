/**
 * The frame every seeded template shares, device exercises and packet
 * exercises alike: the seed gives the draws, the template's draft gives the
 * content, and the frame adds what is the same everywhere: the id, the
 * template id, the seed, the generator version and the level; each device's
 * name in both languages, with the canvas label in Japanese; the hints' tiers;
 * the fingerprint.
 */

import type { TopologySnapshot } from '../../../../src/types/topology';
import type { ExerciseLevel, Localised } from '../../model/types';
import { localiseTopology } from '../../model/text';
import { drawer, type Draw } from './draw';
import { L, labelOf } from './text';

export interface FrameMeta {
  readonly id: string;
  readonly level: ExerciseLevel;
}

/** What the frame works out for one seed. */
export interface Frame {
  /** `id`, `templateId`, `seed`, `generatorVersion`, `level`, in that order. */
  readonly identity: {
    readonly id: string;
    readonly templateId: string;
    readonly seed: number;
    readonly generatorVersion: number;
    readonly level: ExerciseLevel;
  };
  /** Each device's name in both languages (a device without one keeps its label in both). */
  readonly nodeLabels: Record<string, Localised>;
  /** The draft's topology, its devices labelled in Japanese. */
  readonly topology: TopologySnapshot;
  /** The template id and the draft's fingerprint parts, joined with `|`. */
  readonly fingerprint: string;
}

export function frameFor(
  meta: FrameMeta,
  generatorVersion: number,
  seed: number,
  draft: {
    readonly topology: TopologySnapshot;
    readonly names: Readonly<Record<string, Localised>>;
    readonly fingerprint: readonly (string | number)[];
  },
): Frame {
  const nodeLabels = Object.fromEntries(
    draft.topology.nodes.map((node) => {
      const name = draft.names[node.id];
      return [node.id, name ? labelOf(name) : L(node.data.label, node.data.label)];
    }),
  );
  return {
    identity: {
      id: `${meta.id}~${seed}`,
      templateId: meta.id,
      seed,
      generatorVersion,
      level: meta.level,
    },
    nodeLabels,
    topology: localiseTopology(draft.topology, nodeLabels, 'ja'),
    fingerprint: [meta.id, ...draft.fingerprint].join('|'),
  };
}

/** Hints are given in order: the first is tier 1 (where to look), the third tier 3 (almost the answer). */
export const tierAt = (index: number): 1 | 2 | 3 => (index + 1) as 1 | 2 | 3;

/**
 * A template: `meta` with its generator version, and `generate(seed)`, which
 * draws from the seed, builds the draft and puts it together with its frame.
 */
export function defineSeeded<M extends FrameMeta, D, E>(
  meta: M,
  generatorVersion: number,
  build: (draw: Draw, seed: number) => D,
  assemble: (draft: D, frame: (parts: Parameters<typeof frameFor>[3]) => Frame, seed: number) => E,
): M & { readonly generatorVersion: number; readonly generate: (seed: number) => E } {
  const generate = (seed: number): E =>
    assemble(
      build(drawer(seed), seed),
      (parts) => frameFor(meta, generatorVersion, seed, parts),
      seed,
    );
  return { ...meta, generatorVersion, generate };
}
