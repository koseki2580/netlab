/**
 * The addresses offered as chips for a host at levels 1 and 2.
 *
 * They are worked out from the network the host is plugged into, never from
 * the exercise's reference solution, and they are not all right: one is a free
 * address on the host's network, the others are the mistakes a beginner makes
 * (another network, an address somebody already has). The address the host
 * has now is never offered. The order comes from the exercise seed, so the
 * same exercise always shows the same chips; and the usable address takes each
 * place equally often (every run of four seeds puts it in each place once), so
 * "press the first one" is right one time in four and no more.
 */

import { intToIp, ipToInt } from '../../../src/utils/cidr';
import type { TopologySnapshot } from '../../../src/types/topology';

interface Segment {
  /** Network address and prefix length of the LAN the host is on. */
  readonly network: number;
  readonly prefixLength: number;
  /** Addresses already taken on that LAN (other hosts, the router). */
  readonly inUse: readonly string[];
}

/** Walk the cables from the host, through switches, to the first router side. */
function segmentOf(topology: TopologySnapshot, hostId: string): Segment | null {
  const byId = new Map(topology.nodes.map((node) => [node.id, node]));
  const seen = new Set([hostId]);
  const queue = [hostId];
  const hostIps: string[] = [];
  let gateway: { ip: string; prefixLength: number } | null = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const edge of topology.edges) {
      const [otherId, handle] =
        edge.source === current
          ? [edge.target, edge.targetHandle]
          : edge.target === current
            ? [edge.source, edge.sourceHandle]
            : [undefined, undefined];
      if (otherId === undefined || seen.has(otherId)) continue;
      const other = byId.get(otherId);
      if (!other) continue;
      if (other.data.role === 'router') {
        const side = other.data.interfaces?.find((candidate) => candidate.id === handle);
        if (side && gateway === null) {
          gateway = { ip: side.ipAddress, prefixLength: side.prefixLength };
        }
        // The LAN ends at the router: do not walk on through it.
        continue;
      }
      seen.add(otherId);
      if (other.data.role === 'switch') queue.push(otherId);
      else if (typeof other.data.ip === 'string' && other.data.ip !== '')
        hostIps.push(other.data.ip);
    }
  }

  const anchor =
    gateway ?? (hostIps[0] !== undefined ? { ip: hostIps[0], prefixLength: 24 } : null);
  if (anchor === null || anchor.prefixLength < 8 || anchor.prefixLength > 30) return null;
  const size = 2 ** (32 - anchor.prefixLength);
  return {
    network: Math.floor(ipToInt(anchor.ip) / size) * size,
    prefixLength: anchor.prefixLength,
    inUse: [...hostIps, ...(gateway ? [gateway.ip] : [])],
  };
}

/** A small seeded generator (mulberry32): the same seed, the same numbers. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const order = [...items];
  for (let last = order.length - 1; last > 0; last -= 1) {
    const pick = Math.floor(random() * (last + 1));
    const held = order[last] as T;
    order[last] = order[pick] as T;
    order[pick] = held;
  }
  return order;
}

/**
 * The place of the usable address among `count` chips. Seeds are taken `count`
 * at a time, and within each such run the places are a shuffle of all of them:
 * no place is favoured, and the place does not simply step along with the seed.
 */
export function rightPlace(seed: number, count: number): number {
  if (count <= 1) return 0;
  const run = Math.floor(seed / count);
  const places = shuffled(
    Array.from({ length: count }, (_, place) => place),
    generator(Math.imul(run + 1, 0x9e3779b1)),
  );
  return places[seed % count] ?? 0;
}

export interface CandidateParts {
  /** The one address that is free on the host's own network. */
  readonly right: string;
  /** The mistakes: other networks, addresses already taken. At most three. */
  readonly wrong: readonly string[];
}

/** What the chips are made of, before they are put in order. Null when the host's network cannot be told. */
export function candidateParts(
  topology: TopologySnapshot,
  hostId: string,
  seed: number,
): CandidateParts | null {
  const segment = segmentOf(topology, hostId);
  if (segment === null) return null;
  const current = topology.nodes.find((node) => node.id === hostId)?.data.ip;
  const size = 2 ** (32 - segment.prefixLength);
  const taken = new Set([...segment.inUse, ...(typeof current === 'string' ? [current] : [])]);

  // A free host number, starting from a place the seed picks.
  let free: string | undefined;
  for (let step = 0; step < size - 2 && free === undefined; step += 1) {
    const hostNumber = 1 + ((seed * 7 + 19 + step) % (size - 2));
    const candidate = intToIp(segment.network + hostNumber);
    if (!taken.has(candidate)) free = candidate;
  }
  if (free === undefined) return null;
  const right = free;
  const hostNumber = ipToInt(right) - segment.network;

  // The same host number on the networks next door (never the address the host has now).
  const elsewhere = [1, 2, 3]
    .map((doors) => intToIp((segment.network + doors * size + hostNumber) >>> 0))
    .filter((candidate) => candidate !== current);
  const pick = seed % Math.max(1, segment.inUse.length);
  const taken2 = [
    segment.inUse[pick],
    segment.inUse[(pick + 1) % Math.max(1, segment.inUse.length)],
  ];
  // The network's own address is NOT offered as a wrong answer: this simulator
  // accepts it for a host, so the chip would "work" and teach something false.
  const wrong = [elsewhere[0], taken2[0], taken2[1], elsewhere[1]]
    .filter(
      (candidate, index, all): candidate is string =>
        candidate !== undefined &&
        candidate !== current &&
        candidate !== right &&
        all.indexOf(candidate) === index,
    )
    .slice(0, 3);
  return { right, wrong };
}

/** Up to four addresses, exactly one of them usable. Empty when the host's network cannot be told. */
export function addressCandidates(
  topology: TopologySnapshot,
  hostId: string,
  seed: number,
): string[] {
  const parts = candidateParts(topology, hostId, seed);
  if (parts === null) return [];
  const chips = shuffled(parts.wrong, generator(Math.imul(seed + 1, 0x85ebca6b)));
  chips.splice(rightPlace(seed, parts.wrong.length + 1), 0, parts.right);
  return chips;
}
