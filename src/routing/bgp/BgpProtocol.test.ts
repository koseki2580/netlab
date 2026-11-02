import { describe, expect, it } from 'vitest';
import { ADMIN_DISTANCES, type BgpNeighborConfig, type RouterInterface } from '../../types/routing';
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r1', '10.0.12.2'), makeIface('to-r3', '10.0.23.1')],
            [makeNeighbor('10.0.12.1', 65001), makeNeighbor('10.0.23.2', 65003)],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [makeNeighbor('10.0.12.2', 65001), makeNeighbor('10.0.13.2', 65002)],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r2', '203.0.113.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [makeNeighbor('10.0.12.2', 65002), makeNeighbor('10.0.13.2', 65003)],
            ['198.51.100.0/24'],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2'), makeIface('to-r3', '10.0.23.1')],
            [makeNeighbor('10.0.12.1', 65001), makeNeighbor('10.0.23.2', 65003)],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [makeIface('to-r1', '10.0.13.2'), makeIface('to-r2', '10.0.23.2')],
            [makeNeighbor('10.0.13.1', 65001), makeNeighbor('10.0.23.1', 65002)],
          ),
        ],
      });

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '198.51.100.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [makeNeighbor('10.0.12.2', 65002), makeNeighbor('10.0.13.2', 65003)],
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
            [makeIface('to-r1', '10.0.13.2'), makeIface('to-r4', '10.0.34.1')],
            [makeNeighbor('10.0.13.1', 65001), makeNeighbor('10.0.34.2', 65004)],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
      });
    });

    // TC-216 — LOCAL_PREF is local to an AS: R1 raising it for routes from
    // R2 must not make R3, in another AS, prefer the longer path through R1.
    it('does not carry LOCAL_PREF across an eBGP session', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [
              makeNeighbor('10.0.12.2', 65002, { localPref: 200 }),
              makeNeighbor('10.0.13.2', 65003),
            ],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2'), makeIface('to-r3', '10.0.23.1')],
            [makeNeighbor('10.0.12.1', 65001), makeNeighbor('10.0.23.2', 65003)],
            ['203.0.113.0/24'],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [makeIface('to-r1', '10.0.13.2'), makeIface('to-r2', '10.0.23.2')],
            [makeNeighbor('10.0.13.1', 65001), makeNeighbor('10.0.23.1', 65002)],
          ),
        ],
      });

      const routes = new BgpProtocol().computeRoutes(topology);
      expect(findRoute(routes, 'r1', '203.0.113.0/24')).toMatchObject({ nextHop: '10.0.12.2' });
      expect(findRoute(routes, 'r3', '203.0.113.0/24')).toMatchObject({
        nextHop: '10.0.23.1',
        metric: 1,
      });
    });

    it('prefers eBGP over iBGP when other attributes equal', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r4', '10.0.14.1')],
            [makeNeighbor('10.0.12.2', 65001), makeNeighbor('10.0.14.2', 65004)],
          ),
          makeRouter(
            'r2',
            65001,
            '1.1.1.2',
            [makeIface('to-r1', '10.0.12.2'), makeIface('to-r3', '10.0.23.1')],
            [makeNeighbor('10.0.12.1', 65001), makeNeighbor('10.0.23.2', 65003)],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [makeNeighbor('10.0.12.2', 65002), makeNeighbor('10.0.13.2', 65003)],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
        nextHop: '10.0.13.2',
      });
    });

    it('installs equivalent BGP best paths up to maxEcmpPaths', () => {
      const r1 = makeRouter(
        'r1',
        65001,
        '1.1.1.1',
        [
          makeIface('to-r2', '10.0.12.1'),
          makeIface('to-r3', '10.0.13.1'),
          makeIface('to-r4', '10.0.14.1'),
        ],
        [
          makeNeighbor('10.0.12.2', 65002),
          makeNeighbor('10.0.13.2', 65003),
          makeNeighbor('10.0.14.2', 65004),
        ],
      );
      if (r1.data.role === 'router' && r1.data.bgpConfig) {
        r1.data.bgpConfig.maxEcmpPaths = 2;
      }
      const topology = makeTopology({
        nodes: [
          r1,
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
        nextHop: '10.0.12.2',
        equalCostNextHops: [{ nextHop: '10.0.12.2' }, { nextHop: '10.0.13.2' }],
      });
    });

    it('handles multi-AS triangle (AS1—AS2—AS3)', () => {
      const topology = makeTopology({
        nodes: [
          makeRouter(
            'r1',
            65001,
            '1.1.1.1',
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [makeNeighbor('10.0.12.2', 65002), makeNeighbor('10.0.13.2', 65003)],
          ),
          makeRouter(
            'r2',
            65002,
            '2.2.2.2',
            [makeIface('to-r1', '10.0.12.2'), makeIface('to-r3', '10.0.23.1')],
            [makeNeighbor('10.0.12.1', 65001), makeNeighbor('10.0.23.2', 65003)],
          ),
          makeRouter(
            'r3',
            65003,
            '3.3.3.3',
            [makeIface('to-r1', '10.0.13.2'), makeIface('to-r2', '10.0.23.2')],
            [makeNeighbor('10.0.13.1', 65001), makeNeighbor('10.0.23.1', 65002)],
            ['203.0.113.0/24'],
          ),
        ],
      });

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r1', '203.0.113.0/24'),
      ).toMatchObject({
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
            [makeIface('to-r2', '10.0.12.1'), makeIface('to-r3', '10.0.13.1')],
            [makeNeighbor('10.0.12.2', 65001), makeNeighbor('10.0.13.2', 65002)],
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

      expect(
        findRoute(new BgpProtocol().computeRoutes(topology), 'r2', '203.0.113.0/24'),
      ).toMatchObject({
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

// --- The decision process, RFC 4271 §9.1 ---------------------------------------------

interface Peer {
  id: string;
  as: number;
  routerId: string;
  /** The neighbour entry r1 keeps for this peer. */
  policy?: Partial<BgpNeighborConfig>;
  /** r1's subnet number towards this peer. */
  link: number;
  /** A peer address other than `10.0.<link>.2`. */
  address?: string;
}

const PREFIX = '10.99.0.0/24';

/** r1 (AS 65001, id 9.9.9.9) with these peers, each of which originates PREFIX. */
function siteWith(peers: Peer[]): NetworkTopology {
  const r1Interfaces = peers.map((peer) => makeIface(`r1-${peer.link}`, `10.0.${peer.link}.1`));
  const addressOf = (peer: Peer) => peer.address ?? `10.0.${peer.link}.2`;
  const r1 = makeRouter(
    'r1',
    65001,
    '9.9.9.9',
    r1Interfaces,
    peers.map((peer) => makeNeighbor(addressOf(peer), peer.as, peer.policy)),
  );
  return makeTopology({
    nodes: [
      r1,
      ...peers.map((peer) =>
        makeRouter(
          peer.id,
          peer.as,
          peer.routerId,
          [makeIface(`${peer.id}-0`, addressOf(peer))],
          [makeNeighbor(`10.0.${peer.link}.1`, 65001)],
          [PREFIX],
        ),
      ),
    ],
  });
}

function exitOf(topology: NetworkTopology): string | undefined {
  return findRoute(new BgpProtocol().computeRoutes(topology), 'r1', PREFIX)?.nextHop;
}

describe('the BGP decision order (RFC 4271 §9.1.2.2)', () => {
  it('TC-1080: ORIGIN is compared before MED, and a neighbour entry can set it (TC-1088)', () => {
    const topology = siteWith([
      {
        id: 'a',
        as: 65010,
        routerId: '1.1.1.1',
        link: 1,
        policy: { origin: 'incomplete', med: 0 },
      },
      { id: 'b', as: 65010, routerId: '2.2.2.2', link: 2, policy: { origin: 'igp', med: 50 } },
    ]);
    expect(exitOf(topology)).toBe('10.0.2.2');
  });

  it('TC-1080: EGP sits between IGP and INCOMPLETE', () => {
    const topology = siteWith([
      { id: 'a', as: 65010, routerId: '1.1.1.1', link: 1, policy: { origin: 'incomplete' } },
      { id: 'b', as: 65020, routerId: '2.2.2.2', link: 2, policy: { origin: 'egp' } },
    ]);
    expect(exitOf(topology)).toBe('10.0.2.2');
  });

  it('TC-1081: MED is not compared between different neighbouring ASes', () => {
    const topology = siteWith([
      { id: 'a', as: 65010, routerId: '1.1.1.1', link: 1, policy: { med: 100 } },
      { id: 'b', as: 65020, routerId: '2.2.2.2', link: 2, policy: { med: 5 } },
    ]);
    expect(exitOf(topology)).toBe('10.0.1.2');
  });

  it('TC-1082: within one neighbouring AS the lower MED wins', () => {
    const topology = siteWith([
      { id: 'a', as: 65010, routerId: '1.1.1.1', link: 1, policy: { med: 100 } },
      { id: 'b', as: 65010, routerId: '2.2.2.2', link: 2, policy: { med: 5 } },
    ]);
    expect(exitOf(topology)).toBe('10.0.2.2');
  });

  it('TC-1083: the MED cycle gives one answer in every order', () => {
    const a: Peer = { id: 'a', as: 65010, routerId: '1.1.1.1', link: 1, policy: { med: 10 } };
    const b: Peer = { id: 'b', as: 65010, routerId: '3.3.3.3', link: 2, policy: { med: 5 } };
    const c: Peer = { id: 'c', as: 65020, routerId: '2.2.2.2', link: 3 };
    // Two at a time: a beats c, c beats b, b beats a. In full: b removes a, then c wins on id.
    for (const order of [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ]) {
      expect(exitOf(siteWith(order))).toBe('10.0.3.2');
    }
  });

  it('TC-1085: BGP Identifiers compare as numbers', () => {
    const topology = siteWith([
      { id: 'a', as: 65010, routerId: '10.0.0.10', link: 1 },
      { id: 'b', as: 65020, routerId: '10.0.0.9', link: 2 },
    ]);
    expect(exitOf(topology)).toBe('10.0.2.2');
  });

  it('TC-1086: between two sessions to one router the lower peer address wins, as a number', () => {
    const r1 = makeRouter(
      'r1',
      65001,
      '9.9.9.9',
      [makeIface('a', '10.0.0.5'), makeIface('b', '10.0.0.9')],
      [makeNeighbor('10.0.0.10', 65010), makeNeighbor('10.0.0.6', 65010)],
    );
    const peer = makeRouter(
      'p',
      65010,
      '1.1.1.1',
      [makeIface('a', '10.0.0.6'), makeIface('b', '10.0.0.10')],
      [makeNeighbor('10.0.0.5', 65001), makeNeighbor('10.0.0.9', 65001)],
      [PREFIX],
    );
    expect(exitOf(makeTopology({ nodes: [r1, peer] }))).toBe('10.0.0.6');
  });

  it('TC-1084: eBGP beats iBGP once MED has not decided', () => {
    const r1 = makeRouter(
      'r1',
      65001,
      '9.9.9.9',
      [makeIface('a', '10.0.1.1'), makeIface('b', '10.0.2.1')],
      [makeNeighbor('10.0.1.2', 65010), makeNeighbor('10.0.2.2', 65001)],
    );
    const external = makeRouter(
      'ext',
      65010,
      '5.5.5.5',
      [makeIface('a', '10.0.1.2')],
      [makeNeighbor('10.0.1.1', 65001)],
      [PREFIX],
    );
    const internal = makeRouter(
      'int',
      65001,
      '1.1.1.1',
      [makeIface('a', '10.0.2.2'), makeIface('b', '10.0.3.1')],
      [makeNeighbor('10.0.2.1', 65001), makeNeighbor('10.0.3.2', 65020)],
    );
    const far = makeRouter(
      'far',
      65020,
      '6.6.6.6',
      [makeIface('a', '10.0.3.2')],
      [makeNeighbor('10.0.3.1', 65001)],
      [PREFIX],
    );
    expect(exitOf(makeTopology({ nodes: [r1, external, internal, far] }))).toBe('10.0.1.2');
  });

  it('TC-1087: MED does not travel to a further AS', () => {
    // Both r2 routers learn PREFIX from origin; r2a records MED 50 for it. If that MED
    // reached r1, r2b would win on it; it does not, so the lower Identifier does.
    const r1 = makeRouter(
      'r1',
      65001,
      '9.9.9.9',
      [makeIface('a', '10.0.1.1'), makeIface('b', '10.0.2.1')],
      [makeNeighbor('10.0.1.2', 65002), makeNeighbor('10.0.2.2', 65002)],
    );
    const r2a = makeRouter(
      'r2a',
      65002,
      '1.1.1.1',
      [makeIface('a', '10.0.1.2'), makeIface('b', '10.0.3.1')],
      [makeNeighbor('10.0.1.1', 65001), makeNeighbor('10.0.3.2', 65003, { med: 50 })],
    );
    const r2b = makeRouter(
      'r2b',
      65002,
      '2.2.2.2',
      [makeIface('a', '10.0.2.2'), makeIface('b', '10.0.4.1')],
      [makeNeighbor('10.0.2.1', 65001), makeNeighbor('10.0.4.2', 65003)],
    );
    const origin = makeRouter(
      'origin',
      65003,
      '3.3.3.3',
      [makeIface('a', '10.0.3.2'), makeIface('b', '10.0.4.2')],
      [makeNeighbor('10.0.3.1', 65002), makeNeighbor('10.0.4.1', 65002)],
      [PREFIX],
    );
    expect(exitOf(makeTopology({ nodes: [r1, r2a, r2b, origin] }))).toBe('10.0.1.2');
  });

  it('TC-1087: over iBGP the MED is kept', () => {
    // i1 and i2 learn PREFIX from one AS; i1 records MED 50. r1 hears both over iBGP.
    const r1 = makeRouter(
      'r1',
      65001,
      '9.9.9.9',
      [makeIface('a', '10.0.1.1'), makeIface('b', '10.0.2.1')],
      [makeNeighbor('10.0.1.2', 65001), makeNeighbor('10.0.2.2', 65001)],
    );
    const i1 = makeRouter(
      'i1',
      65001,
      '1.1.1.1',
      [makeIface('a', '10.0.1.2'), makeIface('b', '10.0.3.1')],
      [makeNeighbor('10.0.1.1', 65001), makeNeighbor('10.0.3.2', 65003, { med: 50 })],
    );
    const i2 = makeRouter(
      'i2',
      65001,
      '2.2.2.2',
      [makeIface('a', '10.0.2.2'), makeIface('b', '10.0.4.1')],
      [makeNeighbor('10.0.2.1', 65001), makeNeighbor('10.0.4.2', 65003)],
    );
    const origin = makeRouter(
      'origin',
      65003,
      '3.3.3.3',
      [makeIface('a', '10.0.3.2'), makeIface('b', '10.0.4.2')],
      [makeNeighbor('10.0.3.1', 65001), makeNeighbor('10.0.4.1', 65001)],
      [PREFIX],
    );
    expect(exitOf(makeTopology({ nodes: [r1, i1, i2, origin] }))).toBe('10.0.2.2');
  });
});
