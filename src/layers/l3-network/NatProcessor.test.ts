import { describe, expect, it } from 'vitest';
import { NatProcessor } from './NatProcessor';
import type { InFlightPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

function makeRouteEntry(nodeId: string, destination: string, nextHop: string): RouteEntry {
  return {
    destination,
    nextHop,
    metric: 0,
    protocol: 'static',
    adminDistance: 1,
    nodeId,
  };
}

function makeNatTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'router-1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '192.168.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
              nat: 'inside',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:01',
              nat: 'outside',
            },
          ],
          portForwardingRules: [
            { proto: 'tcp', externalPort: 8080, internalIp: '192.168.1.10', internalPort: 80 },
          ],
        },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map<string, RouteEntry[]>([
      [
        'router-1',
        [
          makeRouteEntry('router-1', '192.168.1.0/24', 'direct'),
          makeRouteEntry('router-1', '203.0.113.0/30', 'direct'),
          makeRouteEntry('router-1', '0.0.0.0/0', '203.0.113.2'),
        ],
      ],
    ]),
  };
}

function makePacket(
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
): InFlightPacket {
  return {
    id: `pkt-${srcIp}-${dstIp}-${srcPort}-${dstPort}`,
    srcNodeId: 'router-1',
    dstNodeId: 'router-1',
    currentDeviceId: 'router-1',
    ingressPortId: '',
    path: [],
    timestamp: 1,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        headerChecksum: 0xabcd,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort,
          seq: 1,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  };
}

describe('NatProcessor', () => {
  it('translates source IP and port for inside-to-outside SNAT', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());
    const result = processor.applyPostRouting(
      makePacket('192.168.1.10', '8.8.8.8', 54321, 80),
      'eth0',
      'eth1',
      3,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.translation).toEqual({
      type: 'snat',
      preSrcIp: '192.168.1.10',
      preSrcPort: 54321,
      postSrcIp: '203.0.113.1',
      postSrcPort: 1024,
      preDstIp: '8.8.8.8',
      preDstPort: 80,
      postDstIp: '8.8.8.8',
      postDstPort: 80,
    });
    expect(result.packet.frame.payload.srcIp).toBe('203.0.113.1');
    const translatedOutbound = result.packet.frame.payload.payload;
    if (!('srcPort' in translatedOutbound)) {
      throw new Error('expected port-bearing transport');
    }
    expect(translatedOutbound.srcPort).toBe(1024);
    expect(result.packet.frame.payload.headerChecksum).toBe(0);
    expect(processor.getTable().entries).toHaveLength(1);
  });

  it('reuses an existing SNAT entry for the same flow', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());

    const first = processor.applyPostRouting(
      makePacket('192.168.1.10', '8.8.8.8', 54321, 80),
      'eth0',
      'eth1',
      3,
    );
    const second = processor.applyPostRouting(
      makePacket('192.168.1.10', '8.8.8.8', 54321, 80),
      'eth0',
      'eth1',
      4,
    );

    expect(first.translation?.postSrcPort).toBe(1024);
    expect(second.translation?.postSrcPort).toBe(1024);
    expect(processor.getTable().entries).toHaveLength(1);
    expect(processor.getTable().entries[0].lastSeenAt).toBe(4);
  });

  it('allocates distinct ports for distinct inside flows', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());

    const first = processor.applyPostRouting(
      makePacket('192.168.1.10', '8.8.8.8', 54321, 80),
      'eth0',
      'eth1',
      1,
    );
    const second = processor.applyPostRouting(
      makePacket('192.168.1.20', '8.8.8.8', 54321, 80),
      'eth0',
      'eth1',
      2,
    );

    expect(first.translation?.postSrcPort).toBe(1024);
    expect(second.translation?.postSrcPort).toBe(1025);
  });

  it('reverse-translates outside-to-inside return traffic for SNAT', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());
    processor.applyPostRouting(makePacket('192.168.1.10', '8.8.8.8', 54321, 80), 'eth0', 'eth1', 1);

    const result = processor.applyPreRouting(
      makePacket('8.8.8.8', '203.0.113.1', 80, 1024),
      'eth1',
      2,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.translation).toEqual({
      type: 'snat',
      preSrcIp: '8.8.8.8',
      preSrcPort: 80,
      postSrcIp: '8.8.8.8',
      postSrcPort: 80,
      preDstIp: '203.0.113.1',
      preDstPort: 1024,
      postDstIp: '192.168.1.10',
      postDstPort: 54321,
    });
    expect(result.packet.frame.payload.dstIp).toBe('192.168.1.10');
    const translatedInbound = result.packet.frame.payload.payload;
    if (!('dstPort' in translatedInbound)) {
      throw new Error('expected port-bearing transport');
    }
    expect(translatedInbound.dstPort).toBe(54321);
  });

  it('applies DNAT port forwarding and creates a reverse entry', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());

    const result = processor.applyPreRouting(
      makePacket('198.51.100.10', '203.0.113.1', 55000, 8080),
      'eth1',
      5,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.translation).toEqual({
      type: 'dnat',
      preSrcIp: '198.51.100.10',
      preSrcPort: 55000,
      postSrcIp: '198.51.100.10',
      postSrcPort: 55000,
      preDstIp: '203.0.113.1',
      preDstPort: 8080,
      postDstIp: '192.168.1.10',
      postDstPort: 80,
    });
    expect(result.packet.frame.payload.dstIp).toBe('192.168.1.10');
    const translatedDnat = result.packet.frame.payload.payload;
    if (!('dstPort' in translatedDnat)) {
      throw new Error('expected port-bearing transport');
    }
    expect(translatedDnat.dstPort).toBe(80);
    expect(processor.getTable().entries[0]?.type).toBe('dnat');
  });

  it('reuses the DNAT mapping for the inside server response', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());
    processor.applyPreRouting(makePacket('198.51.100.10', '203.0.113.1', 55000, 8080), 'eth1', 5);

    const result = processor.applyPostRouting(
      makePacket('192.168.1.10', '198.51.100.10', 80, 55000),
      'eth0',
      'eth1',
      6,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.translation).toEqual({
      type: 'dnat',
      preSrcIp: '192.168.1.10',
      preSrcPort: 80,
      postSrcIp: '203.0.113.1',
      postSrcPort: 8080,
      preDstIp: '198.51.100.10',
      preDstPort: 55000,
      postDstIp: '198.51.100.10',
      postDstPort: 55000,
    });
  });

  it('drops unmatched traffic to the outside interface address', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());
    const result = processor.applyPreRouting(
      makePacket('198.51.100.10', '203.0.113.1', 55000, 9999),
      'eth1',
      5,
    );

    expect(result.dropReason).toBe('no-nat-entry');
    expect(result.translation).toBeNull();
  });

  it('drops outside-to-inside traffic without a pre-routing match', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());
    const result = processor.applyPostRouting(
      makePacket('198.51.100.10', '192.168.1.10', 55000, 80),
      'eth1',
      'eth0',
      5,
      false,
    );

    expect(result.dropReason).toBe('no-nat-entry');
  });

  it('drops when no SNAT port is available', () => {
    const processor = new NatProcessor('router-1', makeNatTopology());
    (processor as unknown as { portCounter: number }).portCounter = 65536;

    const result = processor.applyPostRouting(
      makePacket('192.168.1.10', '8.8.8.8', 54321, 80),
      'eth0',
      'eth1',
      3,
    );

    expect(result.dropReason).toBe('nat-port-exhausted');
    expect(result.translation).toBeNull();
  });
});
