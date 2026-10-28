import type { AclMatchInfo, ConnTrackTable } from './acl';
import type { LinkQosTrace } from './link';
import type { NatTable } from './nat';
import type { TlsAnnotation } from './tls';

export interface Neighbor {
  nodeId: string;
  edgeId: string;
}

export interface RoutingCandidate {
  destination: string; // CIDR
  nextHop: string; // IP or 'direct'
  metric: number;
  protocol: string; // 'static'|'ospf'|'rip'|'bgp' — extensible
  adminDistance: number;
  matched: boolean; // isInSubnet(dstIp, destination)
  selectedByLpm: boolean; // the single LPM winner
  selectedByFailover?: boolean; // chosen after the LPM winner was unreachable
}

export interface RoutingDecision {
  dstIp: string;
  candidates: RoutingCandidate[]; // all routes sorted by prefix length desc
  winner: RoutingCandidate | null; // null = no matching route
  explanation: string; // e.g. "Matched 10.0.0.0/24 via direct (static, AD=1)"
}

export interface EcmpTrace {
  routerId: string;
  flowHash: number;
  bucket: number;
  candidateCount: number;
  chosen: {
    nextHop: string;
    outIfId?: string;
  };
}

export interface ShaperTrace {
  readonly edgeId: string;
  readonly classId: string;
  readonly dscp: number;
  readonly segSeq: number;
  readonly queueDepth: number;
  readonly deficit?: number;
  readonly reason?: string;
}

export type ObservabilityTrace =
  | {
      readonly kind: 'netflow:flow-update';
      readonly routerId: string;
      readonly flowKey: string;
      readonly packets: number;
      readonly bytes: number;
    }
  | {
      readonly kind: 'netflow:flow-export';
      readonly routerId: string;
      readonly flowKey: string;
      readonly reason: string;
    }
  | {
      readonly kind: 'sflow:sampled';
      readonly switchId: string;
      readonly portId: string;
      readonly sequence: number;
    }
  | {
      readonly kind: 'sflow:dropped';
      readonly switchId: string;
      readonly portId: string;
      readonly reason: 'collector-full';
    };

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

/** What became of one copy of a frame a switch sent out of a port. */
export interface FloodCopy {
  /** The device that sent the copy. */
  fromNodeId: string;
  /** The device the copy reached. */
  toNodeId: string;
  edgeId: string;
  /** The port it left by. */
  egressPort: string;
  /**
   * `discarded`: a host or router took it and threw it away (`reason`
   * `not-for-me`). `flooded`: a switch copied it on; its copies follow in the
   * list. `forwarded`: a switch sent it on by a port it had learned.
   * `dropped`: a switch could not send it on (`reason` says why).
   */
  outcome: 'discarded' | 'flooded' | 'forwarded' | 'dropped';
  reason?: string;
}

/** The copies of a frame a switch made at this hop, besides the one the trace follows. */
export interface HopFlood {
  copies: FloodCopy[];
}

export interface PacketHop {
  traceEventId?: string;
  step: number;
  nodeId: string;
  /** Set on the hop of a switch that copied the frame out of other ports too. */
  flood?: HopFlood;
  nodeLabel: string;
  srcIp: string;
  dstIp: string;
  srcMac?: string;
  dstMac?: string;
  ttl: number;
  protocol: string; // 'TCP' | 'UDP' | 'ICMP' | '<number>'
  srcPort?: number; // present for TCP and UDP payloads
  dstPort?: number; // present for TCP and UDP payloads
  event: 'create' | 'forward' | 'deliver' | 'drop' | 'arp-request' | 'arp-reply';
  fromNodeId?: string; // absent on step 0 (create)
  toNodeId?: string; // absent on deliver / drop
  activeEdgeId?: string; // ReactFlow edge.id to highlight; absent on deliver / drop
  ingressInterfaceId?: string;
  ingressInterfaceName?: string;
  egressInterfaceId?: string;
  egressInterfaceName?: string;
  arpFrame?: import('./packets').ArpEthernetFrame;
  reason?: string; // known values include node-down, interface-down, no-route, ttl-exceeded
  action?:
    | 'fragment'
    | 'reassembly-pending'
    | 'reassembly-complete'
    | `IGMP ${string}`
    | 'ecmp:bucketed'
    | `shaper:${string}`
    | `netflow:${string}`
    | `sflow:${string}`
    | `tls:${string}`
    | `link:${string}`;
  ecmpTrace?: EcmpTrace;
  shaperTrace?: ShaperTrace;
  observabilityTrace?: ObservabilityTrace;
  tlsTrace?: TlsAnnotation;
  linkQos?: LinkQosTrace;
  fragmentIndex?: number;
  fragmentCount?: number;
  identification?: number;
  nextHopMtu?: number;
  routingDecision?: RoutingDecision; // present only when nodeId is a router, never on TTL drops
  natTranslation?: NatTranslation;
  aclMatch?: AclMatchInfo;
  icmpGenerated?: boolean;
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
export type HighlightMode = 'hop' | 'path';

export interface SimulationState {
  status: SimulationStatus;
  traces: PacketTrace[];
  currentTraceId: string | null;
  currentStep: number; // -1 = trace loaded but playback not started
  activeEdgeIds: string[]; // edge IDs to highlight in the canvas
  activePathEdgeIds: string[]; // selected trace path across all hops
  highlightMode: HighlightMode;
  traceColors: Record<string, string>;
  selectedHop: PacketHop | null;
  selectedPacket: import('./packets').InFlightPacket | null; // packet snapshot at selectedHop
  nodeArpTables: Record<string, Record<string, string>>;
  natTables: NatTable[];
  connTrackTables: ConnTrackTable[];
}
