import { describe, expect, it } from 'vitest';
import type { InFlightPacket } from '../types/packets';
import { isDnsMessage, isUdpDatagram } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { buildDnsQuery } from './DnsClient';
import { handleDnsQuery } from './DnsServer';

/** Extract DNS payload from an InFlightPacket, or null. */
function extractDns(pkt: InFlightPacket | null) {
  if (!pkt) return null;
  const l4 = pkt.frame.payload.payload;
  if (isUdpDatagram(l4) && isDnsMessage(l4.payload)) return l4.payload;
  return null;
}

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '192.168.1.101' },
    },
    {
      id: 'dns-server',
      type: 'server',
      position: { x: 200, y: 0 },
      data: {
        label: 'DNS Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.53',
        dnsServer: {
          zones: [{ name: 'web.example.com', address: '192.168.1.10' }],
        },
      },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'dns-server' }],
  areas: [],
  routeTables: new Map(),
};

describe('DnsServer', () => {
  it('returns a response when the A record exists', () => {
    const query = buildDnsQuery('client-1', 'web.example.com', TOPOLOGY, new Map())!;
    const response = handleDnsQuery(query, TOPOLOGY);
    const payload = extractDns(response ?? null);

    expect(response).not.toBeNull();
    expect(payload?.answers[0]?.address).toBe('192.168.1.10');
  });

  it('returns null for an unknown hostname', () => {
    const query = buildDnsQuery('client-1', 'unknown.example.com', TOPOLOGY, new Map())!;
    expect(handleDnsQuery(query, TOPOLOGY)).toBeNull();
  });
});
