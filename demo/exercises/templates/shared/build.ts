/**
 * Small builders for exercise topologies.
 *
 * Everything here returns plain JSON (`TopologySnapshot`): no route tables, no
 * spanning-tree state. `grade/prepare.ts` computes those. MAC addresses are
 * derived from ids so the same builder call always gives the same topology.
 */

import type { RouterInterface, StaticRouteConfig } from '../../../../src/types/routing';
import type {
  NetlabEdge,
  NetlabNode,
  NetlabNodeData,
  SwitchPort,
  TopologySnapshot,
} from '../../../../src/types/topology';
import type { Place } from './places';
import type { AddressPlan, Net24 } from './plans';
import type { Named } from './text';

/** A locally administered MAC derived from `key` (FNV-1a, 40 bits). */
export function macFor(key: string): string {
  let high = 0x811c9dc5;
  let low = 0x01000193;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    high = Math.imul(high ^ code, 0x01000193) >>> 0;
    low = Math.imul(low ^ code, 0x85ebca6b) >>> 0;
  }
  const hex = (high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0')).slice(0, 10);
  return `02:${hex.match(/../g)?.join(':') ?? '00:00:00:00:00'}`;
}

export interface NodeExtras {
  readonly label?: string;
  readonly x?: number;
  readonly y?: number;
}

/** A PC or a server. `ip: null` builds a host with no address at all. */
export function host(
  id: string,
  ip: string | null,
  extras: NodeExtras & { readonly role?: 'client' | 'server' } = {},
): NetlabNode {
  const role = extras.role ?? 'client';
  return {
    id,
    type: role,
    position: { x: extras.x ?? 0, y: extras.y ?? 0 },
    data: {
      label: extras.label ?? id,
      role,
      layerId: 'l7',
      mac: macFor(id),
      ...(ip !== null ? { ip } : {}),
    },
  };
}

/** One router interface from `'10.0.0.1/24'`. The id is also the edge handle. */
export function iface(
  id: string,
  cidr: string,
  extras: Partial<Omit<RouterInterface, 'id' | 'ipAddress' | 'prefixLength'>> = {},
): RouterInterface {
  const [ipAddress = '', prefix = '24'] = cidr.split('/');
  return {
    id,
    name: id,
    ipAddress,
    prefixLength: Number(prefix),
    // Filled in by `router`, which knows the router id.
    macAddress: '',
    ...extras,
  };
}

export function router(
  id: string,
  interfaces: RouterInterface[],
  data: Partial<NetlabNodeData> = {},
  extras: NodeExtras = {},
): NetlabNode {
  return {
    id,
    type: 'router',
    position: { x: extras.x ?? 0, y: extras.y ?? 0 },
    data: {
      label: extras.label ?? id,
      role: 'router',
      layerId: 'l3',
      // The interface MACs must be unique per router, so the router id is mixed in.
      interfaces: interfaces.map((entry) => ({
        ...entry,
        macAddress: macFor(`${id}:${entry.id}`),
      })),
      ...data,
    },
  };
}

/** An untagged port, an access port (`{ access: 10 }`) or a trunk (`{ trunk: [10, 20] }`). */
export function port(
  id: string,
  vlan?: { readonly access: number } | { readonly trunk: readonly number[] },
): SwitchPort {
  const base = { id, name: id, macAddress: '' };
  if (vlan === undefined) return base;
  if ('access' in vlan) return { ...base, vlanMode: 'access', accessVlan: vlan.access };
  return { ...base, vlanMode: 'trunk', trunkAllowedVlans: [...vlan.trunk], nativeVlan: 1 };
}

export function switchNode(
  id: string,
  ports: SwitchPort[],
  data: Partial<NetlabNodeData> = {},
  extras: NodeExtras = {},
): NetlabNode {
  return {
    id,
    type: 'switch',
    position: { x: extras.x ?? 0, y: extras.y ?? 0 },
    data: {
      label: extras.label ?? id,
      role: 'switch',
      layerId: 'l2',
      ports: ports.map((entry) => ({ ...entry, macAddress: macFor(`${id}:${entry.id}`) })),
      ...data,
    },
  };
}

/**
 * A cable. Each end is `'node'` or `'node:handle'`, where the handle is a
 * router interface id or a switch port id.
 */
export function link(id: string, from: string, to: string): NetlabEdge {
  const [source = '', sourceHandle] = from.split(':');
  const [target = '', targetHandle] = to.split(':');
  return {
    id,
    source,
    target,
    ...(sourceHandle !== undefined ? { sourceHandle } : {}),
    ...(targetHandle !== undefined ? { targetHandle } : {}),
  };
}

export function snapshot(nodes: NetlabNode[], edges: NetlabEdge[]): TopologySnapshot {
  return { nodes, edges, areas: [] };
}

// --- Editing a snapshot (immutably) ---------------------------------------

