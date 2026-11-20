/**
 * The MPLS traffic engineering lesson (REQ-404): RSVP-TE (RFC 3209) LSPs
 * placed by constrained shortest path first (CSPF), against plain IGP
 * shortest-path forwarding, and fast reroute with a facility-backup bypass
 * (RFC 4090).
 *
 * Simplified: six routers, links are treated as carrying traffic one way
 * (ingress A towards egress Z), one bandwidth pool per link, no priorities
 * or pre-emption, no affinities or explicit route objects. Ties between
 * equal-metric paths are broken by the routers' names so results are stable
 * (none occur with the lesson's numbers). The bypass reserves no bandwidth.
 * After a failure the head end re-places the affected LSPs in their original
 * order; real routers use make-before-break and timers.
 */
export type RouterId = 'A' | 'B' | 'C' | 'D' | 'E' | 'Z';

export interface Link {
  /** "X-Y", the two routers in name order. */
  readonly id: string;
  readonly a: RouterId;
  readonly b: RouterId;
  /** The IGP metric. */
  readonly metric: number;
  readonly capacityGbps: number;
}

const link = (a: RouterId, b: RouterId, metric: number, capacityGbps: number): Link => ({
  id: `${a}-${b}`,
  a,
  b,
  metric,
  capacityGbps,
});

export const INGRESS: RouterId = 'A';
export const EGRESS: RouterId = 'Z';

export const LINKS: readonly Link[] = [
  link('A', 'B', 10, 10),
  link('B', 'Z', 10, 10),
  link('A', 'C', 15, 10),
  link('C', 'Z', 15, 10),
  link('A', 'E', 20, 6),
  link('E', 'Z', 20, 6),
  link('B', 'D', 15, 10),
  link('D', 'Z', 20, 10),
];

export type LspId = 'lsp1' | 'lsp2' | 'lsp3';

export interface LspRequest {
  readonly id: LspId;
  readonly bandwidthGbps: number;
}

/** The three LSPs from A to Z, asked for in this order; the third one's size is the learner's. */
export function lspRequests(lsp3Gbps = 4): readonly LspRequest[] {
  return [
    { id: 'lsp1', bandwidthGbps: 6 },
    { id: 'lsp2', bandwidthGbps: 5 },
    { id: 'lsp3', bandwidthGbps: lsp3Gbps },
  ];
}

export interface Path {
  readonly routers: readonly RouterId[];
  readonly linkIds: readonly string[];
  readonly metric: number;
}

const other = (l: Link, r: RouterId): RouterId | null => (l.a === r ? l.b : l.b === r ? l.a : null);

/** Every loop-free path from `from` to `to` over the usable links, shortest first. */
export function allPaths(
  from: RouterId,
  to: RouterId,
  links: readonly Link[] = LINKS,
  usable: (l: Link) => boolean = () => true,
): readonly Path[] {
  const found: Path[] = [];
  const walk = (at: RouterId, routers: RouterId[], linkIds: string[], metric: number) => {
    if (at === to) {
      found.push({ routers: [...routers], linkIds: [...linkIds], metric });
      return;
    }
    for (const l of links) {
      const next = other(l, at);
      if (next === null || routers.includes(next) || !usable(l)) continue;
      walk(next, [...routers, next], [...linkIds, l.id], metric + l.metric);
    }
  };
  walk(from, [from], [], 0);
  return found.sort(
    (x, y) => x.metric - y.metric || x.routers.join('').localeCompare(y.routers.join('')),
  );
}

export function shortestPath(
  from: RouterId,
  to: RouterId,
  links: readonly Link[] = LINKS,
  usable: (l: Link) => boolean = () => true,
): Path | null {
  return allPaths(from, to, links, usable)[0] ?? null;
}

export type LinkGbps = Readonly<Record<string, number>>;

const zero = (links: readonly Link[]): Record<string, number> =>
  Object.fromEntries(links.map((l) => [l.id, 0]));

export interface IgpResult {
  readonly path: Path;
  /** Traffic offered to each link, Gbit/s. */
  readonly loadGbps: LinkGbps;
  /** The most overloaded link on the path. */
  readonly worstLink: {
    readonly id: string;
    readonly loadGbps: number;
    readonly capacityGbps: number;
  };
}

/** Without TE every flow follows the IGP shortest path, whatever it already carries. */
export function igpPlacement(
  requests: readonly LspRequest[],
  links: readonly Link[] = LINKS,
): IgpResult {
  const path = shortestPath(INGRESS, EGRESS, links)!;
  const load = zero(links);
  for (const r of requests) for (const id of path.linkIds) load[id] = load[id]! + r.bandwidthGbps;
  const onPath = links.filter((l) => path.linkIds.includes(l.id));
  const worst = onPath.reduce((w, l) =>
    load[l.id]! / l.capacityGbps > load[w.id]! / w.capacityGbps ? l : w,
  );
  return {
    path,
    loadGbps: load,
    worstLink: { id: worst.id, loadGbps: load[worst.id]!, capacityGbps: worst.capacityGbps },
  };
}

