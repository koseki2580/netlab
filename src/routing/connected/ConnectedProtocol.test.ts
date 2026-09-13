import { describe, expect, it } from 'vitest';
import type { NetworkTopology } from '../../types/topology';
import { connectedProtocol } from './ConnectedProtocol';

/**
 * The shape of the TCP handshake lesson: a client, a router with an address on
 * each side, and a server. The router carries no `staticRoutes`, because on a
 * real router giving an interface an address is already enough to reach the
 * subnet it sits on.
 */
function twoSubnets(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', layerId: 'l7', role: 'client', ip: '10.0.1.10' },
      },
      {
        id: 'router',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R',
          layerId: 'l3',
          role: 'router',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:09:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              macAddress: '00:00:00:09:00:01',
            },
          ],
        },
      },
      {
        id: 'server',
        type: 'server',
        position: { x: 0, y: 0 },
        data: { label: 'S', layerId: 'l7', role: 'server', ip: '10.0.2.10' },
      },
    ],
    edges: [
      { id: 'e1', source: 'client', target: 'router' },
      { id: 'e2', source: 'router', target: 'server' },
    ],
    routeTables: new Map(),
    areas: [],
  };
}

describe('routes a router has by virtue of its own interfaces', () => {
  /**
   * TC-131 — an addressed interface reaches its own subnet.
   *
   * Nothing derived these, so a router knew only the static routes its topology
   * author remembered to write. The TCP handshake lesson had none, and its very
   * first segment — the SYN, the thing the lesson exists to show — was dropped
   * at the router as "no route".
   */
  it('gives the router a route to each subnet it has an address on', () => {
    const routes = connectedProtocol.computeRoutes(twoSubnets());

    expect(routes.map((route) => route.destination).sort()).toEqual(['10.0.1.0/24', '10.0.2.0/24']);
    for (const route of routes) {
      expect(route.nodeId).toBe('router');
      expect(route.nextHop).toBe('direct');
    }
  });

  /** TC-132 — and they win, the way a connected route does on a real router. */
  it('prefers a connected route over a static one for the same subnet', () => {
    expect(connectedProtocol.adminDistance).toBeLessThan(1);
  });

  /** TC-133 — a device with no addressed interfaces contributes nothing. */
  it('derives nothing from hosts or from an unaddressed router', () => {
    const topology = twoSubnets();
    const router = topology.nodes.find((node) => node.id === 'router');
    if (router) router.data.interfaces = [];

    expect(connectedProtocol.computeRoutes(topology)).toEqual([]);
  });
});
