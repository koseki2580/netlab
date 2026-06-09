import type { RouteEntry } from '../../types/routing';
import { networkAddress } from '../../utils/cidr';
import { splitmix64 } from '../../utils/prng';
import type { RouteProblem } from './types';

function intIn(draw: number, loInclusive: number, hiInclusive: number): number {
  const span = hiInclusive - loInclusive + 1;
  return loInclusive + Math.min(span - 1, Math.floor(draw * span));
}

function route(destination: string, nextHop: string): RouteEntry {
  return { destination, nextHop, metric: 0, protocol: 'static', adminDistance: 1, nodeId: 'r1' };
}

/**
 * Build a longest-prefix-match problem from `(seed, seq)`. The table always has
 * a default route plus three strictly nested prefixes (/8 ⊃ /16 ⊃ /24); the
 * destination is placed so exactly one of them is the most specific match, at a
 * depth chosen by the seed — so the learner must apply LPM, not pattern-match.
 */
export function generateRouteProblem(seed: number, seq = 0): RouteProblem {
  const rng = splitmix64((BigInt(seed >>> 0) << 32n) ^ BigInt(seq >>> 0));

  const o1 = 1 + intIn(rng(), 0, 222);
  const o2 = intIn(rng(), 0, 255);
  const o3 = intIn(rng(), 0, 255);

  const net8 = networkAddress(`${o1}.0.0.0`, 8);
  const net16 = networkAddress(`${o1}.${o2}.0.0`, 16);
  const net24 = networkAddress(`${o1}.${o2}.${o3}.0`, 24);

  // Four distinct, readable next-hops in TEST-NET-1.
  const hopBase = 1 + intIn(rng(), 0, 246);
  const hop = (k: number) => `192.0.2.${hopBase + k}`;

  const routes: RouteEntry[] = [
    route('0.0.0.0/0', hop(0)),
    route(`${net8}/8`, hop(1)),
    route(`${net16}/16`, hop(2)),
    route(`${net24}/24`, hop(3)),
  ];

  // Depth 0=default, 1=/8, 2=/16, 3=/24 — where the destination's best match lands.
  const depth = intIn(rng(), 0, 3);
  const host = 1 + intIn(rng(), 0, 253);
  let dstIp: string;
  if (depth === 3) {
    dstIp = `${o1}.${o2}.${o3}.${host}`;
  } else if (depth === 2) {
    const o3b = (o3 + 1 + intIn(rng(), 0, 253)) % 256; // differs from o3 → outside /24
    dstIp = `${o1}.${o2}.${o3b}.${host}`;
  } else if (depth === 1) {
    const o2b = (o2 + 1 + intIn(rng(), 0, 253)) % 256; // differs from o2 → outside /16
    dstIp = `${o1}.${o2b}.${intIn(rng(), 0, 255)}.${host}`;
  } else {
    const o1b = ((o1 + 1 + intIn(rng(), 0, 220)) % 223) + 1; // differs from o1 → outside /8
    dstIp = `${o1b}.${intIn(rng(), 0, 255)}.${intIn(rng(), 0, 255)}.${host}`;
  }

  // Shuffle so the answer can't be read off the table's order.
  const order = routes
    .map((entry) => ({ entry, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map((wrapped) => wrapped.entry);

  return {
    id: `route-${seed >>> 0}-${seq >>> 0}`,
    dstIp,
    routes: order,
    prompt: `A packet is destined for ${dstIp}. Which next-hop does the router choose?`,
  };
}

export function generateRouteSet(seed: number, count: number): RouteProblem[] {
  return Array.from({ length: Math.max(0, count) }, (_, seq) => generateRouteProblem(seed, seq));
}
