/**
 * The addresses offered as chips at levels 1 and 2: for a host, and for a side
 * of a router whose "/number" is not the question (`addressOnly`).
 *
 * They are worked out from the network the device is plugged into, never from
 * the exercise's reference solution. One is usable: a free address on the
 * network the neighbours share. The others are the mistakes a rule of thumb
 * makes: the same numbers but for the last of the network part (192.168.2.x
 * beside 192.168.1.x), the router's own address, a neighbour's address, the
 * wrong network kept with a new last number; for a side of a router also an
 * address from its other side. The address the device has now is never offered.
 *
 * `salt` belongs to the exercise and the setting: two templates set in the
 * same place share their address plan, and without it they would offer the
 * same list. The ORDER is not decided here; it belongs to the attempt
 * (`attemptOrder.ts`).
 */

import { intToIp, ipToInt } from '../../../src/utils/cidr';
import type { TopologySnapshot } from '../../../src/types/topology';
import { hashText } from './attemptOrder';

/** Chips per setting, the usable one included, where the network allows as many. */
export const CHIP_COUNT = 6;

export interface CandidateParts {
  /** The one address that is free on the network the neighbours share. */
  readonly right: string;
  /** The mistakes. At most `CHIP_COUNT - 1`. */
  readonly wrong: readonly string[];
}

interface Side {
  /** Addresses of the hosts on this cable run, the device in question left out. */
  readonly hosts: readonly string[];
  /** The router's side on this cable run, when the device in question is not it. */
  readonly gateway: { readonly ip: string; readonly prefixLength: number } | null;
  /** Addresses of the other sides of the router(s) met. */
  readonly otherSides: readonly string[];
}

/** Walk the cables from `startId` (out of `startHandle` for a router), through switches, up to routers. */
function sideOf(topology: TopologySnapshot, startId: string, startHandle?: string): Side {
  const byId = new Map(topology.nodes.map((node) => [node.id, node]));
  const seen = new Set([startId]);
  const queue = [startId];
  const hosts: string[] = [];
  const otherSides: string[] = [];
  let gateway: Side['gateway'] = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const edge of topology.edges) {
      const [ownHandle, otherId, handle] =
        edge.source === current
          ? [edge.sourceHandle, edge.target, edge.targetHandle]
          : edge.target === current
            ? [edge.targetHandle, edge.source, edge.sourceHandle]
            : [undefined, undefined, undefined];
      if (otherId === undefined) continue;
      // A router is left only by the side asked about.
      if (current === startId && startHandle !== undefined && ownHandle !== startHandle) continue;
      if (seen.has(otherId)) continue;
      const other = byId.get(otherId);
      if (!other) continue;
      if (other.data.role === 'router') {
        for (const side of other.data.interfaces ?? []) {
          if (side.id !== handle) otherSides.push(side.ipAddress);
          else gateway ??= { ip: side.ipAddress, prefixLength: side.prefixLength };
        }
        // The network ends at the router: do not walk on through it.
        continue;
      }
      seen.add(otherId);
      if (other.data.role === 'switch') queue.push(otherId);
      else if (typeof other.data.ip === 'string' && other.data.ip !== '') hosts.push(other.data.ip);
    }
  }
  return { hosts, gateway, otherSides };
}

const withLast = (address: string, last: number): string =>
  `${address.split('.').slice(0, 3).join('.')}.${last}`;
const lastOf = (address: string): number => Number(address.split('.')[3]);

/**
 * The network most of `addresses` share at `prefixLength`, with one of them
 * as the address to build on. Null when there is none to go by.
 */
function sharedNetwork(
  addresses: readonly string[],
  prefixLength: number,
): { readonly network: number; readonly size: number; readonly anchor: string } | null {
  if (prefixLength < 8 || prefixLength > 30) return null;
  const size = 2 ** (32 - prefixLength);
  const groups = new Map<number, string[]>();
  for (const address of addresses) {
    const network = Math.floor(ipToInt(address) / size) * size;
    groups.set(network, [...(groups.get(network) ?? []), address]);
  }
  let best: [number, string[]] | null = null;
  for (const entry of groups) if (best === null || entry[1].length > best[1].length) best = entry;
  const anchor = best?.[1][0];
  return best && anchor !== undefined ? { network: best[0], size, anchor } : null;
}

