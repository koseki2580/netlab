/**
 * The EIGRP lesson (REQ-411): DUAL's successor, feasible successors and the
 * feasibility condition, and what happens when the successor's link fails.
 * EIGRP was created by Cisco and is published as the informational RFC 7868.
 *
 * Simplified: one cost number per link stands for EIGRP's composite metric
 * (bandwidth and delay); costs are small and there are no ties, so no equal-cost
 * or unequal-cost (variance) load sharing. Every router has converged on its
 * shortest path to N. A neighbour whose own best path goes straight through R1
 * advertises its route back to R1 as unreachable (split horizon with poison
 * reverse). A query is shown as one round: each neighbour replies with its
 * best distance that does not use R1, as it would after finishing any queries
 * of its own. Timers, stuck-in-active and query scoping are left out.
 */

export const ROUTER = 'R1';
export const DEST = 'N';

export interface Link {
  readonly a: string;
  readonly b: string;
  readonly cost: number;
}

export interface Topology {
  readonly id: 'with-fs' | 'no-fs';
  readonly links: readonly Link[];
}

/** R1 with four neighbours that each reach N on their own. */
export const WITH_FS: Topology = {
  id: 'with-fs',
  links: [
    { a: ROUTER, b: 'A', cost: 10 },
    { a: 'A', b: DEST, cost: 20 },
    { a: ROUTER, b: 'B', cost: 5 },
    { a: 'B', b: DEST, cost: 28 },
    { a: ROUTER, b: 'C', cost: 4 },
    { a: 'C', b: DEST, cost: 30 },
    { a: ROUTER, b: 'D', cost: 25 },
    { a: 'D', b: DEST, cost: 15 },
  ],
};

/** R1 where X's best path runs X → Y → R1: a backup through X would loop. */
export const NO_FS: Topology = {
  id: 'no-fs',
  links: [
    { a: ROUTER, b: 'A', cost: 10 },
    { a: 'A', b: DEST, cost: 20 },
    { a: ROUTER, b: 'C', cost: 4 },
    { a: 'C', b: DEST, cost: 32 },
    { a: ROUTER, b: 'X', cost: 3 },
    { a: 'X', b: 'Y', cost: 1 },
    { a: 'Y', b: ROUTER, cost: 1 },
  ],
};

export const TOPOLOGIES: readonly Topology[] = [WITH_FS, NO_FS];

/** The main topology with C's own link to N set to `cost`. */
export function withCtoN(cost: number): Topology {
  return {
    id: 'with-fs',
    links: WITH_FS.links.map((link) =>
      link.a === 'C' && link.b === DEST ? { ...link, cost } : link,
    ),
  };
}

const other = (link: Link, node: string) => (link.a === node ? link.b : link.a);
const touches = (link: Link, node: string) => link.a === node || link.b === node;

/** Every node's shortest distance to N, leaving out the `without` nodes. */
export function distances(
  links: readonly Link[],
  without: readonly string[] = [],
): Map<string, number> {
  const usable = links.filter((link) => !without.some((node) => touches(link, node)));
  const dist = new Map<string, number>();
  for (const link of usable) {
    dist.set(link.a, Infinity);
    dist.set(link.b, Infinity);
  }
  dist.set(DEST, 0);
  // Bellman-Ford: small graphs, positive costs.
  for (let round = 0; round < dist.size; round += 1) {
    for (const link of usable) {
      const viaB = dist.get(link.b)! + link.cost;
      const viaA = dist.get(link.a)! + link.cost;
      if (viaB < dist.get(link.a)!) dist.set(link.a, viaB);
      if (viaA < dist.get(link.b)!) dist.set(link.b, viaA);
    }
  }
  return dist;
}

/** The neighbour a node forwards to on its shortest path to N. */
function nextHop(links: readonly Link[], node: string, dist: Map<string, number>): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const link of links.filter((entry) => touches(entry, node))) {
    const via = other(link, node);
    const total = link.cost + (dist.get(via) ?? Infinity);
    if (total < bestDistance) {
      best = via;
      bestDistance = total;
    }
  }
  return best;
}

