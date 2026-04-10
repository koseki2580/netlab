import type { AclMatchInfo, ConnTrackTable } from './acl';
import type { NatTable } from './nat';

export interface RoutingCandidate {
  destination: string;     // CIDR
  nextHop: string;         // IP or 'direct'
  metric: number;
  protocol: string;        // 'static'|'ospf'|'rip'|'bgp' — extensible
  adminDistance: number;
  matched: boolean;        // isInSubnet(dstIp, destination)
  selectedByLpm: boolean;  // the single LPM winner
  selectedByFailover?: boolean; // chosen after the LPM winner was unreachable
}

export interface RoutingDecision {
  dstIp: string;
  candidates: RoutingCandidate[];  // all routes sorted by prefix length desc
  winner: RoutingCandidate | null; // null = no matching route
  explanation: string;             // e.g. "Matched 10.0.0.0/24 via direct (static, AD=1)"
}

export interface NatTranslation {
  type: 'snat' | 'dnat';
  preSrcIp: string;
  preSrcPort: number;
  postSrcIp: string;
  postSrcPort: number;
  preDstIp: string;
  preDstPort: number;
  postDstIp: string;
  postDstPort: number;
}

export interface PacketHop {
  step: number;
  nodeId: string;
  nodeLabel: string;
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: string;         // 'TCP' | 'UDP' | 'ICMP' | '<number>'
  event: 'create' | 'forward' | 'deliver' | 'drop' | 'arp-request' | 'arp-reply';
  fromNodeId?: string;      // absent on step 0 (create)
  toNodeId?: string;        // absent on deliver / drop
  activeEdgeId?: string;    // ReactFlow edge.id to highlight; absent on deliver / drop
  ingressInterfaceId?: string;
  ingressInterfaceName?: string;
  egressInterfaceId?: string;
  egressInterfaceName?: string;
  arpFrame?: import('./packets').ArpEthernetFrame;
  reason?: string;          // known values include node-down, interface-down, no-route, ttl-exceeded
  routingDecision?: RoutingDecision;  // present only when nodeId is a router, never on TTL drops
  natTranslation?: NatTranslation;
  aclMatch?: AclMatchInfo;
  changedFields?: string[];
  timestamp: number;
}

export interface PacketTrace {
  packetId: string;
  sessionId?: string;
  label?: string;
  srcNodeId: string;
  dstNodeId: string;
  hops: PacketHop[];
  status: 'in-flight' | 'delivered' | 'dropped';
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'done';

export interface SimulationState {
  status: SimulationStatus;
  traces: PacketTrace[];
  currentTraceId: string | null;
  currentStep: number;      // -1 = trace loaded but playback not started
  activeEdgeIds: string[];  // edge IDs to highlight in the canvas
  selectedHop: PacketHop | null;
  selectedPacket: import('./packets').InFlightPacket | null;  // packet snapshot at selectedHop
  nodeArpTables: Record<string, Record<string, string>>;
  natTables: NatTable[];
  connTrackTables: ConnTrackTable[];
}
