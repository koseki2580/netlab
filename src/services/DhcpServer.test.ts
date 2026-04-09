import { describe, expect, it } from 'vitest';
import { buildDiscover, handleOffer } from './DhcpClient';
import { handleDiscover, handleRequest, LeaseAllocator } from './DhcpServer';
import type { NetworkTopology } from '../types/topology';
import type { InFlightPacket } from '../types/packets';

const SERVER_CONFIG = {
  leasePool: '192.168.1.100/30',
  subnetMask: '255.255.255.0',
  defaultGateway: '192.168.1.1',
  dnsServer: '192.168.1.53',
  leaseTime: 86400,
} as const;

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', dhcpClient: { enabled: true } },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 200, y: 0 },
      data: {
        label: 'DHCP Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.1',
        dhcpServer: SERVER_CONFIG,
      },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'dhcp-server' }],
  areas: [],
  routeTables: new Map(),
};

describe('DhcpServer', () => {
  it('builds an OFFER from a DISCOVER using the first usable lease address', () => {
    const discover = buildDiscover('client-1', TOPOLOGY)!;
    const allocator = new LeaseAllocator(SERVER_CONFIG);

    const offer = handleDiscover(discover, TOPOLOGY, allocator);
    const transport = offer?.frame.payload.payload;
    const payload = offer ? ((offer.frame.payload.payload as InFlightPacket['frame']['payload']['payload'] & { payload: unknown }).payload as any) : null;

    expect(offer).not.toBeNull();
    expect(transport && 'srcPort' in transport ? transport.srcPort : null).toBe(67);
    expect(transport && 'dstPort' in transport ? transport.dstPort : null).toBe(68);
    expect(payload?.messageType).toBe('OFFER');
    expect(payload?.offeredIp).toBe('192.168.1.101');
  });

  it('builds an ACK after a valid REQUEST', () => {
    const discover = buildDiscover('client-1', TOPOLOGY)!;
    const allocator = new LeaseAllocator(SERVER_CONFIG);
    const offer = handleDiscover(discover, TOPOLOGY, allocator)!;
    const request = handleOffer(offer, 'client-1', TOPOLOGY);

    const ack = handleRequest(request, TOPOLOGY, allocator);
    const payload = ack ? ((ack.frame.payload.payload as InFlightPacket['frame']['payload']['payload'] & { payload: unknown }).payload as any) : null;

    expect(ack).not.toBeNull();
    expect(payload?.messageType).toBe('ACK');
    expect(payload?.offeredIp).toBe('192.168.1.101');
  });

  it('returns a NAK for an unknown transaction id', () => {
    const discover = buildDiscover('client-1', TOPOLOGY)!;
    const allocator = new LeaseAllocator(SERVER_CONFIG);
    const offer = handleDiscover(discover, TOPOLOGY, allocator)!;
    const request = handleOffer(offer, 'client-1', TOPOLOGY);
    const tamperedRequest = JSON.parse(JSON.stringify(request)) as InFlightPacket;
    ((tamperedRequest.frame.payload.payload as InFlightPacket['frame']['payload']['payload'] & { payload: unknown }).payload as any).transactionId = 99999;

    const nak = handleRequest(tamperedRequest, TOPOLOGY, allocator);
    const payload = nak ? ((nak.frame.payload.payload as InFlightPacket['frame']['payload']['payload'] & { payload: unknown }).payload as any) : null;

    expect(nak).not.toBeNull();
    expect(payload?.messageType).toBe('NAK');
  });
});
