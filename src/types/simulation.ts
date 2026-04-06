export interface RoutingCandidate {
  destination: string;     // CIDR
  nextHop: string;         // IP or 'direct'
  metric: number;
  protocol: string;        // 'static'|'ospf'|'rip'|'bgp' — extensible
  adminDistance: number;
  matched: boolean;        // isInSubnet(dstIp, destination)
  selectedByLpm: boolean;  // the single LPM winner
}

export interface RoutingDecision {
  dstIp: string;
  candidates: RoutingCandidate[];  // all routes sorted by prefix length desc
  winner: RoutingCandidate | null; // null = no matching route
  explanation: string;             // e.g. "Matched 10.0.0.0/24 via direct (static, AD=1)"
}

export interface PacketHop {
  step: number;
  nodeId: string;
  nodeLabel: string;
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: string;         // 'TCP' | 'UDP' | 'ICMP' | '<number>'
  event: 'create' | 'forward' | 'deliver' | 'drop';
  fromNodeId?: string;      // absent on step 0 (create)
  toNodeId?: string;        // absent on deliver / drop
  activeEdgeId?: string;    // ReactFlow edge.id to highlight; absent on deliver / drop
  reason?: string;          // populated only when event === 'drop'
  routingDecision?: RoutingDecision;  // present only when nodeId is a router, never on TTL drops
  timestamp: number;
}

export interface PacketTrace {
  packetId: string;
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
}
