import { describe, expect, it } from 'vitest';
import { OspfV3Protocol, buildOspfV3Hello, buildOspfV3LinkLsa } from './OspfV3Protocol';
import type { NetworkTopology } from '../../types/topology';

function iface(id: string, ip: string, ipv6: string) {
  return {
    id,
    name: id,
    ipAddress: ip,
    prefixLength: 30,
    ipv6Address: ipv6,
    prefixLength6: 64,
    macAddress: `02:00:00:00:00:${id.slice(-1).padStart(2, '0')}`,
  };
}

function topology(): NetworkTopology {
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
            iface('r1-a', '10.0.0.1', '2001:db8:12::1'),
            iface('r1-b', '10.0.1.1', '2001:db8:13::1'),
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
            iface('r2-a', '10.0.0.2', '2001:db8:12::2'),
            iface('r2-c', '10.0.2.1', '2001:db8:23::1'),
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
            iface('r3-b', '10.0.1.2', '2001:db8:13::2'),
            iface('r3-c', '10.0.2.2', '2001:db8:23::2'),
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
      { id: 'e13', source: 'r1', target: 'r3' },
      { id: 'e23', source: 'r2', target: 'r3' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

describe('OspfV3Protocol', () => {
  it('builds OSPFv3 hello and Link-LSA teaching packets', () => {
    expect(
      buildOspfV3Hello({ routerId: '1.1.1.1', areaId: '0.0.0.0', instanceId: 7 }),
    ).toMatchObject({
      version: 3,
      type: 'hello',
      destination: 'ff02::5',
      instanceId: 7,
    });
    expect(
      buildOspfV3LinkLsa({
        linkLocalAddress: 'fe80::1',
        prefixes: [{ prefix: '2001:db8:12::', length: 64 }],
      }),
    ).toMatchObject({ kind: 'link-lsa', lsaType: 8, prefixCount: 1 });
  });

  it('installs IPv6 OSPF routes with ECMP next hops', () => {
    const routes = new OspfV3Protocol().computeRoutes(topology());
    const r1ToR23 = routes.find(
      (route) => route.nodeId === 'r1' && route.destination === '2001:db8:23::/64',
    );

    expect(r1ToR23).toMatchObject({
      af: 'v6',
      protocol: 'ospfv3',
      destination: '2001:db8:23::/64',
      equalCostNextHops: [{ nextHop: '2001:db8:12::2' }, { nextHop: '2001:db8:13::2' }],
    });
  });
});
