import { describe, expect, it } from 'vitest';
import type { OspfConfig, RouterInterface } from '../../types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../../types/topology';
import { OspfProtocol } from './OspfProtocol';
import { ospfLsdb, routerLsdb } from './OspfLsdb';

type Port = [id: string, cidr: string, priority?: number];

function router(id: string, routerId: string, ports: Port[], ospf: Omit<OspfConfig, 'routerId'>) {
  const interfaces: RouterInterface[] = ports.map(([portId, cidr, priority], index) => {
    const [ipAddress = '', prefix = '24'] = cidr.split('/');
    return {
      id: portId,
      name: portId,
      ipAddress,
      prefixLength: Number(prefix),
      macAddress: `02:00:00:00:${id.length.toString(16).padStart(2, '0')}:${index.toString(16).padStart(2, '0')}`,
      ...(priority === undefined ? {} : { ospfPriority: priority }),
    };
  });
  const node: NetlabNode = {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3',
      interfaces,
      ospfConfig: { routerId, ...ospf },
    },
  };
  return node;
}

const lanSwitch = (id: string): NetlabNode => ({
  id,
  type: 'switch',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'switch', layerId: 'l2', ports: [] },
});

const cable = (a: string, aPort: string, b: string, bPort?: string): NetlabEdge => ({
  id: `${a}-${b}`,
  source: a,
  target: b,
  sourceHandle: aPort,
  ...(bPort ? { targetHandle: bPort } : {}),
  type: 'smoothstep',
});

const topology = (nodes: NetlabNode[], edges: NetlabEdge[]): NetworkTopology => ({
  nodes,
  edges,
  areas: [],
  routeTables: new Map(),
});

const routes = (t: NetworkTopology) => new OspfProtocol().computeRoutes(t);
const route = (t: NetworkTopology, nodeId: string, destination: string) =>
  routes(t).find((entry) => entry.nodeId === nodeId && entry.destination === destination);

/**
 *  area 1                backbone                area 2
 * r1 ---------- abr1 ---------- core ---------- abr2 ---------- r2
 * 10.1.1.0/24  .0.1.0/30      .0.2.0/30       .0.3.0/30      10.2.2.0/24
 */
function threeAreas(): NetworkTopology {
  return topology(
    [
      router(
        'r1',
        '1.1.1.1',
        [
          ['lan', '10.1.1.1/24'],
          ['up', '10.0.1.1/30'],
        ],
        { areas: [{ areaId: '0.0.0.1', networks: ['10.1.1.0/24', '10.0.1.0/30'] }] },
      ),
      router(
        'abr1',
        '2.2.2.2',
        [
          ['down', '10.0.1.2/30'],
          ['up', '10.0.2.1/30'],
        ],
        {
          areas: [
            { areaId: '0.0.0.1', networks: ['10.0.1.0/30'] },
            { areaId: '0.0.0.0', networks: ['10.0.2.0/30'] },
          ],
        },
      ),
      router(
        'core',
        '3.3.3.3',
        [
          ['a', '10.0.2.2/30'],
          ['b', '10.0.3.1/30'],
        ],
        { areas: [{ areaId: '0', networks: ['10.0.2.0/30', '10.0.3.0/30'] }] },
      ),
      router(
        'abr2',
        '4.4.4.4',
        [
          ['up', '10.0.3.2/30'],
          ['down', '10.0.4.1/30'],
        ],
        {
          areas: [
            { areaId: '0.0.0.0', networks: ['10.0.3.0/30'] },
            { areaId: '0.0.0.2', networks: ['10.0.4.0/30'] },
          ],
        },
      ),
      router(
        'r2',
        '5.5.5.5',
        [
          ['up', '10.0.4.2/30'],
          ['lan', '10.2.2.1/24'],
        ],
        { areas: [{ areaId: '0.0.0.2', networks: ['10.0.4.0/30', '10.2.2.0/24'] }] },
      ),
    ],
    [
      cable('r1', 'up', 'abr1', 'down'),
      cable('abr1', 'up', 'core', 'a'),
      cable('core', 'b', 'abr2', 'up'),
      cable('abr2', 'down', 'r2', 'up'),
    ],
  );
}

