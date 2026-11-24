/**
 * The route-reflector lesson (REQ-432): why iBGP needs a full mesh, how many
 * sessions that costs, and how route reflectors (RFC 4456) remove the mesh
 * without creating loops.
 *
 * iBGP split horizon (RFC 4271 §9.2): a route learned from an iBGP peer is not
 * advertised to another iBGP peer. A route reflector relaxes that rule
 * (RFC 4456 §6): a route from a client goes to every other peer, client or
 * not; a route from a non-client goes to the clients only; a route from an
 * eBGP peer goes to everyone. On reflecting, the RR sets ORIGINATOR_ID (the
 * router ID of the router that brought the route into the AS) if it is not
 * already set, and prepends its CLUSTER_ID to CLUSTER_LIST. A router drops a
 * route whose ORIGINATOR_ID is its own router ID; an RR drops a route whose
 * CLUSTER_LIST already holds its own CLUSTER_ID. NEXT_HOP is not changed.
 *
 * Simplified: one prefix; every router passes on each copy it accepts, as
 * if each were its best path for a moment (real BGP passes on only its
 * current best path, but while sessions come up and go down each copy can be
 * best for a while, and those moments are what the loop checks are for); a
 * router never sends a route back to the peer it came from; updates travel
 * one session per step; the IGP that makes the next hop reachable is not
 * modelled.
 */

// ---------------------------------------------------------------------------
// Part 1: how many iBGP sessions
// ---------------------------------------------------------------------------

/** Sessions for a full iBGP mesh of `n` routers: every pair, n(n − 1)/2. */
export function fullMeshSessions(n: number): number {
  return (n * (n - 1)) / 2;
}

/** Sessions with one route reflector: each of the other n − 1 routers peers with it. */
export function oneRrSessions(n: number): number {
  return n - 1;
}

/**
 * Sessions with two route reflectors for redundancy: each of the n − 2
 * clients peers with both, and the two reflectors peer with each other.
 */
export function twoRrSessions(n: number): number {
  return 2 * (n - 2) + 1;
}

export interface SessionCounts {
  readonly n: number;
  readonly fullMesh: number;
  readonly oneRr: number;
  readonly twoRr: number;
}

export function sessionCounts(n: number): SessionCounts {
  return { n, fullMesh: fullMeshSessions(n), oneRr: oneRrSessions(n), twoRr: twoRrSessions(n) };
}

// ---------------------------------------------------------------------------
// Part 2: does the route get through
// ---------------------------------------------------------------------------

export interface IbgpRouter {
  readonly id: string;
  readonly routerId: string;
  /** Set on a route reflector: its CLUSTER_ID and the ids of its clients. */
  readonly rr?: { readonly clusterId: string; readonly clients: readonly string[] };
}

export interface Topology {
  readonly routers: readonly IbgpRouter[];
  /** iBGP sessions, as pairs of router ids. */
  readonly sessions: readonly (readonly [string, string])[];
  /** The router that learned the prefix from an eBGP neighbour. */
  readonly origin: string;
  /** NEXT_HOP the origin received from that eBGP neighbour. */
  readonly nextHop: string;
}

export interface RouteCopy {
  readonly from: string;
  readonly nextHop: string;
  /** Undefined until a reflector sets it. */
  readonly originatorId?: string | undefined;
  /** Nearest reflector first. */
  readonly clusterList: readonly string[];
}

export type Verdict = 'accepted' | 'originator-id' | 'cluster-list';

export interface Delivery {
  readonly step: number;
  readonly to: string;
  readonly copy: RouteCopy;
  readonly verdict: Verdict;
}

export interface Propagation {
  readonly deliveries: readonly Delivery[];
  /** Router id → the first copy it accepted, for every router that has the route. */
  readonly installed: ReadonlyMap<string, RouteCopy>;
}

/** Whether a router passes a route it learned from `from` on to the peer `to`. */
function advertises(router: IbgpRouter, from: string | 'ebgp', to: string): boolean {
  if (to === from) return false;
  if (from === 'ebgp') return true;
  if (!router.rr) return false; // iBGP split horizon
  const clients = router.rr.clients;
  if (clients.includes(from)) return true; // from a client: to every peer
  return clients.includes(to); // from a non-client: to the clients only
}

