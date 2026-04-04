import { describe, it, expect } from 'vitest';
import { RouterForwarder } from './RouterForwarder';
import type { NetworkTopology } from '../../types/topology';
import type { InFlightPacket } from '../../types/packets';

function makeTopology(routeTable: Record<string, Array<{ destination: string; nextHop: string }>>): NetworkTopology {
  const routeTables = new Map<string, ReturnType<typeof makeRouteEntries>>();
  for (const [nodeId, routes] of Object.entries(routeTable)) {
    routeTables.set(nodeId, makeRouteEntries(nodeId, routes));
  }
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
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          ],
        },
      },
    ],
    edges: [],
    areas: [],
    routeTables,
  };
}

function makeRouteEntries(nodeId: string, routes: Array<{ destination: string; nextHop: string }>) {
  return routes.map((r) => ({
    destination: r.destination,
    nextHop: r.nextHop,
    metric: 0,
    protocol: 'static' as const,
    adminDistance: 1,
    nodeId,
  }));
}

function makePacket(dstIp: string, ttl = 64): InFlightPacket {
  return {
    id: 'pkt-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    ingressPortId: 'eth0',
    frame: {
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        version: 4,
        srcIp: '10.0.0.10',
        dstIp,
        ttl,
        protocol: 6,
        payload: { type: 'tcp', srcPort: 12345, dstPort: 80, flags: { syn: true, ack: false, fin: false }, payload: null },
      },
    },
  };
}

describe('RouterForwarder', () => {
  it('drops packet when TTL is 1', async () => {
    const topology = makeTopology({
      'router-1': [{ destination: '203.0.113.0/24', nextHop: '203.0.113.254' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const result = await forwarder.receive(makePacket('203.0.113.10', 1), 'eth0');
    expect(result.action).toBe('drop');
    expect((result as { action: 'drop'; reason: string }).reason).toBe('ttl-exceeded');
  });

  it('drops packet when no matching route exists', async () => {
    const topology = makeTopology({ 'router-1': [] });
    const forwarder = new RouterForwarder('router-1', topology);
    const result = await forwarder.receive(makePacket('203.0.113.10'), 'eth0');
    expect(result.action).toBe('drop');
    expect((result as { action: 'drop'; reason: string }).reason).toBe('no-route');
  });

  it('forwards to next-hop IP when route exists', async () => {
    const topology = makeTopology({
      'router-1': [{ destination: '203.0.113.0/24', nextHop: '203.0.113.254' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const result = await forwarder.receive(makePacket('203.0.113.10'), 'eth0');
    expect(result.action).toBe('forward');
    expect((result as { action: 'forward'; egressPort: string }).egressPort).toBe('203.0.113.254');
  });

  it('decrements TTL on forward', async () => {
    const topology = makeTopology({
      'router-1': [{ destination: '203.0.113.0/24', nextHop: '203.0.113.254' }],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const result = await forwarder.receive(makePacket('203.0.113.10', 64), 'eth0');
    expect(result.action).toBe('forward');
    const fwd = result as { action: 'forward'; packet: InFlightPacket };
    expect(fwd.packet.frame.payload.ttl).toBe(63);
  });

  it('uses most-specific route (longest prefix match)', async () => {
    const topology = makeTopology({
      'router-1': [
        { destination: '0.0.0.0/0', nextHop: '1.2.3.4' },
        { destination: '10.0.0.0/24', nextHop: 'direct' },
      ],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const result = await forwarder.receive(makePacket('10.0.0.10'), 'eth0');
    expect(result.action).toBe('forward');
    // Should use the /24 route (more specific) not the /0 default route
    const fwd = result as { action: 'forward'; egressPort: string };
    expect(fwd.egressPort).not.toBe('1.2.3.4');
  });

  it('falls back to default route (0.0.0.0/0) for unknown destinations', async () => {
    const topology = makeTopology({
      'router-1': [
        { destination: '0.0.0.0/0', nextHop: '1.2.3.4' },
        { destination: '10.0.0.0/24', nextHop: 'direct' },
      ],
    });
    const forwarder = new RouterForwarder('router-1', topology);
    const result = await forwarder.receive(makePacket('8.8.8.8'), 'eth0');
    expect(result.action).toBe('forward');
    expect((result as { action: 'forward'; egressPort: string }).egressPort).toBe('1.2.3.4');
  });
});
