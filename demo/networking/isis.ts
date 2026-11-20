/**
 * The IS-IS lesson (REQ-392): addresses (NETs), levels and adjacencies, the
 * attached (ATT) bit, and SPF on the Level 1 and Level 2 databases, compared
 * with OSPF.
 *
 * Simplified: every router has exactly one area address and one LAN prefix;
 * links are point-to-point with one metric used in both directions; ties
 * between equal-cost paths go to the lower router name (no ECMP); an L1/L2
 * router sets ATT when its Level 2 SPF reaches a router in another area; no
 * route leaking from Level 2 into Level 1; no overload bit, no DIS.
 */

export type RouterId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type Level = 'L1' | 'L2' | 'L1L2';
export type Adjacency = 'L1' | 'L2' | 'L1L2' | 'none';

export const ROUTER_IDS: readonly RouterId[] = ['R1', 'R2', 'R3', 'R4', 'R5'];
export const LEVELS: readonly Level[] = ['L1', 'L2', 'L1L2'];

export interface Router {
  readonly id: RouterId;
  readonly net: string;
  readonly level: Level;
  readonly prefix: string;
}

export interface Link {
  readonly a: RouterId;
  readonly b: RouterId;
  readonly metric: number;
}

export interface Network {
  readonly routers: readonly Router[];
  readonly links: readonly Link[];
}

/** The default interface metric on common implementations (wide metrics: 24 bits; 2^24 − 1 means "do not use this link"). */
export const DEFAULT_METRIC = 10;

export const BASE_NETWORK: Network = {
  routers: [
    { id: 'R1', net: '49.0001.0000.0000.0001.00', level: 'L1', prefix: '10.0.1.0/24' },
    { id: 'R2', net: '49.0001.0000.0000.0002.00', level: 'L1L2', prefix: '10.0.2.0/24' },
    { id: 'R3', net: '49.0001.0000.0000.0003.00', level: 'L1L2', prefix: '10.0.3.0/24' },
    { id: 'R4', net: '49.0002.0000.0000.0004.00', level: 'L1L2', prefix: '10.0.4.0/24' },
    { id: 'R5', net: '49.0002.0000.0000.0005.00', level: 'L1', prefix: '10.0.5.0/24' },
  ],
  links: [
    { a: 'R1', b: 'R2', metric: DEFAULT_METRIC },
    { a: 'R1', b: 'R3', metric: 30 },
    { a: 'R2', b: 'R3', metric: DEFAULT_METRIC },
    { a: 'R2', b: 'R4', metric: DEFAULT_METRIC },
    { a: 'R3', b: 'R4', metric: DEFAULT_METRIC },
    { a: 'R4', b: 'R5', metric: DEFAULT_METRIC },
    { a: 'R1', b: 'R5', metric: DEFAULT_METRIC },
  ],
};

/** The network with some routers' levels changed. */
export function withLevels(network: Network, levels: Partial<Record<RouterId, Level>>): Network {
  return {
    ...network,
    routers: network.routers.map((r) => ({ ...r, level: levels[r.id] ?? r.level })),
  };
}

export interface NetParts {
  readonly area: string;
  readonly afi: string;
  readonly systemId: string;
  readonly nsel: string;
}

/**
 * Splits a NET: the last byte is the NSEL (00 for a router), the six bytes
 * before it the system ID, and everything before that (1 to 13 bytes, the
 * first being the AFI) the area address. Returns null for anything else.
 */
export function parseNet(net: string): NetParts | null {
  const trimmed = net.trim();
  if (!/^[0-9a-fA-F.]+$/.test(trimmed)) return null;
  const hex = trimmed.replace(/\./g, '').toLowerCase();
  if (hex.length % 2 !== 0) return null;
  const bytes = hex.length / 2;
  if (bytes < 8 || bytes > 20) return null;
  const nsel = hex.slice(-2);
  if (nsel !== '00') return null;
  const sys = hex.slice(-14, -2);
  const areaHex = hex.slice(0, -14);
  const afi = areaHex.slice(0, 2);
  const rest = areaHex.slice(2).match(/.{1,4}/g) ?? [];
  return {
    area: [afi, ...rest].join('.'),
    afi,
    systemId: sys.match(/.{4}/g)!.join('.'),
    nsel,
  };
}

const router = (network: Network, id: RouterId) => network.routers.find((r) => r.id === id)!;
const areaOf = (network: Network, id: RouterId) => parseNet(router(network, id).net)!.area;
const hasL1 = (level: Level) => level !== 'L2';
const hasL2 = (level: Level) => level !== 'L1';

/**
 * Which adjacency two neighbouring routers form: Level 1 only when both run
 * Level 1 and share an area, Level 2 whenever both run Level 2.
 */
export function adjacency(network: Network, a: RouterId, b: RouterId): Adjacency {
  const ra = router(network, a);
  const rb = router(network, b);
  const l1 = hasL1(ra.level) && hasL1(rb.level) && areaOf(network, a) === areaOf(network, b);
  const l2 = hasL2(ra.level) && hasL2(rb.level);
  if (l1 && l2) return 'L1L2';
  if (l1) return 'L1';
  return l2 ? 'L2' : 'none';
}

export type Db = 'L1' | 'L2';

function neighbours(network: Network, id: RouterId, db: Db) {
  return network.links.flatMap((link) => {
    if (link.a !== id && link.b !== id) return [];
    const other = link.a === id ? link.b : link.a;
    const adj = adjacency(network, id, other);
    return adj === db || adj === 'L1L2' ? [{ id: other, metric: link.metric }] : [];
  });
}

export interface SpfEntry {
  readonly to: RouterId;
  readonly metric: number;
  /** Routers from the root to `to`, both included. */
  readonly path: readonly RouterId[];
}

