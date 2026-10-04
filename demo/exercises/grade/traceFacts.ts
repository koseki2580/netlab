/**
 * What the grader reads from a probe beyond `ProbeFacts` (see `probe.ts`,
 * which already reports both legs, the first drop, the request path, ACL
 * matches and NAT translations). Only what was missing lives here.
 */

import type { PacketTrace } from '../../../src/types/simulation';
import type { TopologySnapshot } from '../../../src/types/topology';
import type { CheckEvidence } from '../model/types';
import type { ProbeFacts } from './probe';

/** What the canvas calls a node; the id when the node is unknown or unlabelled. */
export function labelOf(topology: Pick<TopologySnapshot, 'nodes'>, nodeId: string): string {
  const label = topology.nodes.find((node) => node.id === nodeId)?.data.label;
  return typeof label === 'string' && label.length > 0 ? label : nodeId;
}

/** Where and why the probe stopped (if it did) and the way the request went. */
export function evidenceOf(
  facts: ProbeFacts,
  topology: Pick<TopologySnapshot, 'nodes'>,
): CheckEvidence {
  return {
    ...(facts.drop
      ? {
          nodeId: facts.drop.nodeId,
          nodeLabel: labelOf(topology, facts.drop.nodeId),
          dropReason: facts.drop.reason,
          dropLeg: facts.drop.leg,
        }
      : {}),
    path: facts.forwardNodeIds,
  };
}

/**
 * Whether `nodeId` rewrote the source address of the first packet of the
 * exchange and that packet reached its target. For a TCP probe that packet is
 * the SYN, which is all NAT can be judged on: the SYN-ACK never gets back
 * through NAT in this engine (engineContract fact 2). `facts.natTranslations`
 * is not used because it spans every packet of the exchange.
 */
export function sourceNatOnSyn(facts: ProbeFacts, nodeId: string): boolean {
  const syn = facts.traces[0];
  return (
    syn?.status === 'delivered' &&
    syn.hops.some((hop) => hop.nodeId === nodeId && hop.natTranslation?.type === 'snat')
  );
}

/**
 * The trace to replay for a result: the one in which the exchange stopped, so
 * a TCP probe that fails on its second packet shows that packet, not the SYN.
 */
export function stoppingTrace(facts: ProbeFacts): PacketTrace | null {
  return (
    facts.traces.find((trace) => trace.hops.some((hop) => hop.event === 'drop')) ?? facts.trace
  );
}
