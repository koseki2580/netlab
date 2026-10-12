/**
 * The addresses offered as chips at levels 1 and 2: for a host, and for a side
 * of a router whose "/number" is not the question (`addressOnly`).
 *
 * They are worked out from the network the device is plugged into, never from
 * the exercise's reference solution. One is usable: a free address on the
 * network the neighbours share. Each of the others is a mistake a learner can
 * be told the reason of: an address already in use, the router's own address,
 * a network that looks close, the wrong network kept with a new last number.
 *
 * THE CHIPS ALONE MUST NOT SAY WHICH ONE IS USABLE. A learner once found it
 * without the diagram: its first three numbers were the most common among the
 * chips and its last number the most shared. So the set is built as a grid in
 * which the usable chip stands like every other:
 *
 * - a /24 (`grid`): two networks times three last numbers. Each network has
 *   three chips, each last number two. With a single neighbour to go by:
 *   three networks, one number apart, times two last numbers.
 * - a /16 or a /8 (`spread`): six chips with six different "first three
 *   numbers", each last number on two of them. The usable one has middle
 *   numbers no neighbour has, so copying a neighbour's first three numbers
 *   (the "/24 habit") lands on an address in use.
 *
 * Where the free last number stands among the others (lowest, between,
 * highest) follows the salt, so neither end gives it away.
 * `templates/chipTells.test.ts` holds all of this over the pools.
 *
 * `salt` belongs to the exercise and the setting: two templates set in the
 * same place share their address plan, and without it they would offer the
 * same list. The ORDER is not decided here; it belongs to the attempt
 * (`attemptOrder.ts`). The address the device has now is never offered.
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

const octets = (address: string): number[] => address.split('.').map(Number);
const firstThree = (address: string): string => address.split('.').slice(0, 3).join('.');
const withLast = (address: string, last: number): string => `${firstThree(address)}.${last}`;
const lastOf = (address: string): number => Number(address.split('.')[3]);
const distinct = <T>(items: readonly T[]): T[] => [...new Set(items)];

interface Shared {
  readonly network: number;
  readonly size: number;
  readonly prefixLength: number;
  /** An address on it, to build on. */
  readonly anchor: string;
}

/**
 * The network most of `addresses` share at `prefixLength`, with one of them
 * as the address to build on. Null when there is none to go by.
 */
function sharedNetwork(addresses: readonly string[], prefixLength: number): Shared | null {
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
  return best && anchor !== undefined ? { network: best[0], size, prefixLength, anchor } : null;
}

const insideOf =
  (shared: Shared) =>
  (address: string): boolean => {
    const value = ipToInt(address);
    return value > shared.network && value < shared.network + shared.size - 1;
  };

/**
 * A last number nothing uses, standing where the salt says among the `taken`
 * ones: below them all, between them, or above them all. Where that place has
 * no room, the next place is taken.
 */
function freeLast(
  taken: readonly number[],
  used: ReadonlySet<number>,
  salt: number,
  usable: (last: number) => boolean,
): number | undefined {
  const sorted = [...taken].sort((a, b) => a - b);
  const low = sorted[0] ?? 100;
  const high = sorted[sorted.length - 1] ?? 100;
  // Close enough to the neighbours' numbers to look like one of theirs.
  const ranges: readonly (readonly [number, number])[] = [
    [Math.max(2, low - 40), low - 1],
    [low + 1, high - 1],
    [high + 1, Math.min(253, high + 60)],
  ];
  // The place the salt asks for, then the other two in an order the salt decides too:
  // a place without room must not always give its turn to the same neighbour.
  const wanted = salt % 3;
  const rest = [0, 1, 2].filter((place) => place !== wanted);
  if ((salt >>> 2) % 2 === 1) rest.reverse();
  for (const place of [wanted, ...rest]) {
    const [from, to] = ranges[place] ?? [0, -1];
    const room: number[] = [];
    for (let last = from; last <= to; last += 1) {
      if (!used.has(last) && usable(last)) room.push(last);
    }
    const pick = room[(salt >>> 4) % Math.max(1, room.length)];
    if (pick !== undefined) return pick;
  }
  return undefined;
}

/** The network `doors` networks on: the same numbers but for the last of the network part. */
const nextDoor = (address: string, size: number, doors: number): string | undefined => {
  const value = ipToInt(address) + doors * size;
  return value > 0 && value < 0xe0000000 ? intToIp(value >>> 0) : undefined;
};

/**
 * Which networks next door to offer: one on, one back, two on. Not "one back"
 * from a network whose number is 0: 10.19.255.x beside 10.20.0.x does not look
 * like a slip of one number.
 */
