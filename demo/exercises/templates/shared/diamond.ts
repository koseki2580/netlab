/**
 * What the level 3 routing templates share: two ways from the PC's site to
 * the server's site, over one router or another.
 *
 *            r2 (top)
 * pc — r1 <          > r4 — srv
 *            r3 (bottom)
 *
 * Every network comes from the seed's address plan: the PC's network, the
 * server's, and four links (/30) between the routers.
 */

import type { StaticRouteConfig } from '../../../../src/types/routing';
import type { TopologySnapshot } from '../../../../src/types/topology';
import type { Localised, SettingChange, SettingRef } from '../../model/types';
import { host, iface, link, router, snapshot, withNodeData, withOspfCost } from './build';
import type { Place } from './places';
import type { AddressPlan, Net24 } from './plans';
import { L, type Named } from './text';

export type Way = 'top' | 'bottom';

export interface DiamondLink {
  readonly cidr: string;
  /** The address on the router nearer the PC, and on the one nearer the server. */
  readonly a: string;
  readonly b: string;
}

export interface DiamondNet {
  readonly topology: TopologySnapshot;
  readonly names: Readonly<Record<string, Named>>;
  readonly near: Net24;
  readonly far: Net24;
  /** r1–r2, r1–r3, r2–r4, r3–r4. */
  readonly links: {
    readonly r12: DiamondLink;
    readonly r13: DiamondLink;
    readonly r24: DiamondLink;
    readonly r34: DiamondLink;
  };
  /** The router of each way. */
  readonly via: Readonly<Record<Way, 'r2' | 'r3'>>;
}

const at = (col: number, row: number) => ({ x: col * 210, y: row * 120 });

function linkOf(block: string, index: number): DiamondLink {
  const base = index * 4;
  return { cidr: `${block}.${base}/30`, a: `${block}.${base + 1}`, b: `${block}.${base + 2}` };
}

