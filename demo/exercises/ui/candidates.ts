/**
 * The addresses offered as chips for a host at levels 1 and 2.
 *
 * They are worked out from the network the host is plugged into, never from
 * the exercise's reference solution, and they are not all right: one is a free
 * address on the host's network, the others are the mistakes a beginner makes
 * (another network, an address somebody already has). The address the host
 * has now is never offered. The order comes from the exercise seed, so the
 * right one is not always in the same place and the same exercise always
 * shows the same chips.
 */

import { intToIp, ipToInt } from '../../../src/utils/cidr';
import type { TopologySnapshot } from '../../../src/types/topology';
import { optionOrder } from '../../course/examAttempt';

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

/** Up to four addresses, at least one of them usable. Empty when the host's network cannot be told. */
export function addressCandidates(
  topology: TopologySnapshot,
  hostId: string,
  seed: number,
): string[] {
  const segment = segmentOf(topology, hostId);
  if (segment === null) return [];
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
  if (free === undefined) return [];
  const hostNumber = ipToInt(free) - segment.network;

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
  const candidates = [free, elsewhere[0], taken2[0], taken2[1], elsewhere[1]]
    .filter(
      (candidate, index, all): candidate is string =>
        candidate !== undefined && candidate !== current && all.indexOf(candidate) === index,
    )
    .slice(0, 4);

  return optionOrder(seed, 0).flatMap((index) => {
    const candidate = candidates[index];
    return candidate === undefined ? [] : [candidate];
  });
}
