import { describe, expect, it } from 'vitest';
import { BgpProtocol } from './BgpProtocol';
import type { NetworkTopology } from '../../types/topology';

function twoRouters(edges: NetworkTopology['edges'] = []): NetworkTopology {
  return {
    nodes: [
      {
        id: 'r1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'r1-r2',
              name: 'r1-r2',
              ipAddress: '10.0.0.1',
              prefixLength: 30,
              ipv6Address: '2001:db8:12::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:00:01',
            },
          ],
          bgpConfig: {
            localAs: 65001,
            routerId: '1.1.1.1',
            networks: ['2001:db8:1::/64'],
            neighbors: [{ address: '2001:db8:12::2', remoteAs: 65002, families: ['v6'] }],
          },
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 100, y: 0 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'r2-r1',
              name: 'r2-r1',
              ipAddress: '10.0.0.2',
              prefixLength: 30,
              ipv6Address: '2001:db8:12::2',
              prefixLength6: 64,
              macAddress: '02:00:00:00:00:02',
            },
          ],
          bgpConfig: {
            localAs: 65002,
            routerId: '2.2.2.2',
            networks: ['2001:db8:2::/64'],
            neighbors: [{ address: '2001:db8:12::1', remoteAs: 65001, families: ['v6'] }],
          },
        },
      },
    ],
    edges,
    areas: [],
    routeTables: new Map(),
  };
}

describe('BgpProtocol MP-BGP IPv6', () => {
  it('exchanges IPv6 unicast routes only with v6-capable neighbors', () => {
    const topology = twoRouters();

    const routes = new BgpProtocol().computeRoutes(topology);

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'r1',
          destination: '2001:db8:2::/64',
          nextHop: '2001:db8:12::2',
          af: 'v6',
        }),
        expect.objectContaining({
          nodeId: 'r2',
          destination: '2001:db8:1::/64',
          nextHop: '2001:db8:12::1',
          af: 'v6',
        }),
      ]),
    );
  });

  // TC-240: an eBGP session whose neighbour address sits on a failed link is
  // down, so nothing is learned through it.
  it('TC-240: learns no route from a neighbour on a down link', () => {
    const routes = new BgpProtocol().computeRoutes(
      twoRouters([{ id: 'e12', source: 'r1', target: 'r2', data: { state: 'down' } }]),
    );

    expect(routes.filter((route) => route.nextHop !== 'direct')).toEqual([]);
  });
});