/** The diamond with no routing at all; `withOspf` or `withStatic` adds it. */
export function buildDiamond(
  place: Place,
  plan: AddressPlan,
  /** List the far router before the near one (nothing on the diagram moves): cards follow this order. */
  farFirst = false,
): DiamondNet {
  const { near, far, gateway, pcs, servers } = plan;
  const block = plan.links[0].cidr.split('.').slice(0, 3).join('.');
  const links = {
    r12: linkOf(block, 0),
    r13: linkOf(block, 1),
    r24: linkOf(block, 2),
    r34: linkOf(block, 3),
  };
  const { sites } = place;
  const names: Record<string, Named> = {
    pc: sites.near.device,
    r1: sites.near.router,
    r2: sites.mid.router,
    r3: sites.far3.router,
    r4: sites.far.router,
    srv: sites.far.device,
  };
  const topology = snapshot(
    [
      host('pc', near.at(pcs[0]), at(0, 1)),
      router(
        'r1',
        [
          iface('lan', `${near.at(gateway)}/24`),
          iface('to-r2', `${links.r12.a}/30`),
          iface('to-r3', `${links.r13.a}/30`),
        ],
        {},
        at(1, 1),
      ),
      router(
        'r2',
        [iface('to-r1', `${links.r12.b}/30`), iface('to-r4', `${links.r24.a}/30`)],
        {},
        at(2, 0),
      ),
      router(
        'r3',
        [iface('to-r1', `${links.r13.b}/30`), iface('to-r4', `${links.r34.a}/30`)],
        {},
        at(2, 2),
      ),
      router(
        'r4',
        [
          iface('to-r2', `${links.r24.b}/30`),
          iface('to-r3', `${links.r34.b}/30`),
          iface('lan', `${far.at(gateway)}/24`),
        ],
        {},
        at(3, 1),
      ),
      host('srv', far.at(servers[0]), { role: 'server', ...at(4, 1) }),
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
  const ordered = farFirst
    ? {
        ...topology,
        nodes: [...topology.nodes].sort((a, b) => Number(b.id === 'r4') - Number(a.id === 'r4')),
      }
    : topology;
  return { topology: ordered, names, near, far, links, via: { top: 'r2', bottom: 'r3' } };
}

/** Every router runs OSPF, with one `areas` entry per network so each link has a cost of its own. */
export function withOspf(net: DiamondNet): TopologySnapshot {
  const { near, far, links } = net;
  const networks: Record<string, string[]> = {
    r1: [near.cidr, links.r12.cidr, links.r13.cidr],
    r2: [links.r12.cidr, links.r24.cidr],
    r3: [links.r13.cidr, links.r34.cidr],
    r4: [links.r24.cidr, links.r34.cidr, far.cidr],
  };
  return Object.entries(networks).reduce(
    (topology, [nodeId, nets], index) =>
      withNodeData(topology, nodeId, {
        ospfConfig: {
          routerId: `${index + 1}.${index + 1}.${index + 1}.${index + 1}`,
          areas: nets.map((network) => ({ areaId: '0.0.0.0', networks: [network] })),
        },
      }),
    net.topology,
  );
}

/** The cost of one link as seen from one router: outgoing traffic only. */
export const cost = (nodeId: string, network: string, value: number): SettingChange => ({
  kind: 'ospf-cost',
  nodeId,
  network,
  cost: value,
});

export const costRef = (nodeId: string, network: string): SettingRef => ({
  kind: 'ospf-cost',
  nodeId,
  network,
});

/** Apply OSPF costs to a topology (`cost` changes only). */
export function withCosts(
  topology: TopologySnapshot,
  costs: readonly { readonly nodeId: string; readonly network: string; readonly cost: number }[],
): TopologySnapshot {
  return costs.reduce(
    (current, entry) => withOspfCost(current, entry.nodeId, entry.network, entry.cost),
    topology,
  );
}

/**
 * Static routes for everything but r1's way to the server: r2 and r3 both know
 * both ends, r4 sends answers back over `back`.
 */
export function withStatic(
  net: DiamondNet,
  back: Way,
  r1Routes: readonly StaticRouteConfig[],
): TopologySnapshot {
  const { near, far, links } = net;
  const set = (topology: TopologySnapshot, nodeId: string, routes: readonly StaticRouteConfig[]) =>
    withNodeData(topology, nodeId, { staticRoutes: routes.map((route) => ({ ...route })) });
  let topology = set(net.topology, 'r1', r1Routes);
  topology = set(topology, 'r2', [
    { destination: far.cidr, nextHop: links.r24.b },
    { destination: near.cidr, nextHop: links.r12.a },
  ]);
  topology = set(topology, 'r3', [
    { destination: far.cidr, nextHop: links.r34.b },
    { destination: near.cidr, nextHop: links.r13.a },
  ]);
  return set(topology, 'r4', [
    { destination: near.cidr, nextHop: back === 'top' ? links.r24.a : links.r34.a },
  ]);
}

/** What OSPF cost is, said once per brief. */
export const COST_GLOSS = L(
  'The routers find their ways by themselves (OSPF). Each link has a cost (a score per link; the way with the lowest total is chosen). A cost counts for traffic going OUT of the router it is set on.',
  'ルータどうしは、道を自分たちで見つけます（OSPF）。ケーブルごとにコスト（回線ごとの点数。合計が小さい道が選ばれます）があります。コストは、それを設定したルータから「出ていく」通信にだけ数えられます。',
);

/** Why a cost counts outbound only. */
export const WHY_OUTBOUND = L(
  'Each router adds up the costs on its own way out: that is how it decides where to send things. The answer coming back is decided by the routers on the other side, with their own costs.',
  '各ルータは、自分から出ていく側のコストを足して、どこへ送るかを決めます。帰ってくる返事の道は、向こう側のルータが、自分のコストで決めます。',
);

export const wayWords = (net: DiamondNet, way: Way): Localised => {
  const name = net.names[net.via[way]];
  return L(name?.en ?? net.via[way], name?.ja ?? net.via[way]);
};
