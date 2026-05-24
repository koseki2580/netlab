import type { RouteEntry } from '../types/routing';
import type { PacketTrace } from '../types/simulation';

/**
 * M3 — per-step state snapshots.
 *
 * The simulator replays one packet trace hop by hop. Routes are topology-derived
 * (static across hops); ARP and MAC are the tables that genuinely evolve — entries
 * are learned as the packet traverses hops (ARP from ARP frames, MAC from the source
 * MAC observed on each ingress port). {@link buildStepSnapshots} reconstructs, for
 * every hop step, each node's route table plus the ARP and MAC entries it has learned
 * through that step.
 */

export interface RouteRow {
  dst: string;
  via: string;
  proto: string;
  metric: number;
  ad: number;
}

export interface ArpRow {
  ip: string;
  mac: string;
}

export interface MacRow {
  mac: string;
  port: string;
}

export interface NodeStepState {
  routes: RouteRow[];
  arp: ArpRow[];
  mac: MacRow[];
}

/** step index → (nodeId → state at that step). */
export type StepSnapshots = Map<number, Record<string, NodeStepState>>;

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface RouteDiffRow extends RouteRow {
  status: DiffStatus;
  from?: { metric: number; via: string };
}

export interface ArpDiffRow extends ArpRow {
  status: DiffStatus;
  from?: { mac: string };
}

export interface MacDiffRow extends MacRow {
  status: DiffStatus;
  from?: { port: string };
}

function routeRows(
  routeTable: ReadonlyMap<string, readonly RouteEntry[]>,
  nodeId: string,
): RouteRow[] {
  return (routeTable.get(nodeId) ?? []).map((r) => ({
    dst: r.destination,
    via: r.nextHop,
    proto: r.protocol,
    metric: r.metric,
    ad: r.adminDistance,
  }));
}

/**
 * Build per-step snapshots from a committed trace and the (static) route table.
 * ARP for a node at step N is every binding it observed in hops `0..N`.
 */
export function buildStepSnapshots(
  trace: PacketTrace,
  routeTable: ReadonlyMap<string, readonly RouteEntry[]>,
): StepSnapshots {
  const snapshots: StepSnapshots = new Map();
  const arpByNode = new Map<string, Map<string, string>>();
  const macByNode = new Map<string, Map<string, string>>();
  const nodeIds = new Set<string>(routeTable.keys());
  for (const hop of trace.hops) nodeIds.add(hop.nodeId);

  trace.hops.forEach((hop, step) => {
    const arp = hop.arpFrame?.payload;
    if (arp?.senderIp && arp.senderMac) {
      const learned = arpByNode.get(hop.nodeId) ?? new Map<string, string>();
      learned.set(arp.senderIp, arp.senderMac);
      arpByNode.set(hop.nodeId, learned);
    }

    // MAC learning: a node maps the source MAC to the port it arrived on.
    const ingressPort = hop.ingressInterfaceName ?? hop.ingressInterfaceId;
    if (hop.srcMac && ingressPort) {
      const learned = macByNode.get(hop.nodeId) ?? new Map<string, string>();
      learned.set(hop.srcMac, ingressPort);
      macByNode.set(hop.nodeId, learned);
    }

    const perNode: Record<string, NodeStepState> = {};
    for (const nodeId of nodeIds) {
      perNode[nodeId] = {
        routes: routeRows(routeTable, nodeId),
        arp: [...(arpByNode.get(nodeId) ?? new Map()).entries()]
          .map(([ip, mac]) => ({ ip, mac }))
          .sort((a, b) => a.ip.localeCompare(b.ip)),
        mac: [...(macByNode.get(nodeId) ?? new Map()).entries()]
          .map(([mac, port]) => ({ mac, port }))
          .sort((a, b) => a.mac.localeCompare(b.mac)),
      };
    }
    snapshots.set(step, perNode);
  });

  return snapshots;
}

const STATUS_ORDER: Record<DiffStatus, number> = {
  added: 0,
  changed: 1,
  unchanged: 2,
  removed: 3,
};

/** Diff two route-row sets, keyed by destination + protocol. Pure. */
export function diffRoutes(prev: readonly RouteRow[], next: readonly RouteRow[]): RouteDiffRow[] {
  const key = (r: RouteRow) => `${r.dst}|${r.proto}`;
  const prevMap = new Map(prev.map((r) => [key(r), r]));
  const rows: RouteDiffRow[] = [];
  for (const r of next) {
    const p = prevMap.get(key(r));
    if (!p) rows.push({ ...r, status: 'added' });
    else if (r.metric !== p.metric || r.via !== p.via)
      rows.push({ ...r, status: 'changed', from: { metric: p.metric, via: p.via } });
    else rows.push({ ...r, status: 'unchanged' });
  }
  const nextKeys = new Set(next.map(key));
  for (const p of prev) {
    if (!nextKeys.has(key(p))) rows.push({ ...p, status: 'removed' });
  }
  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

/** Diff two ARP-row sets, keyed by IP. Pure. */
export function diffArp(prev: readonly ArpRow[], next: readonly ArpRow[]): ArpDiffRow[] {
  const prevMap = new Map(prev.map((r) => [r.ip, r]));
  const rows: ArpDiffRow[] = [];
  for (const r of next) {
    const p = prevMap.get(r.ip);
    if (!p) rows.push({ ...r, status: 'added' });
    else if (r.mac !== p.mac) rows.push({ ...r, status: 'changed', from: { mac: p.mac } });
    else rows.push({ ...r, status: 'unchanged' });
  }
  const nextIps = new Set(next.map((r) => r.ip));
  for (const p of prev) {
    if (!nextIps.has(p.ip)) rows.push({ ...p, status: 'removed' });
  }
  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

/** Diff two MAC-row sets, keyed by MAC address. Pure. */
export function diffMac(prev: readonly MacRow[], next: readonly MacRow[]): MacDiffRow[] {
  const prevMap = new Map(prev.map((r) => [r.mac, r]));
  const rows: MacDiffRow[] = [];
  for (const r of next) {
    const p = prevMap.get(r.mac);
    if (!p) rows.push({ ...r, status: 'added' });
    else if (r.port !== p.port) rows.push({ ...r, status: 'changed', from: { port: p.port } });
    else rows.push({ ...r, status: 'unchanged' });
  }
  const nextMacs = new Set(next.map((r) => r.mac));
  for (const p of prev) {
    if (!nextMacs.has(p.mac)) rows.push({ ...p, status: 'removed' });
  }
  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}
