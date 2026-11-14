import type { PacketTrace } from '../../types/simulation';

/**
 * The sender's address and port as they reached `receiverNodeId`: after any
 * NAT on the way (RFC 3022 §2.2). A reply is addressed to these.
 */
export function peerSeenBy(
  trace: PacketTrace,
  receiverNodeId: string,
): { ip: string; port: number } | null {
  const arrived = trace.hops.find(
    (hop) => hop.nodeId === receiverNodeId && hop.event === 'deliver',
  );
  return arrived && arrived.srcPort !== undefined
    ? { ip: arrived.srcIp, port: arrived.srcPort }
    : null;
}