export function withNodeData(
  topology: TopologySnapshot,
  nodeId: string,
  patch: Partial<NetlabNodeData>,
): TopologySnapshot {
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node,
    ),
  };
}

export function withInterface(
  topology: TopologySnapshot,
  nodeId: string,
  ifaceId: string,
  patch: Partial<RouterInterface>,
): TopologySnapshot {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  return withNodeData(topology, nodeId, {
    interfaces: (node?.data.interfaces ?? []).map((entry) =>
      entry.id === ifaceId ? { ...entry, ...patch } : entry,
    ),
  });
}

export function withPort(
  topology: TopologySnapshot,
  nodeId: string,
  portId: string,
  patch: Partial<SwitchPort>,
): TopologySnapshot {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  return withNodeData(topology, nodeId, {
    ports: (node?.data.ports ?? []).map((entry) =>
      entry.id === portId ? { ...entry, ...patch } : entry,
    ),
  });
}

export function withLinkState(
  topology: TopologySnapshot,
  edgeId: string,
  state: 'up' | 'down',
): TopologySnapshot {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, data: { ...edge.data, state } } : edge,
    ),
  };
}

/** Set the OSPF cost of the `areas` entry that lists `network` on one router. */
export function withOspfCost(
  topology: TopologySnapshot,
  nodeId: string,
  network: string,
  cost: number,
): TopologySnapshot {
  const config = topology.nodes.find((candidate) => candidate.id === nodeId)?.data.ospfConfig;
  if (!config) return topology;
  return withNodeData(topology, nodeId, {
    ospfConfig: {
      ...config,
      areas: config.areas.map((area) =>
        area.networks.includes(network) ? { ...area, cost } : area,
      ),
    },
  });
}

// --- Shapes ----------------------------------------------------------------

/**
 * Two PCs behind a switch, a router, and a server on the far side.
 *
 * pc1, pc2 — sw1 — r1 — srv        LAN 192.168.1.0/24, far side 203.0.113.0/24
 */
export function lanBehindRouter(): TopologySnapshot {
  return snapshot(
    [
      host('pc1', '192.168.1.10'),
      host('pc2', '192.168.1.11'),
      switchNode('sw1', [port('p1'), port('p2'), port('p3')]),
      router('r1', [iface('lan', '192.168.1.1/24'), iface('wan', '203.0.113.1/24')]),
      host('srv', '203.0.113.10', { role: 'server' }),
    ],
    [
      link('e-pc1', 'pc1', 'sw1:p1'),
      link('e-pc2', 'pc2', 'sw1:p2'),
      link('e-up', 'sw1:p3', 'r1:lan'),
      link('e-srv', 'r1:wan', 'srv'),
    ],
  );
}

/**
 * Two routers in a chain. Neither has a route to the other's LAN until the
 * caller adds one, so this is the base for every "missing route" exercise.
 *
 * pc — r1 — r2 — srv      10.0.1.0/24, 10.0.12.0/30, 10.0.2.0/24
 */
export function routerChain(): TopologySnapshot {
  return snapshot(
    [
      host('pc', '10.0.1.10'),
      router('r1', [iface('lan', '10.0.1.1/24'), iface('to-r2', '10.0.12.1/30')]),
      router('r2', [iface('to-r1', '10.0.12.2/30'), iface('lan', '10.0.2.1/24')]),
      host('srv', '10.0.2.10', { role: 'server' }),
    ],
    [
      link('e-pc', 'pc', 'r1:lan'),
      link('e-12', 'r1:to-r2', 'r2:to-r1'),
      link('e-srv', 'r2:lan', 'srv'),
    ],
  );
}

/** The networks of `routerDiamond`, for writing OSPF areas and routes. */
export const DIAMOND_NETS = {
  left: '10.0.1.0/24',
  top1: '10.0.12.0/30',
  bottom1: '10.0.13.0/30',
  top2: '10.0.24.0/30',
  bottom2: '10.0.34.0/30',
  right: '10.0.4.0/24',
} as const;

/**
 * Four routers in a diamond: two ways from pc to srv, over r2 or over r3.
 * No routing is configured; callers add `ospfConfig` or `staticRoutes`.
 *
 *            r2
 * pc — r1 <      > r4 — srv
 *            r3
 */