const doorSteps = (shared: Shared): number[] =>
  Math.floor(shared.network / shared.size) % 256 === 0 ? [1, 2, 3] : [1, -1, 2, 3];

/** Every address the topology shows. */
function shownIn(topology: TopologySnapshot): string[] {
  return topology.nodes.flatMap((node) => [
    ...(typeof node.data.ip === 'string' && node.data.ip !== '' ? [node.data.ip] : []),
    ...(node.data.interfaces ?? []).map((side) => side.ipAddress),
  ]);
}

interface GridInput {
  readonly shared: Shared;
  /** The address the device has now. Never offered. */
  readonly current: string | null;
  /** Addresses in use on the shared network, the ones to offer as "in use" first. */
  readonly taken: readonly string[];
  /** Networks to offer as the wrong one (any address on each), most wanted first. */
  readonly elsewhere: readonly (string | undefined)[];
  readonly salt: number;
}

/**
 * Two networks times three last numbers; with one address in use to go by,
 * three networks times two. See the top of the file.
 */
function grid({ shared, current, taken, elsewhere, salt }: GridInput): CandidateParts | null {
  const inside = insideOf(shared);
  const inUse = distinct(
    taken.filter((address) => inside(address) && address !== current).map(lastOf),
  ).filter((last) => current === null || last !== lastOf(current));
  // Which of the addresses in use are offered follows the salt.
  const turn = inUse.length === 0 ? 0 : (salt >>> 8) % inUse.length;
  const lasts = [...inUse.slice(turn), ...inUse.slice(0, turn)].slice(0, 2);
  if (lasts.length === 0) return null;
  const used = new Set([...taken.map(lastOf), ...(current === null ? [] : [lastOf(current)])]);
  const free = freeLast(lasts, used, salt, (last) => inside(withLast(shared.anchor, last)));
  if (free === undefined) return null;
  const right = withLast(shared.anchor, free);

  // Wrong networks: not the shared one, not twice the same.
  const nets = distinct(
    elsewhere.flatMap((address) =>
      address !== undefined && !inside(withLast(address, free)) ? [firstThree(address)] : [],
    ),
  ).filter((net) => net !== firstThree(shared.anchor));
  const [second, third] = nets;
  if (second === undefined) return null;
  const at = (net: string, last: number): string => `${net}.${last}`;
  const [one, two] = lasts;
  const wrong =
    one !== undefined && two !== undefined
      ? [
          withLast(shared.anchor, one),
          withLast(shared.anchor, two),
          at(second, free),
          at(second, one),
          at(second, two),
        ]
      : one !== undefined && third !== undefined
        ? [
            withLast(shared.anchor, one),
            at(second, free),
            at(second, one),
            at(third, free),
            at(third, one),
          ]
        : [];
  const offered = wrong.filter((chip) => chip !== current && chip !== right);
  return offered.length === CHIP_COUNT - 1 && distinct(offered).length === offered.length
    ? { right, wrong: offered }
    : null;
}

/** Middle numbers for an address on a /8 or a /16 that no neighbour has. */
const MIDDLES = [2, 3, 5, 6, 7, 8, 12, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150];

interface SpreadInput {
  readonly shared: Shared;
  readonly current: string | null;
  readonly taken: readonly string[];
  readonly salt: number;
}

/**
 * A /8 or a /16: six chips with six different "first three numbers". The
 * usable one has middle numbers no neighbour has; two are neighbours' own
 * addresses (what copying a neighbour's first three numbers lands on); three
 * start with other numbers than the "/number" allows. See the top of the file.
 */
