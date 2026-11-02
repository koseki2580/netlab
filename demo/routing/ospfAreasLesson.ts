/**
 * What the OSPF areas lesson shows, read from the simulator's calculation: the
 * network, the LSDB and routes, and the LAN's DR and BDR as routers come and go.
 *
 *   area 1 (10.1.0.0/16)                backbone                   area 2
 *   R2  R3  R7 (LAN, with a switch)
 *     \ | /
 *      SW --- R1 (ABR) ---- R4 (ASBR) ---- R5 (ABR) ---- R6 --- 10.2.0.0/24
 */

import { ospfLsdb, type Lsa, type OspfLsdb } from '../../src/routing/ospf/OspfLsdb';
import { OspfProtocol } from '../../src/routing/ospf/OspfProtocol';
import type { OspfAreaConfig, RouteEntry, RouterInterface } from '../../src/types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../../src/types/topology';

type T = (en: string, ja: string) => string;

const AREA_1 = '0.0.0.1';
const AREA_2 = '0.0.0.2';
const BACKBONE = '0.0.0.0';
const LAN = '10.1.0.0/24';

type Port = readonly [id: string, address: string, prefix: number, priority?: number];

function device(
  id: string,
  label: string,
  routerId: string,
  x: number,
  y: number,
  ports: readonly Port[],
  areas: OspfAreaConfig[],
  externals?: NonNullable<NetlabNode['data']['ospfConfig']>['externals'],
): NetlabNode {
  const interfaces = ports.map<RouterInterface>(([port, ipAddress, prefixLength, priority], i) => ({
    id: port,
    name: port,
    ipAddress,
    prefixLength,
    macAddress: `02:00:00:0${label.charAt(1)}:00:0${i}`,
    ...(priority === undefined ? {} : { ospfPriority: priority }),
  }));
  return {
    id,
    type: 'router',
    position: { x, y },
    data: {
      label,
      role: 'router',
      layerId: 'l3',
      interfaces,
      ospfConfig: { routerId, areas, ...(externals ? { externals } : {}) },
    },
  };
}

const NODES: readonly NetlabNode[] = [
  device(
    'r1',
    'R1',
    '1.1.1.1',
    340,
    240,
    [
      ['lan', '10.1.0.1', 24],
      ['up', '10.0.1.1', 30],
    ],
    [
      { areaId: AREA_1, networks: [LAN], ranges: ['10.1.0.0/16'] },
      { areaId: BACKBONE, networks: ['10.0.1.0/30'] },
    ],
  ),
  device(
    'r2',
    'R2',
    '2.2.2.2',
    40,
    80,
    [
      ['lan', '10.1.0.2', 24, 100],
      ['stub', '10.1.20.1', 24],
    ],
    [{ areaId: AREA_1, networks: [LAN, '10.1.20.0/24'] }],
  ),
  device(
    'r3',
    'R3',
    '3.3.3.3',
    40,
    240,
    [
      ['lan', '10.1.0.3', 24, 50],
      ['stub', '10.1.30.1', 24],
    ],
    [{ areaId: AREA_1, networks: [LAN, '10.1.30.0/24'] }],
  ),
  device(
    'r7',
    'R7',
    '7.7.7.7',
    40,
    400,
    [['lan', '10.1.0.7', 24, 255]],
    [{ areaId: AREA_1, networks: [LAN] }],
  ),
  device(
    'r4',
    'R4',
    '4.4.4.4',
    540,
    240,
    [
      ['a', '10.0.1.2', 30],
      ['b', '10.0.2.1', 30],
    ],
    [{ areaId: BACKBONE, networks: ['10.0.1.0/30', '10.0.2.0/30'] }],
    [{ network: '203.0.113.0/24', metric: 20 }],
  ),
  device(
    'r5',
    'R5',
    '5.5.5.5',
    740,
    240,
    [
      ['up', '10.0.2.2', 30],
      ['down', '10.0.3.1', 30],
    ],
    [
      { areaId: BACKBONE, networks: ['10.0.2.0/30'] },
      { areaId: AREA_2, networks: ['10.0.3.0/30'] },
    ],
  ),
  device(
    'r6',
    'R6',
    '6.6.6.6',
    940,
    240,
    [
      ['up', '10.0.3.2', 30],
      ['lan', '10.2.0.1', 24],
    ],
    [{ areaId: AREA_2, networks: ['10.0.3.0/30', '10.2.0.0/24'] }],
  ),
  {
    id: 'sw',
    type: 'switch',
    position: { x: 190, y: 240 },
    data: {
      label: 'SW',
      role: 'switch',
      layerId: 'l2',
      ports: ['p1', 'p2', 'p3', 'p4'].map((id, index) => ({
        id,
        name: id,
        macAddress: `02:00:00:a0:00:0${index}`,
      })),
    },
  },
];

const lanCable = (router: string): NetlabEdge => ({
  id: `e-lan-${router}`,
  source: router,
  target: 'sw',
  sourceHandle: 'lan',
  type: 'smoothstep',
});

