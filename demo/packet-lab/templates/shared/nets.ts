/**
 * The two networks every packet exercise is set in, named after a place, and
 * the packet a device of it sends.
 *
 *   lan:     pc1, pc2 — sw1 — r1 — sw2 — srv, srv2
 *   chain:   pc — r1 — … — rN — srv            (N = 1 to 4)
 *   diamond: pc — r1 — r2 or r3 — r4 — srv     (r1's route picks the way)
 *
 * From the README's rules: a narrow link is never the sender's own cable, and
 * there is at most one on a path. The one exception is `p3-pmtud`, whose
 * packets all carry DF: two narrow links are sound when nothing is ever cut
 * (it is cutting twice the engine gets wrong).
 */

import type { AclRule } from '../../../../src/types/acl';
import type { StaticRouteConfig } from '../../../../src/types/routing';
import type { TopologySnapshot } from '../../../../src/types/topology';
import {
  host,
  iface,
  link,
  macFor,
  port,
  router,
  snapshot,
  switchNode,
  withInterface,
} from '../../../exercises/templates/shared/build';
import { buildDiamond, withStatic, type Way } from '../../../exercises/templates/shared/diamond';
import type { Place } from '../../../exercises/templates/shared/places';
import type { AddressPlan } from '../../../exercises/templates/shared/plans';
import type { Named } from '../../../exercises/templates/shared/text';
import type { Carries, PacketGiven } from '../../model';

export type Names = Readonly<Record<string, Named>>;

const at = (col: number, row: number) => ({ x: col * 210, y: row * 110 });

export interface PacketNet {
  readonly topology: TopologySnapshot;
  readonly names: Names;
  /** The address of every host and of every side of a router, by `node` or `node:side`. */
  readonly ip: Readonly<Record<string, string>>;
  /** The routers between the sender and `srv`, in order. */
  readonly routers: readonly string[];
  /** The cable each router sends onto towards `srv`, by router id. */
  readonly edgeAfter: Readonly<Record<string, string>>;
  /** The side of each router the packet from the sender comes in on. */
  readonly inSide: Readonly<Record<string, string>>;
  /** The MAC of every host, router side and switch port, by `node` or `node:side`. */
  readonly mac: Readonly<Record<string, string>>;
}

/**
 * MACs drawn afresh for every instance (`salt`: the seed). The shared builders
 * derive a MAC from the node id alone, so the router's MAC would be the same
 * string in every instance, and a learner could remember it instead of
 * reading the diagram.
 */
function salted(topology: TopologySnapshot, salt: number) {
  const mac: Record<string, string> = {};
  // Hashed twice: one pass of FNV leaves the first bytes tied to how the key begins.
  const of = (key: string) => (mac[key] = macFor(macFor(`${key}~${salt}`)));
  return {
    mac,
    topology: {
      ...topology,
      nodes: topology.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          ...(node.data.mac !== undefined ? { mac: of(node.id) } : {}),
          ...(node.data.interfaces
            ? {
                interfaces: node.data.interfaces.map((side) => ({
                  ...side,
                  macAddress: of(`${node.id}:${side.id}`),
                })),
              }
            : {}),
          ...(node.data.ports
            ? {
                ports: node.data.ports.map((entry) => ({
                  ...entry,
                  macAddress: of(`${node.id}:${entry.id}`),
                })),
              }
            : {}),
        },
      })),
    },
  };
}

export type LanShape = 'one-router' | 'two-routers';

/**
 * one-router:   pc1, pc2 — sw1 — r1 — sw2 — srv, srv2
 * two-routers:  pc1, pc2 — sw1 — r1 — r2 — sw2 — srv, srv2
 */