export function routerDiamond(): TopologySnapshot {
  return snapshot(
    [
      host('pc', '10.0.1.10'),
      router('r1', [
        iface('lan', '10.0.1.1/24'),
        iface('to-r2', '10.0.12.1/30'),
        iface('to-r3', '10.0.13.1/30'),
      ]),
      router('r2', [iface('to-r1', '10.0.12.2/30'), iface('to-r4', '10.0.24.1/30')]),
      router('r3', [iface('to-r1', '10.0.13.2/30'), iface('to-r4', '10.0.34.1/30')]),
      router('r4', [
        iface('to-r2', '10.0.24.2/30'),
        iface('to-r3', '10.0.34.2/30'),
        iface('lan', '10.0.4.1/24'),
      ]),
      host('srv', '10.0.4.10', { role: 'server' }),
    ],
    [
      link('e-pc', 'pc', 'r1:lan'),
      link('e-12', 'r1:to-r2', 'r2:to-r1'),
      link('e-13', 'r1:to-r3', 'r3:to-r1'),
      link('e-24', 'r2:to-r4', 'r4:to-r2'),
      link('e-34', 'r3:to-r4', 'r4:to-r3'),
      link('e-srv', 'r4:lan', 'srv'),
    ],
  );
}

/** `routerDiamond` with every router running OSPF on all of its networks. */
export function ospfDiamond(): TopologySnapshot {
  const networks: Record<string, string[]> = {
    r1: [DIAMOND_NETS.left, DIAMOND_NETS.top1, DIAMOND_NETS.bottom1],
    r2: [DIAMOND_NETS.top1, DIAMOND_NETS.top2],
    r3: [DIAMOND_NETS.bottom1, DIAMOND_NETS.bottom2],
    r4: [DIAMOND_NETS.top2, DIAMOND_NETS.bottom2, DIAMOND_NETS.right],
  };
  return Object.entries(networks).reduce(
    (topology, [nodeId, nets], index) =>
      withNodeData(topology, nodeId, {
        ospfConfig: {
          routerId: `${index + 1}.${index + 1}.${index + 1}.${index + 1}`,
          // One entry per network, so a cost can be set on one link alone.
          areas: nets.map((network) => ({ areaId: '0.0.0.0', networks: [network] })),
        },
      }),
    routerDiamond(),
  );
}

/**
 * One switch, four PCs, two access VLANs. All four share one IP network, so
 * only the VLAN keeps a1/a2 apart from b1/b2.
 */
export function vlanSwitch(): TopologySnapshot {
  return snapshot(
    [
      host('a1', '10.0.0.11'),
      host('a2', '10.0.0.12'),
      host('b1', '10.0.0.21'),
      host('b2', '10.0.0.22'),
      switchNode(
        'sw1',
        [
          port('p1', { access: 10 }),
          port('p2', { access: 10 }),
          port('p3', { access: 20 }),
          port('p4', { access: 20 }),
        ],
        { vlans: [{ vlanId: 10 }, { vlanId: 20 }] },
      ),
    ],
    [
      link('e-a1', 'a1', 'sw1:p1'),
      link('e-a2', 'a2', 'sw1:p2'),
      link('e-b1', 'b1', 'sw1:p3'),
      link('e-b2', 'b2', 'sw1:p4'),
    ],
  );
}

/**
 * Two switches joined by a trunk; a VLAN 10 PC and a VLAN 20 PC on each.
 *
 * a1, b1 — sw1 ══ sw2 — a2, b2
 */
export function trunkedSwitches(trunkVlans: readonly number[] = [10, 20]): TopologySnapshot {
  const vlans = { vlans: [{ vlanId: 10 }, { vlanId: 20 }] };
  return snapshot(
    [
      host('a1', '10.0.0.11'),
      host('b1', '10.0.0.21'),
      host('a2', '10.0.0.12'),
      host('b2', '10.0.0.22'),
      switchNode(
        'sw1',
        [port('p1', { access: 10 }), port('p2', { access: 20 }), port('t', { trunk: trunkVlans })],
        vlans,
      ),
      switchNode(
        'sw2',
        [port('p1', { access: 10 }), port('p2', { access: 20 }), port('t', { trunk: trunkVlans })],
        vlans,
      ),
    ],
    [
      link('e-a1', 'a1', 'sw1:p1'),
      link('e-b1', 'b1', 'sw1:p2'),
      link('e-a2', 'a2', 'sw2:p1'),
      link('e-b2', 'b2', 'sw2:p2'),
      link('e-trunk', 'sw1:t', 'sw2:t'),
    ],
  );
}

/**
 * Three switches in a loop, one PC on each. Spanning tree must block one port.
 * `swa` has the lowest priority unless the caller says otherwise.
 */
export function switchTriangle(
  priorities: { readonly swa?: number; readonly swb?: number; readonly swc?: number } = {},
): TopologySnapshot {
  const sw = (id: 'swa' | 'swb' | 'swc', others: [string, string], fallback: number) =>
    switchNode(id, [port(`to-${others[0]}`), port(`to-${others[1]}`), port('h')], {
      stpConfig: { priority: priorities[id] ?? fallback },
    });
  return snapshot(
    [
      host('ha', '10.0.0.11'),
      host('hb', '10.0.0.12'),
      host('hc', '10.0.0.13'),
      sw('swa', ['swb', 'swc'], 4096),
      sw('swb', ['swa', 'swc'], 32768),
      sw('swc', ['swa', 'swb'], 32768),
    ],
    [
      link('e-ha', 'ha', 'swa:h'),
      link('e-hb', 'hb', 'swb:h'),
      link('e-hc', 'hc', 'swc:h'),
      link('e-ab', 'swa:to-swb', 'swb:to-swa'),
      link('e-ac', 'swa:to-swc', 'swc:to-swa'),
      link('e-bc', 'swb:to-swc', 'swc:to-swb'),
    ],
  );
}

