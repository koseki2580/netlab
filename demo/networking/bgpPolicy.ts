/**
 * The BGP policy lesson (REQ-396): how a router picks one of several paths to
 * the same prefix (the decision process of RFC 4271 §9.1.2.2, with a
 * vendor-specific weight in front), and how BGP communities (RFC 1997) steer
 * where a route goes and how a provider treats it.
 *
 * Simplified: every path has a MED; AS_PATH holds plain AS numbers (no
 * AS_SET or confederation segments); there is no locally originated path, no
 * multipath, no route reflection (so no ORIGINATOR_ID or CLUSTER_LIST), and
 * no "prefer the oldest eBGP path" rule some vendors add; router IDs are
 * distinct, so the last tie-break (lowest peer address) is never reached.
 * The community part has one AS with three routers in an iBGP full mesh and
 * no confederation, and nobody strips communities.
 */

// ---------------------------------------------------------------------------
// Part 1: the decision process
// ---------------------------------------------------------------------------

export type PathId = 'isp-a' | 'isp-b' | 'ibgp';
export type Origin = 'igp' | 'egp' | 'incomplete';

export interface BgpPath {
  readonly id: PathId;
  /** Vendor-specific, local to this router, higher wins. Not part of RFC 4271. */
  readonly weight: number;
  readonly localPref: number;
  /** AS numbers, nearest first: `asPath[0]` is the neighbouring AS. */
  readonly asPath: readonly number[];
  readonly origin: Origin;
  readonly med: number;
  readonly session: 'ebgp' | 'ibgp';
  /** IGP cost from this router to the path's next hop. */
  readonly igpMetric: number;
  /** The BGP Identifier of the peer the path was learned from (dotted quad). */
  readonly routerId: string;
}

export type StepId =
  | 'weight'
  | 'local-pref'
  | 'as-path'
  | 'origin'
  | 'med'
  | 'ebgp'
  | 'igp-metric'
  | 'router-id';

export const STEP_ORDER: readonly StepId[] = [
  'weight',
  'local-pref',
  'as-path',
  'origin',
  'med',
  'ebgp',
  'igp-metric',
  'router-id',
];

export interface StepResult {
  readonly step: StepId;
  /** Paths still in the running after this step. */
  readonly survivors: readonly PathId[];
  /** Paths this step took out. */
  readonly removed: readonly PathId[];
}

export interface Decision {
  readonly winner: PathId;
  /** The step that left one path. */
  readonly decidedBy: StepId;
  /** Every step that was reached, in order; steps after `decidedBy` are not run. */
  readonly steps: readonly StepResult[];
}

export interface DecisionOptions {
  /** Compare MED between paths from different neighbouring ASes too. Off by default. */
  readonly alwaysCompareMed?: boolean;
}

/** R1 sits in AS64500; 203.0.113.0/24 belongs to AS64510, a customer of both ISPs. */
export const LOCAL_AS = 64500;
export const PREFIX = '203.0.113.0/24';

export const BASE_PATHS: readonly BgpPath[] = [
  // eBGP from ISP-A (AS64501), on R1's own link.
  {
    id: 'isp-a',
    weight: 0,
    localPref: 100,
    asPath: [64501, 64510],
    origin: 'igp',
    med: 50,
    session: 'ebgp',
    igpMetric: 0,
    routerId: '192.0.2.10',
  },
  // eBGP from ISP-B (AS64502).
  {
    id: 'isp-b',
    weight: 0,
    localPref: 100,
    asPath: [64502, 64510],
    origin: 'igp',
    med: 30,
    session: 'ebgp',
    igpMetric: 0,
    routerId: '192.0.2.2',
  },
  // iBGP from R2, which learned it from ISP-A on a second link.
  {
    id: 'ibgp',
    weight: 0,
    localPref: 100,
    asPath: [64501, 64510],
    origin: 'igp',
    med: 20,
    session: 'ibgp',
    igpMetric: 10,
    routerId: '10.0.0.2',
  },
];

const ORIGIN_RANK: Record<Origin, number> = { igp: 0, egp: 1, incomplete: 2 };

/** A dotted-quad router ID as the 32-bit number it is compared as. */
export function routerIdValue(routerId: string): number {
  return routerId.split('.').reduce((value, octet) => value * 256 + Number(octet), 0);
}

/** Keep the paths whose `score` is the lowest. */
function keepLowest(paths: readonly BgpPath[], score: (path: BgpPath) => number): BgpPath[] {
  const best = Math.min(...paths.map(score));
  return paths.filter((path) => score(path) === best);
}

function applyStep(step: StepId, paths: readonly BgpPath[], options: DecisionOptions): BgpPath[] {
  switch (step) {
    case 'weight':
      return keepLowest(paths, (path) => -path.weight);
    case 'local-pref':
      return keepLowest(paths, (path) => -path.localPref);
    case 'as-path':
      return keepLowest(paths, (path) => path.asPath.length);
    case 'origin':
      return keepLowest(paths, (path) => ORIGIN_RANK[path.origin]);
    case 'med': {
      // A path is removed only by a lower MED from the same neighbouring AS,
      // unless the operator asked to compare MED across ASes.
      const group = (path: BgpPath) => (options.alwaysCompareMed ? 0 : (path.asPath[0] ?? 0));
      return paths.filter((path) =>
        paths.every((other) => group(other) !== group(path) || other.med >= path.med),
      );
    }
    case 'ebgp':
      return paths.some((path) => path.session === 'ebgp')
        ? paths.filter((path) => path.session === 'ebgp')
        : [...paths];
    case 'igp-metric':
      return keepLowest(paths, (path) => path.igpMetric);
    case 'router-id':
      return keepLowest(paths, (path) => routerIdValue(path.routerId));
  }
}

