import { describe, expect, it } from 'vitest';
import {
  ADMIN_DISTANCES,
  type BgpNeighborConfig,
  type RouterInterface,
} from '../../types/routing';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { BgpProtocol, bgpProtocol } from './BgpProtocol';

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function makeIface(id: string, ipAddress: string, prefixLength = 30): RouterInterface {
  return {
    id,
    name: id,
    ipAddress,
    prefixLength,
    macAddress: `00:00:00:00:${id.padStart(2, '0')}:00`,
  };
}

function makeNeighbor(
  address: string,
  remoteAs: number,
  overrides: Partial<BgpNeighborConfig> = {},
): BgpNeighborConfig {
  return {
    address,
    remoteAs,
    ...overrides,
  };
}

function makeRouter(
  id: string,
  localAs: number,
  routerId: string,
  interfaces: RouterInterface[],
  neighbors: BgpNeighborConfig[],
  networks: string[] = [],
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
      bgpConfig: {
        localAs,
        routerId,
        neighbors,
        networks,
      },
    },
  };
}

function findRoute(
  routes: ReturnType<BgpProtocol['computeRoutes']>,
  nodeId: string,
  destination: string,
) {
  return routes.find((route) => route.nodeId === nodeId && route.destination === destination);
}

describe('BgpProtocol', () => {
  describe('Interface contract', () => {
    it('protocol name is "bgp"', () => {
      expect(new BgpProtocol().name).toBe('bgp');
    });

    it('adminDistance is 20 (eBGP distance per ADMIN_DISTANCES.ebgp)', () => {
      const protocol = new BgpProtocol();
      expect(protocol.adminDistance).toBe(ADMIN_DISTANCES.ebgp);
      expect(protocol.adminDistance).toBe(20);
    });

    it('bgpProtocol singleton is an instance of BgpProtocol', () => {
      expect(bgpProtocol).toBeInstanceOf(BgpProtocol);
    });
  });

  describe('computeRoutes', () => {
    it('returns empty array when no routers have bgpConfig', () => {
      const topology = makeTopology({
        nodes: [
          {
            id: 'r1',
            type: 'router',
            position: { x: 0, y: 0 },
            data: { label: 'r1', role: 'router', layerId: 'l3' },
          },
        ],
      });

      expect(new BgpProtocol().computeRoutes(topology)).toEqual([]);
    });

    it('originates configured network prefixes as local routes', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('eth0', '10.0.12.1')],
            [],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: 'direct',
        protocol: 'bgp',
      });
    });

    it('propagates routes to eBGP neighbor with AS prepend', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('to-r2', '10.0.12.1')],
            [makeNeighbor('10.0.12.2', 65002)],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [
              makeIface('to-r1', '10.0.12.2'),
              makeIface('to-r3', '10.0.23.1'),
            ],
            [
              makeNeighbor('10.0.12.1', 65001),
              makeNeighbor('10.0.23.2', 65003),
            ],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [makeIface('to-r2', '10.0.23.2')],
            [makeNeighbor('10.0.23.1', 65002)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 2,
      });
    });

    it('does not prepend AS for iBGP propagation', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65001),
              makeNeighbor('10.0.13.2', 65002),
            ],
          ),
          makeRouter(
            'r2',
            65001,
            '1.1.1.2',
            [makeIface('to-r1', '10.0.12.2')],
            [makeNeighbor('10.0.12.1', 65001)],
          ),
          makeRouter(
            'r3',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.13.2')],
            [makeNeighbor('10.0.13.1', 65001)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r2', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.12.1',
        metric: 1,
      });
    });

    it('prevents routing loops via AS_PATH check', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65002),
              makeNeighbor('10.0.13.2', 65003),
            ],
            ['198.51.100.0/24'],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [
              makeIface('to-r1', '10.0.12.2'),
              makeIface('to-r3', '10.0.23.1'),
            ],
            [
              makeNeighbor('10.0.12.1', 65001),
              makeNeighbor('10.0.23.2', 65003),
            ],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [
              makeIface('to-r1', '10.0.13.2'),
              makeIface('to-r2', '10.0.23.2'),
            ],
            [
              makeNeighbor('10.0.13.1', 65001),
              makeNeighbor('10.0.23.1', 65002),
            ],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '198.51.100.0/24')).toMatchObject({
        nextHop: 'direct',
        metric: 0,
      });
    });

    it('selects route with shortest AS_PATH', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65002),
              makeNeighbor('10.0.13.2', 65003),
            ],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2')],
            [makeNeighbor('10.0.12.1', 65001)],
            ['203.0.113.0/24'],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [
              makeIface('to-r1', '10.0.13.2'),
              makeIface('to-r4', '10.0.34.1'),
            ],
            [
              makeNeighbor('10.0.13.1', 65001),
              makeNeighbor('10.0.34.2', 65004),
            ],
          ),
          makeRouter(
            'r4',
            65004,
            '4.4.4.4',
            [makeIface('to-r3', '10.0.34.2')],
            [makeNeighbor('10.0.34.1', 65003)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.12.2',
        metric: 1,
      });
    });

    it('selects route with highest LOCAL_PREF when AS_PATH tied', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65002, { localPref: 200 }),
              makeNeighbor('10.0.13.2', 65003, { localPref: 100 }),
            ],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2')],
            [makeNeighbor('10.0.12.1', 65001)],
            ['203.0.113.0/24'],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [makeIface('to-r1', '10.0.13.2')],
            [makeNeighbor('10.0.13.1', 65001)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.12.2',
      });
    });

    it('prefers eBGP over iBGP when other attributes equal', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r4', '10.0.14.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65001),
              makeNeighbor('10.0.14.2', 65004),
            ],
          ),
          makeRouter(
            'r2',
            65001,
            '1.1.1.2',
            [
              makeIface('to-r1', '10.0.12.2'),
              makeIface('to-r3', '10.0.23.1'),
            ],
            [
              makeNeighbor('10.0.12.1', 65001),
              makeNeighbor('10.0.23.2', 65003),
            ],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [makeIface('to-r2', '10.0.23.2')],
            [makeNeighbor('10.0.23.1', 65001)],
            ['203.0.113.0/24'],
          ),
          makeRouter(
            'r4',
            65004,
            '4.4.4.4',
            [makeIface('to-r1', '10.0.14.2')],
            [makeNeighbor('10.0.14.1', 65001)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.14.2',
        adminDistance: 20,
      });
    });

    it('uses lowest router ID as final tiebreaker', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65002),
              makeNeighbor('10.0.13.2', 65003),
            ],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2')],
            [makeNeighbor('10.0.12.1', 65001)],
            ['203.0.113.0/24'],
          ),
          makeRouter(
            'r3',
            65003,
            '1.1.1.2',
            [makeIface('to-r1', '10.0.13.2')],
            [makeNeighbor('10.0.13.1', 65001)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.13.2',
      });
    });

    it('handles multi-AS triangle (AS1—AS2—AS3)', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65002),
              makeNeighbor('10.0.13.2', 65003),
            ],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [
              makeIface('to-r1', '10.0.12.2'),
              makeIface('to-r3', '10.0.23.1'),
            ],
            [
              makeNeighbor('10.0.12.1', 65001),
              makeNeighbor('10.0.23.2', 65003),
            ],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [
              makeIface('to-r1', '10.0.13.2'),
              makeIface('to-r2', '10.0.23.2'),
            ],
            [
              makeNeighbor('10.0.13.1', 65001),
              makeNeighbor('10.0.23.1', 65002),
            ],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.13.2',
        metric: 1,
      });
    });

    it('uses adminDistance 20 for eBGP routes', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('to-r2', '10.0.12.1')],
            [makeNeighbor('10.0.12.2', 65002)],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2')],
            [makeNeighbor('10.0.12.1', 65001)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24')).toMatchObject({
        adminDistance: 20,
      });
    });

    it('uses adminDistance 200 for iBGP routes', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [
              makeIface('to-r2', '10.0.12.1'),
              makeIface('to-r3', '10.0.13.1'),
            ],
            [
              makeNeighbor('10.0.12.2', 65001),
              makeNeighbor('10.0.13.2', 65002),
            ],
          ),
          makeRouter(
            'r2',
            65001,
            '1.1.1.2',
            [makeIface('to-r1', '10.0.12.2')],
            [makeNeighbor('10.0.12.1', 65001)],
          ),
          makeRouter(
            'r3',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.13.2')],
            [makeNeighbor('10.0.13.1', 65001)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(findRoute(new BgpProtocol().computeRoutes(topology), 'r2', '203.0.113.0/24')).toMatchObject({
        adminDistance: 200,
      });
    });

    it('ignores routers without bgpConfig', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('to-r2', '10.0.12.1')],
            [makeNeighbor('10.0.12.2', 65002)],
          ),
          {
            id: 'r2',
            type: 'router',
            position: { x: 0, y: 0 },
            data: {
              label: 'r2',
              role: 'router',
              layerId: 'l3',
              interfaces: [makeIface('to-r1', '10.0.12.2')],
            },
          },
        ],
      });

      expect(new BgpProtocol().computeRoutes(topology)).toEqual([]);
    });
  });
});