/**
 * Ten devices: two PCs behind a switch, the OSPF diamond, and two servers
 * behind a second switch. Used to time a grade on a realistic size.
 */
export function tenNodeCampus(): TopologySnapshot {
  const diamond = ospfDiamond();
  const keep = diamond.nodes.filter((node) => node.id !== 'pc' && node.id !== 'srv');
  return snapshot(
    [
      host('pc1', '10.0.1.10'),
      host('pc2', '10.0.1.11'),
      switchNode('sw1', [port('p1'), port('p2'), port('up')]),
      ...keep,
      switchNode('sw2', [port('p1'), port('p2'), port('up')]),
      host('srv1', '10.0.4.10', { role: 'server' }),
      host('srv2', '10.0.4.11', { role: 'server' }),
    ],
    [
      link('e-pc1', 'pc1', 'sw1:p1'),
      link('e-pc2', 'pc2', 'sw1:p2'),
      link('e-sw1', 'sw1:up', 'r1:lan'),
      ...diamond.edges.filter((edge) => edge.id !== 'e-pc' && edge.id !== 'e-srv'),
      link('e-sw2', 'r4:lan', 'sw2:up'),
      link('e-srv1', 'sw2:p1', 'srv1'),
      link('e-srv2', 'sw2:p2', 'srv2'),
    ],
  );
}

// --- Shapes for the exercise templates ---------------------------------------
//
// Each returns the topology, the name of every device (`names`, by node id) and
// the ids a template needs to plant a fault and write checks. Positions are
// laid out left to right so the canvas needs no editing.

type Names = Record<string, Named>;

const COL = 210;
const ROW = 110;
const at = (col: number, row: number): { x: number; y: number } => ({ x: col * COL, y: row * ROW });

// --- A LAN behind one router (level 1) ---

export type LanShape = 'one-switch' | 'two-switches' | 'server-switch';
export const LAN_SHAPES: readonly [LanShape, LanShape, LanShape] = [
  'one-switch',
  'two-switches',
  'server-switch',
];

export interface LanNet {
  readonly topology: TopologySnapshot;
  readonly names: Names;
  /** `pc1`, `pc2`, `pc3`. */
  readonly pcs: readonly [string, string, string];
  /**
   * The PCs that may carry an address fault: those sharing their switch with
   * another PC. A PC alone on its switch that is given an address of the far
   * network is still delivered both ways in this simulator, so a fault (or a
   * learner's wrong answer) there would go unnoticed.
   */
  readonly faultable: readonly [string, string, ...string[]];
  /** `srv`, plus `srv2` in the `server-switch` shape. */
  readonly servers: readonly string[];
  /** Every device on the server side, with the cable it hangs on. */
  readonly cableOf: Readonly<Record<string, string>>;
  /** The cable from the PCs' switch towards the router. */
  readonly uplink: string;
  /** Every cable, for an allow-list. */
  readonly cables: readonly string[];
}

/**
 * one-switch:     pc1, pc2, pc3 — sw1 — r1 — srv
 * two-switches:   pc1, pc2 — sw1 — sw2 — r1 — srv, with pc3 on sw2
 * server-switch:  pc1, pc2, pc3 — sw1 — r1 — sw3 — srv, srv2
 */
