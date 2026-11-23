/**
 * The PIM lesson (REQ-401): multicast routing between routers with PIM
 * sparse mode (RFC 7761) and source-specific multicast (RFC 4607).
 *
 * Seven routers joined by links whose cost is also their one-way delay in ms.
 * The source sits behind R1; receivers sit behind R5, R6 and R7. Unicast
 * routing is the shortest path by cost (costs are the same both ways and every
 * shortest path used here is unique). PIM builds its trees from those routes:
 *
 * - Shared tree (*,G): each last-hop router joins hop by hop towards the RP,
 *   so the tree is the union of the receivers' shortest paths to the RP. The
 *   source's first-hop router sends to the RP along its shortest path
 *   (in Register messages), and the RP sends down the tree. Once the RP joins the source
 *   tree, native packets follow the (S,G) branch, so a router on it (R3 for an RP on R6) also
 *   feeds its (*,G) branches directly; the delays here are those of the Register phase.
 * - Source tree (S,G): each last-hop router joins towards the source, so the
 *   tree is the union of the receivers' shortest paths to the source.
 * - SSM: receivers name the source (IGMPv3), so the source tree is built
 *   from the start and no RP exists.
 * - RPF check: a router accepts a packet only from the neighbour it would use
 *   to reach the source (source tree) or the RP (shared tree).
 *
 * Simplified: hosts sit on their routers with no delay; DR election, Assert,
 * timers, Register-Stop and (S,G,rpt) prunes are not modelled; after the
 * switch the RP's own (S,G) branch is taken to be pruned unless a receiver's
 * source tree runs through it.
 */
export type RouterId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';

export interface Link {
  readonly a: RouterId;
  readonly b: RouterId;
  /** Cost and one-way delay, ms. */
  readonly cost: number;
}

