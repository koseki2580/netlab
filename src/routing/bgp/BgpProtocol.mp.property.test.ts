import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { NetworkTopology } from '../../types/topology';
import { BgpProtocol } from './BgpProtocol';

function topology(v6Enabled: boolean): NetworkTopology {
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
            neighbors: [
              {
                address: '2001:db8:12::2',
                remoteAs: 65002,
                families: v6Enabled ? ['v6'] : ['v4'],
              },
            ],
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
            neighbors: [
              {
                address: '2001:db8:12::1',
                remoteAs: 65001,
                families: v6Enabled ? ['v6'] : ['v4'],
              },
            ],
          },
        },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

describe('MP-BGP properties', () => {
  it('exchanges IPv6 NLRI only when both peers enable v6', () => {
    fc.assert(
      fc.property(fc.boolean(), (v6Enabled) => {
        const routes = new BgpProtocol().computeRoutes(topology(v6Enabled));
        const learned = routes.some(
          (route) => route.nodeId === 'r1' && route.destination === '2001:db8:2::/64',
        );
        expect(learned).toBe(v6Enabled);
      }),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