export function buildLan(place: Place, plan: AddressPlan, shape: LanShape): LanNet {
  const { near, far, gateway, pcs, servers } = plan;
  const r1 = router(
    'r1',
    [iface('lan', `${near.at(gateway)}/24`), iface('far', `${far.at(gateway)}/24`)],
    {},
    at(2, 1),
  );
  const pc = (index: 0 | 1 | 2, row: number, col = 0) =>
    host(`pc${index + 1}`, near.at(pcs[index]), at(col, row));
  const srv = host('srv', far.at(servers[0]), { role: 'server', ...at(3, 1) });
  const names: Names = {
    pc1: place.pcs[0],
    pc2: place.pcs[1],
    pc3: place.pcs[2],
    sw1: place.lanSwitch,
    r1: place.router,
    srv: place.server,
  };
  const sw1 = (uplinkRow: number) =>
    switchNode('sw1', [port('p1'), port('p2'), port('p3'), port('up')], {}, at(1, uplinkRow));

  if (shape === 'two-switches') {
    const edges = [
      link('e-pc1', 'pc1', 'sw1:p1'),
      link('e-pc2', 'pc2', 'sw1:p2'),
      link('e-sw', 'sw1:up', 'sw2:p1'),
      link('e-pc3', 'pc3', 'sw2:p2'),
      link('e-up', 'sw2:up', 'r1:lan'),
      link('e-srv', 'r1:far', 'srv'),
    ];
    return {
      topology: snapshot(
        [
          pc(0, 0),
          pc(1, 1),
          sw1(0),
          switchNode('sw2', [port('p1'), port('p2'), port('up')], {}, at(1, 2)),
          pc(2, 2),
          r1,
          srv,
        ],
        edges,
      ),
      names: { ...names, sw2: place.backSwitch },
      pcs: ['pc1', 'pc2', 'pc3'],
      faultable: ['pc1', 'pc2'],
      servers: ['srv'],
      cableOf: { pc1: 'e-pc1', pc2: 'e-pc2', pc3: 'e-pc3', srv: 'e-srv' },
      uplink: 'e-up',
      cables: edges.map((edge) => edge.id),
    };
  }

  if (shape === 'server-switch') {
    const edges = [
      link('e-pc1', 'pc1', 'sw1:p1'),
      link('e-pc2', 'pc2', 'sw1:p2'),
      link('e-pc3', 'pc3', 'sw1:p3'),
      link('e-up', 'sw1:up', 'r1:lan'),
      link('e-far', 'r1:far', 'sw3:up'),
      link('e-srv', 'sw3:p1', 'srv'),
      link('e-srv2', 'sw3:p2', 'srv2'),
    ];
    return {
      topology: snapshot(
        [
          pc(0, 0),
          pc(1, 1),
          pc(2, 2),
          sw1(1),
          r1,
          switchNode('sw3', [port('p1'), port('p2'), port('up')], {}, at(3, 1)),
          host('srv', far.at(servers[0]), { role: 'server', ...at(4, 0) }),
          host('srv2', far.at(servers[1]), { role: 'server', ...at(4, 2) }),
        ],
        edges,
      ),
      names: { ...names, sw3: place.farSwitch, srv2: place.server2 },
      pcs: ['pc1', 'pc2', 'pc3'],
      faultable: ['pc1', 'pc2', 'pc3'],
      servers: ['srv', 'srv2'],
      cableOf: { pc1: 'e-pc1', pc2: 'e-pc2', pc3: 'e-pc3', srv: 'e-srv', srv2: 'e-srv2' },
      uplink: 'e-up',
      cables: edges.map((edge) => edge.id),
    };
  }

  const edges = [
    link('e-pc1', 'pc1', 'sw1:p1'),
    link('e-pc2', 'pc2', 'sw1:p2'),
    link('e-pc3', 'pc3', 'sw1:p3'),
    link('e-up', 'sw1:up', 'r1:lan'),
    link('e-srv', 'r1:far', 'srv'),
  ];
  return {
    topology: snapshot([pc(0, 0), pc(1, 1), pc(2, 2), sw1(1), r1, srv], edges),
    names,
    pcs: ['pc1', 'pc2', 'pc3'],
    faultable: ['pc1', 'pc2', 'pc3'],
    servers: ['srv'],
    cableOf: { pc1: 'e-pc1', pc2: 'e-pc2', pc3: 'e-pc3', srv: 'e-srv' },
    uplink: 'e-up',
    cables: edges.map((edge) => edge.id),
  };
}

// --- Two groups on switches (VLANs) ---

export type VlanShape = 'one-2-2' | 'one-3-2' | 'two-trunk' | 'three-trunk';

export interface VlanMember {
  readonly id: string;
  readonly group: 0 | 1;
  readonly switchId: string;
  readonly portId: string;
}

export interface VlanNet {
  readonly topology: TopologySnapshot;
  readonly names: Names;
  readonly members: readonly VlanMember[];
  /** Both ends of every switch-to-switch link. */
  readonly trunks: readonly { readonly switchId: string; readonly portId: string }[];
  /** The VLAN number of each group. */
  readonly vlans: readonly [number, number];
}

/**
 * one-2-2:      a1, a2, b1, b2 on sw1
 * one-3-2:      a1, a2, a3, b1, b2 on sw1
 * two-trunk:    a1, b1 — sw1 ══ sw2 — a2, b2
 * three-trunk:  a1, b1 — sw1 ══ sw2 ══ sw3 — a2, b2   (a3 on sw2)
 *
 * Every device is on one IP network, so only the VLAN keeps the groups apart.
 * Every port starts in its group's VLAN and every trunk carries both.
 */
