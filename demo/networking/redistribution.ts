/**
 * The route-redistribution lesson (REQ-405): administrative distance, and why
 * mutual redistribution at two points can send traffic the long way, and how
 * route tags or a changed distance fix it.
 *
 * Simplified: one prefix (10.5.0.0/16) is tracked; the administrative
 * distances are the common Cisco defaults (other vendors use other numbers);
 * OSPF externals are type E2 with a seed metric of 20, so only the cost to
 * the advertising border router breaks ties; RIP routes redistributed from
 * OSPF get a seed metric of 1; routers update one at a time in a fixed order
 * (R1 before R2), and every RIP update and OSPF flood is instant.
 */

export type Protocol = 'connected' | 'static' | 'ebgp' | 'ospf' | 'rip' | 'ibgp';

/** The common (Cisco) default administrative distances. Vendors differ. */
export const DEFAULT_AD: Readonly<Record<Protocol, number>> = {
  connected: 0,
  static: 1,
  ebgp: 20,
  ospf: 110,
  rip: 120,
  ibgp: 200,
};

export interface Candidate {
  readonly protocol: Protocol;
  /** The next hop (a router name or an address). */
  readonly via: string;
  /** The metric in the protocol's own unit: hops for RIP, cost for OSPF. */
  readonly metric: number;
  readonly ad: number;
  readonly tag?: number;
  /** Refused by an inbound filter: kept in the protocol, not installed. */
  readonly filtered?: boolean;
}

/**
 * The route a router installs: the lowest administrative distance wins.
 * Metrics are compared only between routes of the same protocol, because a
 * RIP hop count and an OSPF cost are not the same unit.
 */
