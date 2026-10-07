/**
 * The frame every template shares: draw from the seed, build a `Draft`, and
 * `defineTemplate` turns it into an `Exercise` (labels on the devices, check
 * labels split from the checks, the id and the fingerprint).
 */

import type { TopologySnapshot } from '../../../../src/types/topology';
import type {
  DesignOption,
  Exercise,
  ExerciseCheck,
  ExerciseKind,
  ExerciseLevel,
  ExerciseTemplate,
  Localised,
  SettingChange,
  SettingRef,
} from '../../model/types';
import { drawer, type Draw } from './draw';
import { L, labelOf, The, type Named } from './text';
import { GENERATOR_VERSION } from './version';

export type LabelledCheck = ExerciseCheck & { readonly label: Localised };

export interface Draft {
  readonly title: Localised;
  readonly brief: Localised;
  /** The start state, fault planted. */
  readonly topology: TopologySnapshot;
  /** The name of every device, by node id. */
  readonly names: Readonly<Record<string, Named>>;
  readonly allowed: readonly SettingRef[];
  readonly options?: readonly DesignOption[];
  readonly checks: readonly LabelledCheck[];
  /** Where to look; what rule applies; almost the answer. */
  readonly hints: readonly [Localised, Localised, Localised];
  readonly lessons: readonly string[];
  readonly reference: readonly SettingChange[];
  readonly wrongAnswers?: readonly (readonly SettingChange[])[];
  /** What makes this instance a different task: place, shape, fault, device. No raw numbers. */
  readonly fingerprint: readonly string[];
}

export interface TemplateMeta {
  readonly id: string;
  readonly level: ExerciseLevel;
  readonly kind: ExerciseKind;
  readonly title: Localised;
}

export function defineTemplate(
  meta: TemplateMeta,
  build: (draw: Draw, seed: number) => Draft,
): ExerciseTemplate {
  const generate = (seed: number): Exercise => {
    const draft = build(drawer(seed), seed);
    const nodeLabels = Object.fromEntries(
      draft.topology.nodes.map((node) => {
        const name = draft.names[node.id];
        return [node.id, name ? labelOf(name) : L(node.data.label, node.data.label)];
      }),
    );
    return {
      id: `${meta.id}~${seed}`,
      templateId: meta.id,
      seed,
      generatorVersion: GENERATOR_VERSION,
      level: meta.level,
      kind: meta.kind,
      title: draft.title,
      brief: draft.brief,
      start: {
        ...draft.topology,
        nodes: draft.topology.nodes.map((node) => ({
          ...node,
          data: { ...node.data, label: nodeLabels[node.id]?.ja ?? node.data.label },
        })),
      },
      allowed: draft.allowed,
      ...(draft.options ? { options: draft.options } : {}),
      checks: draft.checks.map(({ label: _label, ...check }) => check as ExerciseCheck),
      hints: draft.hints.map((text, index) => ({ tier: (index + 1) as 1 | 2 | 3, text })),
      lessons: draft.lessons,
      reference: draft.reference,
      fingerprint: [meta.id, ...draft.fingerprint].join('|'),
      checkLabels: Object.fromEntries(draft.checks.map((check) => [check.id, check.label])),
      nodeLabels,
      ...(draft.wrongAnswers ? { wrongAnswers: draft.wrongAnswers } : {}),
    };
  };
  return { ...meta, generatorVersion: GENERATOR_VERSION, generate };
}

/** The setting a change writes. */
export function refOf(change: SettingChange): SettingRef {
  switch (change.kind) {
    case 'host-ip':
    case 'static-routes':
    case 'stp-priority':
      return { kind: change.kind, nodeId: change.nodeId };
    case 'iface-address':
    case 'iface-nat':
      return { kind: change.kind, nodeId: change.nodeId, ifaceId: change.ifaceId };
    case 'port-vlan':
    case 'stp-port':
      return { kind: change.kind, nodeId: change.nodeId, portId: change.portId };
    case 'link-state':
      return { kind: change.kind, edgeId: change.edgeId };
    case 'ospf-cost':
      return { kind: change.kind, nodeId: change.nodeId, network: change.network };
    case 'iface-acl':
      return {
        kind: change.kind,
        nodeId: change.nodeId,
        ifaceId: change.ifaceId,
        direction: change.direction,
      };
  }
}

/** Checks written as goals: "The till reaches the stock server". */
export function goals(names: Readonly<Record<string, Named>>) {
  const name = (id: string): Named => names[id] ?? L(id, id);
  return {
    reach: (from: string, to: string): LabelledCheck => ({
      id: `reach-${from}-${to}`,
      kind: 'reach',
      probe: { via: 'ping', from, to },
      label: L(
        `${The(name(from))} reaches the ${name(to).en}`,
        `${name(from).ja}から${name(to).ja}に届く`,
      ),
    }),
    apart: (from: string, to: string, because: 'vlan' | 'acl'): LabelledCheck => ({
      id: `apart-${from}-${to}`,
      kind: 'must-not-reach',
      probe: { via: 'ping', from, to },
      because,
      label: L(
        `${The(name(from))} does not reach the ${name(to).en}`,
        `${name(from).ja}から${name(to).ja}には届かない`,
      ),
    }),
  };
}