export function buildVlan(
  place: Place,
  plan: AddressPlan,
  shape: VlanShape,
  vlans: readonly [number, number],
): VlanNet {
  const seats: Record<VlanShape, readonly (readonly [string, 0 | 1, string])[]> = {
    'one-2-2': [
      ['a1', 0, 'sw1'],
      ['a2', 0, 'sw1'],
      ['b1', 1, 'sw1'],
      ['b2', 1, 'sw1'],
    ],
    'one-3-2': [
      ['a1', 0, 'sw1'],
      ['a2', 0, 'sw1'],
      ['a3', 0, 'sw1'],
      ['b1', 1, 'sw1'],
      ['b2', 1, 'sw1'],
    ],
    'two-trunk': [
      ['a1', 0, 'sw1'],
      ['b1', 1, 'sw1'],
      ['a2', 0, 'sw2'],
      ['b2', 1, 'sw2'],
    ],
    'three-trunk': [
      ['a1', 0, 'sw1'],
      ['b1', 1, 'sw1'],
      ['a3', 0, 'sw2'],
      ['a2', 0, 'sw3'],
      ['b2', 1, 'sw3'],
    ],
  };
  const switchIds = shape.startsWith('one')
    ? ['sw1']
    : shape === 'two-trunk'
      ? ['sw1', 'sw2']
      : ['sw1', 'sw2', 'sw3'];
  const members: VlanMember[] = [];
  const names: Names = {};
  const nodes: NetlabNode[] = [];
  const edges: NetlabEdge[] = [];
  const perSwitch: Record<string, SwitchPort[]> = {};
  const lastOf = (id: string): number => (id.startsWith('a') ? 10 : 20) + Number(id.slice(1));

  for (const [id, group, switchId] of seats[shape]) {
    const ports = (perSwitch[switchId] ??= []);
    const portId = `p${ports.length + 1}`;
    ports.push(port(portId, { access: vlans[group] }));
    members.push({ id, group, switchId, portId });
    names[id] =
      place.groups[group].members[Number(id.slice(1)) - 1] ?? place.groups[group].members[0];
    const column = switchIds.indexOf(switchId) * 2;
    const row = ports.length - 1;
    // A lone switch has its devices on both sides; several switches each have theirs below.
    nodes.push(
      host(
        id,
        plan.near.at(lastOf(id)),
        switchIds.length === 1
          ? at(group === 0 ? 0 : 2, row % 3)
          : at(column + (row === 0 ? -0.45 : 0.45), 2),
      ),
    );
    edges.push(link(`e-${id}`, id, `${switchId}:${portId}`));
  }

  const trunks: { switchId: string; portId: string }[] = [];
  switchIds.forEach((switchId, index) => {
    const next = switchIds[index + 1];
    if (next === undefined) return;
    const left = switchIds.length === 3 && index === 1 ? 't2' : 't';
    const right = switchIds.length === 3 && index === 0 ? 't1' : 't';
    (perSwitch[switchId] ??= []).push(port(left, { trunk: vlans }));
    (perSwitch[next] ??= []).push(port(right, { trunk: vlans }));
    trunks.push({ switchId, portId: left }, { switchId: next, portId: right });
    edges.push(link(`e-trunk${index + 1}`, `${switchId}:${left}`, `${next}:${right}`));
  });

  const switchNames = [place.lanSwitch, place.backSwitch, place.farSwitch];
  switchIds.forEach((switchId, index) => {
    names[switchId] = switchNames[index] ?? place.lanSwitch;
    nodes.push(
      switchNode(
        switchId,
        perSwitch[switchId] ?? [],
        { vlans: vlans.map((vlanId) => ({ vlanId })) },
        switchIds.length === 1 ? at(1, 1) : at(index * 2, 0.6),
      ),
    );
  });

  return { topology: snapshot(nodes, edges), names, members, trunks, vlans };
}

// --- Switches in a loop (spanning tree) ---

export type LoopShape = 'triangle' | 'square' | 'tail';

export interface LoopNet {
  readonly topology: TopologySnapshot;
  readonly names: Names;
  /** `swa`, `swb`, `swc` (and `swd`). Each has one device, `ha`...; */
  readonly switches: readonly string[];
  /** The id of the cable between two switches, in either order. */
  readonly cable: (left: string, right: string) => string | undefined;
}

/**
 * triangle:  swa, swb, swc all joined to each other
 * square:    swa — swb — swc — swd — swa
 * tail:      the triangle, with swd hanging off swc
 *
 * One device per switch (`ha` on `swa`, ...), all on one network, no VLANs.
 */