export const ROUTERS: readonly RouterId[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

export const LINKS: readonly Link[] = [
  { a: 'R1', b: 'R2', cost: 2 },
  { a: 'R2', b: 'R3', cost: 2 },
  { a: 'R1', b: 'R4', cost: 3 },
  { a: 'R4', b: 'R5', cost: 2 },
  { a: 'R3', b: 'R5', cost: 5 },
  { a: 'R3', b: 'R6', cost: 2 },
  { a: 'R2', b: 'R6', cost: 5 },
  { a: 'R3', b: 'R7', cost: 3 },
  { a: 'R4', b: 'R7', cost: 3 },
];

/** The source's first-hop router. */
export const SOURCE_ROUTER: RouterId = 'R1';
/** The last-hop routers whose hosts joined the group. */
export const RECEIVERS: readonly RouterId[] = ['R5', 'R6', 'R7'];
/** Where the rendezvous point can be placed in the lesson. */
export const RP_CHOICES: readonly RouterId[] = ['R3', 'R4', 'R6'];
export const DEFAULT_RP: RouterId = 'R3';

export const SOURCE_IP = '10.1.1.10';
/** An any-source group (administratively scoped range). */
export const ASM_GROUP = '239.1.1.1';
/** A source-specific group: SSM uses 232.0.0.0/8. */
export const SSM_GROUP = '232.1.1.1';

/** A link's key, its two ends in order. */
export function linkKey(x: RouterId, y: RouterId): string {
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

function cost(x: RouterId, y: RouterId): number {
  const link = LINKS.find((l) => linkKey(l.a, l.b) === linkKey(x, y));
  if (!link) throw new Error(`no link ${x}-${y}`);
  return link.cost;
}

export function neighbours(router: RouterId): RouterId[] {
  return LINKS.flatMap((l) => (l.a === router ? [l.b] : l.b === router ? [l.a] : []));
}

/** The shortest path by cost (Dijkstra), both ends included. */
export function shortestPath(from: RouterId, to: RouterId): RouterId[] {
  const dist = new Map<RouterId, number>(ROUTERS.map((r) => [r, Infinity]));
  const prev = new Map<RouterId, RouterId>();
  const done = new Set<RouterId>();
  dist.set(from, 0);
  while (done.size < ROUTERS.length) {
    let current: RouterId | null = null;
    for (const r of ROUTERS) {
      if (!done.has(r) && (current === null || dist.get(r)! < dist.get(current)!)) current = r;
    }
    if (current === null || dist.get(current) === Infinity) break;
    done.add(current);
    for (const n of neighbours(current)) {
      const d = dist.get(current)! + cost(current, n);
      if (d < dist.get(n)!) {
        dist.set(n, d);
        prev.set(n, current);
      }
    }
  }
  const path: RouterId[] = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
}

export function pathDelay(path: readonly RouterId[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += cost(path[i - 1]!, path[i]!);
  return total;
}

function pathLinks(path: readonly RouterId[]): string[] {
  return path.slice(1).map((r, i) => linkKey(path[i]!, r));
}

export interface Delivery {
  readonly receiver: RouterId;
  /** The routers the traffic passes, source's router first. */
  readonly path: readonly RouterId[];
  readonly delayMs: number;
  /** Whether the traffic passes through the RP router. */
  readonly viaRp: boolean;
}

export interface TreeResult {
  readonly deliveries: readonly Delivery[];
  /** Every link that carries the group's traffic, sorted. */
  readonly links: readonly string[];
  /** The sum of the costs of those links. */
  readonly linkCost: number;
}

function tree(paths: readonly (readonly RouterId[])[], deliveries: Delivery[]): TreeResult {
  const links = [...new Set(paths.flatMap(pathLinks))].sort();
  const linkCost = links.reduce((sum, key) => {
    const [x, y] = key.split('-') as [RouterId, RouterId];
    return sum + cost(x, y);
  }, 0);
  return { deliveries, links, linkCost };
}

/** The RP's (*,G) tree: each receiver's join travels its shortest path to the RP. */
export function sharedTreeLinks(rp: RouterId, receivers = RECEIVERS): string[] {
  return [...new Set(receivers.flatMap((r) => pathLinks(shortestPath(r, rp))))].sort();
}

/** Before the switch: source → RP, then down the shared tree. */
export function viaSharedTree(rp: RouterId, receivers = RECEIVERS): TreeResult {
  const toRp = shortestPath(SOURCE_ROUTER, rp);
  const paths = receivers.map((r) => [...toRp, ...shortestPath(r, rp).reverse().slice(1)]);
  const deliveries = receivers.map((receiver, i) => ({
    receiver,
    path: paths[i]!,
    delayMs: pathDelay(paths[i]!),
    viaRp: true,
  }));
  return tree([toRp, ...receivers.map((r) => shortestPath(r, rp))], deliveries);
}

/** After every last-hop router switched: each receiver's shortest path from the source. */
export function viaSourceTree(rp: RouterId | null, receivers = RECEIVERS): TreeResult {
  const paths = receivers.map((r) => shortestPath(SOURCE_ROUTER, r));
  const deliveries = receivers.map((receiver, i) => ({
    receiver,
    path: paths[i]!,
    delayMs: pathDelay(paths[i]!),
    viaRp: rp !== null && paths[i]!.includes(rp),
  }));
  return tree(paths, deliveries);
}

/** SSM: receivers name the source, so the source tree is built at once and there is no RP. */
export function ssmTree(receivers = RECEIVERS): TreeResult {
  return viaSourceTree(null, receivers);
}

export type RpfMode =
  | { readonly tree: 'shared'; readonly rp: RouterId }
  | { readonly tree: 'source' };

export interface RpfResult {
  /** The neighbour towards the source (or the RP); null on that router itself. */
  readonly rpfNeighbour: RouterId | null;
  readonly accepted: boolean;
}

/** A router accepts a multicast packet only from its RPF neighbour. */
export function rpfCheck(router: RouterId, arrivedFrom: RouterId, mode: RpfMode): RpfResult {
  const target = mode.tree === 'shared' ? mode.rp : SOURCE_ROUTER;
  const rpfNeighbour = router === target ? null : shortestPath(router, target)[1]!;
  return { rpfNeighbour, accepted: rpfNeighbour === arrivedFrom };
}