export function lanNet(
  place: Place,
  plan: AddressPlan,
  salt: number,
  shape: LanShape = 'one-router',
): PacketNet {
  const { near, far, gateway, pcs, servers, links } = plan;
  const two = shape === 'two-routers';
  const ip: Record<string, string> = {
    pc1: near.at(pcs[0]),
    pc2: near.at(pcs[1]),
    'r1:lan': near.at(gateway),
    srv: far.at(servers[0]),
    srv2: far.at(servers[1]),
    ...(two
      ? { 'r1:to-r2': links[0].a, 'r2:to-r1': links[0].b, 'r2:far': far.at(gateway) }
      : { 'r1:far': far.at(gateway) }),
  };
  const routers = two
    ? [
        router(
          'r1',
          [iface('lan', `${ip['r1:lan']}/24`), iface('to-r2', `${links[0].a}/30`)],
          { staticRoutes: [{ destination: far.cidr, nextHop: links[0].b }] },
          at(2, 1),
        ),
        router(
          'r2',
          [iface('to-r1', `${links[0].b}/30`), iface('far', `${far.at(gateway)}/24`)],
          { staticRoutes: [{ destination: near.cidr, nextHop: links[0].a }] },
          at(3, 1),
        ),
      ]
    : [
        router(
          'r1',
          [iface('lan', `${ip['r1:lan']}/24`), iface('far', `${far.at(gateway)}/24`)],
          {},
          at(2, 1),
        ),
      ];
  const last = two ? 'r2' : 'r1';
  const col = two ? 4 : 3;
  const { topology, mac } = salted(
    snapshot(
      [
        host('pc1', ip.pc1 ?? '', at(0, 0)),
        host('pc2', ip.pc2 ?? '', at(0, 2)),
        switchNode('sw1', [port('p1'), port('p2'), port('up')], {}, at(1, 1)),
        ...routers,
        switchNode('sw2', [port('up'), port('p1'), port('p2')], {}, at(col, 1)),
        host('srv', ip.srv ?? '', { role: 'server', ...at(col + 1, 0) }),
        host('srv2', ip.srv2 ?? '', { role: 'server', ...at(col + 1, 2) }),
      ],
      [
        link('e-pc1', 'pc1', 'sw1:p1'),
        link('e-pc2', 'pc2', 'sw1:p2'),
        link('e-up', 'sw1:up', 'r1:lan'),
        ...(two ? [link('e-12', 'r1:to-r2', 'r2:to-r1')] : []),
        link('e-far', `${last}:far`, 'sw2:up'),
        link('e-srv', 'sw2:p1', 'srv'),
        link('e-srv2', 'sw2:p2', 'srv2'),
      ],
    ),
    salt,
  );
  return {
    topology,
    mac,
    names: {
      pc1: place.pcs[0],
      pc2: place.pcs[1],
      sw1: place.lanSwitch,
      ...(two ? { r1: place.sites.near.router, r2: place.sites.far.router } : { r1: place.router }),
      sw2: place.farSwitch,
      srv: place.server,
      srv2: place.server2,
    },
    ip,
    routers: two ? ['r1', 'r2'] : ['r1'],
    edgeAfter: two ? { r1: 'e-12', r2: 'e-far' } : { r1: 'e-far' },
    inSide: two ? { r1: 'lan', r2: 'to-r1' } : { r1: 'lan' },
  };
}

export type RouterCount = 1 | 2 | 3 | 4;

export function chainNet(
  place: Place,
  plan: AddressPlan,
  count: RouterCount,
  salt: number,
): PacketNet {
  const { near, far, gateway, pcs, servers, links } = plan;
  const { sites } = place;
  const ids = Array.from({ length: count }, (_, index) => `r${index + 1}`);
  const routerNames: Named[] =
    count === 1
      ? [place.router]
      : [
          sites.near.router,
          ...[sites.mid.router, sites.far2.router].slice(0, count - 2),
          sites.far.router,
        ];
  const ip: Record<string, string> = { pc: near.at(pcs[0]), srv: far.at(servers[0]) };
  const edgeAfter: Record<string, string> = {};
  const inSide: Record<string, string> = {};
  const nodes = ids.map((id, index) => {
    const first = index === 0;
    const last = index === count - 1;
    const back = first ? 'lan' : `to-r${index}`;
    const on = last ? (first ? 'far' : 'lan') : `to-r${index + 2}`;
    const backIp = first ? near.at(gateway) : (links[index - 1]?.b ?? '');
    const onIp = last ? far.at(gateway) : (links[index]?.a ?? '');
    ip[`${id}:${back}`] = backIp;
    ip[`${id}:${on}`] = onIp;
    inSide[id] = back;
    edgeAfter[id] = last ? 'e-srv' : `e-${index + 1}`;
    const staticRoutes: StaticRouteConfig[] = [
      ...(last ? [] : [{ destination: far.cidr, nextHop: links[index]?.b ?? '' }]),
      ...(first ? [] : [{ destination: near.cidr, nextHop: links[index - 1]?.a ?? '' }]),
    ];
    return router(
      id,
      [iface(back, `${backIp}/${first ? 24 : 30}`), iface(on, `${onIp}/${last ? 24 : 30}`)],
      { staticRoutes },
      at(index + 1, 1),
    );
  });
  const sideTowards = (index: number, next: boolean): string => {
    const id = ids[index] ?? '';
    const side = next
      ? index === count - 1
        ? count === 1
          ? 'far'
          : 'lan'
        : `to-r${index + 2}`
      : (inSide[id] ?? '');
    return `${id}:${side}`;
  };
  const { topology, mac } = salted(
    snapshot(
      [
        host('pc', ip.pc ?? '', at(0, 1)),
        ...nodes,
        host('srv', ip.srv ?? '', { role: 'server', ...at(count + 1, 1) }),
      ],
      [
        link('e-pc', 'pc', sideTowards(0, false)),
        ...ids
          .slice(0, -1)
          .map((_, index) =>
            link(`e-${index + 1}`, sideTowards(index, true), sideTowards(index + 1, false)),
          ),
        link('e-srv', sideTowards(count - 1, true), 'srv'),
      ],
    ),
    salt,
  );
  return {
    topology,
    mac,
    names: {
      pc: count === 1 ? place.pcs[0] : sites.near.device,
      srv: count === 1 ? place.server : sites.far.device,
      ...Object.fromEntries(ids.map((id, index) => [id, routerNames[index] ?? place.router])),
    },
    ip,
    routers: ids,
    edgeAfter,
    inSide,
  };
}