export function buildLoop(
  place: Place,
  plan: AddressPlan,
  shape: LoopShape,
  priorities: Readonly<Record<string, number>>,
  deviceNames: readonly Named[],
): LoopNet {
  const letters = shape === 'triangle' ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd'];
  const pairs: Record<LoopShape, readonly (readonly [string, string])[]> = {
    triangle: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ],
    square: [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
    ],
    tail: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
      ['c', 'd'],
    ],
  };
  const spots: Record<LoopShape, readonly { x: number; y: number }[]> = {
    triangle: [at(0, 1), at(2, 1), at(1, 0)],
    square: [at(0, 0), at(2, 0), at(2, 1.6), at(0, 1.6)],
    tail: [at(0, 1.4), at(2, 1.4), at(1, 0.4), at(2.6, 0.2)],
  };
  const hostSpots: Record<LoopShape, readonly { x: number; y: number }[]> = {
    triangle: [at(0, 2), at(2, 2), at(2.2, 0)],
    square: [at(-1, 0), at(3, 0), at(3, 1.6), at(-1, 1.6)],
    tail: [at(0, 2.4), at(2, 2.4), at(0, 0.2), at(3.6, 0.2)],
  };
  const names: Names = {};
  const nodes: NetlabNode[] = [];
  const edges: NetlabEdge[] = [];
  const cables = new Map<string, string>();

  letters.forEach((letter, index) => {
    const id = `sw${letter}`;
    const others = pairs[shape].flatMap(([left, right]) =>
      left === letter ? [right] : right === letter ? [left] : [],
    );
    names[id] = place.switches[index] ?? place.switches[0];
    names[`h${letter}`] = deviceNames[index] ?? place.pcs[0];
    nodes.push(
      switchNode(
        id,
        [...others.map((other) => port(`to-sw${other}`)), port('h')],
        { stpConfig: { priority: priorities[id] ?? 32768 } },
        spots[shape][index] ?? at(0, 0),
      ),
      host(`h${letter}`, plan.near.at(11 + index), hostSpots[shape][index] ?? at(0, 0)),
    );
    edges.push(link(`e-h${letter}`, `h${letter}`, `${id}:h`));
  });
  for (const [left, right] of pairs[shape]) {
    const id = `e-${left}${right}`;
    cables.set(`${left}${right}`, id);
    cables.set(`${right}${left}`, id);
    edges.push(link(id, `sw${left}:to-sw${right}`, `sw${right}:to-sw${left}`));
  }

  return {
    topology: snapshot(nodes, edges),
    names,
    switches: letters.map((letter) => `sw${letter}`),
    cable: (left, right) => cables.get(`${left.slice(2)}${right.slice(2)}`),
  };
}

// --- Sites joined by routers (static routes) ---

export type RoutedShape = 'chain2' | 'chain3' | 'hub';
export const ROUTED_SHAPES: readonly [RoutedShape, RoutedShape, RoutedShape] = [
  'chain2',
  'chain3',
  'hub',
];

export interface RoutedRouter {
  readonly id: string;
  /** Every static route this router needs for the whole network to work. */
  readonly routes: readonly StaticRouteConfig[];
}

export interface RoutedNet {
  /** With every route in place: everything reaches everything. */
  readonly topology: TopologySnapshot;
  readonly names: Names;
  readonly routers: readonly RoutedRouter[];
  /** The learner's PC and the device it must reach; `other` is a second far device (hub only). */
  readonly pc: string;
  readonly srv: string;
  readonly other?: string;
  /** The routers on the way from `pc` to `srv`, in order. */
  readonly path: readonly string[];
  /** The network of `pc` and of `srv`. */
  readonly pcNet: Net24;
  readonly srvNet: Net24;
  /** The address of the next router towards `srv` (from `path[i]`) and back towards `pc`. */
  readonly towardsSrv: Readonly<Record<string, string>>;
  readonly towardsPc: Readonly<Record<string, string>>;
  /** An address of its own that each router has on the way: a classic wrong next hop. */
  readonly ownAddressOn: Readonly<Record<string, string>>;
  /** A neighbour of the router that leads AWAY from `srv`, where it has one. */
  readonly awayFromSrv: Readonly<Record<string, string>>;
}

/**
 * chain2:  pc — r1 — r2 — srv
 * chain3:  pc — r1 — rm — r2 — srv
 * hub:     pc — r1 — r2 — srv, and r1 — r3 — other
 */
