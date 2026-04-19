import { describe, expect, it } from 'vitest';
import type { RouterInterface } from '../types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../types/topology';
import { buildRouterAdjacency, getConnectedNetworks } from './graphBuilder';

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function makeRouter(id: string, interfaces: Partial<RouterInterface>[]): NetlabNode {
  return {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3',
      interfaces: interfaces.map((iface, index) => ({
        id: `eth${index}`,
        name: `eth${index}`,
        ipAddress: `10.0.${index}.1`,
        prefixLength: 24,
        macAddress: `00:00:00:00:00:0${index}`,
        ...iface,
      })),
    },
  };
}

function makeNode(id: string, role: string, type: NetlabNode['type']): NetlabNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role,
      layerId: role === 'switch' ? 'l2' : 'l7',
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

describe('buildRouterAdjacency', () => {
  it('returns empty map when no routers exist', () => {
    const topology = makeTopology({
      nodes: [makeNode('client-1', 'client', 'client')],
    });

    expect(buildRouterAdjacency(topology)).toEqual(new Map());
  });

  it('returns empty adjacency for isolated router (no edges)', () => {
    const topology = makeTopology({
      nodes: [makeRouter('r1', [{ ipAddress: '10.0.0.1', prefixLength: 24 }])],
    });

    expect(buildRouterAdjacency(topology)).toEqual(new Map([['r1', []]]));
  });

  it('discovers bidirectional adjacency between two connected routers', () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('r1', [{ ipAddress: '10.0.12.1', prefixLength: 30 }]),
        makeRouter('r2', [{ ipAddress: '10.0.12.2', prefixLength: 30 }]),
      ],
      edges: [makeEdge('e1', 'r1', 'r2')],
    });

    const adjacency = buildRouterAdjacency(topology);

    expect(adjacency.get('r1')).toEqual([
      expect.objectContaining({
        neighborId: 'r2',
        edgeId: 'e1',
        localIface: expect.objectContaining({ id: 'eth0', ipAddress: '10.0.12.1' }),
        neighborIface: expect.objectContaining({ id: 'eth0', ipAddress: '10.0.12.2' }),
      }),
    ]);
    expect(adjacency.get('r2')).toEqual([
      expect.objectContaining({
        neighborId: 'r1',
        edgeId: 'e1',
        localIface: expect.objectContaining({ id: 'eth0', ipAddress: '10.0.12.2' }),
        neighborIface: expect.objectContaining({ id: 'eth0', ipAddress: '10.0.12.1' }),
      }),
    ]);
  });

  it('resolves interfaces via edge sourceHandle/targetHandle', () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('r1', [
          { id: 'lan0', name: 'lan0', ipAddress: '192.0.2.1', prefixLength: 24 },
          { id: 'wan0', name: 'wan0', ipAddress: '10.0.12.1', prefixLength: 30 },
        ]),
        makeRouter('r2', [
          { id: 'wan9', name: 'wan9', ipAddress: '10.0.12.2', prefixLength: 30 },
          { id: 'lan9', name: 'lan9', ipAddress: '198.51.100.1', prefixLength: 24 },
        ]),
      ],
      edges: [makeEdge('e1', 'r1', 'r2', 'wan0', 'wan9')],
    });

    const adjacency = buildRouterAdjacency(topology);
    const [entry] = adjacency.get('r1') ?? [];

    expect(entry.localIface.id).toBe('wan0');
    expect(entry.neighborIface.id).toBe('wan9');
  });

  it('falls back to subnet matching when no handles present', () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('r1', [
          { ipAddress: '192.0.2.1', prefixLength: 24 },
          { ipAddress: '10.0.12.1', prefixLength: 30 },
        ]),
        makeRouter('r2', [
          { ipAddress: '10.0.12.2', prefixLength: 30 },
          { ipAddress: '198.51.100.1', prefixLength: 24 },
        ]),
      ],
      edges: [makeEdge('e1', 'r1', 'r2')],
    });

    const adjacency = buildRouterAdjacency(topology);
    const [entry] = adjacency.get('r1') ?? [];

    expect(entry.localIface.ipAddress).toBe('10.0.12.1');
    expect(entry.neighborIface.ipAddress).toBe('10.0.12.2');
  });

  it('ignores non-router nodes (clients, switches)', () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('r1', [{ ipAddress: '10.0.10.1', prefixLength: 24 }]),
        makeNode('client-1', 'client', 'client'),
        makeNode('switch-1', 'switch', 'switch'),
      ],
      edges: [makeEdge('e1', 'r1', 'client-1'), makeEdge('e2', 'r1', 'switch-1')],
    });

    expect(buildRouterAdjacency(topology)).toEqual(new Map([['r1', []]]));
  });

  it('handles multi-hop chain (R1—R2—R3)', () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('r1', [{ ipAddress: '10.0.12.1', prefixLength: 30 }]),
        makeRouter('r2', [
          { ipAddress: '10.0.12.2', prefixLength: 30 },
          { ipAddress: '10.0.23.2', prefixLength: 30 },
        ]),
        makeRouter('r3', [{ ipAddress: '10.0.23.3', prefixLength: 30 }]),
      ],
      edges: [makeEdge('e12', 'r1', 'r2'), makeEdge('e23', 'r2', 'r3')],
    });

    const adjacency = buildRouterAdjacency(topology);

    expect(adjacency.get('r1')).toHaveLength(1);
    expect(adjacency.get('r2')).toHaveLength(2);
    expect(adjacency.get('r3')).toHaveLength(1);
  });

  it('uses default cost 1 for each link', () => {
    const topology = makeTopology({
      nodes: [
        makeRouter('r1', [{ ipAddress: '10.0.12.1', prefixLength: 30 }]),
        makeRouter('r2', [{ ipAddress: '10.0.12.2', prefixLength: 30 }]),
      ],
      edges: [makeEdge('e1', 'r1', 'r2')],
    });

    const [entry] = buildRouterAdjacency(topology).get('r1') ?? [];
    expect(entry.cost).toBe(1);
  });
});

