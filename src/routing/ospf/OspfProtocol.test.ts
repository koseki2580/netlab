import { describe, expect, it } from 'vitest';
import { ADMIN_DISTANCES, type OspfAreaConfig, type RouterInterface } from '../../types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../../types/topology';
import { OspfProtocol, ospfProtocol } from './OspfProtocol';

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function makeIface(id: string, ipAddress: string, prefixLength: number): RouterInterface {
  return {
    id,
    name: id,
    ipAddress,
    prefixLength,
    macAddress: `00:00:00:00:${id.padStart(2, '0')}:00`,
  };
}

function makeArea(networks: string[], cost?: number): OspfAreaConfig {
  return {
    areaId: '0.0.0.0',
    networks,
    cost,
  };
}

function makeRouter(
  id: string,
  interfaces: RouterInterface[],
  areas?: OspfAreaConfig[],
): NetlabNode {
  return {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3',
      interfaces,
      ospfConfig: areas
        ? {
            routerId: `1.1.1.${id.replace(/\D/g, '') || '1'}`,
            areas,
          }
        : undefined,
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): NetlabEdge {
  return { id, source, target, sourceHandle, targetHandle };
}

function findRoute(
  routes: ReturnType<OspfProtocol['computeRoutes']>,
  nodeId: string,
  destination: string,
) {
  return routes.find((route) => route.nodeId === nodeId && route.destination === destination);
}

describe('OspfProtocol', () => {
  describe('Interface contract', () => {
    it('protocol name is "ospf"', () => {
      expect(new OspfProtocol().name).toBe('ospf');
    });

    it('adminDistance is 110 (OSPF standard admin distance per ADMIN_DISTANCES.ospf)', () => {
      const protocol = new OspfProtocol();
      expect(protocol.adminDistance).toBe(ADMIN_DISTANCES.ospf);
      expect(protocol.adminDistance).toBe(110);
    });

    it('ospfProtocol singleton is an instance of OspfProtocol', () => {
      expect(ospfProtocol).toBeInstanceOf(OspfProtocol);
    });
  });

  describe('computeRoutes', () => {
    it('returns empty array when no routers have ospfConfig', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('eth0', '10.0.12.1', 30)]),
          makeRouter('r2', [makeIface('eth0', '10.0.12.2', 30)]),
        ],
        edges: [makeEdge('e1', 'r1', 'r2')],
      });

      expect(new OspfProtocol().computeRoutes(topology)).toEqual([]);
    });

    it('returns directly connected networks with metric 0', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('lan0', '10.1.0.1', 24), makeIface('eth0', '10.0.12.1', 30)],
            [makeArea(['10.1.0.0/24', '10.0.12.0/30'])],
          ),
        ],
      });

      const routes = new OspfProtocol().computeRoutes(topology);

      expect(routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nodeId: 'r1',
            destination: '10.1.0.0/24',
            nextHop: 'direct',
            metric: 0,
          }),
          expect.objectContaining({
            nodeId: 'r1',
            destination: '10.0.12.0/30',
            nextHop: 'direct',
            metric: 0,
          }),
        ]),
      );
    });

    it('computes shortest path between two adjacent routers', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('lan0', '10.1.0.1', 24), makeIface('eth0', '10.0.12.1', 30)],
            [makeArea(['10.1.0.0/24', '10.0.12.0/30'])],
          ),
          makeRouter(
            'r2',
            [makeIface('eth0', '10.0.12.2', 30), makeIface('lan0', '10.2.0.1', 24)],
            [makeArea(['10.0.12.0/30', '10.2.0.0/24'])],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2', 'eth0', 'eth0')],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.2.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 1,
      });
    });

    it('computes shortest path in linear chain R1—R2—R3', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], [makeArea(['10.0.12.0/30'])]),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.1', 30)],
            [makeArea(['10.0.12.0/30', '10.0.23.0/30'])],
          ),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.2', 30), makeIface('lan0', '10.3.0.1', 24)],
            [makeArea(['10.0.23.0/30', '10.3.0.0/24'])],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e23', 'r2', 'r3')],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 2,
      });
    });

    it('selects shorter path in triangle topology (R1—R2—R3, R1—R3)', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('to-r2', '10.0.12.1', 30), makeIface('to-r3', '10.0.13.1', 30)],
            [makeArea(['10.0.12.0/30', '10.0.13.0/30'])],
          ),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.1', 30)],
            [makeArea(['10.0.12.0/30', '10.0.23.0/30'])],
          ),
          makeRouter(
            'r3',
            [
              makeIface('to-r1', '10.0.13.2', 30),
              makeIface('to-r2', '10.0.23.2', 30),
              makeIface('lan0', '10.3.0.1', 24),
            ],
            [makeArea(['10.0.13.0/30', '10.0.23.0/30', '10.3.0.0/24'])],
          ),
        ],
        edges: [
          makeEdge('e12', 'r1', 'r2'),
          makeEdge('e23', 'r2', 'r3'),
          makeEdge('e13', 'r1', 'r3'),
        ],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.13.2',
        metric: 1,
      });
    });

    it('uses link cost from adjacency (default 1)', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], [makeArea(['10.0.12.0/30'])]),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('lan0', '10.2.0.1', 24)],
            [makeArea(['10.0.12.0/30', '10.2.0.0/24'])],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2')],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.2.0.0/24'),
      ).toMatchObject({
        metric: 1,
      });
    });

    it('accumulates cost across multiple hops', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], [makeArea(['10.0.12.0/30'], 2)]),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.1', 30)],
            [makeArea(['10.0.12.0/30', '10.0.23.0/30'], 3)],
          ),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.2', 30), makeIface('lan0', '10.3.0.1', 24)],
            [makeArea(['10.0.23.0/30', '10.3.0.0/24'])],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e23', 'r2', 'r3')],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        metric: 5,
      });
    });

    it('resolves correct first-hop nextHop IP for multi-hop paths', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], [makeArea(['10.0.12.0/30'])]),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.1', 30)],
            [makeArea(['10.0.12.0/30', '10.0.23.0/30'])],
          ),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.2', 30), makeIface('lan0', '10.3.0.1', 24)],
            [makeArea(['10.0.23.0/30', '10.3.0.0/24'])],
          ),
        ],
        edges: [
          makeEdge('e12', 'r1', 'r2', 'to-r2', 'to-r1'),
          makeEdge('e23', 'r2', 'r3', 'to-r3', 'to-r2'),
        ],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
      });
    });

    it('only advertises networks listed in ospfConfig.areas[].networks', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [
              makeIface('lan0', '10.1.0.1', 24),
              makeIface('mgmt0', '192.168.1.1', 24),
              makeIface('to-r2', '10.0.12.1', 30),
            ],
            [makeArea(['10.1.0.0/24', '10.0.12.0/30'])],
          ),
          makeRouter('r2', [makeIface('to-r1', '10.0.12.2', 30)], [makeArea(['10.0.12.0/30'])]),
        ],
        edges: [makeEdge('e12', 'r1', 'r2')],
      });

      const routes = new OspfProtocol().computeRoutes(topology);

      expect(findRoute(routes, 'r2', '10.1.0.0/24')).toBeDefined();
      expect(findRoute(routes, 'r2', '192.168.1.0/24')).toBeUndefined();
    });

    it('ignores routers without ospfConfig', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], [makeArea(['10.0.12.0/30'])]),
          makeRouter('r2', [
            makeIface('to-r1', '10.0.12.2', 30),
            makeIface('to-r3', '10.0.23.1', 30),
          ]),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.2', 30), makeIface('lan0', '10.3.0.1', 24)],
            [makeArea(['10.0.23.0/30', '10.3.0.0/24'])],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e23', 'r2', 'r3')],
      });

      expect(
        findRoute(new OspfProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toBeUndefined();
    });

    it('uses adminDistance 110 for all routes', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], [makeArea(['10.0.12.0/30'])]),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('lan0', '10.2.0.1', 24)],
            [makeArea(['10.0.12.0/30', '10.2.0.0/24'])],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2')],
      });

      const routes = new OspfProtocol().computeRoutes(topology);
      expect(routes).not.toHaveLength(0);
      expect(routes.every((route) => route.adminDistance === 110)).toBe(true);
    });

    it('handles disconnected OSPF islands (no routes between them))', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('to-r2', '10.0.12.1', 30), makeIface('lan0', '10.1.0.1', 24)],
            [makeArea(['10.0.12.0/30', '10.1.0.0/24'])],
          ),
          makeRouter('r2', [makeIface('to-r1', '10.0.12.2', 30)], [makeArea(['10.0.12.0/30'])]),
          makeRouter(
            'r3',
            [makeIface('to-r4', '10.0.34.1', 30), makeIface('lan0', '10.3.0.1', 24)],
            [makeArea(['10.0.34.0/30', '10.3.0.0/24'])],
          ),
          makeRouter('r4', [makeIface('to-r3', '10.0.34.2', 30)], [makeArea(['10.0.34.0/30'])]),
        ],
        edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e34', 'r3', 'r4')],
      });

      const routes = new OspfProtocol().computeRoutes(topology);

      expect(findRoute(routes, 'r1', '10.3.0.0/24')).toBeUndefined();
      expect(findRoute(routes, 'r3', '10.1.0.0/24')).toBeUndefined();
    });
  });
});