describe('OSPF areas (RFC 2328 §16)', () => {
  it('TC-1091: a route to another area costs the way to the ABR plus the ABR’s cost', () => {
    const t = threeAreas();
    expect(route(t, 'r1', '10.2.2.0/24')).toMatchObject({
      nextHop: '10.0.1.2',
      metric: 5,
      ospfPathType: 'inter-area',
    });
    expect(route(t, 'core', '10.1.1.0/24')).toMatchObject({
      nextHop: '10.0.2.1',
      metric: 3,
      ospfPathType: 'inter-area',
    });
    expect(route(t, 'r1', '10.1.1.0/24')).toMatchObject({
      nextHop: 'direct',
      ospfPathType: 'intra-area',
    });
    expect(route(t, 'abr1', '10.1.1.0/24')).toMatchObject({ ospfPathType: 'intra-area' });
  });

  it('TC-1090: an intra-area route is preferred however much it costs', () => {
    // r1 and r2 both stand in the backbone and area 1. The area-1 cable costs 100; the
    // backbone way through b costs 2. The server's LAN is in area 1, so r1 keeps area 1.
    const t = topology(
      [
        router(
          'r1',
          '1.1.1.1',
          [
            ['slow', '10.0.9.1/30'],
            ['fast', '10.0.1.1/30'],
          ],
          {
            areas: [
              { areaId: '0.0.0.1', networks: ['10.0.9.0/30'], cost: 100 },
              { areaId: '0.0.0.0', networks: ['10.0.1.0/30'] },
            ],
          },
        ),
        router(
          'b',
          '2.2.2.2',
          [
            ['a', '10.0.1.2/30'],
            ['c', '10.0.2.1/30'],
          ],
          { areas: [{ areaId: '0.0.0.0', networks: ['10.0.1.0/30', '10.0.2.0/30'] }] },
        ),
        router(
          'r2',
          '3.3.3.3',
          [
            ['slow', '10.0.9.2/30'],
            ['fast', '10.0.2.2/30'],
            ['lan', '10.7.0.1/24'],
          ],
          {
            areas: [
              { areaId: '0.0.0.1', networks: ['10.0.9.0/30', '10.7.0.0/24'] },
              { areaId: '0.0.0.0', networks: ['10.0.2.0/30'] },
            ],
          },
        ),
      ],
      [
        cable('r1', 'slow', 'r2', 'slow'),
        cable('r1', 'fast', 'b', 'a'),
        cable('b', 'c', 'r2', 'fast'),
      ],
    );
    expect(route(t, 'r1', '10.7.0.0/24')).toMatchObject({
      nextHop: '10.0.9.2',
      metric: 101,
      ospfPathType: 'intra-area',
    });
    // b has only the summary from the ABRs, so it takes the cheaper of them: r2.
    expect(route(t, 'b', '10.7.0.0/24')).toMatchObject({
      nextHop: '10.0.2.2',
      ospfPathType: 'inter-area',
    });
  });

  it('TC-1092: an ABR summarises a range at the highest cost of its parts, and hides them', () => {
    const t = topology(
      [
        router(
          'r1',
          '1.1.1.1',
          [
            ['a', '10.1.1.1/24'],
            ['b', '10.1.2.1/24'],
            ['up', '10.0.1.1/30'],
          ],
          {
            areas: [
              { areaId: '0.0.0.1', networks: ['10.1.1.0/24', '10.0.1.0/30'] },
              { areaId: '0.0.0.1', networks: ['10.1.2.0/24'], cost: 20 },
            ],
          },
        ),
        router(
          'abr',
          '2.2.2.2',
          [
            ['down', '10.0.1.2/30'],
            ['up', '10.0.2.1/30'],
          ],
          {
            areas: [
              { areaId: '0.0.0.1', networks: ['10.0.1.0/30'], ranges: ['10.1.0.0/16'] },
              { areaId: '0.0.0.0', networks: ['10.0.2.0/30'] },
            ],
          },
        ),
        router('core', '3.3.3.3', [['a', '10.0.2.2/30']], {
          areas: [{ areaId: '0.0.0.0', networks: ['10.0.2.0/30'] }],
        }),
      ],
      [cable('r1', 'up', 'abr', 'down'), cable('abr', 'up', 'core', 'a')],
    );
    expect(route(t, 'core', '10.1.0.0/16')).toMatchObject({
      metric: 1 + 1 + 20,
      ospfPathType: 'inter-area',
    });
    expect(route(t, 'core', '10.1.1.0/24')).toBeUndefined();
    expect(route(t, 'core', '10.1.2.0/24')).toBeUndefined();
    expect(route(t, 'abr', '10.1.2.0/24')).toMatchObject({ ospfPathType: 'intra-area' });
  });

  it('TC-1093: with no backbone, two areas do not learn each other’s networks', () => {
    const t = topology(
      [
        router(
          'r1',
          '1.1.1.1',
          [
            ['lan', '10.1.1.1/24'],
            ['up', '10.0.1.1/30'],
          ],
          { areas: [{ areaId: '0.0.0.1', networks: ['10.1.1.0/24', '10.0.1.0/30'] }] },
        ),
        router(
          'mid',
          '2.2.2.2',
          [
            ['a', '10.0.1.2/30'],
            ['b', '10.0.2.1/30'],
          ],
          {
            areas: [
              { areaId: '0.0.0.1', networks: ['10.0.1.0/30'] },
              { areaId: '0.0.0.2', networks: ['10.0.2.0/30'] },
            ],
          },
        ),
        router(
          'r2',
          '3.3.3.3',
          [
            ['up', '10.0.2.2/30'],
            ['lan', '10.2.2.1/24'],
          ],
          { areas: [{ areaId: '0.0.0.2', networks: ['10.0.2.0/30', '10.2.2.0/24'] }] },
        ),
      ],
      [cable('r1', 'up', 'mid', 'a'), cable('mid', 'b', 'r2', 'up')],
    );
    expect(route(t, 'r1', '10.2.2.0/24')).toBeUndefined();
    expect(route(t, 'r2', '10.1.1.0/24')).toBeUndefined();
  });

  it('TC-1093: two ends of a cable in different areas form no adjacency', () => {
    const t = threeAreas();
    const mismatched = {
      ...t,
      nodes: t.nodes.map((node) =>
        node.id === 'r1'
          ? {
              ...node,
              data: {
                ...node.data,
                ospfConfig: {
                  routerId: '1.1.1.1',
                  areas: [
                    { areaId: '0.0.0.9', networks: ['10.0.1.0/30'] },
                    { areaId: '0.0.0.1', networks: ['10.1.1.0/24'] },
                  ],
                },
              },
            }
          : node,
      ),
    };
    expect(route(mismatched, 'r1', '10.2.2.0/24')).toBeUndefined();
  });

  it('TC-1094: one area, written two ways, stays with the single-area calculation', () => {
    const single = topology(
      [
        router(
          'a',
          '1.1.1.1',
          [
            ['lan', '10.1.1.1/24'],
            ['up', '10.0.1.1/30'],
          ],
          { areas: [{ areaId: '0', networks: ['10.1.1.0/24', '10.0.1.0/30'] }] },
        ),
        router('b', '2.2.2.2', [['down', '10.0.1.2/30']], {
          areas: [{ areaId: '0.0.0.0', networks: ['10.0.1.0/30'] }],
        }),
      ],
      [cable('a', 'up', 'b', 'down')],
    );
    expect(JSON.stringify(routes(single))).toBe(
      JSON.stringify([
        {
          destination: '10.0.1.0/30',
          nextHop: 'direct',
          metric: 0,
          protocol: 'ospf',
          adminDistance: 110,
          nodeId: 'a',
        },
        {
          destination: '10.1.1.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'ospf',
          adminDistance: 110,
          nodeId: 'a',
        },
        {
          destination: '10.0.1.0/30',
          nextHop: 'direct',
          metric: 0,
          protocol: 'ospf',
          adminDistance: 110,
          nodeId: 'b',
        },
        {
          destination: '10.1.1.0/24',
          nextHop: '10.0.1.1',
          metric: 2,
          protocol: 'ospf',
          adminDistance: 110,
          nodeId: 'b',
        },
      ]),
    );
  });

  it('TC-1096: E1 adds the way to the ASBR, E2 does not, and internal routes win over both', () => {
    const t = threeAreas();
    const withExternals: NetworkTopology = {
      ...t,
      nodes: t.nodes.map((node) =>
        node.id === 'r2' && node.data.ospfConfig
          ? {
              ...node,
              data: {
                ...node.data,
                ospfConfig: {
                  ...node.data.ospfConfig,
                  externals: [
                    { network: '192.0.2.0/24', metric: 20 },
                    { network: '198.51.100.0/24', metric: 20, metricType: 1 as const },
                    // Also inside area 1: internal wins.
                    { network: '10.1.1.0/24', metric: 1 },
                  ],
                },
              },
            }
          : node,
      ),
    };
    expect(route(withExternals, 'r1', '192.0.2.0/24')).toMatchObject({
      metric: 20,
      nextHop: '10.0.1.2',
      ospfPathType: 'external-2',
    });
    // r1 to the ASBR: r1-abr1 1, abr1-core 1, core-abr2 1, abr2-r2 1.
    expect(route(withExternals, 'r1', '198.51.100.0/24')).toMatchObject({
      metric: 24,
      ospfPathType: 'external-1',
    });
    expect(route(withExternals, 'core', '10.1.1.0/24')).toMatchObject({
      ospfPathType: 'inter-area',
    });
    expect(route(withExternals, 'r2', '192.0.2.0/24')).toBeUndefined();
  });
});