export function bestRoute(candidates: readonly Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (candidate.filtered) continue;
    if (
      !best ||
      candidate.ad < best.ad ||
      (candidate.ad === best.ad &&
        candidate.protocol === best.protocol &&
        candidate.metric < best.metric)
    ) {
      best = candidate;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Part 1: one router, several sources for the same prefix.            */
/* ------------------------------------------------------------------ */

export type SourceId = 'static' | 'ospf-r7' | 'ospf-r8' | 'rip-r9';

export const SOURCES: readonly { readonly id: SourceId; readonly candidate: Candidate }[] = [
  {
    id: 'static',
    candidate: { protocol: 'static', via: '192.0.2.1', metric: 0, ad: DEFAULT_AD.static },
  },
  { id: 'ospf-r7', candidate: { protocol: 'ospf', via: 'R7', metric: 30, ad: DEFAULT_AD.ospf } },
  { id: 'ospf-r8', candidate: { protocol: 'ospf', via: 'R8', metric: 20, ad: DEFAULT_AD.ospf } },
  { id: 'rip-r9', candidate: { protocol: 'rip', via: 'R9', metric: 2, ad: DEFAULT_AD.rip } },
];

/** Which of the present sources the router installs. */
export function chooseSource(present: readonly SourceId[]): SourceId | null {
  const best = bestRoute(
    SOURCES.filter((source) => present.includes(source.id)).map((source) => source.candidate),
  );
  return SOURCES.find((source) => source.candidate === best)?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Part 2: a RIP domain and an OSPF domain joined at R1 and R2.        */
/* ------------------------------------------------------------------ */

export type RouterId = 'RA' | 'R1' | 'R2' | 'O1' | 'O2';
export const ROUTERS: readonly RouterId[] = ['RA', 'R1', 'R2', 'O1', 'O2'];
export const BORDER: readonly RouterId[] = ['R1', 'R2'];

export const PREFIX = '10.5.0.0/16';
/** RA has 10.5.0.0/16 on a connected interface and runs RIP. */
export const ORIGIN: RouterId = 'RA';
export const RIP_LINKS: readonly (readonly [RouterId, RouterId])[] = [
  ['RA', 'R1'],
  ['RA', 'R2'],
];
export const OSPF_LINKS: readonly (readonly [RouterId, RouterId, number])[] = [
  ['R1', 'O1', 10],
  ['O1', 'O2', 10],
  ['O2', 'R2', 10],
];
const RIP_ROUTERS: readonly RouterId[] = ['RA', 'R1', 'R2'];
const OSPF_ROUTERS: readonly RouterId[] = ['R1', 'O1', 'O2', 'R2'];

export const E2_SEED_METRIC = 20;
export const RIP_SEED_METRIC = 1;
/** The tag R1 and R2 put on routes they take from RIP into OSPF, with the tag fix. */
export const RIP_TAG = 100;
/** The OSPF external distance R1 and R2 use with the distance fix, above RIP's 120. */
export const RAISED_OSPF_EXTERNAL_AD = 125;

export type Fix = 'none' | 'tag' | 'distance';
export const FIXES: readonly Fix[] = ['none', 'tag', 'distance'];

export type Step =
  | { readonly kind: 'install'; readonly router: RouterId; readonly route: Candidate }
  | { readonly kind: 'remove'; readonly router: RouterId }
  | { readonly kind: 'to-ospf'; readonly router: RouterId; readonly tag?: number }
  | { readonly kind: 'withdraw-ospf'; readonly router: RouterId }
  | { readonly kind: 'to-rip'; readonly router: RouterId }
  | { readonly kind: 'withdraw-rip'; readonly router: RouterId }
  | { readonly kind: 'deny-to-rip'; readonly router: RouterId; readonly tag: number };

export interface RouterTable {
  readonly candidates: readonly Candidate[];
  readonly installed: Candidate | null;
}

export interface Path {
  readonly routers: readonly RouterId[];
  readonly hops: number;
  readonly loop: boolean;
  readonly reached: boolean;
}

export interface Outcome {
  readonly fix: Fix;
  readonly steps: readonly Step[];
  readonly tables: Readonly<Record<RouterId, RouterTable>>;
  /** Border routers that put 10.5.0.0/16 into OSPF, with the tag they set. */
  readonly ospfOrigins: readonly { readonly router: RouterId; readonly tag?: number }[];
  /** Border routers that put an OSPF-learned 10.5.0.0/16 back into RIP. */
  readonly ripInjections: readonly RouterId[];
  readonly pathFromR2: Path;
}

interface State {
  readonly rib: Map<RouterId, Candidate | null>;
  readonly lsas: Map<RouterId, number | undefined>;
  readonly injected: Set<RouterId>;
}

/** Shortest OSPF costs and first hops from `from` (Dijkstra over the OSPF links). */
function ospfPaths(from: RouterId): Map<RouterId, { cost: number; firstHop: RouterId }> {
  const result = new Map<RouterId, { cost: number; firstHop: RouterId }>();
  const dist = new Map<RouterId, { cost: number; firstHop: RouterId | null }>([
    [from, { cost: 0, firstHop: null }],
  ]);
  const done = new Set<RouterId>();
  while (true) {
    let next: RouterId | null = null;
    for (const [router, entry] of dist) {
      if (!done.has(router) && (next === null || entry.cost < dist.get(next)!.cost)) next = router;
    }
    if (next === null) break;
    done.add(next);
    const here = dist.get(next)!;
    if (here.firstHop) result.set(next, { cost: here.cost, firstHop: here.firstHop });
    for (const [a, b, cost] of OSPF_LINKS) {
      const other = a === next ? b : b === next ? a : null;
      if (!other || done.has(other)) continue;
      const total = here.cost + cost;
      if (!dist.has(other) || total < dist.get(other)!.cost) {
        dist.set(other, { cost: total, firstHop: here.firstHop ?? other });
      }
    }
  }
  return result;
}

function ripNeighbours(router: RouterId): RouterId[] {
  return RIP_LINKS.flatMap(([a, b]) => (a === router ? [b] : b === router ? [a] : []));
}

/** The RIP metric `router` advertises to `to`, or null if it advertises nothing. */
function ripAdvert(state: State, router: RouterId, to: RouterId): number | null {
  if (router === ORIGIN) return 0;
  const route = state.rib.get(router);
  if (!route) return null;
  if (route.protocol === 'rip') return route.via === to ? null : route.metric; // split horizon
  if (route.protocol === 'ospf' && state.injected.has(router)) return RIP_SEED_METRIC;
  return null;
}

function candidatesAt(state: State, router: RouterId, fix: Fix): Candidate[] {
  const candidates: Candidate[] = [];
  if (router === ORIGIN) {
    candidates.push({ protocol: 'connected', via: 'eth1', metric: 0, ad: DEFAULT_AD.connected });
  }
  if (RIP_ROUTERS.includes(router)) {
    for (const neighbour of ripNeighbours(router)) {
      const advert = ripAdvert(state, neighbour, router);
      if (advert !== null) {
        candidates.push({
          protocol: 'rip',
          via: neighbour,
          metric: advert + 1,
          ad: DEFAULT_AD.rip,
        });
      }
    }
  }
  if (OSPF_ROUTERS.includes(router)) {
    const paths = ospfPaths(router);
    let chosen: {
      asbr: RouterId;
      cost: number;
      firstHop: RouterId;
      tag: number | undefined;
    } | null = null;
    for (const [asbr, tag] of state.lsas) {
      const path = paths.get(asbr);
      if (asbr === router || !path) continue;
      if (!chosen || path.cost < chosen.cost) chosen = { asbr, ...path, tag };
    }
    if (chosen) {
      const isBorder = BORDER.includes(router);
      candidates.push({
        protocol: 'ospf',
        via: chosen.firstHop,
        metric: E2_SEED_METRIC,
        ad: fix === 'distance' && isBorder ? RAISED_OSPF_EXTERNAL_AD : DEFAULT_AD.ospf,
        ...(chosen.tag !== undefined ? { tag: chosen.tag } : {}),
        ...(fix === 'tag' && isBorder && chosen.tag === RIP_TAG ? { filtered: true } : {}),
      });
    }
  }
  return candidates;
}

/** One router recomputes its table and, if it is a border router, its redistribution. */
function update(state: State, router: RouterId, fix: Fix, redistribute: boolean, log: Step[]) {
  const before = state.rib.get(router) ?? null;
  const best = bestRoute(candidatesAt(state, router, fix));
  if (!sameRoute(before, best)) {
    state.rib.set(router, best);
    log.push(best ? { kind: 'install', router, route: best } : { kind: 'remove', router });
  }
  if (!redistribute || !BORDER.includes(router)) return;
  const wantsLsa = best?.protocol === 'rip';
  if (wantsLsa && !state.lsas.has(router)) {
    const tag = fix === 'tag' ? RIP_TAG : undefined;
    state.lsas.set(router, tag);
    log.push({ kind: 'to-ospf', router, ...(tag !== undefined ? { tag } : {}) });
  } else if (!wantsLsa && state.lsas.has(router)) {
    state.lsas.delete(router);
    log.push({ kind: 'withdraw-ospf', router });
  }
  const fromOspf = best?.protocol === 'ospf';
  const denied = fromOspf && fix === 'tag' && best.tag === RIP_TAG;
  const wantsRip = fromOspf && !denied;
  if (wantsRip && !state.injected.has(router)) {
    state.injected.add(router);
    log.push({ kind: 'to-rip', router });
  } else if (!wantsRip && state.injected.has(router)) {
    state.injected.delete(router);
    log.push({ kind: 'withdraw-rip', router });
  }
  if (denied && !log.some((step) => step.kind === 'deny-to-rip' && step.router === router)) {
    log.push({ kind: 'deny-to-rip', router, tag: RIP_TAG });
  }
}

function sameRoute(a: Candidate | null, b: Candidate | null): boolean {
  return (
    a?.protocol === b?.protocol && a?.via === b?.via && a?.metric === b?.metric && a?.ad === b?.ad
  );
}

/** Follows next hops for 10.5.0.0/16 from `start` until RA, a dead end, or a loop. */
export function forwardingPath(
  rib: ReadonlyMap<RouterId, Candidate | null>,
  start: RouterId,
): Path {
  const routers: RouterId[] = [start];
  let here = start;
  while (here !== ORIGIN) {
    const route = rib.get(here);
    if (!route) return { routers, hops: routers.length - 1, loop: false, reached: false };
    const next = route.via as RouterId;
    if (routers.includes(next)) {
      routers.push(next);
      return { routers, hops: routers.length - 1, loop: true, reached: false };
    }
    routers.push(next);
    here = next;
  }
  return { routers, hops: routers.length - 1, loop: false, reached: true };
}

const UPDATE_ORDER: readonly RouterId[] = ['R1', 'R2', 'O1', 'O2', 'RA'];

/**
 * RIP converges first; then R1 and R2 start redistributing both ways, R1
 * first. Routers update one at a time until a whole round changes nothing.
 */
export function simulate(fix: Fix): Outcome {
  const state: State = { rib: new Map(), lsas: new Map(), injected: new Set() };
  const steps: Step[] = [];
  for (const router of ['RA', 'R1', 'R2'] as const) update(state, router, fix, false, steps);
  for (let round = 0; round < 10; round += 1) {
    const before = steps.length;
    for (const router of UPDATE_ORDER) update(state, router, fix, true, steps);
    if (steps.length === before) break;
  }
  const tables = {} as Record<RouterId, RouterTable>;
  for (const router of ROUTERS) {
    tables[router] = {
      candidates: candidatesAt(state, router, fix),
      installed: state.rib.get(router) ?? null,
    };
  }
  return {
    fix,
    steps,
    tables,
    ospfOrigins: [...state.lsas].map(([router, tag]) =>
      tag !== undefined ? { router, tag } : { router },
    ),
    ripInjections: [...state.injected],
    pathFromR2: forwardingPath(state.rib, 'R2'),
  };
}
