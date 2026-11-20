/**
 * The NAT traversal lesson (REQ-406): two peers behind NATs try to reach each
 * other directly for a call. STUN (RFC 8489) tells each peer the public
 * address its NAT gave it; they swap those addresses and both send at once
 * ("hole punching"); TURN (RFC 8656) relays when that fails; and ICE
 * (RFC 8445) gathers candidates, pairs them, checks the pairs and picks the
 * highest-priority pair that works.
 *
 * NAT behaviour uses the RFC 4787 terms: mapping is endpoint-independent
 * (EIM), address-dependent (ADM) or address-and-port-dependent (APDM);
 * filtering is endpoint-independent (EIF), address-dependent (ADF) or
 * address-and-port-dependent (APDF).
 *
 * Simplified: one host and one public IP per NAT; a NAT hands out ports in
 * order from a fixed start; mappings never time out; every check is sent
 * (and retransmitted) before any is judged, so both NATs have opened every
 * hole they ever will; private host addresses are never reachable from the
 * other side (the peers are on different networks); STUN and TURN run on
 * separate servers; TURN permissions are installed for every IP of the other
 * peer's candidates; only A's check list is shown (A is the controlling
 * agent), with A's side listed by its base (host) address, and a peer-reflexive
 * candidate is learned only on A's side; nomination, port prediction,
 * hairpinning and mapping timeouts are left out; one-way delays and the media
 * bit rate are assumptions.
 */

export type Mapping = 'EIM' | 'ADM' | 'APDM';
export type Filtering = 'EIF' | 'ADF' | 'APDF';

export interface Behaviour {
  readonly mapping: Mapping;
  readonly filtering: Filtering;
}

/** The four classic NAT types, in RFC 4787 terms. */
export type NatType = 'full-cone' | 'restricted-cone' | 'port-restricted-cone' | 'symmetric';
export const NAT_TYPES: readonly NatType[] = [
  'full-cone',
  'restricted-cone',
  'port-restricted-cone',
  'symmetric',
];
export const NAT_BEHAVIOUR: Readonly<Record<NatType, Behaviour>> = {
  'full-cone': { mapping: 'EIM', filtering: 'EIF' },
  'restricted-cone': { mapping: 'EIM', filtering: 'ADF' },
  'port-restricted-cone': { mapping: 'EIM', filtering: 'APDF' },
  symmetric: { mapping: 'APDM', filtering: 'APDF' },
};

export interface Endpoint {
  readonly ip: string;
  readonly port: number;
}
export const show = (endpoint: Endpoint) => `${endpoint.ip}:${endpoint.port}`;
const same = (a: Endpoint, b: Endpoint) => a.ip === b.ip && a.port === b.port;

interface NatMapping {
  readonly key: string;
  readonly external: Endpoint;
  /** Every destination sent to from this mapping. */
  readonly sentTo: Endpoint[];
}

/** One NAT with one host behind it. */
export class Nat {
  private readonly mappings: NatMapping[] = [];
  private nextPort: number;

  constructor(
    readonly behaviour: Behaviour,
    readonly publicIp: string,
    firstPort: number,
  ) {
    this.nextPort = firstPort;
  }

  private keyFor(destination: Endpoint): string {
    if (this.behaviour.mapping === 'EIM') return '*';
    if (this.behaviour.mapping === 'ADM') return destination.ip;
    return show(destination);
  }

  /** The host sends a packet to `destination`; returns the public source address the NAT gives it. */
  send(destination: Endpoint): Endpoint {
    const key = this.keyFor(destination);
    let mapping = this.mappings.find((entry) => entry.key === key);
    if (!mapping) {
      mapping = { key, external: { ip: this.publicIp, port: this.nextPort++ }, sentTo: [] };
      this.mappings.push(mapping);
    }
    if (!mapping.sentTo.some((sent) => same(sent, destination))) mapping.sentTo.push(destination);
    return mapping.external;
  }

  /** A packet from `source` arrives at public address `destination`: does the NAT let it in? */
  accepts(destination: Endpoint, source: Endpoint): boolean {
    const mapping = this.mappings.find((entry) => same(entry.external, destination));
    if (!mapping) return false;
    if (this.behaviour.filtering === 'EIF') return true;
    if (this.behaviour.filtering === 'ADF')
      return mapping.sentTo.some((sent) => sent.ip === source.ip);
    return mapping.sentTo.some((sent) => same(sent, source));
  }
}

