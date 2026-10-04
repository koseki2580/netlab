/**
 * Run one probe on a prepared topology and report what happened as facts.
 *
 * A fresh engine is built for every probe and disposed afterwards: engines
 * keep ARP caches, NAT tables and connection tracking between packets, and a
 * grade must not depend on the order of its checks.
 */

import { HookEngine } from '../../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../../src/simulation/worker/MainThreadEngine';
import type { AclMatchInfo } from '../../../src/types/acl';
import type { NatTranslation, PacketHop, PacketTrace } from '../../../src/types/simulation';
import type { NetworkTopology } from '../../../src/types/topology';
import type { Probe } from '../model/types';

export interface ProbeDrop {
  readonly nodeId: string;
  /** The engine's reason, verbatim. Empty when the engine gave none. */
  readonly reason: string;
  /** `request` = on the way there, `reply` = on the way back. */
  readonly leg: 'request' | 'reply';
}

export interface ProbeFacts {
  /**
   * `delivered`: the whole exchange worked (ping: the reply came back; tcp: the
   * handshake completed). `no-address`: an end has no address, nothing was sent.
   * `engine-error`: the engine threw; see `error`.
   */
  readonly status: 'delivered' | 'dropped' | 'no-address' | 'engine-error';
  readonly delivered: boolean;
  /** The request reached its destination, whatever happened to the reply. */
  readonly requestDelivered: boolean;
  /** The first drop, or null. */
  readonly drop: ProbeDrop | null;
  /** Nodes the request visited, in order, up to and including the first `deliver`. */
  readonly forwardNodeIds: readonly string[];
  /** Edges the request crossed, in order. */
  readonly forwardEdgeIds: readonly string[];
  readonly aclMatches: readonly (AclMatchInfo & { readonly nodeId: string })[];
  readonly natTranslations: readonly (NatTranslation & { readonly nodeId: string })[];
  /** Ping: the merged request+reply trace. TCP: the SYN trace. Null if nothing was sent. */
  readonly trace: PacketTrace | null;
  /** Every trace of the exchange (TCP: SYN, SYN-ACK, ACK as far as it got). */
  readonly traces: readonly PacketTrace[];
  readonly error?: string;
}

const DEFAULT_SRC_PORT = 49152;

/** The address a probe uses for a node: a host's `ip`, else a router's first interface. */
export function addressOf(topology: NetworkTopology, nodeId: string): string | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (typeof node.data.ip === 'string' && node.data.ip.length > 0) return node.data.ip;
  const first = node.data.interfaces?.[0]?.ipAddress;
  return first !== undefined && first.length > 0 ? first : null;
}

function nothingSent(status: 'no-address' | 'engine-error', error?: string): ProbeFacts {
  return {
    status,
    delivered: false,
    requestDelivered: false,
    drop: null,
    forwardNodeIds: [],
    forwardEdgeIds: [],
    aclMatches: [],
    natTranslations: [],
    trace: null,
    traces: [],
    ...(error !== undefined ? { error } : {}),
  };
}

/** Read the facts out of the hops of one exchange. Exported for the grader's trace replay. */
export function readFacts(traces: readonly PacketTrace[], delivered: boolean): ProbeFacts {
  const hops: PacketHop[] = traces.flatMap((trace) => trace.hops);
  const firstDeliver = hops.findIndex((hop) => hop.event === 'deliver');
  const firstDrop = hops.findIndex((hop) => hop.event === 'drop');
  const requestDelivered = firstDeliver !== -1 && (firstDrop === -1 || firstDeliver < firstDrop);
  const forward = hops
    .slice(0, requestDelivered ? firstDeliver + 1 : firstDrop === -1 ? hops.length : firstDrop + 1)
    .filter((hop) => hop.event !== 'arp-request' && hop.event !== 'arp-reply');

  const forwardNodeIds: string[] = [];
  const forwardEdgeIds: string[] = [];
  for (const hop of forward) {
    if (forwardNodeIds[forwardNodeIds.length - 1] !== hop.nodeId) forwardNodeIds.push(hop.nodeId);
    if (
      hop.activeEdgeId !== undefined &&
      forwardEdgeIds[forwardEdgeIds.length - 1] !== hop.activeEdgeId
    ) {
      forwardEdgeIds.push(hop.activeEdgeId);
    }
  }

  const dropHop = firstDrop === -1 ? undefined : hops[firstDrop];
  return {
    status: delivered ? 'delivered' : 'dropped',
    delivered,
    requestDelivered,
    drop: dropHop
      ? {
          nodeId: dropHop.nodeId,
          reason: dropHop.reason ?? '',
          leg: requestDelivered ? 'reply' : 'request',
        }
      : null,
    forwardNodeIds,
    forwardEdgeIds,
    aclMatches: hops.flatMap((hop) =>
      hop.aclMatch ? [{ ...hop.aclMatch, nodeId: hop.nodeId }] : [],
    ),
    natTranslations: hops.flatMap((hop) =>
      hop.natTranslation ? [{ ...hop.natTranslation, nodeId: hop.nodeId }] : [],
    ),
    trace: traces[0] ?? null,
    traces,
  };
}

/** Never throws and never rejects. */
export async function runProbe(prepared: NetworkTopology, probe: Probe): Promise<ProbeFacts> {
  const srcIp = addressOf(prepared, probe.from);
  const dstIp =
    probe.via === 'ping' && probe.toIp !== undefined ? probe.toIp : addressOf(prepared, probe.to);
  if (srcIp === null || dstIp === null) return nothingSent('no-address');

  let engine: MainThreadEngine | null = null;
  try {
    engine = new MainThreadEngine(prepared, new HookEngine());
    if (probe.via === 'ping') {
      const trace = await engine.ping(probe.from, dstIp);
      return readFacts([trace], trace.status === 'delivered');
    }
    const result = await engine.tcpConnect(
      probe.from,
      probe.to,
      probe.srcPort ?? DEFAULT_SRC_PORT,
      probe.dstPort,
    );
    return readFacts(result.traces, result.success);
  } catch (error) {
    return nothingSent('engine-error', error instanceof Error ? error.message : String(error));
  } finally {
    try {
      engine?.dispose();
    } catch {
      // Disposal must not turn a finished probe into a failure.
    }
  }
}