function spread({ shared, current, taken, salt }: SpreadInput): CandidateParts | null {
  const inside = insideOf(shared);
  const fixed = Math.floor(shared.prefixLength / 8);
  const neighbours = distinct(taken.filter((address) => inside(address) && address !== current));
  // Two neighbours with different first three numbers and different last numbers.
  const pairs = neighbours.flatMap((first, index) =>
    neighbours
      .slice(index + 1)
      .filter(
        (second) =>
          firstThree(first) !== firstThree(second) &&
          lastOf(first) !== lastOf(second) &&
          (current === null ||
            (lastOf(first) !== lastOf(current) && lastOf(second) !== lastOf(current))),
      )
      .map((second): readonly [string, string] =>
        (salt >>> 6) % 2 === 0 ? [first, second] : [second, first],
      ),
  );
  const pair = pairs[(salt >>> 8) % Math.max(1, pairs.length)];
  if (!pair) return null;
  const [one, two] = pair;

  // Middle numbers nobody on the diagram has at that place.
  const others = [...neighbours, ...(current === null ? [] : [current])].map(octets);
  const start = octets(shared.anchor).slice(0, fixed);
  const middle: number[] = [];
  for (let place = fixed; place < 3; place += 1) {
    const room = MIDDLES.filter((value) => others.every((address) => address[place] !== value));
    const pick = room[(salt >>> (place * 3)) % Math.max(1, room.length)];
    if (pick === undefined) return null;
    middle.push(pick);
  }
  const used = new Set([...neighbours, ...(current === null ? [] : [current])].map(lastOf));
  const free = freeLast([lastOf(one), lastOf(two)], used, salt, () => true);
  if (free === undefined) return null;
  const right = [...start, ...middle, free].join('.');
  if (!inside(right)) return null;

  // The numbers the "/number" fixes, but wrong: the device's own, or one further on.
  const outside =
    current !== null && !inside(current)
      ? octets(current).slice(0, fixed)
      : start.map((value, place) => (place === fixed - 1 ? value + 1 : value));
  const away = (rest: readonly number[]): string => [...outside, ...rest].join('.');
  const keep =
    current !== null && !inside(current)
      ? firstThree(current)
      : firstThree(away(octets(one).slice(fixed)));
  const sixth =
    firstThree(away(octets(two).slice(fixed))) === keep
      ? away([...octets(one).slice(fixed, 3), lastOf(two)])
      : away(octets(two).slice(fixed));
  const wrong = [
    one,
    two,
    // The usable chip's middle numbers behind the wrong start.
    away([...middle, lastOf(one)]),
    // The wrong start kept, only the last number new.
    `${keep}.${free}`,
    sixth,
  ];
  const offered = wrong.filter(
    (chip) => chip !== current && chip !== right && !(inside(chip) && !taken.includes(chip)),
  );
  return offered.length === CHIP_COUNT - 1 && distinct(offered).length === offered.length
    ? { right, wrong: offered }
    : null;
}

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
  if (prefixLength < 24) return spread({ shared, current, taken: neighbours, salt });

  const inside = insideOf(shared);
  // A network the diagram shows elsewhere is not offered: this simulator
  // still delivers to a host that carries an address from the router's other
  // side, so the chip would "work". The device's own wrong network is.
  const elsewhereShown = new Set(
    shownIn(topology)
      .filter((address) => address !== current)
      .map(firstThree),
  );
  const doors = doorSteps(shared)
    .flatMap((step) => nextDoor(shared.anchor, shared.size, step) ?? [])
    .filter((address) => !elsewhereShown.has(firstThree(address)));
  const own = current !== null && !inside(current) && !elsewhereShown.has(firstThree(current));
  // The wrong network kept (two times in three where there is one), else the network next door.
  const keepOwn = own && salt % 3 !== 0;
  return grid({
    shared,
    current,
    // The router's own address first where there is one, then a neighbour's.
    taken: [...(side.gateway ? [side.gateway.ip] : []), ...side.hosts],
    elsewhere: keepOwn ? [current, ...doors] : [...doors, ...(own ? [current] : [])],
    salt,
  });
}

/** Chips for a side of a router. Null when no device on that side has an address to go by. */
export function ifaceCandidates(
  topology: TopologySnapshot,
  nodeId: string,
  ifaceId: string,
  saltText: string,
): CandidateParts | null {
  const sides = topology.nodes.find((node) => node.id === nodeId)?.data.interfaces ?? [];
  const own = sides.find((side) => side.id === ifaceId);
  if (!own) return null;
  const side = sideOf(topology, nodeId, ifaceId);
  const shared = sharedNetwork(side.hosts, own.prefixLength);
  if (shared === null) return null;
  const salt = hashText(saltText);
  const inside = insideOf(shared);
  const others = sides.flatMap((entry) => (entry.id === ifaceId ? [] : [entry.ipAddress]));
  const doors = doorSteps(shared).map((step) => nextDoor(shared.anchor, shared.size, step));
  // The wrong network kept, the network of the router's other side, the network next door:
  // which comes first follows the salt.
  const kept = inside(own.ipAddress) ? [] : [own.ipAddress];
  const wanted = [...kept, ...others, ...doors];
  const turn = (salt >>> 12) % Math.max(1, Math.min(3, wanted.length));
  return grid({
    shared,
    current: own.ipAddress,
    taken: side.hosts,
    elsewhere: [...wanted.slice(turn), ...wanted.slice(0, turn)],
    salt,
  });
}
