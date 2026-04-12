import { describe, expect, it } from 'vitest';
import { RouterForwarder } from './RouterForwarder';
import type { InFlightPacket } from '../../types/packets';
import type { Neighbor } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { computeIpv4Checksum } from '../../utils/checksum';
import { buildIpv4HeaderBytes } from '../../utils/packetLayout';

function makeRouteEntries(
  nodeId: string,
  routes: Array<{ destination: string; nextHop: string; metric?: number }>,
) {
  return routes.map((route) => ({
    destination: route.destination,
    nextHop: route.nextHop,
    metric: route.metric ?? 0,
    protocol: 'static' as const,
    adminDistance: 1,
    nodeId,
  }));
}

function makeRouter(
  id: string,
  interfaces: Array<{ id: string; name: string; ipAddress: string; prefixLength: number; macAddress: string }>,
) {
  return {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3' as const,
      interfaces,
    },
  };
}

function makeServer(id: string, ip: string) {
  return {
    id,
    type: 'server',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'server',
      layerId: 'l7' as const,
      ip,
      mac: '02:00:00:00:00:20',
    },
  };
}

function makeSwitch(id: string) {
  return {
    id,
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'switch',
      layerId: 'l2' as const,
      ports: [
        { id: 'p0', name: 'fa0/0', macAddress: '02:00:00:10:00:00' },
        { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
      ],
    },
  };
}

function makeTopology(options: {
  nodes: NetworkTopology['nodes'];
  edges?: NetworkTopology['edges'];
  routeTable?: Array<{ destination: string; nextHop: string; metric?: number }>;
}): NetworkTopology {
  return {
    nodes: options.nodes,
    edges: options.edges ?? [],
    areas: [],
    routeTables: new Map([
      ['router-1', makeRouteEntries('router-1', options.routeTable ?? [])],
    ]),
  };
}

function makePacket(dstIp: string, ttl = 64): InFlightPacket {
  return {
    id: 'pkt-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    currentDeviceId: 'router-1',
    ingressPortId: 'eth0',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.10',
        dstIp,
        ttl,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  };
}

function expectForward(result: Awaited<ReturnType<RouterForwarder['receive']>>) {
  expect(result.action).toBe('forward');
  if (result.action !== 'forward') {
    throw new Error(`expected forward decision, got ${result.action}`);
  }
  return result;
}

function expectDrop(result: Awaited<ReturnType<RouterForwarder['receive']>>) {
  expect(result.action).toBe('drop');
  if (result.action !== 'drop') {
    throw new Error(`expected drop decision, got ${result.action}`);
  }
  return result;
}