/**
 * Dijkstra over one level's adjacencies from `root`. A Level 1 database only
 * holds the root's own area, because Level 1 adjacencies never leave it.
 * Empty when the root does not run that level.
 */
export function spf(network: Network, root: RouterId, db: Db): readonly SpfEntry[] {
  const level = router(network, root).level;
  if (db === 'L1' ? !hasL1(level) : !hasL2(level)) return [];
  const dist = new Map<RouterId, number>([[root, 0]]);
  const path = new Map<RouterId, readonly RouterId[]>([[root, [root]]]);
  const done = new Set<RouterId>();
  for (;;) {
    let next: RouterId | null = null;
    for (const id of ROUTER_IDS) {
      const d = dist.get(id);
      if (d === undefined || done.has(id)) continue;
      if (next === null || d < dist.get(next)!) next = id;
    }
    if (next === null) break;
    done.add(next);
    for (const n of neighbours(network, next, db)) {
      const d = dist.get(next)! + n.metric;
      if (d < (dist.get(n.id) ?? Infinity)) {
        dist.set(n.id, d);
        path.set(n.id, [...path.get(next)!, n.id]);
      }
    }
  }
  return ROUTER_IDS.filter((id) => done.has(id)).map((id) => ({
    to: id,
    metric: dist.get(id)!,
    path: path.get(id)!,
  }));
}

/** An L1/L2 router sets ATT in its Level 1 LSP when Level 2 reaches another area. */
export function setsAttached(network: Network, id: RouterId): boolean {
  if (router(network, id).level !== 'L1L2') return false;
  const own = areaOf(network, id);
  return spf(network, id, 'L2').some((e) => areaOf(network, e.to) !== own);
}

export interface Route {
  readonly prefix: string;
  readonly source: 'connected' | 'L1' | 'L2' | 'L1-default';
  readonly metric: number;
  /** null for the router's own prefix. */
  readonly nextHop: RouterId | null;
}

export const DEFAULT_PREFIX = '0.0.0.0/0';

/**
 * The routes a router installs: its own prefix, Level 1 routes to its area,
 * Level 2 routes (to L2 routers' prefixes and the area prefixes L1/L2 routers
 * carry into Level 2), Level 1 preferred over Level 2, and — for an L1-only
 * router — a default route to the nearest router setting ATT.
 */
export function routes(network: Network, id: RouterId): readonly Route[] {
  const self = router(network, id);
  const table = new Map<string, Route>([
    [self.prefix, { prefix: self.prefix, source: 'connected', metric: 0, nextHop: null }],
  ]);
  for (const e of spf(network, id, 'L1')) {
    const prefix = router(network, e.to).prefix;
    if (!table.has(prefix))
      table.set(prefix, { prefix, source: 'L1', metric: e.metric, nextHop: e.path[1]! });
  }
  for (const e of spf(network, id, 'L2')) {
    const advertiser = router(network, e.to);
    // An L2 router advertises its own prefix; an L1/L2 router also its area's L1 prefixes.
    const advertised: { prefix: string; metric: number }[] = [
      { prefix: advertiser.prefix, metric: 0 },
    ];
    if (advertiser.level === 'L1L2') {
      for (const inner of spf(network, advertiser.id, 'L1')) {
        advertised.push({ prefix: router(network, inner.to).prefix, metric: inner.metric });
      }
    }
    for (const ad of advertised) {
      const metric = e.metric + ad.metric;
      const current = table.get(ad.prefix);
      if (current && current.source !== 'L2') continue;
      if (current && current.metric <= metric) continue;
      table.set(ad.prefix, {
        prefix: ad.prefix,
        source: 'L2',
        metric,
        nextHop: e.path[1] ?? null,
      });
    }
  }
  const exit = nearestAttached(network, id);
  if (exit) {
    table.set(DEFAULT_PREFIX, {
      prefix: DEFAULT_PREFIX,
      source: 'L1-default',
      metric: exit.metric,
      nextHop: exit.path[1]!,
    });
  }
  return [...table.values()];
}

/** The nearest router setting ATT, as an L1-only router sees it, or null. */
export function nearestAttached(network: Network, id: RouterId): SpfEntry | null {
  if (router(network, id).level !== 'L1') return null;
  return (
    spf(network, id, 'L1')
      .filter((e) => e.to !== id && setsAttached(network, e.to))
      .sort((x, y) => x.metric - y.metric)[0] ?? null
  );
}

export interface Trace {
  readonly reached: boolean;
  readonly hops: readonly RouterId[];
  readonly metric: number;
}

function linkMetric(network: Network, a: RouterId, b: RouterId): number {
  return network.links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))!.metric;
}

/** The metric of a path of routers, summed over its links. */
export function pathMetric(network: Network, hops: readonly RouterId[]): number {
  let sum = 0;
  for (let i = 1; i < hops.length; i++) sum += linkMetric(network, hops[i - 1]!, hops[i]!);
  return sum;
}

/**
 * Follows a packet hop by hop from `from` to `to`'s LAN: each router looks up
 * the destination prefix in its own table, falling back to its default route.
 */
export function trace(network: Network, from: RouterId, to: RouterId): Trace {
  const prefix = router(network, to).prefix;
  const hops: RouterId[] = [from];
  let at = from;
  while (at !== to && hops.length <= ROUTER_IDS.length) {
    const table = routes(network, at);
    const route =
      table.find((r) => r.prefix === prefix) ?? table.find((r) => r.prefix === DEFAULT_PREFIX);
    if (!route || route.nextHop === null)
      return { reached: false, hops, metric: pathMetric(network, hops) };
    at = route.nextHop;
    hops.push(at);
  }
  return { reached: at === to, hops, metric: pathMetric(network, hops) };
}