// The addresses of the lesson (documentation ranges, RFC 5737 / RFC 1918).
export const STUN_SERVER: Endpoint = { ip: '192.0.2.10', port: 3478 };
export const TURN_SERVER: Endpoint = { ip: '192.0.2.20', port: 3478 };
export type Side = 'A' | 'B';
export const HOST: Readonly<Record<Side, Endpoint>> = {
  A: { ip: '10.0.0.2', port: 5000 },
  B: { ip: '192.168.1.2', port: 6000 },
};
const PUBLIC_IP: Readonly<Record<Side, string>> = { A: '198.51.100.1', B: '203.0.113.1' };
const FIRST_PORT: Readonly<Record<Side, number>> = { A: 40000, B: 50000 };
export const RELAY: Readonly<Record<Side, Endpoint>> = {
  A: { ip: TURN_SERVER.ip, port: 49152 },
  B: { ip: TURN_SERVER.ip, port: 49153 },
};
const other = (side: Side): Side => (side === 'A' ? 'B' : 'A');

// ---------------------------------------------------------------- ICE priorities

/** prflx (peer-reflexive) is learned during the checks, not gathered. */
export type CandidateType = 'host' | 'prflx' | 'srflx' | 'relay';
/** The type preferences RFC 8445 §5.1.2.2 recommends. */
export const TYPE_PREFERENCE: Readonly<Record<CandidateType, number>> = {
  host: 126,
  prflx: 110,
  srflx: 100,
  relay: 0,
};
/** The local preference for a host with one interface (RFC 8445 §5.1.2.1). */
export const LOCAL_PREFERENCE = 65535;

/** RFC 8445 §5.1.2.1: 2^24 × type preference + 2^8 × local preference + (256 − component). */
export function candidatePriority(
  type: CandidateType,
  localPreference = LOCAL_PREFERENCE,
  component = 1,
): number {
  return 2 ** 24 * TYPE_PREFERENCE[type] + 2 ** 8 * localPreference + (256 - component);
}

/**
 * RFC 8445 §6.1.2.3: 2^32 × MIN(G, D) + 2 × MAX(G, D) + (G > D ? 1 : 0), G
 * being the controlling agent's candidate and D the controlled one's. It needs
 * more than 53 bits, so it is a bigint.
 */
export function pairPriority(controlling: number, controlled: number): bigint {
  const g = BigInt(controlling);
  const d = BigInt(controlled);
  const min = g < d ? g : d;
  const max = g < d ? d : g;
  return (1n << 32n) * min + 2n * max + (g > d ? 1n : 0n);
}

// ---------------------------------------------------------------- the simulation

export interface Candidate {
  readonly side: Side;
  readonly type: CandidateType;
  readonly address: Endpoint;
  readonly priority: number;
}

export interface Pair {
  /** A's candidate (A is the controlling agent) and B's. */
  readonly local: Candidate;
  readonly remote: Candidate;
  readonly priority: bigint;
  readonly works: boolean;
}

export interface Traversal {
  readonly candidates: Readonly<Record<Side, readonly Candidate[]>>;
  /** What STUN told each peer: its server-reflexive address. */
  readonly reflexive: Readonly<Record<Side, Endpoint>>;
  /** The public source address each peer's NAT used when it sent to the other's reflexive address. */
  readonly usedTowardPeer: Readonly<Record<Side, Endpoint>>;
  /** Did each peer's check to the other's reflexive address get there, and the answer back? */
  readonly direct: Readonly<
    Record<Side, { readonly arrived: boolean; readonly answered: boolean }>
  >;
  /** A connection without a relay: either direct check succeeded. */
  readonly directWorks: boolean;
  /** A's check list, highest priority first. */
  readonly pairs: readonly Pair[];
  /** The highest-priority pair that works, or null. */
  readonly selected: Pair | null;
}

interface Packet {
  readonly from: Endpoint;
  readonly arrived: boolean;
}

/**
 * Runs the lesson's two peers through STUN, TURN and ICE. With
 * `useRelay: false` they have only host and server-reflexive candidates.
 */
