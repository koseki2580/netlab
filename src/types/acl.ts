export type AclAction = 'permit' | 'deny';
export type AclProtocol = 'tcp' | 'udp' | 'icmp' | 'any';
export type ConnState = 'new' | 'established';

export interface AclPortRange {
  from: number;
  to: number;
}

export interface AclRule {
  id: string;
  priority: number;
  action: AclAction;
  protocol: AclProtocol;
  srcIp?: string;
  dstIp?: string;
  srcPort?: number | AclPortRange;
  dstPort?: number | AclPortRange;
  description?: string;
}

export interface AclMatchInfo {
  direction: 'inbound' | 'outbound';
  interfaceId: string;
  interfaceName: string;
  matchedRule: AclRule | null;
  action: AclAction;
  byConnTrack: boolean;
}

export interface ConnTrackEntry {
  id: string;
  proto: 'tcp' | 'udp';
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  state: ConnState;
  createdAt: number;
  lastSeenAt: number;
}

export interface ConnTrackTable {
  routerId: string;
  entries: ConnTrackEntry[];
}
