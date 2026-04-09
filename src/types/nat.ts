export type NatType = 'snat' | 'dnat';

export interface NatEntry {
  id: string;
  proto: 'tcp' | 'udp';
  type: NatType;
  insideLocalIp: string;
  insideLocalPort: number;
  insideGlobalIp: string;
  insideGlobalPort: number;
  outsidePeerIp: string;
  outsidePeerPort: number;
  createdAt: number;
  lastSeenAt: number;
}

export interface NatTable {
  routerId: string;
  entries: NatEntry[];
}