/** Run the decision process, stopping at the first step that leaves one path. */
export function decide(paths: readonly BgpPath[], options: DecisionOptions = {}): Decision {
  let remaining = [...paths];
  const steps: StepResult[] = [];
  for (const step of STEP_ORDER) {
    const survivors = applyStep(step, remaining, options);
    steps.push({
      step,
      survivors: survivors.map((path) => path.id),
      removed: remaining.filter((path) => !survivors.includes(path)).map((path) => path.id),
    });
    remaining = survivors;
    if (remaining.length === 1) break;
  }
  return { winner: remaining[0]!.id, decidedBy: steps[steps.length - 1]!.step, steps };
}

/** The base paths with one path's attributes changed. */
export function withChange(
  id: PathId,
  change: Partial<Omit<BgpPath, 'id'>>,
  paths: readonly BgpPath[] = BASE_PATHS,
): BgpPath[] {
  return paths.map((path) => (path.id === id ? { ...path, ...change } : path));
}

// ---------------------------------------------------------------------------
// Part 2: communities
// ---------------------------------------------------------------------------

export type CommunityId = 'none' | 'no-export' | 'no-advertise' | 'lp-80';
export const COMMUNITIES: readonly CommunityId[] = ['none', 'no-export', 'no-advertise', 'lp-80'];

/** How each community is written on the wire / in configuration. */
export const COMMUNITY_VALUE: Record<CommunityId, string> = {
  none: '—',
  'no-export': 'NO_EXPORT (65535:65281)',
  'no-advertise': 'NO_ADVERTISE (65535:65282)',
  'lp-80': '65001:80',
};

export type RouterId = 'cust' | 'e1' | 'c1' | 'e2' | 'peer';
export const ROUTERS: readonly { readonly id: RouterId; readonly as: number }[] = [
  { id: 'cust', as: 65000 },
  { id: 'e1', as: 65001 },
  { id: 'c1', as: 65001 },
  { id: 'e2', as: 65001 },
  { id: 'peer', as: 65002 },
];

/** BGP sessions; a session between routers of the same AS is iBGP. */
export const SESSIONS: readonly (readonly [RouterId, RouterId])[] = [
  ['cust', 'e1'],
  ['e1', 'c1'],
  ['e1', 'e2'],
  ['c1', 'e2'],
  ['e2', 'peer'],
];

/** LOCAL_PREF a router sets on routes it learns over eBGP, unless policy says otherwise. */
export const DEFAULT_LOCAL_PREF = 100;
/** AS65001's documented policy: a customer route tagged 65001:80 gets LOCAL_PREF 80. */
export const TAGGED_LOCAL_PREF = 80;

export interface RouterState {
  readonly id: RouterId;
  readonly as: number;
  readonly holds: boolean;
  /** The router it learned the route from; null for the originator or when it has none. */
  readonly learnedFrom: RouterId | null;
  /** LOCAL_PREF in this router's table; null for the originator or when it has none. */
  readonly localPref: number | null;
  readonly advertisesTo: readonly RouterId[];
}

const asOf = (id: RouterId) => ROUTERS.find((router) => router.id === id)!.as;

function peersOf(id: RouterId): RouterId[] {
  return SESSIONS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
}

/**
 * The customer (AS65000) originates 198.51.100.0/24 tagged with `community`
 * and sends it to AS65001. Who ends up with it, and who sends it on?
 */
export function propagate(community: CommunityId): RouterState[] {
  const learnedFrom = new Map<RouterId, RouterId | null>([['cust', null]]);
  const localPref = new Map<RouterId, number | null>([['cust', null]]);
  const advertisesTo = new Map<RouterId, RouterId[]>();
  const queue: RouterId[] = ['cust'];
  while (queue.length > 0) {
    const router = queue.shift()!;
    const from = learnedFrom.get(router) ?? null;
    const viaIbgp = from !== null && asOf(from) === asOf(router);
    const targets = peersOf(router).filter((peer) => {
      if (peer === from) return false;
      const ebgp = asOf(peer) !== asOf(router);
      // The originator attaches the community on its way out; the rules bind receivers.
      if (router !== 'cust') {
        if (community === 'no-advertise') return false;
        if (community === 'no-export' && ebgp) return false;
      }
      // A route learned over iBGP is not passed to another iBGP peer.
      if (viaIbgp && !ebgp) return false;
      return true;
    });
    advertisesTo.set(router, targets);
    for (const peer of targets) {
      if (learnedFrom.has(peer)) continue;
      learnedFrom.set(peer, router);
      const ebgp = asOf(peer) !== asOf(router);
      // LOCAL_PREF is set on eBGP import and carried unchanged over iBGP.
      const imported =
        community === 'lp-80' && asOf(peer) === 65001 ? TAGGED_LOCAL_PREF : DEFAULT_LOCAL_PREF;
      localPref.set(peer, ebgp ? imported : (localPref.get(router) ?? DEFAULT_LOCAL_PREF));
      queue.push(peer);
    }
  }
  return ROUTERS.map(({ id, as }) => ({
    id,
    as,
    holds: learnedFrom.has(id),
    learnedFrom: learnedFrom.get(id) ?? null,
    localPref: localPref.get(id) ?? null,
    advertisesTo: advertisesTo.get(id) ?? [],
  }));
}