const EDGES: readonly NetlabEdge[] = [
  lanCable('r1'),
  lanCable('r2'),
  lanCable('r3'),
  lanCable('r7'),
  {
    id: 'e-14',
    source: 'r1',
    target: 'r4',
    sourceHandle: 'up',
    targetHandle: 'a',
    type: 'smoothstep',
  },
  {
    id: 'e-45',
    source: 'r4',
    target: 'r5',
    sourceHandle: 'b',
    targetHandle: 'up',
    type: 'smoothstep',
  },
  {
    id: 'e-56',
    source: 'r5',
    target: 'r6',
    sourceHandle: 'down',
    targetHandle: 'up',
    type: 'smoothstep',
  },
];

/** The routers on the LAN that can be stopped and started, with their priorities in view. */
export const LAN_ROUTERS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'r2', label: 'R2' },
  { id: 'r3', label: 'R3' },
  { id: 'r7', label: 'R7' },
];

export const LESSON_ROUTER_IDS: readonly string[] = NODES.filter(
  (node) => node.data.role === 'router',
).map((node) => node.id);

/** Who is stopped, and who holds DR and BDR: the election's memory. */
export interface LanState {
  readonly stopped: readonly string[];
  readonly dr: string | null;
  readonly bdr: string | null;
}

export function lessonTopology(lan: Pick<LanState, 'stopped'>): NetworkTopology {
  return {
    nodes: [...NODES],
    edges: EDGES.map((edge) =>
      lan.stopped.includes(edge.source)
        ? { ...edge, data: { ...edge.data, state: 'down' as const } }
        : edge,
    ),
    areas: [],
    routeTables: new Map(),
  };
}

/** The LSDB as it stands; a state with no roles yet is a cold start. */
export function lessonLsdb(lan: LanState): OspfLsdb {
  return ospfLsdb(lessonTopology(lan), {
    held: { [LAN]: { dr: lan.dr, bdr: lan.bdr } },
  });
}

export function lessonRoutes(lan: LanState): RouteEntry[] {
  return new OspfProtocol().computeRoutes(lessonTopology(lan));
}

function settled(stopped: readonly string[], held: Pick<LanState, 'dr' | 'bdr'>): LanState {
  const [segment] = lessonLsdb({ ...held, stopped }).segments;
  return { stopped, dr: segment?.dr ?? null, bdr: segment?.bdr ?? null };
}

/** All but R7 start together. */
export function initialLan(): LanState {
  return settled(['r7'], { dr: null, bdr: null });
}

/** One router stops or starts, and the rest keep the roles they hold. */
export function lanToggled(lan: LanState, routerId: string): LanState {
  const stopped = lan.stopped.includes(routerId)
    ? lan.stopped.filter((id) => id !== routerId)
    : [...lan.stopped, routerId];
  return settled(stopped, lan);
}

/** Every router starts again together: the only way a better router takes over. */
export function lanRestarted(): LanState {
  return settled([], { dr: null, bdr: null });
}

export function labelOfRouterId(routerId: string | null): string {
  const node = NODES.find((entry) => entry.data.ospfConfig?.routerId === routerId);
  return node?.data.label ?? '—';
}

/** One line of a database, for the lesson's list. */
export function describeLsa(lsa: Lsa, t: T): string {
  switch (lsa.type) {
    case 1: {
      const links = lsa.links
        .map((link) =>
          link.kind === 'point-to-point'
            ? t(`link to ${link.id}`, `${link.id} への線`)
            : link.kind === 'transit'
              ? t(`LAN of DR ${link.id}`, `DR ${link.id} の LAN`)
              : t(`stub ${link.id}`, `スタブ ${link.id}`),
        )
        .join(', ');
      return t(
        `Type 1 · router ${lsa.advertisingRouter}: ${links}`,
        `Type 1・ルータ ${lsa.advertisingRouter}：${links}`,
      );
    }
    case 2:
      return t(
        `Type 2 · network ${lsa.network} from the DR ${lsa.advertisingRouter}: ${lsa.attachedRouters.join(', ')}`,
        `Type 2・ネットワーク ${lsa.network}（DR ${lsa.advertisingRouter} から）：${lsa.attachedRouters.join(', ')}`,
      );
    case 3:
      return t(
        `Type 3 · summary ${lsa.lsId} from ${lsa.advertisingRouter}, cost ${lsa.cost}`,
        `Type 3・サマリ ${lsa.lsId}（${lsa.advertisingRouter} から、コスト ${lsa.cost}）`,
      );
    case 5:
      return t(
        `Type 5 · external ${lsa.lsId} from ${lsa.advertisingRouter}, E${lsa.metricType} metric ${lsa.metric}`,
        `Type 5・外部 ${lsa.lsId}（${lsa.advertisingRouter} から、E${lsa.metricType} メトリック ${lsa.metric}）`,
      );
  }
}
