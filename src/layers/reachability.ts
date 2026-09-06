import type { NetlabEdge, NetworkTopology } from '../types/topology';

/**
 * Whether any node satisfying `isDestination` can be reached starting at
 * `startNodeId` without passing back through `originNodeId`, following only
 * links `isUsable` allows.
 *
 * A forwarder that floods reaches every branch; a trace follows one. Which
 * branch it picks is the difference between a lesson that shows an arrival and
 * one that shows a dead end, so both the switch and the router ask this before
 * falling back to whichever neighbour happens to be listed first.
 */
export function reachesFrom(
  topology: NetworkTopology,
  originNodeId: string,
  startNodeId: string,
  isDestination: (nodeId: string) => boolean,
  isUsable: (edge: NetlabEdge) => boolean = () => true,
): boolean {
  if (isDestination(startNodeId)) return true;

  const seen = new Set([originNodeId, startNodeId]);
  const queue = [startNodeId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of topology.edges) {
      const next =
        edge.source === current ? edge.target : edge.target === current ? edge.source : null;
      if (next === null || seen.has(next)) continue;
      if (!isUsable(edge)) continue;
      if (isDestination(next)) return true;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}