export function traverse(a: Behaviour, b: Behaviour, useRelay = true): Traversal {
  const nats: Record<Side, Nat> = {
    A: new Nat(a, PUBLIC_IP.A, FIRST_PORT.A),
    B: new Nat(b, PUBLIC_IP.B, FIRST_PORT.B),
  };

  // Gathering: a STUN Binding request reveals the reflexive address; a TURN
  // Allocate (over its own mapping) gives the relayed one.
  const reflexive: Record<Side, Endpoint> = {
    A: nats.A.send(STUN_SERVER),
    B: nats.B.send(STUN_SERVER),
  };
  if (useRelay) {
    nats.A.send(TURN_SERVER);
    nats.B.send(TURN_SERVER);
  }
  const gather = (side: Side): Candidate[] => {
    const list: Candidate[] = [
      { side, type: 'host', address: HOST[side], priority: candidatePriority('host') },
      { side, type: 'srflx', address: reflexive[side], priority: candidatePriority('srflx') },
    ];
    if (useRelay)
      list.push({
        side,
        type: 'relay',
        address: RELAY[side],
        priority: candidatePriority('relay'),
      });
    return list;
  };
  const candidates: Record<Side, Candidate[]> = { A: gather('A'), B: gather('B') };

  // A TURN server forwards to its client only from IPs the client gave permission to:
  // every IP among the other peer's candidates.
  const relayPermits = (side: Side, source: Endpoint) =>
    candidates[other(side)].some((candidate) => candidate.address.ip === source.ip);

  /** `side` sends from its local candidate to `target`, which belongs to the other side. */
  const sendFrom = (side: Side, local: Candidate, target: Endpoint): Packet => {
    const peer = other(side);
    if (same(target, HOST[peer])) return { from: HOST[side], arrived: false }; // a private address, not routed
    const from = local.type === 'relay' ? RELAY[side] : nats[side].send(target);
    const arrived = same(target, RELAY[peer])
      ? relayPermits(peer, from)
      : nats[peer].accepts(target, from);
    return { from, arrived };
  };

  // Local server-reflexive candidates are replaced by their base (the host
  // candidate) and the duplicates pruned (RFC 8445 §6.1.2.4), so each peer
  // checks from its host and relay candidates to all of the other's.
  const checkList = (side: Side) =>
    candidates[side]
      .filter((local) => local.type !== 'srflx')
      .flatMap((local) => candidates[other(side)].map((remote) => ({ local, remote })));

  // Every check is sent, and retransmitted, before any is judged.
  for (const side of ['A', 'B'] as const)
    for (const { local, remote } of checkList(side)) sendFrom(side, local, remote.address);

  /** A check succeeds when the request arrives and the answer, sent back to where it came from, arrives too. */
  const check = (side: Side, local: Candidate, remote: Candidate) => {
    const request = sendFrom(side, local, remote.address);
    if (!request.arrived) return { arrived: false, answered: false };
    const peer = other(side);
    const answer = sendFrom(
      peer,
      remote.type === 'relay' ? remote : candidates[peer][0]!,
      request.from,
    );
    return { arrived: true, answered: answer.arrived };
  };

  const hostOf = (side: Side) => candidates[side][0]!;
  const srflxOf = (side: Side) => candidates[side][1]!;
  const usedTowardPeer: Record<Side, Endpoint> = {
    A: nats.A.send(reflexive.B),
    B: nats.B.send(reflexive.A),
  };
  const direct = {
    A: check('A', hostOf('A'), srflxOf('B')),
    B: check('B', hostOf('B'), srflxOf('A')),
  };
  const directWorks = direct.A.answered || direct.B.answered;

  // B's check reached A from an address A was never told about: A learns it as
  // a peer-reflexive candidate and checks it at once (RFC 8445 §7.3.1.3).
  const list = checkList('A');
  if (direct.B.arrived && !same(usedTowardPeer.B, reflexive.B)) {
    const prflx: Candidate = {
      side: 'B',
      type: 'prflx',
      address: usedTowardPeer.B,
      priority: candidatePriority('prflx'),
    };
    candidates.B.push(prflx);
    list.push({ local: hostOf('A'), remote: prflx });
  }

  const pairs: Pair[] = list
    .map(({ local, remote }) => ({
      local,
      remote,
      priority: pairPriority(local.priority, remote.priority),
      works: check('A', local, remote).answered,
    }))
    .sort((x, y) => (x.priority === y.priority ? 0 : x.priority > y.priority ? -1 : 1));

  return {
    candidates,
    reflexive,
    usedTowardPeer,
    direct,
    directWorks,
    pairs,
    selected: pairs.find((pair) => pair.works) ?? null,
  };
}

export const traverseTypes = (a: NatType, b: NatType, useRelay = true) =>
  traverse(NAT_BEHAVIOUR[a], NAT_BEHAVIOUR[b], useRelay);

// ---------------------------------------------------------------- the cost of a relay

/** Assumed one-way delays, ms. */
export const ONE_WAY_MS = { direct: 20, aToTurn: 25, turnToB: 30 } as const;

export interface PathCost {
  readonly relayed: boolean;
  readonly rttMs: number;
  /** What the TURN server receives, and also sends, for this one call, kbit/s. */
  readonly turnKbps: number;
}

/**
 * The round trip of the chosen pair, and the load a two-way call at
 * `bitrateKbps` each way puts on the TURN server. Each relay candidate in the
 * pair is one pass through the server.
 */
export function pathCost(pair: Pair, bitrateKbps: number): PathCost {
  const relays = [pair.local, pair.remote].filter((c) => c.type === 'relay').length;
  if (relays === 0) return { relayed: false, rttMs: 2 * ONE_WAY_MS.direct, turnKbps: 0 };
  return {
    relayed: true,
    rttMs: 2 * (ONE_WAY_MS.aToTurn + ONE_WAY_MS.turnToB),
    turnKbps: relays * 2 * bitrateKbps,
  };
}
