import type { TopologySnapshot } from '../../../src/types/topology';
import type { SettingRef } from '../model/types';
import { settingTestId } from './describe';

interface Place {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a setting is on the diagram: its device; for a cable, a port or a
 * router side, the middle of the cable, so the ports of one switch are read
 * in the order of the devices plugged into them.
 */
function placeOf(ref: SettingRef, topology: TopologySnapshot): Place | null {
  const at = (nodeId: string) =>
    topology.nodes.find((node) => node.id === nodeId)?.position ?? null;
  const middle = (a: Place | null, b: Place | null) =>
    a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : (a ?? b);

  if (ref.kind === 'link-state') {
    const edge = topology.edges.find((candidate) => candidate.id === ref.edgeId);
    return edge ? middle(at(edge.source), at(edge.target)) : null;
  }
  const handle = 'portId' in ref ? ref.portId : 'ifaceId' in ref ? ref.ifaceId : null;
  if (handle === null) return at(ref.nodeId);
  const edge = topology.edges.find(
    (candidate) =>
      (candidate.source === ref.nodeId && candidate.sourceHandle === handle) ||
      (candidate.target === ref.nodeId && candidate.targetHandle === handle),
  );
  if (!edge) return at(ref.nodeId);
  return middle(at(ref.nodeId), at(edge.source === ref.nodeId ? edge.target : edge.source));
}

/**
 * The settings in the order their cards are shown: as the diagram reads, left
 * to right and then top to bottom, the cables before everything else. An exercise lists what may be changed in
 * whatever order suited its author, and "the faulty one first" would answer
 * the question for a learner who presses the first card. The order here does
 * not depend on the order the exercise gives.
 */
export function settingOrder(
  allowed: readonly SettingRef[],
  topology: TopologySnapshot,
): readonly SettingRef[] {
  return allowed
    .map((ref) => ({ ref, key: settingTestId(ref), place: placeOf(ref, topology) }))
    .sort((a, b) => {
      const ax = a.place?.x ?? Infinity;
      const bx = b.place?.x ?? Infinity;
      const ay = a.place?.y ?? Infinity;
      const by = b.place?.y ?? Infinity;
      // Cables first: where an exercise is about a cable, an address offered
      // beside it (a distractor) came first and pushed the cables off the screen.
      const cables = Number(b.ref.kind === 'link-state') - Number(a.ref.kind === 'link-state');
      return (
        cables ||
        (ax === bx ? 0 : ax < bx ? -1 : 1) ||
        (ay === by ? 0 : ay < by ? -1 : 1) ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
      );
    })
    .map((entry) => entry.ref);
}
