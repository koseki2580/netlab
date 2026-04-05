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
