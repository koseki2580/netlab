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
  ExerciseHint,
  ExerciseKind,
  ExerciseLevel,
  ExerciseTemplate,
  Localised,
  SettingChange,
  SettingRef,
} from '../../model/types';
import { portWords, sideWords } from '../../model/names';
import { drawer, type Draw } from './draw';
import { L, labelOf, The, type Named } from './text';
import { GENERATOR_VERSION } from './version';

export type LabelledCheck = ExerciseCheck & { readonly label: Localised };

export interface Draft {
  readonly title: Localised;
  /** One line: what to do. */
  readonly task: Localised;
  /** One line: the rule that applies, without the values. */
  readonly rule?: Localised;
  /** The story and the glosses, read on request. */
  readonly brief: Localised;
  /** The start state, fault planted. */
  readonly topology: TopologySnapshot;
  /** The name of every device, by node id. */
  readonly names: Readonly<Record<string, Named>>;
  readonly allowed: readonly SettingRef[];
  readonly options?: readonly DesignOption[];
  readonly checks: readonly LabelledCheck[];
  /** Where to look; what rule applies; almost the answer. */
  readonly hints: readonly [DraftHint, DraftHint, DraftHint];
  readonly lessons: readonly string[];
  readonly reference: readonly SettingChange[];
  readonly wrongAnswers?: readonly (readonly SettingChange[])[];
  /** See `Exercise.pickFirst`. */
  readonly pickFirst?: { readonly faulty: readonly string[] };
  /** See `Exercise.unsoundPasses`. */
  readonly unsoundPasses?: readonly (readonly SettingChange[])[];
  /** What makes this instance a different task: place, shape, fault, device. No raw numbers. */
  readonly fingerprint: readonly string[];
  /** See `Exercise.answerInBrief`: why this brief states a value that is the answer. */
  readonly answerInBrief?: string;
}

/** A hint: its text, or its text with the fact it rests on and the line for when that is no longer so. */
export type DraftHint = Localised | Omit<ExerciseHint, 'tier'>;

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
      task: draft.task,
      ...(draft.rule ? { rule: draft.rule } : {}),
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
      hints: draft.hints.map((hint, index) => ({
        tier: (index + 1) as 1 | 2 | 3,
        ...('text' in hint ? hint : { text: hint }),
      })),
      lessons: draft.lessons,
      reference: draft.reference,
      fingerprint: [meta.id, ...draft.fingerprint].join('|'),
      checkLabels: Object.fromEntries(draft.checks.map((check) => [check.id, check.label])),
      nodeLabels,
      ...(draft.wrongAnswers ? { wrongAnswers: draft.wrongAnswers } : {}),
      ...(draft.unsoundPasses ? { unsoundPasses: draft.unsoundPasses } : {}),
      ...(draft.pickFirst ? { pickFirst: draft.pickFirst } : {}),
      ...(draft.answerInBrief !== undefined ? { answerInBrief: draft.answerInBrief } : {}),
    };
  };
  return { ...meta, generatorVersion: GENERATOR_VERSION, generate };
}

/**
 * A switch port and a router side as the settings form names them, in both
 * languages, for hints: 「差し込み口 p1（レジ につながる）」, never a bare `p1`.
 */
export function formNames(topology: TopologySnapshot, names: Readonly<Record<string, Named>>) {
  const peer = (nodeId: string, handleId: string): Localised | null => {
    const edge = topology.edges.find(
      (candidate) =>
        (candidate.source === nodeId && candidate.sourceHandle === handleId) ||
        (candidate.target === nodeId && candidate.targetHandle === handleId),
    );
    if (!edge) return null;
    const otherId = edge.source === nodeId ? edge.target : edge.source;
    const name = names[otherId];
    return name ? labelOf(name) : L(otherId, otherId);
  };
  return {
    port: (nodeId: string, portId: string) => portWords(portId, peer(nodeId, portId)),
    side: (nodeId: string, ifaceId: string) => sideWords(ifaceId, peer(nodeId, ifaceId)),
  };
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