export interface Placement {
  readonly id: LspId;
  readonly bandwidthGbps: number;
  /** null: no path has enough unreserved bandwidth, so the LSP is refused. */
  readonly path: Path | null;
}

export interface CspfResult {
  readonly placements: readonly Placement[];
  /** Bandwidth reserved on each link, Gbit/s. */
  readonly reservedGbps: LinkGbps;
}

/**
 * CSPF, one LSP at a time in request order: prune the links whose unreserved
 * bandwidth is below the request, take the shortest remaining path, reserve.
 */
export function cspfPlacement(
  requests: readonly LspRequest[],
  links: readonly Link[] = LINKS,
  alreadyReserved: LinkGbps = zero(links),
): CspfResult {
  const reserved: Record<string, number> = { ...zero(links), ...alreadyReserved };
  const placements = requests.map((r): Placement => {
    const path = shortestPath(
      INGRESS,
      EGRESS,
      links,
      (l) => l.capacityGbps - reserved[l.id]! >= r.bandwidthGbps,
    );
    if (path) for (const id of path.linkIds) reserved[id] = reserved[id]! + r.bandwidthGbps;
    return { id: r.id, bandwidthGbps: r.bandwidthGbps, path };
  });
  return { placements, reservedGbps: reserved };
}

export function unreservedGbps(l: Link, reserved: LinkGbps): number {
  return l.capacityGbps - (reserved[l.id] ?? 0);
}

export interface FrrResult {
  readonly failedLinkId: string;
  /** The router just before the failed link (the point of local repair). */
  readonly plr: RouterId;
  /** The router just after it, where the bypass rejoins the LSPs. */
  readonly mergePoint: RouterId;
  /** LSPs whose path crossed the failed link. */
  readonly protectedIds: readonly LspId[];
  /** The pre-signalled bypass from PLR to merge point around the failed link. */
  readonly bypass: Path | null;
  /** Traffic each link carries while the bypass is in use (it reserves nothing), Gbit/s. */
  readonly bypassLoadGbps: LinkGbps;
  /** The head end's new placement of every LSP after it re-runs CSPF without the failed link. */
  readonly after: CspfResult;
}

export function fastReroute(
  requests: readonly LspRequest[],
  failedLinkId = 'B-Z',
  links: readonly Link[] = LINKS,
): FrrResult {
  const before = cspfPlacement(requests, links);
  const failed = links.find((l) => l.id === failedLinkId)!;
  const affected = before.placements.filter((p) => p.path?.linkIds.includes(failedLinkId));
  const sample = affected[0]?.path ?? shortestPath(INGRESS, EGRESS, links)!;
  const at = sample.linkIds.indexOf(failedLinkId);
  const plr = at >= 0 ? sample.routers[at]! : failed.a;
  const mergePoint = at >= 0 ? sample.routers[at + 1]! : failed.b;
  const bypass = shortestPath(plr, mergePoint, links, (l) => l.id !== failedLinkId);

  // While the bypass is in use, the protected traffic is on it; the rest stays put.
  const load = zero(links);
  for (const p of before.placements) {
    if (!p.path) continue;
    for (const id of p.path.linkIds) load[id] = load[id]! + p.bandwidthGbps;
    if (affected.includes(p) && bypass) {
      load[failedLinkId] = load[failedLinkId]! - p.bandwidthGbps;
      for (const id of bypass.linkIds) load[id] = load[id]! + p.bandwidthGbps;
    }
  }

  // The head end keeps the unaffected LSPs' reservations and re-places the rest.
  const remaining = links.filter((l) => l.id !== failedLinkId);
  const kept = zero(remaining);
  for (const p of before.placements)
    if (p.path && !affected.includes(p))
      for (const id of p.path.linkIds) kept[id] = kept[id]! + p.bandwidthGbps;
  const replaced = cspfPlacement(
    affected.map((p) => ({ id: p.id, bandwidthGbps: p.bandwidthGbps })),
    remaining,
    kept,
  );
  const placements = before.placements.map((p) =>
    affected.includes(p) ? replaced.placements.find((q) => q.id === p.id)! : p,
  );
  return {
    failedLinkId,
    plr,
    mergePoint,
    protectedIds: affected.map((p) => p.id),
    bypass,
    bypassLoadGbps: load,
    after: { placements, reservedGbps: replaced.reservedGbps },
  };
}

/** Typical figures, not guarantees: FRR switches in tens of ms; the head end re-signals in about a second or more. */
export const FRR_SWITCH_MS = 50;
