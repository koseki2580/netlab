import { describe, expect, it } from 'vitest';
import type { RouterInterface } from '../../types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../../types/topology';
import { ADMIN_DISTANCES } from '../../types/routing';
import { RipProtocol, ripProtocol } from './RipProtocol';

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function makeRouter(id: string, interfaces: RouterInterface[], ripNetworks?: string[]): NetlabNode {
  return {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3',
      interfaces,
      ripConfig: ripNetworks
        ? {
            version: 2,
            networks: ripNetworks,
          }
        : undefined,
    },
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
  routes: ReturnType<RipProtocol['computeRoutes']>,
  nodeId: string,
  destination: string,
) {
  return routes.find((route) => route.nodeId === nodeId && route.destination === destination);
}

function makeLinearChain(routerCount: number): NetworkTopology {
  const nodes: NetlabNode[] = [];
  const edges: NetlabEdge[] = [];

  for (let index = 1; index <= routerCount; index += 1) {
    const interfaces: RouterInterface[] = [];

    if (index > 1) {
      interfaces.push(makeIface(`left${index}`, `10.${index - 1}.0.2`, 30));
    }

    if (index < routerCount) {
      interfaces.push(makeIface(`right${index}`, `10.${index}.0.1`, 30));
    }

    if (index === routerCount) {
      interfaces.push(makeIface(`lan${index}`, '10.99.0.1', 24));
    }

    const advertisedNetworks = index === routerCount ? ['10.99.0.0/24'] : [];
    nodes.push(makeRouter(`r${index}`, interfaces, advertisedNetworks));

    if (index < routerCount) {
      edges.push(makeEdge(`e${index}`, `r${index}`, `r${index + 1}`));
    }
  }

  return makeTopology({ nodes, edges });
}