/** Three routers on one LAN in area 1, one of them an ABR, plus an ASBR in the backbone. */
function withLan(): NetworkTopology {
  return topology(
    [
      router(
        'abr',
        '3.3.3.3',
        [
          ['lan', '10.5.0.3/24', 10],
          ['up', '10.0.1.1/30'],
        ],
        {
          areas: [
            { areaId: '0.0.0.1', networks: ['10.5.0.0/24'] },
            { areaId: '0.0.0.0', networks: ['10.0.1.0/30'] },
          ],
        },
      ),
      router('x', '1.1.1.1', [['lan', '10.5.0.1/24', 200]], {
        areas: [{ areaId: '0.0.0.1', networks: ['10.5.0.0/24'], cost: 7 }],
      }),
      router(
        'y',
        '2.2.2.2',
        [
          ['lan', '10.5.0.2/24'],
          ['stub', '10.6.0.1/24'],
        ],
        { areas: [{ areaId: '0.0.0.1', networks: ['10.5.0.0/24', '10.6.0.0/24'] }] },
      ),
      router('asbr', '4.4.4.4', [['down', '10.0.1.2/30']], {
        areas: [{ areaId: '0.0.0.0', networks: ['10.0.1.0/30'] }],
        externals: [{ network: '192.0.2.0/24', metric: 20 }],
      }),
      lanSwitch('sw'),
    ],
    [
      cable('abr', 'lan', 'sw'),
      cable('x', 'lan', 'sw'),
      cable('y', 'lan', 'sw'),
      cable('abr', 'up', 'asbr', 'down'),
    ],
  );
}

