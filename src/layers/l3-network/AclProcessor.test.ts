import { describe, expect, it } from 'vitest';
import { AclProcessor } from './AclProcessor';
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

function makeAclTopology(options: {
  stateful?: boolean;
  inboundAcl?: NonNullable<NetworkTopology['nodes'][number]['data']['interfaces']>[number]['inboundAcl'];
  outboundAcl?: NonNullable<NetworkTopology['nodes'][number]['data']['interfaces']>[number]['outboundAcl'];
  wanInboundAcl?: NonNullable<NetworkTopology['nodes'][number]['data']['interfaces']>[number]['inboundAcl'];
} = {}): NetworkTopology {
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
          statefulFirewall: options.stateful === true,
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
              inboundAcl: options.inboundAcl,
              outboundAcl: options.outboundAcl,
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
              inboundAcl: options.wanInboundAcl,
            },
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
          makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
          makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
          makeRouteEntry('router-1', '0.0.0.0/0', '203.0.113.2'),
        ],
      ],
    ]),
  };
}

function makeTcpPacket(
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

function makeUdpPacket(
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
): InFlightPacket {
  return {
    id: `udp-${srcIp}-${dstIp}-${srcPort}-${dstPort}`,
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
        protocol: 17,
        headerChecksum: 0xabcd,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort,
          checksum: 0x1234,
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  };
}

describe('AclProcessor', () => {
  it('permits a packet matching an inbound permit rule', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        inboundAcl: [
          {
            id: 'permit-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            srcIp: '10.0.0.0/24',
            dstPort: 80,
          },
        ],
      }),
    );

    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.match?.action).toBe('permit');
    expect(result.match?.direction).toBe('inbound');
    expect(result.match?.matchedRule?.id).toBe('permit-http');
  });

  it('denies a packet matching a deny rule', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        inboundAcl: [
          {
            id: 'deny-ssh',
            priority: 10,
            action: 'deny',
            protocol: 'tcp',
            dstPort: 22,
          },
        ],
      }),
    );

    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 22),
      'eth0',
      3,
    );

    expect(result.dropReason).toBe('acl-deny');
    expect(result.match?.action).toBe('deny');
    expect(result.match?.matchedRule?.id).toBe('deny-ssh');
  });

  it('uses first match by ascending priority', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        inboundAcl: [
          {
            id: 'deny-http',
            priority: 20,
            action: 'deny',
            protocol: 'tcp',
            dstPort: 80,
          },
          {
            id: 'permit-subnet',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            srcIp: '10.0.0.0/24',
          },
        ],
      }),
    );

    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.match?.matchedRule?.id).toBe('permit-subnet');
  });

  it('applies implicit default deny when no rule matches', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        inboundAcl: [
          {
            id: 'permit-https',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 443,
          },
        ],
      }),
    );

    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );

    expect(result.dropReason).toBe('acl-deny');
    expect(result.match?.matchedRule).toBeNull();
    expect(result.match?.byConnTrack).toBe(false);
  });

  it('returns null when no ACL list is configured on the interface', () => {
    const processor = new AclProcessor('router-1', makeAclTopology());
    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.match).toBeNull();
  });

  it('treats an empty ACL list as implicit deny-only', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({ inboundAcl: [] }),
    );

    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );

    expect(result.dropReason).toBe('acl-deny');
    expect(result.match?.matchedRule).toBeNull();
  });

  it('matches protocol any against TCP and UDP packets', () => {
    const topology = makeAclTopology({
      inboundAcl: [
        {
          id: 'permit-any',
          priority: 10,
          action: 'permit',
          protocol: 'any',
        },
      ],
    });
    const processor = new AclProcessor('router-1', topology);

    const tcpResult = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      1,
    );
    const udpResult = processor.applyIngress(
      makeUdpPacket('10.0.0.10', '203.0.113.10', 53000, 53),
      'eth0',
      2,
    );

    expect(tcpResult.match?.matchedRule?.id).toBe('permit-any');
    expect(udpResult.match?.matchedRule?.id).toBe('permit-any');
  });

  it('matches exact ports, ranges, and CIDR values', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        inboundAcl: [
          {
            id: 'permit-range',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            srcIp: 'any',
            dstIp: '203.0.113.0/24',
            srcPort: { from: 54000, to: 55000 },
            dstPort: 8080,
          },
        ],
      }),
    );

    const result = processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 8080),
      'eth0',
      3,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.match?.matchedRule?.id).toBe('permit-range');
  });

  it('does not modify packet fields during ACL evaluation', () => {
    const packet = makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80);
    const before = structuredClone(packet);
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        inboundAcl: [
          {
            id: 'permit-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
      }),
    );

    const result = processor.applyIngress(packet, 'eth0', 3);

    expect(result.packet).toEqual(before);
    expect(packet).toEqual(before);
  });

  it('records conn-track entries on permitted stateful flows and reuses them', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        stateful: true,
        inboundAcl: [
          {
            id: 'permit-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
      }),
    );

    processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );
    processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      4,
    );

    const table = processor.getConnTrackTable();
    expect(table.entries).toHaveLength(1);
    expect(table.entries[0]?.createdAt).toBe(3);
    expect(table.entries[0]?.lastSeenAt).toBe(4);
    expect(table.entries[0]?.state).toBe('new');
  });

  it('auto-permits return traffic via conn-track and updates lastSeenAt', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        stateful: true,
        inboundAcl: [
          {
            id: 'permit-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
        wanInboundAcl: [],
      }),
    );

    processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );

    const result = processor.applyIngress(
      makeTcpPacket('203.0.113.10', '10.0.0.10', 80, 54321),
      'eth1',
      7,
    );

    expect(result.dropReason).toBeUndefined();
    expect(result.match?.action).toBe('permit');
    expect(result.match?.byConnTrack).toBe(true);
    expect(processor.getConnTrackTable().entries[0]?.lastSeenAt).toBe(7);
    expect(processor.getConnTrackTable().entries[0]?.state).toBe('established');
  });

  it('evaluates egress ACLs against outboundAcl', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        outboundAcl: [
          {
            id: 'deny-ssh-egress',
            priority: 10,
            action: 'deny',
            protocol: 'tcp',
            dstPort: 22,
          },
        ],
      }),
    );

    const result = processor.applyEgress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 22),
      'eth0',
      5,
    );

    expect(result.dropReason).toBe('acl-deny');
    expect(result.match?.direction).toBe('outbound');
    expect(result.match?.matchedRule?.id).toBe('deny-ssh-egress');
  });

  it('clears conn-track state', () => {
    const processor = new AclProcessor(
      'router-1',
      makeAclTopology({
        stateful: true,
        inboundAcl: [
          {
            id: 'permit-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
      }),
    );

    processor.applyIngress(
      makeTcpPacket('10.0.0.10', '203.0.113.10', 54321, 80),
      'eth0',
      3,
    );
    processor.clear();

    expect(processor.getConnTrackTable().entries).toEqual([]);
  });
});
