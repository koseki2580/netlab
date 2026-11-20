/**
 * The anycast and CDN lesson (REQ-398): one prefix, 192.0.2.0/24, announced
 * by a CDN (AS 64500) from Tokyo, Frankfurt and New York, and which copy each
 * user reaches.
 *
 * Simplified: every network is one AS and one node. Each AS learns the routes
 * its neighbours chose, rejects any that already contain it, keeps the one
 * with the shortest AS path, and breaks ties by the lowest neighbour AS number
 * (standing in for BGP's later tie-breakers). No policy (local preference,
 * customer/peer rules) is modelled. A link's latency includes the carrier's
 * backbone haul between cities; RTT is twice the one-way latency.
 *
 * The DNS part steers a client to one of three unicast servers by the
 * location of the resolver that asks, or of the client when the resolver
 * sends ECS (EDNS Client Subnet, RFC 7871).
 */
export type SiteId = 'site-tyo' | 'site-fra' | 'site-nyc';
export type UserId = 'isp-osaka' | 'isp-sg' | 'isp-london' | 'isp-chicago';
export type TransitId = 't-us' | 't-euro' | 't-asia' | 't-global';
export type NodeId = SiteId | UserId | TransitId;

export interface AsNode {
  readonly id: NodeId;
  readonly asn: number;
  readonly kind: 'site' | 'transit' | 'access';
}

export const ANYCAST_PREFIX = '192.0.2.0/24';

export const SITES: readonly SiteId[] = ['site-tyo', 'site-fra', 'site-nyc'];
export const USERS: readonly UserId[] = ['isp-osaka', 'isp-sg', 'isp-london', 'isp-chicago'];

export const NODES: readonly AsNode[] = [
  { id: 'site-tyo', asn: 64500, kind: 'site' },
  { id: 'site-fra', asn: 64500, kind: 'site' },
  { id: 'site-nyc', asn: 64500, kind: 'site' },
  { id: 't-us', asn: 64510, kind: 'transit' },
  { id: 't-euro', asn: 64520, kind: 'transit' },
  { id: 't-asia', asn: 64530, kind: 'transit' },
  { id: 't-global', asn: 64540, kind: 'transit' },
  { id: 'isp-osaka', asn: 64601, kind: 'access' },
  { id: 'isp-sg', asn: 64602, kind: 'access' },
  { id: 'isp-london', asn: 64603, kind: 'access' },
  { id: 'isp-chicago', asn: 64604, kind: 'access' },
];

export interface Link {
  readonly a: NodeId;
  readonly b: NodeId;
  /** One-way latency, ms. */
  readonly ms: number;
}

export const LINKS: readonly Link[] = [
  { a: 'site-tyo', b: 't-asia', ms: 1 },
  { a: 'site-fra', b: 't-euro', ms: 1 },
  { a: 'site-nyc', b: 't-us', ms: 1 },
  // The global carrier hands traffic to the CDN in Frankfurt only.
  { a: 'site-fra', b: 't-global', ms: 80 },
  { a: 't-global', b: 't-asia', ms: 35 },
  { a: 't-asia', b: 't-euro', ms: 120 },
  { a: 't-asia', b: 't-us', ms: 80 },
  { a: 't-euro', b: 't-us', ms: 42 },
  { a: 'isp-osaka', b: 't-asia', ms: 5 },
  { a: 'isp-sg', b: 't-global', ms: 1 },
  { a: 'isp-london', b: 't-euro', ms: 8 },
  { a: 'isp-chicago', b: 't-us', ms: 10 },
];

const nodeOf = (id: NodeId) => NODES.find((node) => node.id === id)!;
const isSite = (id: NodeId): id is SiteId => nodeOf(id).kind === 'site';

function neighbours(id: NodeId): { id: NodeId; ms: number }[] {
  return LINKS.flatMap((link) =>
    link.a === id
      ? [{ id: link.b, ms: link.ms }]
      : link.b === id
        ? [{ id: link.a, ms: link.ms }]
        : [],
  );
}

function linkMs(a: NodeId, b: NodeId): number {
  return neighbours(a).find((n) => n.id === b)!.ms;
}