/** `net` with one cable made narrow. */
export function withMtu(net: PacketNet, edgeId: string, mtuBytes: number): PacketNet {
  return {
    ...net,
    topology: {
      ...net.topology,
      edges: net.topology.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, mtuBytes } } : edge,
      ),
    },
  };
}

/** `net` with a list (ACL) on the side of `routerId` the sender's packets come in on. */
export function withFilter(net: PacketNet, routerId: string, rules: readonly AclRule[]): PacketNet {
  return {
    ...net,
    topology: withInterface(net.topology, routerId, net.inSide[routerId] ?? '', {
      inboundAcl: rules.map((rule) => ({ ...rule })),
    }),
  };
}

/** The packet `from` sends, as an exercise hands it over. */
export function packetFrom(
  net: PacketNet,
  from: string,
  over: Partial<Omit<PacketGiven, 'from' | 'srcIp' | 'srcMac'>> = {},
): PacketGiven {
  const carries: Carries = over.carries ?? 'icmp';
  return {
    from,
    srcIp: net.ip[from] ?? '',
    srcMac: net.mac[from] ?? '',
    dstIp: null,
    dstMac: null,
    ttl: 64,
    df: false,
    carries,
    dstPort: null,
    dataBytes: 0,
    ...over,
  };
}

/**
 * The diamond: r1's one route to the server's network goes the `way` given,
 * and r4 sends replies back the same way. `routers` is the path the packet
 * takes, in order.
 */
export function diamondNet(place: Place, plan: AddressPlan, way: Way, salt: number): PacketNet {
  const base = buildDiamond(place, plan);
  const via = base.via[way];
  const nextHop = way === 'top' ? base.links.r12.b : base.links.r13.b;
  const { topology, mac } = salted(
    withStatic(base, way, [{ destination: base.far.cidr, nextHop }]),
    salt,
  );
  const ip: Record<string, string> = {};
  for (const node of topology.nodes) {
    if (node.data.ip) ip[node.id] = node.data.ip;
    for (const side of node.data.interfaces ?? []) ip[`${node.id}:${side.id}`] = side.ipAddress;
  }
  const routers = ['r1', via, 'r4'];
  const edgeOf = (a: string, b: string) =>
    topology.edges.find(
      (edge) =>
        (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a),
    )?.id ?? '';
  const edgeAfter: Record<string, string> = {
    r1: edgeOf('r1', via),
    [via]: edgeOf(via, 'r4'),
    r4: edgeOf('r4', 'srv'),
  };
  const sideFacing = (id: string, from: string) => {
    const edge = topology.edges.find((candidate) => candidate.id === edgeOf(id, from));
    const handle = edge?.source === id ? edge.sourceHandle : edge?.targetHandle;
    return handle ?? '';
  };
  return {
    topology,
    mac,
    names: base.names,
    ip,
    routers,
    edgeAfter,
    inSide: { r1: sideFacing('r1', 'pc'), [via]: sideFacing(via, 'r1'), r4: sideFacing('r4', via) },
  };
}