describe('RipProtocol', () => {
  describe('Interface contract', () => {
    it('protocol name is "rip"', () => {
      expect(new RipProtocol().name).toBe('rip');
    });

    it('adminDistance is 120 (RIP admin distance per ADMIN_DISTANCES.rip)', () => {
      const protocol = new RipProtocol();
      expect(protocol.adminDistance).toBe(ADMIN_DISTANCES.rip);
      expect(protocol.adminDistance).toBe(120);
    });

    it('ripProtocol singleton is an instance of RipProtocol', () => {
      expect(ripProtocol).toBeInstanceOf(RipProtocol);
    });
  });

  describe('computeRoutes', () => {
    it('returns empty array when no routers have ripConfig', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('eth0', '10.0.12.1', 30)]),
          makeRouter('r2', [makeIface('eth0', '10.0.12.2', 30)]),
        ],
        edges: [makeEdge('e1', 'r1', 'r2')],
      });

      expect(new RipProtocol().computeRoutes(topology)).toEqual([]);
    });

    it('returns directly connected networks with metric 0', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('eth0', '10.1.0.1', 24), makeIface('eth1', '10.0.12.1', 30)],
            ['10.1.0.0/24', '10.0.12.0/30'],
          ),
        ],
      });

      const routes = new RipProtocol().computeRoutes(topology);

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

    it('propagates routes to adjacent router with metric + 1', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('lan0', '10.1.0.1', 24), makeIface('eth0', '10.0.12.1', 30)],
            ['10.1.0.0/24'],
          ),
          makeRouter(
            'r2',
            [makeIface('eth0', '10.0.12.2', 30), makeIface('lan0', '10.2.0.1', 24)],
            ['10.2.0.0/24'],
          ),
        ],
        edges: [makeEdge('e1', 'r1', 'r2', 'eth0', 'eth0')],
      });

      const routes = new RipProtocol().computeRoutes(topology);

      expect(findRoute(routes, 'r2', '10.1.0.0/24')).toMatchObject({
        nextHop: '10.0.12.1',
        metric: 1,
      });
      expect(findRoute(routes, 'r1', '10.2.0.0/24')).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 1,
      });
    });

    it('selects route with lower metric when multiple paths exist', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('to-r2', '10.0.12.1', 30), makeIface('to-r3', '10.0.13.1', 30)],
            [],
          ),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r4', '10.0.24.1', 30)],
            [],
          ),
          makeRouter(
            'r3',
            [makeIface('to-r1', '10.0.13.2', 30), makeIface('to-r5', '10.0.35.1', 30)],
            [],
          ),
          makeRouter(
            'r4',
            [
              makeIface('to-r2', '10.0.24.2', 30),
              makeIface('to-r5', '10.0.45.2', 30),
              makeIface('lan0', '10.4.0.1', 24),
            ],
            ['10.4.0.0/24'],
          ),
          makeRouter(
            'r5',
            [makeIface('to-r3', '10.0.35.2', 30), makeIface('to-r4', '10.0.45.1', 30)],
            [],
          ),
        ],
        edges: [
          makeEdge('e12', 'r1', 'r2'),
          makeEdge('e13', 'r1', 'r3'),
          makeEdge('e24', 'r2', 'r4'),
          makeEdge('e35', 'r3', 'r5'),
          makeEdge('e54', 'r5', 'r4'),
        ],
      });

      expect(
        findRoute(new RipProtocol().computeRoutes(topology), 'r1', '10.4.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 2,
      });
    });

    it('enforces max hop count of 15 (metric 16 = unreachable)', () => {
      const topology = makeLinearChain(17);
      const routes = new RipProtocol().computeRoutes(topology);

      expect(findRoute(routes, 'r1', '10.99.0.0/24')).toBeUndefined();
      expect(findRoute(routes, 'r2', '10.99.0.0/24')).toMatchObject({ metric: 15 });
    });

    it('handles linear chain R1—R2—R3 correctly', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('lan0', '10.1.0.1', 24), makeIface('to-r2', '10.0.12.1', 30)],
            ['10.1.0.0/24'],
          ),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.2', 30)],
            [],
          ),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.3', 30), makeIface('lan0', '10.3.0.1', 24)],
            ['10.3.0.0/24'],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e23', 'r2', 'r3')],
      });

      expect(
        findRoute(new RipProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 2,
      });
    });

    it('handles triangle topology with shortest path selection', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('to-r2', '10.0.12.1', 30), makeIface('to-r3', '10.0.13.1', 30)],
            [],
          ),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.2', 30)],
            [],
          ),
          makeRouter(
            'r3',
            [
              makeIface('to-r1', '10.0.13.3', 30),
              makeIface('to-r2', '10.0.23.3', 30),
              makeIface('lan0', '10.3.0.1', 24),
            ],
            ['10.3.0.0/24'],
          ),
        ],
        edges: [
          makeEdge('e12', 'r1', 'r2'),
          makeEdge('e23', 'r2', 'r3'),
          makeEdge('e13', 'r1', 'r3'),
        ],
      });

      expect(
        findRoute(new RipProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.13.3',
        metric: 1,
      });
    });

    it('only advertises networks listed in ripConfig.networks', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [
              makeIface('lan0', '10.1.0.1', 24),
              makeIface('mgmt0', '192.168.1.1', 24),
              makeIface('to-r2', '10.0.12.1', 30),
            ],
            ['10.1.0.0/24'],
          ),
          makeRouter('r2', [makeIface('to-r1', '10.0.12.2', 30)], []),
        ],
        edges: [makeEdge('e12', 'r1', 'r2')],
      });

      const routes = new RipProtocol().computeRoutes(topology);

      expect(findRoute(routes, 'r2', '10.1.0.0/24')).toBeDefined();
      expect(findRoute(routes, 'r2', '192.168.1.0/24')).toBeUndefined();
    });

    it('ignores routers without ripConfig', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('lan0', '10.1.0.1', 24), makeIface('to-r2', '10.0.12.1', 30)],
            ['10.1.0.0/24'],
          ),
          makeRouter('r2', [
            makeIface('to-r1', '10.0.12.2', 30),
            makeIface('to-r3', '10.0.23.2', 30),
          ]),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.3', 30), makeIface('lan0', '10.3.0.1', 24)],
            ['10.3.0.0/24'],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e23', 'r2', 'r3')],
      });

      const routes = new RipProtocol().computeRoutes(topology);

      expect(findRoute(routes, 'r1', '10.3.0.0/24')).toBeUndefined();
      expect(findRoute(routes, 'r3', '10.1.0.0/24')).toBeUndefined();
    });

    it('produces correct nextHop IP (neighbor facing interface)', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter('r1', [makeIface('to-r2', '10.0.12.1', 30)], []),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('to-r3', '10.0.23.2', 30)],
            [],
          ),
          makeRouter(
            'r3',
            [makeIface('to-r2', '10.0.23.3', 30), makeIface('lan0', '10.3.0.1', 24)],
            ['10.3.0.0/24'],
          ),
        ],
        edges: [
          makeEdge('e12', 'r1', 'r2', 'to-r2', 'to-r1'),
          makeEdge('e23', 'r2', 'r3', 'to-r3', 'to-r2'),
        ],
      });

      expect(
        findRoute(new RipProtocol().computeRoutes(topology), 'r1', '10.3.0.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
      });
    });

    it('uses adminDistance 120 for all routes', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            [makeIface('lan0', '10.1.0.1', 24), makeIface('to-r2', '10.0.12.1', 30)],
            ['10.1.0.0/24'],
          ),
          makeRouter(
            'r2',
            [makeIface('to-r1', '10.0.12.2', 30), makeIface('lan0', '10.2.0.1', 24)],
            ['10.2.0.0/24'],
          ),
        ],
        edges: [makeEdge('e12', 'r1', 'r2')],
      });

      const routes = new RipProtocol().computeRoutes(topology);
      expect(routes).not.toHaveLength(0);
      expect(routes.every((route) => route.adminDistance === 120)).toBe(true);
    });
  });
});
