export interface DhcpServerConfig {
  leasePool: string;
  subnetMask: string;
  defaultGateway: string;
  dnsServer?: string;
  leaseTime: number;
}

export interface DhcpClientConfig {
  enabled: boolean;
}

export interface DnsZoneEntry {
  name: string;
  address: string;
}

export interface DnsServerConfig {
  zones: DnsZoneEntry[];
}

export interface DhcpLeaseState {
  status: 'init' | 'selecting' | 'requesting' | 'bound';
  transactionId: number;
  offeredIp?: string;
  serverIp?: string;
  assignedIp?: string;
  subnetMask?: string;
  defaultGateway?: string;
  dnsServerIp?: string;
}

export interface DnsCacheEntry {
  address: string;
  ttl: number;
  resolvedAt: number;
}

export type DnsCache = Record<string, DnsCacheEntry>;
