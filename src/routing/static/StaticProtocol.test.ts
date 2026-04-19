import { describe, it, expect } from 'vitest';
import { StaticProtocol } from './StaticProtocol';
import type { NetworkTopology } from '../../types/topology';
import { assertDefined } from '../../utils';

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

describe('StaticProtocol', () => {
  it('returns no routes when there are no nodes', () => {
    const protocol = new StaticProtocol();
    expect(protocol.computeRoutes(makeTopology())).toEqual([]);
  });

  it('returns no routes for non-router nodes', () => {
    const protocol = new StaticProtocol();
    const topology = makeTopology({
      nodes: [
        {
          id: 'client-1',
          type: 'client',
          position: { x: 0, y: 0 },
          data: { label: 'Client', role: 'client', layerId: 'l7' },
        },
      ],
    });
    expect(protocol.computeRoutes(topology)).toEqual([]);
  });

  it('returns static routes for a router node', () => {
    const protocol = new StaticProtocol();
    const topology = makeTopology({
      nodes: [
        {
          id: 'router-1',
          type: 'router',
          position: { x: 0, y: 0 },
          data: {
            label: 'R-1',
            role: 'router',
            layerId: 'l3',
            staticRoutes: [
              { destination: '10.0.0.0/24', nextHop: 'direct' },
              { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
            ],
          },
        },
      ],
    });

    const routes = protocol.computeRoutes(topology);
    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({
      destination: '10.0.0.0/24',
      nextHop: 'direct',
      metric: 0,
      protocol: 'static',
      nodeId: 'router-1',
    });
    expect(routes[1]).toMatchObject({
      destination: '0.0.0.0/0',
      nextHop: '203.0.113.254',
      metric: 0,
      protocol: 'static',
      nodeId: 'router-1',
    });
  });

  it('uses metric from static route config when provided', () => {
    const protocol = new StaticProtocol();
    const topology = makeTopology({
      nodes: [
        {
          id: 'router-1',
          type: 'router',
          position: { x: 0, y: 0 },
          data: {
            label: 'R-1',
            role: 'router',
            layerId: 'l3',
            staticRoutes: [{ destination: '10.0.0.0/24', nextHop: 'direct', metric: 5 }],
          },
        },
      ],
    });
    const routes = protocol.computeRoutes(topology);
    const firstRoute = routes[0];
    assertDefined(firstRoute, 'expected computed static route');
    expect(firstRoute.metric).toBe(5);
  });

  it('aggregates routes from multiple routers', () => {
    const protocol = new StaticProtocol();
    const topology = makeTopology({
      nodes: [
        {
          id: 'r1',
          type: 'router',
          position: { x: 0, y: 0 },
          data: {
            label: 'R-1',
            role: 'router',
            layerId: 'l3',
            staticRoutes: [{ destination: '10.0.0.0/24', nextHop: 'direct' }],
          },
        },
        {
          id: 'r2',
          type: 'router',
          position: { x: 100, y: 0 },
          data: {
            label: 'R-2',
            role: 'router',
            layerId: 'l3',
            staticRoutes: [{ destination: '192.168.0.0/24', nextHop: 'direct' }],
          },
        },
      ],
    });
    const routes = protocol.computeRoutes(topology);
    expect(routes).toHaveLength(2);
    expect(routes.map((r) => r.nodeId)).toContain('r1');
    expect(routes.map((r) => r.nodeId)).toContain('r2');
  });

  it('has adminDistance of 1 (static routes have highest priority)', () => {
    const protocol = new StaticProtocol();
    expect(protocol.adminDistance).toBe(1);
  });
});