function build(
  shared: NonNullable<ReturnType<typeof sharedNetwork>>,
  current: string | null,
  taken: readonly string[],
  mistakes: (right: string, last: number) => readonly (string | undefined)[],
  preferred: readonly number[],
  salt: number,
): CandidateParts | null {
  const inside = (address: string): boolean => {
    const value = ipToInt(address);
    return value > shared.network && value < shared.network + shared.size - 1;
  };
  // Last numbers nothing on this side uses, the device's own included.
  const used = new Set([...taken, ...(current === null ? [] : [current])].map(lastOf));
  const pool = [
    ...preferred,
    ...Array.from({ length: 12 }, (_, index) => 20 + ((salt + index * 37) % 200)),
  ].filter(
    (last, index, all) =>
      !used.has(last) && all.indexOf(last) === index && inside(withLast(shared.anchor, last)),
  );
  const last = pool[salt % Math.max(1, Math.min(pool.length, preferred.length + 4))];
  if (last === undefined) return null;
  const right = withLast(shared.anchor, last);

  const wrong = mistakes(right, last)
    .filter(
      (candidate, index, all): candidate is string =>
        candidate !== undefined &&
        candidate !== current &&
        candidate !== right &&
        all.indexOf(candidate) === index &&
        // Never a second usable address by accident.
        !(inside(candidate) && !taken.includes(candidate)),
    )
    .slice(0, CHIP_COUNT - 1);
  return { right, wrong };
}

/** The address on the network next door: the same numbers but for the last of the network part. */
const nextDoor = (right: string, size: number, doors: number): string | undefined => {
  const value = ipToInt(right) + doors * size;
  return value > 0 && value < 0xe0000000 ? intToIp(value >>> 0) : undefined;
};

/** Chips for a host. Null when the network it is plugged into cannot be told. */
export function hostCandidates(
  topology: TopologySnapshot,
  hostId: string,
  saltText: string,
): CandidateParts | null {
  const side = sideOf(topology, hostId);
  const ip = topology.nodes.find((node) => node.id === hostId)?.data.ip;
  const current = typeof ip === 'string' && ip !== '' ? ip : null;
  const prefixLength = side.gateway?.prefixLength ?? 24;
  const neighbours = [...side.hosts, ...(side.gateway ? [side.gateway.ip] : [])];
  const shared = sharedNetwork(neighbours, prefixLength);
  if (shared === null) return null;
  const salt = hashText(saltText);
  const pick = side.hosts.length === 0 ? 0 : salt % side.hosts.length;
  return build(
    shared,
    current,
    neighbours,
    (right, last) => [
      nextDoor(right, shared.size, 1),
      side.gateway?.ip,
      side.hosts[pick],
      // The wrong network kept, only the last number new.
      current !== null && withLast(current, last) !== right ? withLast(current, last) : undefined,
      // (Not an address from the router's other side: this simulator still
      // delivers to a host that carries one, so the chip would "work".)
      side.hosts[(pick + 1) % Math.max(1, side.hosts.length)],
      nextDoor(right, shared.size, -1),
      nextDoor(right, shared.size, 2),
    ],
    [],
    salt,
  );
}

/** Chips for a side of a router. Null when no device on that side has an address to go by. */
export function ifaceCandidates(
  topology: TopologySnapshot,
  nodeId: string,
  ifaceId: string,
  saltText: string,
): CandidateParts | null {
  const own = topology.nodes
    .find((node) => node.id === nodeId)
    ?.data.interfaces?.find((side) => side.id === ifaceId);
  if (!own) return null;
  const side = sideOf(topology, nodeId, ifaceId);
  const shared = sharedNetwork(side.hosts, own.prefixLength);
  if (shared === null) return null;
  const salt = hashText(saltText);
  const pick = salt % side.hosts.length;
  const others = (topology.nodes.find((node) => node.id === nodeId)?.data.interfaces ?? []).flatMap(
    (entry) => (entry.id === ifaceId ? [] : [entry.ipAddress]),
  );
  return build(
    shared,
    own.ipAddress,
    side.hosts,
    (right, last) => [
      side.hosts[pick],
      nextDoor(right, shared.size, 1),
      others[0] !== undefined
        ? withLast(others[0], last === lastOf(others[0]) ? 77 : last)
        : undefined,
      withLast(own.ipAddress, last === lastOf(own.ipAddress) ? 77 : last),
      side.hosts[(pick + 1) % side.hosts.length],
      nextDoor(right, shared.size, -1),
      nextDoor(right, shared.size, 2),
    ],
    // A router usually takes the first or the last number of its network.
    [1, 254],
    salt,
  );
}
