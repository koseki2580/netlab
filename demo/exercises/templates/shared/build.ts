/**
 * Small builders for exercise topologies.
 *
 * Everything here returns plain JSON (`TopologySnapshot`): no route tables, no
 * spanning-tree state. `grade/prepare.ts` computes those. MAC addresses are
 * derived from ids so the same builder call always gives the same topology.
 */

import type { RouterInterface } from '../../../../src/types/routing';
import type {
  NetlabEdge,
  NetlabNode,
  NetlabNodeData,
  SwitchPort,
  TopologySnapshot,
} from '../../../../src/types/topology';

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
