import type { DnsRecord } from './packets';
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
  /** A records answered with TTL 300, as before (no SOA: nothing is authoritative). */
  zones: DnsZoneEntry[];
  /** Records of any type; an SOA makes the server authoritative for its name. */
  records?: DnsRecord[];
  /** A recursive resolver: it walks from these root servers' addresses. */
  recursive?: { rootServers: string[] };
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
