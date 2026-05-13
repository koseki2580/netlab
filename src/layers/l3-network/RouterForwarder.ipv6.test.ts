import { describe, expect, it } from 'vitest';
import { RouterForwarder } from './RouterForwarder';
import type { ForwardContext } from '../../types/layers';
import { isIpv6Packet, type InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';

function packet(): InFlightPacket {
  return {
    id: 'ipv6-1',
    srcNodeId: 'host-a',
    dstNodeId: 'host-b',
    currentDeviceId: 'r1',
    ingressPortId: 'eth0',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '02:00:00:00:00:0a',
      dstMac: '02:00:00:00:00:01',
      etherType: 0x86dd,
      payload: {
        layer: 'L3',
        version: 6,
        srcIp: '2001:db8:1::10',
        dstIp: '2001:db8:2::20',
        ttl: 64,
        hopLimit: 64,
        protocol: 58,
        nextHeader: 58,
        payload: { layer: 'L4', type: 128, code: 0, checksum: 0 },
      },
    },
  };
}

function topology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'r1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R1',
          layerId: 'l3',
          role: 'router',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:1::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:00:01',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:2::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:00:02',
            },
          ],
        },
      },
      {
        id: 'host-b',
        type: 'server',
        position: { x: 100, y: 0 },
        data: {
          label: 'B',
          layerId: 'l7',
          role: 'server',
          ip: '10.0.2.20',
          ipv6: '2001:db8:2::20',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [{ id: 'e-r1-b', source: 'r1', target: 'host-b', sourceHandle: 'eth1' }],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          {
            destination: '2001:db8:2::/64',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 1,
            nodeId: 'r1',
          },
        ],
      ],
    ]),
  };
}

describe('RouterForwarder IPv6', () => {
  it('looks up IPv6 routes and decrements both TTL alias and hop limit', async () => {
    const forwarder = new RouterForwarder('r1', topology());
    const ctx: ForwardContext = { neighbors: [{ nodeId: 'host-b', edgeId: 'e-r1-b' }] };

    const decision = await forwarder.receive(packet(), 'eth0', ctx);

    expect(decision.action).toBe('forward');
    if (decision.action !== 'forward') return;
    expect(decision.egressInterfaceId).toBe('eth1');
    expect(decision.packet.frame.payload.ttl).toBe(63);
    expect(isIpv6Packet(decision.packet.frame.payload)).toBe(true);
    if (!isIpv6Packet(decision.packet.frame.payload)) return;
    expect(decision.packet.frame.payload.hopLimit).toBe(63);
  });
});
