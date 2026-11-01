import { describe, expect, it } from 'vitest';
import type { PacketHop } from '../../../types/simulation';
import { parseTraceFilter } from './parser';

const udpHop = (srcPort: number, dstPort: number, label: string): PacketHop => ({
  step: 0,
  nodeId: label,
  nodeLabel: label,
  srcIp: '192.168.1.20',
  dstIp: '192.168.1.53',
  ttl: 64,
  protocol: 'UDP',
  srcPort,
  dstPort,
  event: 'forward',
  timestamp: 1,
});

const HOPS = {
  dnsQuery: udpHop(49152, 53, 'dns-query'),
  dnsResponse: udpHop(53, 49152, 'dns-response'),
  dhcpDiscover: udpHop(68, 67, 'dhcp-discover'),
  icmp: {
    ...udpHop(0, 0, 'icmp'),
    protocol: 'ICMP',
    srcPort: undefined,
    dstPort: undefined,
  } as unknown as PacketHop,
};

function kept(filter: string): string[] {
  const parsed = parseTraceFilter(filter);
  if (!parsed.ok) throw parsed.error;
  return Object.entries(HOPS)
    .filter(([, hop]) => parsed.predicate(hop))
    .map(([name]) => name);
}

describe('trace filter on DNS (TC-1027)', () => {
  it('keeps exactly the DNS hops for protocol == dns and drops them for !=', () => {
    expect(kept('protocol == dns')).toEqual(['dnsQuery', 'dnsResponse']);
    expect(kept('protocol != dns')).toEqual(['dhcpDiscover', 'icmp']);
  });

  it('keeps what it kept before for protocol == udp', () => {
    expect(kept('protocol == udp')).toEqual(['dnsQuery', 'dnsResponse', 'dhcpDiscover']);
    expect(kept('protocol != udp')).toEqual(['icmp']);
  });
});
