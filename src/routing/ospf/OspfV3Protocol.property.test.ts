import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { NetworkTopology } from '../../types/topology';
import { OspfV3Protocol } from './OspfV3Protocol';

function iface(id: string, ip: string, ipv6: string, mac: string) {
  return {
    id,
    name: id,
    ipAddress: ip,
    prefixLength: 30,
    ipv6Address: ipv6,
    prefixLength6: 64,
    macAddress: mac,
  };
}

function topology(withDiagonal: boolean): NetworkTopology {
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
            iface('r1-a', '10.0.0.1', '2001:db8:12::1', '02:00:00:00:01:01'),
            iface('r1-b', '10.0.1.1', '2001:db8:13::1', '02:00:00:00:01:02'),
          ],
          ospfv3Config: {
            routerId: '1.1.1.1',
            areas: [{ areaId: '0.0.0.0', networks: ['2001:db8:12::/64', '2001:db8:13::/64'] }],
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
            iface('r2-a', '10.0.0.2', '2001:db8:12::2', '02:00:00:00:02:01'),
            iface('r2-c', '10.0.2.1', '2001:db8:23::1', '02:00:00:00:02:02'),
          ],
          ospfv3Config: {
            routerId: '2.2.2.2',
            areas: [{ areaId: '0.0.0.0', networks: ['2001:db8:12::/64', '2001:db8:23::/64'] }],
          },
        },
      },
      {
        id: 'r3',
        type: 'router',
        position: { x: 50, y: 100 },
        data: {
          label: 'R3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('r3-b', '10.0.1.2', '2001:db8:13::2', '02:00:00:00:03:01'),
            iface('r3-c', '10.0.2.2', '2001:db8:23::2', '02:00:00:00:03:02'),
          ],
          ospfv3Config: {
            routerId: '3.3.3.3',
            areas: [{ areaId: '0.0.0.0', networks: ['2001:db8:13::/64', '2001:db8:23::/64'] }],
          },
        },
      },
    ],
    edges: [
      { id: 'e12', source: 'r1', target: 'r2' },
      ...(withDiagonal ? [{ id: 'e13', source: 'r1', target: 'r3' }] : []),
      { id: 'e23', source: 'r2', target: 'r3' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

describe('OspfV3Protocol properties', () => {
  it('converges deterministically and exposes ECMP only when equal paths exist', () => {
    fc.assert(
      fc.property(fc.boolean(), (withDiagonal) => {
        const routes = new OspfV3Protocol().computeRoutes(topology(withDiagonal));
        const route = routes.find(
          (candidate) => candidate.nodeId === 'r1' && candidate.destination === '2001:db8:23::/64',
        );

        expect(route?.af).toBe('v6');
        expect(route?.equalCostNextHops?.length ?? 1).toBe(withDiagonal ? 2 : 1);
      }),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