export function propagate(topology: Topology): Propagation {
  const byId = new Map(topology.routers.map((router) => [router.id, router]));
  const peers = (id: string) =>
    topology.sessions.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
  const installed = new Map<string, RouteCopy>();
  const deliveries: Delivery[] = [];
  const origin = byId.get(topology.origin)!;
  installed.set(origin.id, { from: 'ebgp', nextHop: topology.nextHop, clusterList: [] });

  // Each wave holds the routers that accepted the route in the previous step.
  let wave: { router: IbgpRouter; learnedFrom: string | 'ebgp'; copy: RouteCopy }[] = [
    { router: origin, learnedFrom: 'ebgp', copy: installed.get(origin.id)! },
  ];
  // CLUSTER_LIST grows with every reflection and an RR drops its own
  // cluster, so the waves die out; the step cap only guards a bad topology.
  for (let step = 1; wave.length > 0 && step <= 32; step += 1) {
    const next: typeof wave = [];
    for (const { router, learnedFrom, copy } of wave) {
      for (const peerId of peers(router.id)) {
        if (!advertises(router, learnedFrom, peerId)) continue;
        const reflected = router.rr !== undefined && learnedFrom !== 'ebgp';
        const sent: RouteCopy = {
          from: router.id,
          nextHop: copy.nextHop,
          originatorId: reflected
            ? (copy.originatorId ?? byId.get(learnedFrom)!.routerId)
            : copy.originatorId,
          clusterList: reflected ? [router.rr!.clusterId, ...copy.clusterList] : copy.clusterList,
        };
        const peer = byId.get(peerId)!;
        const verdict: Verdict =
          sent.originatorId === peer.routerId
            ? 'originator-id'
            : peer.rr && sent.clusterList.includes(peer.rr.clusterId)
              ? 'cluster-list'
              : 'accepted';
        deliveries.push({ step, to: peerId, copy: sent, verdict });
        if (verdict === 'accepted') {
          if (!installed.has(peerId)) installed.set(peerId, sent);
          next.push({ router: peer, learnedFrom: router.id, copy: sent });
        }
      }
    }
    wave = next;
  }
  return { deliveries, installed };
}

// The lesson's scenarios: A learns 203.0.113.0/24 from its eBGP neighbour
// 198.51.100.1, and the question is whether C ends up with it.

export type ScenarioId = 'plain' | 'one-rr' | 'two-rr-same' | 'two-rr-split';
export const SCENARIO_IDS: readonly ScenarioId[] = [
  'plain',
  'one-rr',
  'two-rr-same',
  'two-rr-split',
];

export const PREFIX = '203.0.113.0/24';
export const EBGP_NEXT_HOP = '198.51.100.1';

const A: IbgpRouter = { id: 'A', routerId: '10.0.0.1' };
const C: IbgpRouter = { id: 'C', routerId: '10.0.0.3' };

export const SCENARIOS: Record<ScenarioId, Topology> = {
  // B is an ordinary iBGP router: sessions A–B and B–C, no A–C.
  plain: {
    routers: [A, { id: 'B', routerId: '10.0.0.2' }, C],
    sessions: [
      ['A', 'B'],
      ['B', 'C'],
    ],
    origin: 'A',
    nextHop: EBGP_NEXT_HOP,
  },
  // The same sessions, with B a route reflector and A and C its clients.
  'one-rr': {
    routers: [
      A,
      { id: 'B', routerId: '10.0.0.2', rr: { clusterId: '10.0.0.2', clients: ['A', 'C'] } },
      C,
    ],
    sessions: [
      ['A', 'B'],
      ['B', 'C'],
    ],
    origin: 'A',
    nextHop: EBGP_NEXT_HOP,
  },
  // Two reflectors sharing one CLUSTER_ID; A and C are clients of both.
  'two-rr-same': {
    routers: [
      A,
      { id: 'RR1', routerId: '10.0.0.11', rr: { clusterId: '0.0.0.1', clients: ['A', 'C'] } },
      { id: 'RR2', routerId: '10.0.0.12', rr: { clusterId: '0.0.0.1', clients: ['A', 'C'] } },
      C,
    ],
    sessions: [
      ['A', 'RR1'],
      ['A', 'RR2'],
      ['RR1', 'RR2'],
      ['RR1', 'C'],
      ['RR2', 'C'],
    ],
    origin: 'A',
    nextHop: EBGP_NEXT_HOP,
  },
  // Two reflectors, each its own cluster (CLUSTER_ID = its router ID).
  'two-rr-split': {
    routers: [
      A,
      { id: 'RR1', routerId: '10.0.0.11', rr: { clusterId: '10.0.0.11', clients: ['A', 'C'] } },
      { id: 'RR2', routerId: '10.0.0.12', rr: { clusterId: '10.0.0.12', clients: ['A', 'C'] } },
      C,
    ],
    sessions: [
      ['A', 'RR1'],
      ['A', 'RR2'],
      ['RR1', 'RR2'],
      ['RR1', 'C'],
      ['RR2', 'C'],
    ],
    origin: 'A',
    nextHop: EBGP_NEXT_HOP,
  },
};

/** Whether client C ends up with the route in a scenario. */
export function reachesC(id: ScenarioId): boolean {
  return propagate(SCENARIOS[id]).installed.has('C');
}