export interface Route {
  readonly site: SiteId;
  /** From this node to the site, both included. */
  readonly path: readonly NodeId[];
  /** The AS path this node received: its neighbour first, the origin last. */
  readonly asPath: readonly number[];
  readonly oneWayMs: number;
  readonly rttMs: number;
}

function routeOf(path: readonly NodeId[]): Route {
  let oneWayMs = 0;
  for (let i = 1; i < path.length; i += 1) oneWayMs += linkMs(path[i - 1]!, path[i]!);
  return {
    site: path[path.length - 1] as SiteId,
    path,
    asPath: path.slice(1).map((id) => nodeOf(id).asn),
    oneWayMs,
    rttMs: oneWayMs * 2,
  };
}

/**
 * Every AS's chosen route to the prefix when `live` sites announce it,
 * computed as BGP does: each AS hears only its neighbours' choices.
 */
export function bgpRoutes(live: readonly SiteId[]): Record<NodeId, Route | null> {
  let best = Object.fromEntries(
    NODES.map((node) => [
      node.id,
      isSite(node.id) && live.includes(node.id) ? routeOf([node.id]) : null,
    ]),
  ) as Record<NodeId, Route | null>;
  for (let round = 0; round < NODES.length * 2; round += 1) {
    const next = { ...best };
    for (const node of NODES) {
      if (node.kind === 'site') continue;
      const candidates = neighbours(node.id)
        .map((n) => ({ via: n.id, heard: best[n.id] }))
        .filter(
          (c): c is { via: NodeId; heard: Route } =>
            c.heard !== null && !c.heard.path.includes(node.id),
        )
        .sort(
          (x, y) =>
            x.heard.path.length - y.heard.path.length ||
            nodeOf(x.via).asn - nodeOf(y.via).asn ||
            x.via.localeCompare(y.via),
        );
      const chosen = candidates[0];
      next[node.id] = chosen ? routeOf([node.id, ...chosen.heard.path]) : null;
    }
    const same = NODES.every((node) => next[node.id]?.path.join() === best[node.id]?.path.join());
    best = next;
    if (same) break;
  }
  return best;
}

/** The site a user's traffic to the anycast prefix reaches, or null if none announces it. */
export function routeFor(user: UserId, live: readonly SiteId[] = SITES): Route | null {
  return bgpRoutes(live)[user];
}

/** The lowest-latency path to any live site, ignoring BGP: where geography alone would send you. */
export function lowestLatency(user: UserId, live: readonly SiteId[] = SITES): Route | null {
  let best: Route | null = null;
  const walk = (path: NodeId[]) => {
    const here = path[path.length - 1]!;
    if (isSite(here)) {
      if (!live.includes(here)) return;
      const route = routeOf(path);
      if (best === null || route.oneWayMs < best.oneWayMs) best = route;
      return;
    }
    for (const n of neighbours(here)) if (!path.includes(n.id)) walk([...path, n.id]);
  };
  walk([user]);
  return best;
}

export type Resolver = 'own' | 'public-london' | 'public-london-ecs';
export const RESOLVERS: readonly Resolver[] = ['own', 'public-london', 'public-london-ecs'];

/** The unicast address of each site's server, used when steering by DNS. */
export const UNICAST: Record<SiteId, string> = {
  'site-tyo': '198.51.100.10',
  'site-fra': '198.51.100.20',
  'site-nyc': '198.51.100.30',
};

/** Where the authoritative server thinks the client is. */
function locationSeen(user: UserId, resolver: Resolver): UserId {
  return resolver === 'public-london' ? 'isp-london' : user;
}

export interface Steering {
  /** The network the authoritative server steers for. */
  readonly seenFrom: UserId;
  readonly server: SiteId;
  readonly address: string;
  /** The client's RTT to the server it was given. */
  readonly rttMs: number;
}

/**
 * DNS-based steering: each site has its own unicast prefix; the answer is the
 * server nearest to the location the authoritative server sees.
 */
export function dnsSteer(user: UserId, resolver: Resolver): Steering {
  const seenFrom = locationSeen(user, resolver);
  const server = [...SITES].sort(
    (x, y) => bgpRoutes([x])[seenFrom]!.rttMs - bgpRoutes([y])[seenFrom]!.rttMs,
  )[0]!;
  return {
    seenFrom,
    server,
    address: UNICAST[server],
    rttMs: bgpRoutes([server])[user]!.rttMs,
  };
}