describe('RouterForwarder', () => {
  it('drops packet when TTL is 1', async () => {
    const topology = makeTopology({
      nodes: [makeRouter('router-1', [])],
      routeTable: [{ destination: '203.0.113.0/24', nextHop: '172.16.0.2' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);

    const result = await forwarder.receive(makePacket('203.0.113.10', 1), 'eth0', { neighbors: [] });

    expect(expectDrop(result).reason).toBe('ttl-exceeded');
  });

  it('drops packet when no matching route exists', async () => {
    const topology = makeTopology({
      nodes: [makeRouter('router-1', [])],
      routeTable: [],
    });
    const forwarder = new RouterForwarder('router-1', topology);

    const result = await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors: [] });

    expect(expectDrop(result).reason).toBe('no-route');
  });

  it('returns next-hop node, edge, and egress interface for an indirect route', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ]),
        makeRouter('router-2', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
        ]),
      ],
      edges: [{ id: 'e-r2', source: 'router-1', target: 'router-2', sourceHandle: 'eth1', targetHandle: 'eth0' }],
      routeTable: [{ destination: '203.0.113.0/24', nextHop: '172.16.0.2' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const neighbors: Neighbor[] = [{ nodeId: 'router-2', edgeId: 'e-r2' }];

    const result = expectForward(
      await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors }),
    );

    expect(result.nextNodeId).toBe('router-2');
    expect(result.edgeId).toBe('e-r2');
    expect(result.egressPort).toBe('172.16.0.2');
    expect(result.egressInterfaceId).toBe('eth1');
    expect(result.selectedRoute).toMatchObject({
      destination: '203.0.113.0/24',
      nextHop: '172.16.0.2',
    });
  });

  it('decrements TTL and recomputes the IPv4 header checksum', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ]),
        makeRouter('router-2', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
        ]),
      ],
      edges: [{ id: 'e-r2', source: 'router-1', target: 'router-2', sourceHandle: 'eth1', targetHandle: 'eth0' }],
      routeTable: [{ destination: '203.0.113.0/24', nextHop: '172.16.0.2' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const neighbors: Neighbor[] = [{ nodeId: 'router-2', edgeId: 'e-r2' }];

    const firstResult = expectForward(
      await forwarder.receive(makePacket('203.0.113.10', 64), 'eth0', { neighbors }),
    );
    const firstPacket = firstResult.packet;
    const expectedChecksum = computeIpv4Checksum(
      buildIpv4HeaderBytes(firstPacket.frame.payload, { checksumOverride: 0 }),
    );

    expect(firstPacket.frame.payload.ttl).toBe(63);
    expect(firstPacket.frame.payload.headerChecksum).toBe(expectedChecksum);
    expect(expectedChecksum).not.toBe(0);

    const secondResult = expectForward(
      await forwarder.receive(firstPacket, 'eth0', { neighbors }),
    );
    expect(secondResult.packet.frame.payload.ttl).toBe(62);
    expect(secondResult.packet.frame.payload.headerChecksum).not.toBe(
      firstPacket.frame.payload.headerChecksum,
    );
  });

  it('uses the most-specific reachable route', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          { id: 'eth2', name: 'eth2', ipAddress: '172.17.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:02' },
        ]),
        makeRouter('router-2', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
        ]),
        makeRouter('router-3', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.17.0.2', prefixLength: 24, macAddress: '00:00:00:03:00:00' },
        ]),
      ],
      edges: [
        { id: 'e-r2', source: 'router-1', target: 'router-2', sourceHandle: 'eth1', targetHandle: 'eth0' },
        { id: 'e-r3', source: 'router-1', target: 'router-3', sourceHandle: 'eth2', targetHandle: 'eth0' },
      ],
      routeTable: [
        { destination: '0.0.0.0/0', nextHop: '172.17.0.2' },
        { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },
      ],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const neighbors: Neighbor[] = [
      { nodeId: 'router-2', edgeId: 'e-r2' },
      { nodeId: 'router-3', edgeId: 'e-r3' },
    ];

    const result = expectForward(
      await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors }),
    );

    expect(result.nextNodeId).toBe('router-2');
    expect(result.edgeId).toBe('e-r2');
    expect(result.selectedRoute?.destination).toBe('203.0.113.0/24');
    expect(result.egressPort).not.toBe('172.17.0.2');
  });

  it('falls back when the primary route neighbor is unreachable', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          { id: 'eth2', name: 'eth2', ipAddress: '172.17.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:02' },
        ]),
        makeRouter('router-2', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
        ]),
        makeRouter('router-3', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.17.0.2', prefixLength: 24, macAddress: '00:00:00:03:00:00' },
        ]),
      ],
      edges: [
        { id: 'e-r2', source: 'router-1', target: 'router-2', sourceHandle: 'eth1', targetHandle: 'eth0' },
        { id: 'e-r3', source: 'router-1', target: 'router-3', sourceHandle: 'eth2', targetHandle: 'eth0' },
      ],
      routeTable: [
        { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },
        { destination: '0.0.0.0/0', nextHop: '172.17.0.2', metric: 5 },
      ],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const neighbors: Neighbor[] = [{ nodeId: 'router-3', edgeId: 'e-r3' }];

    const result = expectForward(
      await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors }),
    );

    expect(result.nextNodeId).toBe('router-3');
    expect(result.edgeId).toBe('e-r3');
    expect(result.egressInterfaceId).toBe('eth2');
    expect(result.selectedRoute?.destination).toBe('0.0.0.0/0');
    expect(result.selectedRoute?.nextHop).toBe('172.17.0.2');
  });

  it('drops with no-route when all matching routes are unreachable', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ]),
        makeRouter('router-2', [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
        ]),
      ],
      edges: [{ id: 'e-r2', source: 'router-1', target: 'router-2', sourceHandle: 'eth1', targetHandle: 'eth0' }],
      routeTable: [{ destination: '203.0.113.0/24', nextHop: '172.16.0.2' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);

    const result = await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors: [] });

    expect(expectDrop(result).reason).toBe('no-route');
  });

  it('resolves a direct route to the neighbor owning the destination IP', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ]),
        makeServer('server-1', '203.0.113.10'),
      ],
      edges: [{ id: 'e-host', source: 'router-1', target: 'server-1', sourceHandle: 'eth1' }],
      routeTable: [{ destination: '203.0.113.0/24', nextHop: 'direct' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const neighbors: Neighbor[] = [{ nodeId: 'server-1', edgeId: 'e-host' }];

    const result = expectForward(
      await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors }),
    );

    expect(result.nextNodeId).toBe('server-1');
    expect(result.edgeId).toBe('e-host');
    expect(result.egressPort).toBe('203.0.113.10');
    expect(result.egressInterfaceId).toBe('eth1');
  });

  it('resolves a direct route through an adjacent switch', async () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('router-1', [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ]),
        makeSwitch('switch-1'),
      ],
      edges: [{ id: 'e-sw', source: 'router-1', target: 'switch-1', sourceHandle: 'eth1', targetHandle: 'p0' }],
      routeTable: [{ destination: '203.0.113.0/24', nextHop: 'direct' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const neighbors: Neighbor[] = [{ nodeId: 'switch-1', edgeId: 'e-sw' }];

    const result = expectForward(
      await forwarder.receive(makePacket('203.0.113.10'), 'eth0', { neighbors }),
    );

    expect(result.nextNodeId).toBe('switch-1');
    expect(result.edgeId).toBe('e-sw');
    expect(result.egressInterfaceId).toBe('eth1');
  });
});
