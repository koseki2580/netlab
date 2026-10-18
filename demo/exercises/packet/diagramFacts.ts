/**
 * What a packet exercise needs said beside its diagram, and only that: the
 * MAC address of each device where a MAC is the question, the limit (MTU) of
 * each cable that has one, and a router's list (ACL) where there is one. The
 * device exercises' diagram shows none of these.
 */

import type { TopologySnapshot } from '../../../src/types/topology';
import type { Localised, PacketExercise } from '../../packet-lab/model';
import { labelIn } from '../model/text';

export interface DiagramFact {
  readonly id: string;
  readonly text: Localised;
}

export interface DiagramFacts {
  readonly macs: readonly DiagramFact[];
  readonly mtus: readonly DiagramFact[];
  readonly lists: readonly DiagramFact[];
}

const MAC_ASKS = new Set(['frame-src-mac', 'frame-dst-mac']);

/** Whether a MAC is part of the answer. */
export function needsMacs(exercise: PacketExercise): boolean {
  if (exercise.kind === 'build-packet')
    return exercise.fields.some((field) => field.id === 'dstMac');
  if (exercise.kind === 'read-packet')
    return exercise.questions.some((question) => MAC_ASKS.has(question.ask));
  return false;
}

const name = (exercise: PacketExercise, id: string): Localised => labelIn(exercise.nodeLabels, id);

function cableName(
  exercise: PacketExercise,
  topology: TopologySnapshot,
  edgeId: string,
): Localised {
  const edge = topology.edges.find((entry) => entry.id === edgeId);
  if (!edge) return { en: edgeId, ja: edgeId };
  const a = name(exercise, edge.source);
  const b = name(exercise, edge.target);
  return { en: `${a.en} – ${b.en}`, ja: `${a.ja} と ${b.ja} のあいだ` };
}

export function diagramFacts(exercise: PacketExercise): DiagramFacts {
  const { topology } = exercise;
  const macs: DiagramFact[] = needsMacs(exercise)
    ? topology.nodes.flatMap((node) => {
        const label = name(exercise, node.id);
        const own = node.data.mac
          ? [
              {
                id: node.id,
                text: { en: `${label.en}: ${node.data.mac}`, ja: `${label.ja}：${node.data.mac}` },
              },
            ]
          : [];
        const sides = (node.data.interfaces ?? []).map((side) => {
          const edge = topology.edges.find(
            (entry) =>
              (entry.source === node.id && entry.sourceHandle === side.id) ||
              (entry.target === node.id && entry.targetHandle === side.id),
          );
          const peerId = edge ? (edge.source === node.id ? edge.target : edge.source) : '';
          const peer = name(exercise, peerId);
          return {
            id: `${node.id}:${side.id}`,
            text: {
              en: `${label.en}, side facing ${peer.en}: ${side.macAddress}`,
              ja: `${label.ja}（${peer.ja}の側）：${side.macAddress}`,
            },
          };
        });
        const ports = (node.data.ports ?? [])
          .filter((port) => port.id === 'up')
          .map((port) => ({
            id: `${node.id}:${port.id}`,
            text: {
              en: `${label.en}, port towards the router: ${port.macAddress}`,
              ja: `${label.ja}（ルータ側の差し込み口）：${port.macAddress}`,
            },
          }));
        return [...own, ...sides, ...ports];
      })
    : [];
  const mtus: DiagramFact[] = topology.edges.flatMap((edge) => {
    const mtu = edge.data?.mtuBytes;
    if (typeof mtu !== 'number') return [];
    const cable = cableName(exercise, topology, edge.id);
    return [
      {
        id: edge.id,
        text: {
          en: `Cable ${cable.en}: MTU ${mtu} bytes`,
          ja: `${cable.ja}の回線：MTU ${mtu} バイト`,
        },
      },
    ];
  });
  const lists: DiagramFact[] = topology.nodes.flatMap((node) =>
    (node.data.interfaces ?? []).flatMap((side) =>
      (side.inboundAcl ?? []).map((rule, index) => {
        const label = name(exercise, node.id);
        const kind =
          rule.protocol === 'any'
            ? { en: 'any kind', ja: '種類すべて' }
            : { en: rule.protocol.toUpperCase(), ja: rule.protocol.toUpperCase() };
        const to = rule.dstIp
          ? { en: ` to ${rule.dstIp}`, ja: `・あて先 ${rule.dstIp}` }
          : { en: '', ja: '' };
        const port =
          rule.dstPort !== undefined
            ? {
                en: `, port ${String(typeof rule.dstPort === 'number' ? rule.dstPort : `${rule.dstPort.from}-${rule.dstPort.to}`)}`,
                ja: `・ポート ${String(typeof rule.dstPort === 'number' ? rule.dstPort : `${rule.dstPort.from}-${rule.dstPort.to}`)}`,
              }
            : { en: '', ja: '' };
        const action =
          rule.action === 'permit' ? { en: 'allow', ja: '通す' } : { en: 'refuse', ja: '止める' };
        return {
          id: `${node.id}:${side.id}:${index}`,
          text: {
            en: `${label.en}, line ${index + 1}: ${action.en} ${kind.en}${to.en}${port.en}`,
            ja: `${label.ja}の一覧 ${index + 1} 行目：${action.ja}・${kind.ja}${to.ja}${port.ja}`,
          },
        };
      }),
    ),
  );
  return { macs, mtus, lists };
}
