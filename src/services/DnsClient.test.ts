import { describe, expect, it } from 'vitest';
import { buildDnsQuery, handleDnsResponse } from './DnsClient';
import type { InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';

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

function makeResponse(): InFlightPacket {
  return {
    id: 'dns-response-1',
    srcNodeId: 'dns-server',
    dstNodeId: 'client-1',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '192.168.1.53',
        dstIp: '192.168.1.101',
        ttl: 64,
        protocol: 17,
        payload: {
          layer: 'L4',
          srcPort: 53,
          dstPort: 50000,
          payload: {
            layer: 'L7',
            transactionId: 1,
            isResponse: true,
            questions: [{ name: 'web.example.com', type: 'A' }],
            answers: [{ name: 'web.example.com', type: 'A', ttl: 300, address: '192.168.1.10' }],
          },
        },
      },
    },
    currentDeviceId: 'dns-server',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

describe('DnsClient', () => {
  it('prefers the runtime IP over static node data when building a query', () => {
    const query = buildDnsQuery(
      'client-1',
      'web.example.com',
      TOPOLOGY,
      new Map([['client-1', '192.168.1.150']]),
    );

    expect(query?.frame.payload.srcIp).toBe('192.168.1.150');
    expect(query?.frame.payload.dstIp).toBe('192.168.1.53');
  });

  it('extracts the first answer from a DNS response', () => {
    expect(handleDnsResponse(makeResponse())).toEqual({
      hostname: 'web.example.com',
      address: '192.168.1.10',
      ttl: 300,
    });
  });
});