export function buildRouted(place: Place, plan: AddressPlan, shape: RoutedShape): RoutedNet {
  const { near, far, far2, gateway, pcs, servers, links } = plan;
  const [l1, l2] = links;
  const { sites } = place;
  const pc = host('pc', near.at(pcs[0]), at(0, 1));
  const srv = host('srv', far.at(servers[0]), {
    role: 'server',
    ...at(shape === 'chain3' ? 4 : 3, shape === 'hub' ? 0 : 1),
  });
  const names: Names = {
    pc: sites.near.device,
    r1: sites.near.router,
    r2: sites.far.router,
    srv: sites.far.device,
  };
  const lan = (net: Net24) => iface('lan', `${net.at(gateway)}/24`);
  const withRoutes = (topology: TopologySnapshot, routers: readonly RoutedRouter[]) =>
    routers.reduce(
      (current, entry) =>
        withNodeData(current, entry.id, {
          staticRoutes: entry.routes.map((route) => ({ ...route })),
        }),
      topology,
    );

  if (shape === 'chain3') {
    const routers: RoutedRouter[] = [
      { id: 'r1', routes: [{ destination: far.cidr, nextHop: l1.b }] },
      {
        id: 'rm',
        routes: [
          { destination: far.cidr, nextHop: l2.b },
          { destination: near.cidr, nextHop: l1.a },
        ],
      },
      { id: 'r2', routes: [{ destination: near.cidr, nextHop: l2.a }] },
    ];
    const topology = snapshot(
      [
        pc,
        router('r1', [lan(near), iface('to-rm', `${l1.a}/30`)], {}, at(1, 1)),
        router('rm', [iface('to-r1', `${l1.b}/30`), iface('to-r2', `${l2.a}/30`)], {}, at(2, 1)),
        router('r2', [iface('to-rm', `${l2.b}/30`), lan(far)], {}, at(3, 1)),
        srv,
      ],
      [
        link('e-pc', 'pc', 'r1:lan'),
        link('e-1m', 'r1:to-rm', 'rm:to-r1'),
        link('e-m2', 'rm:to-r2', 'r2:to-rm'),
        link('e-srv', 'r2:lan', 'srv'),
      ],
    );
    return {
      topology: withRoutes(topology, routers),
      names: { ...names, rm: sites.mid.router },
      routers,
      pc: 'pc',
      srv: 'srv',
      path: ['r1', 'rm', 'r2'],
      pcNet: near,
      srvNet: far,
      towardsSrv: { r1: l1.b, rm: l2.b },
      towardsPc: { rm: l1.a, r2: l2.a },
      ownAddressOn: { r1: l1.a, rm: l2.a, r2: l2.b },
      awayFromSrv: { rm: l1.a },
    };
  }

  if (shape === 'hub') {
    const routers: RoutedRouter[] = [
      {
        id: 'r1',
        routes: [
          { destination: far.cidr, nextHop: l1.b },
          { destination: far2.cidr, nextHop: l2.b },
        ],
      },
      {
        id: 'r2',
        routes: [
          { destination: near.cidr, nextHop: l1.a },
          { destination: far2.cidr, nextHop: l1.a },
        ],
      },
      {
        id: 'r3',
        routes: [
          { destination: near.cidr, nextHop: l2.a },
          { destination: far.cidr, nextHop: l2.a },
        ],
      },
    ];
    const topology = snapshot(
      [
        pc,
        router(
          'r1',
          [lan(near), iface('to-r2', `${l1.a}/30`), iface('to-r3', `${l2.a}/30`)],
          {},
          at(1, 1),
        ),
        router('r2', [iface('to-r1', `${l1.b}/30`), lan(far)], {}, at(2, 0)),
        router('r3', [iface('to-r1', `${l2.b}/30`), lan(far2)], {}, at(2, 2)),
        srv,
        host('other', far2.at(servers[1]), { role: 'server', ...at(3, 2) }),
      ],
      [
        link('e-pc', 'pc', 'r1:lan'),
        link('e-12', 'r1:to-r2', 'r2:to-r1'),
        link('e-13', 'r1:to-r3', 'r3:to-r1'),
        link('e-srv', 'r2:lan', 'srv'),
        link('e-other', 'r3:lan', 'other'),
      ],
    );
    return {
      topology: withRoutes(topology, routers),
      names: { ...names, r3: sites.far2.router, other: sites.far2.device },
      routers,
      pc: 'pc',
      srv: 'srv',
      other: 'other',
      path: ['r1', 'r2'],
      pcNet: near,
      srvNet: far,
      towardsSrv: { r1: l1.b },
      towardsPc: { r2: l1.a },
      ownAddressOn: { r1: l1.a, r2: l1.b },
      awayFromSrv: { r1: l2.b },
    };
  }

  const routers: RoutedRouter[] = [
    { id: 'r1', routes: [{ destination: far.cidr, nextHop: l1.b }] },
    { id: 'r2', routes: [{ destination: near.cidr, nextHop: l1.a }] },
  ];
  const topology = snapshot(
    [
      pc,
      router('r1', [lan(near), iface('to-r2', `${l1.a}/30`)], {}, at(1, 1)),
      router('r2', [iface('to-r1', `${l1.b}/30`), lan(far)], {}, at(2, 1)),
      srv,
    ],
    [
      link('e-pc', 'pc', 'r1:lan'),
      link('e-12', 'r1:to-r2', 'r2:to-r1'),
      link('e-srv', 'r2:lan', 'srv'),
    ],
  );
  return {
    topology: withRoutes(topology, routers),
    names,
    routers,
    pc: 'pc',
    srv: 'srv',
    path: ['r1', 'r2'],
    pcNet: near,
    srvNet: far,
    towardsSrv: { r1: l1.b },
    towardsPc: { r2: l1.a },
    ownAddressOn: { r1: l1.a, r2: l1.b },
    awayFromSrv: {},
  };
}