describe('the link-state database', () => {
  it('TC-1100: routers on a LAN reach each other at the cost of the sender’s interface', () => {
    const t = withLan();
    expect(route(t, 'x', '10.6.0.0/24')).toMatchObject({
      nextHop: '10.5.0.2',
      metric: 7 + 1,
      ospfPathType: 'intra-area',
    });
  });

  it('TC-1100: the DR, elected by priority, originates the Type 2', () => {
    const lsdb = ospfLsdb(withLan());
    expect(lsdb.segments).toEqual([
      expect.objectContaining({
        network: '10.5.0.0/24',
        areaId: '0.0.0.1',
        dr: '1.1.1.1',
        bdr: '3.3.3.3',
      }),
    ]);
    const area1 = lsdb.areas.find((area) => area.areaId === '0.0.0.1');
    expect(area1?.lsas.filter((lsa) => lsa.type === 2)).toEqual([
      {
        type: 2,
        lsId: '10.5.0.1',
        advertisingRouter: '1.1.1.1',
        network: '10.5.0.0/24',
        attachedRouters: ['1.1.1.1', '2.2.2.2', '3.3.3.3'],
      },
    ]);
  });

  it('TC-1095: each area holds Types 1, 2, 3 and 5, and a router holds its areas', () => {
    const lsdb = ospfLsdb(withLan());
    const types = (areaId: string) =>
      lsdb.areas.find((area) => area.areaId === areaId)?.lsas.map((lsa) => lsa.type);
    expect(types('0.0.0.1')).toEqual([1, 1, 1, 2, 3, 5]);
    expect(types('0.0.0.0')).toEqual([1, 1, 3, 3, 5]);

    const area1 = lsdb.areas.find((area) => area.areaId === '0.0.0.1');
    expect(
      area1?.lsas.find((lsa) => lsa.type === 1 && lsa.advertisingRouter === '2.2.2.2'),
    ).toEqual({
      type: 1,
      lsId: '2.2.2.2',
      advertisingRouter: '2.2.2.2',
      links: [
        { kind: 'transit', id: '10.5.0.1', cost: 1 },
        { kind: 'stub', id: '10.6.0.0/24', cost: 1 },
      ],
    });
    expect(area1?.lsas.find((lsa) => lsa.type === 3)).toEqual({
      type: 3,
      lsId: '10.0.1.0/30',
      advertisingRouter: '3.3.3.3',
      cost: 1,
    });
    expect(area1?.lsas.find((lsa) => lsa.type === 5)).toEqual({
      type: 5,
      lsId: '192.0.2.0/24',
      advertisingRouter: '4.4.4.4',
      metric: 20,
      metricType: 2,
    });
  });

  it('TC-1095: routers of one area hold the same list; an ABR holds two; a stranger none', () => {
    const lsdb = ospfLsdb(withLan());
    const areasOf = (nodeId: string) => routerLsdb(lsdb, nodeId).map((area) => area.areaId);
    expect(areasOf('x')).toEqual(['0.0.0.1']);
    expect(areasOf('abr')).toEqual(['0.0.0.0', '0.0.0.1']);
    expect(routerLsdb(lsdb, 'x')).toEqual(routerLsdb(lsdb, 'y'));
    expect(routerLsdb(lsdb, 'nobody')).toEqual([]);
    expect(lsdb.routers.find((entry) => entry.nodeId === 'abr')).toMatchObject({
      abr: true,
      asbr: false,
    });
    expect(lsdb.routers.find((entry) => entry.nodeId === 'asbr')).toMatchObject({
      abr: false,
      asbr: true,
    });
  });

  it('TC-1095: a point-to-point cable is a router link plus a stub network', () => {
    const area0 = ospfLsdb(withLan()).areas.find((area) => area.areaId === '0.0.0.0');
    expect(
      area0?.lsas.find((lsa) => lsa.type === 1 && lsa.advertisingRouter === '4.4.4.4'),
    ).toEqual({
      type: 1,
      lsId: '4.4.4.4',
      advertisingRouter: '4.4.4.4',
      links: [
        { kind: 'point-to-point', id: '3.3.3.3', cost: 1 },
        { kind: 'stub', id: '10.0.1.0/30', cost: 1 },
      ],
    });
  });

  it('TC-1095: a stopped router leaves the LAN, its LSAs and the election', () => {
    const t = withLan();
    const stopped: NetworkTopology = {
      ...t,
      edges: t.edges.map((edge) =>
        edge.id === 'x-sw' ? { ...edge, data: { state: 'down' as const } } : edge,
      ),
    };
    const [segment] = ospfLsdb(stopped).segments;
    expect(segment).toMatchObject({ dr: '3.3.3.3', bdr: '2.2.2.2' });
  });

  it('TC-1098: the LSDB can be read with the roles already held', () => {
    const [segment] = ospfLsdb(withLan(), {
      held: { '10.5.0.0/24': { dr: '2.2.2.2', bdr: '3.3.3.3' } },
    }).segments;
    expect(segment).toMatchObject({ dr: '2.2.2.2', bdr: '3.3.3.3' });
  });
});