export interface NeighbourRow {
  readonly id: string;
  /** Cost of R1's link to this neighbour. */
  readonly link: number;
  /** Reported distance: the neighbour's own distance to N, as it tells R1 (Infinity when poisoned). */
  readonly rd: number;
  /** R1's distance to N through this neighbour: link + RD. */
  readonly fd: number;
}

/** R1's topology table for N: one row per neighbour, sorted by name. */
export function topologyTable(topology: Topology): NeighbourRow[] {
  const dist = distances(topology.links);
  return topology.links
    .filter((link) => touches(link, ROUTER))
    .map((link) => {
      const id = other(link, ROUTER);
      // Split horizon with poison reverse: a route whose next hop is R1 is
      // advertised to R1 as unreachable.
      const rd = nextHop(topology.links, id, dist) === ROUTER ? Infinity : dist.get(id)!;
      return { id, link: link.cost, rd, fd: link.cost + rd };
    })
    .sort((x, y) => x.id.localeCompare(y.id));
}

export interface Selection {
  readonly successor: NeighbourRow;
  /** The feasible distance: the successor's total distance. */
  readonly feasibleDistance: number;
  /** Neighbours other than the successor whose RD < the feasible distance. */
  readonly feasibleSuccessors: readonly NeighbourRow[];
}

/** DUAL's choice: lowest total distance wins; others qualify only if RD < FD. */
export function select(rows: readonly NeighbourRow[]): Selection {
  const successor = rows.reduce((best, row) => (row.fd < best.fd ? row : best));
  const feasibleDistance = successor.fd;
  const feasibleSuccessors = rows.filter(
    (row) => row.id !== successor.id && row.rd < feasibleDistance,
  );
  return { successor, feasibleDistance, feasibleSuccessors };
}

export interface Reply {
  readonly id: string;
  /** The neighbour's best distance to N that does not use R1. */
  readonly distance: number;
}

export interface Failover {
  readonly failed: string;
  /** passive: a feasible successor took over at once; active: R1 had to ask. */
  readonly state: 'passive' | 'active';
  readonly queried: readonly string[];
  readonly replies: readonly Reply[];
  readonly newSuccessor: string | null;
  readonly newDistance: number;
}

/** The successor's link fails. */
export function failSuccessor(topology: Topology): Failover {
  const rows = topologyTable(topology);
  const { successor, feasibleSuccessors } = select(rows);
  const failed = successor.id;
  if (feasibleSuccessors.length > 0) {
    const next = feasibleSuccessors.reduce((best, row) => (row.fd < best.fd ? row : best));
    return {
      failed,
      state: 'passive',
      queried: [],
      replies: [],
      newSuccessor: next.id,
      newDistance: next.fd,
    };
  }
  // No feasible successor: the route goes active and R1 queries every
  // remaining neighbour. While active, R1 tells them its own distance is
  // unreachable, so each answers with a path that avoids R1.
  const remaining = rows.filter((row) => row.id !== failed);
  const avoidingR1 = distances(topology.links, [ROUTER]);
  const replies = remaining.map((row) => ({
    id: row.id,
    distance: avoidingR1.get(row.id) ?? Infinity,
  }));
  let newSuccessor: string | null = null;
  let newDistance = Infinity;
  for (const reply of replies) {
    const total = remaining.find((row) => row.id === reply.id)!.link + reply.distance;
    if (total < newDistance) {
      newSuccessor = reply.id;
      newDistance = total;
    }
  }
  return {
    failed,
    state: 'active',
    queried: remaining.map((row) => row.id),
    replies,
    newSuccessor,
    newDistance,
  };
}

/**
 * Where a packet R1 hands to `neighbour` goes, following each router's
 * current next hop, until it reaches N or comes back to R1.
 */
export function pathFrom(topology: Topology, neighbour: string): string[] {
  const dist = distances(topology.links);
  const path = [ROUTER, neighbour];
  let node = neighbour;
  while (node !== DEST && node !== ROUTER && path.length <= dist.size + 1) {
    const hop = nextHop(topology.links, node, dist);
    if (hop === null) break;
    path.push(hop);
    node = hop;
  }
  return path;
}

/** True when a packet sent to the neighbour comes back to R1 instead of reaching N. */
export function loopsBack(topology: Topology, neighbour: string): boolean {
  const path = pathFrom(topology, neighbour);
  return path[path.length - 1] === ROUTER;
}