describe('getConnectedNetworks', () => {
  it('returns one connected-network entry for each router interface', () => {
    const router = makeRouter('r1', [
      { ipAddress: '10.0.0.1', prefixLength: 24 },
      { ipAddress: '172.16.0.2', prefixLength: 30 },
    ]);

    expect(getConnectedNetworks(router)).toEqual([
      { cidr: '10.0.0.0/24' },
      { cidr: '172.16.0.0/30' },
    ]);
  });

  it('returns empty array for node without interfaces', () => {
    const router = makeRouter('r1', []);

    expect(getConnectedNetworks(router)).toEqual([]);
  });

  it('returns empty array for non-router node', () => {
    expect(getConnectedNetworks(makeNode('client-1', 'client', 'client'))).toEqual([]);
  });

  describe('VLAN sub-interfaces', () => {
    it('emits one connected network per sub-interface in addition to the parent interface', () => {
      const router = makeRouter('r1', [
        {
          id: 'eth0',
          name: 'eth0',
          ipAddress: '192.0.2.1',
          prefixLength: 24,
          subInterfaces: [
            {
              id: 'eth0.10',
              parentInterfaceId: 'eth0',
              vlanId: 10,
              ipAddress: '10.0.10.1',
              prefixLength: 24,
            },
            {
              id: 'eth0.20',
              parentInterfaceId: 'eth0',
              vlanId: 20,
              ipAddress: '10.0.20.1',
              prefixLength: 24,
            },
          ],
        },
      ]);

      expect(getConnectedNetworks(router)).toEqual([
        { cidr: '192.0.2.0/24' },
        { cidr: '10.0.10.0/24', vlanId: 10 },
        { cidr: '10.0.20.0/24', vlanId: 20 },
      ]);
    });

    it('annotates sub-interface-derived networks with their vlanId', () => {
      const router = makeRouter('r1', [
        {
          id: 'eth0',
          name: 'eth0',
          ipAddress: '192.0.2.1',
          prefixLength: 24,
          subInterfaces: [
            {
              id: 'eth0.30',
              parentInterfaceId: 'eth0',
              vlanId: 30,
              ipAddress: '10.30.0.1',
              prefixLength: 24,
            },
          ],
        },
      ]);

      expect(getConnectedNetworks(router)).toContainEqual({ cidr: '10.30.0.0/24', vlanId: 30 });
    });

    it('returns identical results for routers with no subInterfaces (regression guard)', () => {
      const router = makeRouter('r1', [
        { ipAddress: '10.0.0.1', prefixLength: 24 },
        { ipAddress: '172.16.0.2', prefixLength: 30 },
      ]);

      expect(getConnectedNetworks(router)).toEqual([
        { cidr: '10.0.0.0/24' },
        { cidr: '172.16.0.0/30' },
      ]);
    });
  });
});
