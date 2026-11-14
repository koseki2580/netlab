/**
 * The network of the level 5 packet exercises (REQ-353): a chain of three
 * routers in which the two ends carry the packet through the middle one in a
 * tunnel, and the middle one knows nothing of the PC's or the server's network.
 *
 *   pc — r1 — r2 — r3 — srv
 *
 * - `gre`: r1 and r3 wrap it in GRE (RFC 2784, key RFC 2890) between their core addresses.
 * - `vxlan`: r1 and r3 are VTEPs (RFC 7348) with a VNI each, sending from their
 *   loopbacks; r2 has routes to those two addresses and to nothing of the sites.
 * - `mpls`: r1 pushes the LDP label for r3's loopback (RFC 5036) over the VPN label
 *   (RFC 4364 §5–6); r2 swaps or pops it by its label table; r3 pops what is left.
 *
 * `fault` breaks the far end (another key, VNI, or no VPN label) or the middle.
 */

import type { NetlabNode, NetlabNodeData, TopologySnapshot } from '../../../../src/types/topology';
import { iface, macFor } from '../../../exercises/templates/shared/build';
import type { Place } from '../../../exercises/templates/shared/places';
import type { AddressPlan } from '../../../exercises/templates/shared/plans';
import { chainNet, type PacketNet } from './nets';

export type TunnelKind = 'gre' | 'vxlan' | 'mpls';

export interface TunnelNet extends PacketNet {
  readonly kind: TunnelKind;
  /** The tunnel's ends: the address each end sends the outer packet from (GRE, VXLAN). */
  readonly ends: { readonly near: string; readonly far: string };
  /** Every address of the core: r1's and r3's on the cables, r2's two, and the third /30's two. */
  readonly core: readonly string[];
  /** MPLS: r3's loopback, the FEC of the transport label. */
  readonly loopback: string;
  /** GRE: r3's address on the tunnel itself (its `tun0` side). */
  readonly farTunnelSide: string;
  /** GRE key or VXLAN VNI at r1, and at r3. */
  readonly ids: { readonly near: number; readonly far: number };
  /** MPLS: the label r1 pushes on top, the one r2 sends on (null: r2 pops it, PHP), and the VPN label. */
  readonly labels: { readonly top: number; readonly next: number | null; readonly vpn: number };
}

/**
 * What breaks: `far-end` another key or VNI at r3 (MPLS: r3 has no entry for the
 * VPN label); `middle` r2 has no label table (MPLS) or its cable to r3 is out.
 */
export type TunnelFault = 'none' | 'far-end' | 'middle';

export interface TunnelOptions {
  readonly kind: TunnelKind;
  readonly fault: TunnelFault;
  /** MPLS: r3 asked for label 3 (implicit null), so r2 pops the transport label. */
  readonly php: boolean;
  readonly salt: number;
}

const patch = (
  topology: TopologySnapshot,
  id: string,
  change: (data: NetlabNodeData) => Partial<NetlabNodeData>,
): TopologySnapshot => ({
  ...topology,
  nodes: topology.nodes.map((node: NetlabNode) =>
    node.id === id ? { ...node, data: { ...node.data, ...change(node.data) } } : node,
  ),
});

export function tunnelNet(place: Place, plan: AddressPlan, options: TunnelOptions): TunnelNet {
  const { kind, fault, php, salt } = options;
  // Which /30 is which follows the salt, so the far end's address is not always the same.
  const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ] as const;
  // Hashed, not `salt % n`: the templates place their outcomes by the seed too.
  const hash = (tag: string) =>
    parseInt(macFor(`${tag}~${salt}`).replace(/:/g, '').slice(2, 10), 16);
  const order = orders[hash('order') % orders.length] ?? orders[0];
  // And which end of each /30 is which, so no address keeps one role.
  const turned = (index: number) => {
    const link = plan.links[order[index] ?? index] ?? plan.links[0];
    return (hash('turn') >>> index) % 2 === 0 ? link : { ...link, a: link.b, b: link.a };
  };
  const links = [turned(0), turned(1), turned(2)] as const;
  const shuffledPlan: AddressPlan = { ...plan, links };
  const base = chainNet(place, shuffledPlan, 3, salt);
  const [toR2, toR3, spare] = links;
  const near = toR2.a;
  const far = toR3.b;
  // A key, a VNI and labels that differ from instance to instance.
  const id = 100 + (hash('id') % 90) * 10;
  const ids = { near: kind === 'vxlan' ? id * 10 : id, far: 0 };
  const farId = fault === 'far-end' ? ids.near + (kind === 'vxlan' ? 10 : 1) : ids.near;
  const top = 16001 + (hash('top') % 400) * 2;
  const labels = { top, next: php ? null : top + 1, vpn: 24000 + (hash('vpn') % 2000) };
  let topology = base.topology;

  // The middle router knows only its own two cables.
  topology = patch(topology, 'r2', () => ({ staticRoutes: [] }));
  const routesAt = (router: 'r1' | 'r3') =>
    router === 'r1'
      ? [{ destination: toR3.cidr, nextHop: toR2.b }]
      : [{ destination: toR2.cidr, nextHop: toR3.a }];

  if (kind === 'gre') {
    const inner = { near: spare.a, far: spare.b };
    topology = patch(topology, 'r1', (data) => ({
      interfaces: [
        ...(data.interfaces ?? []),
        {
          ...iface('tun0', `${inner.near}/30`, {
            greTunnel: { sourceIp: near, destinationIp: far, key: ids.near },
          }),
          macAddress: macFor(`r1:tun0~${salt}`),
        },
      ],
      staticRoutes: [...routesAt('r1'), { destination: plan.far.cidr, nextHop: inner.far }],
    }));
    topology = patch(topology, 'r3', (data) => ({
      interfaces: [
        ...(data.interfaces ?? []),
        {
          ...iface('tun0', `${inner.far}/30`, {
            greTunnel: { sourceIp: far, destinationIp: near, key: farId },
          }),
          macAddress: macFor(`r3:tun0~${salt}`),
        },
      ],
      staticRoutes: [...routesAt('r3'), { destination: plan.near.cidr, nextHop: inner.near }],
    }));
  } else if (kind === 'vxlan') {
    const loop = { near: spare.a, far: spare.b };
    const lo = (id: string, address: string): NetlabNodeData['interfaces'] => [
      { ...iface('lo', `${address}/32`), macAddress: macFor(`${id}:lo~${salt}`) },
    ];
    topology = patch(topology, 'r1', (data) => ({
      interfaces: [...(data.interfaces ?? []), ...(lo('r1', loop.near) ?? [])],
      vtep: { vni: ids.near, sourceVtepIp: loop.near, peerVtepIps: [loop.far] },
      staticRoutes: [
        { destination: `${loop.far}/32`, nextHop: toR2.b },
        { destination: plan.far.cidr, nextHop: loop.far },
      ],
    }));
    topology = patch(topology, 'r2', () => ({
      staticRoutes: [
        { destination: `${loop.near}/32`, nextHop: toR2.a },
        { destination: `${loop.far}/32`, nextHop: toR3.b },
      ],
    }));
    topology = patch(topology, 'r3', (data) => ({
      interfaces: [...(data.interfaces ?? []), ...(lo('r3', loop.far) ?? [])],
      vtep: { vni: farId, sourceVtepIp: loop.far, peerVtepIps: [loop.near] },
      staticRoutes: [
        { destination: `${loop.near}/32`, nextHop: toR3.a },
        { destination: plan.near.cidr, nextHop: loop.near },
      ],
    }));
  } else {
    const loop = { near: spare.a, far: spare.b };
    topology = patch(topology, 'r1', (data) => ({
      interfaces: [
        ...(data.interfaces ?? []),
        { ...iface('lo', `${loop.near}/32`), macAddress: macFor(`r1:lo~${salt}`) },
      ],
      mpls: {
        ftn: [{ prefix: `${loop.far}/32`, push: [labels.top], nextHop: toR2.b }],
        vpn: [{ prefix: plan.far.cidr, label: labels.vpn, egress: loop.far }],
      },
    }));
    topology = patch(topology, 'r2', () => ({
      staticRoutes: [],
      mpls:
        fault === 'middle'
          ? {}
          : {
              lfib: [
                php
                  ? { inLabel: labels.top, action: 'pop' as const, nextHop: toR3.b }
                  : {
                      inLabel: labels.top,
                      action: 'swap' as const,
                      outLabel: labels.top + 1,
                      nextHop: toR3.b,
                    },
              ],
            },
    }));
    topology = patch(topology, 'r3', (data) => ({
      interfaces: [
        ...(data.interfaces ?? []),
        { ...iface('lo', `${loop.far}/32`), macAddress: macFor(`r3:lo~${salt}`) },
      ],
      mpls: {
        lfib: [
          { inLabel: labels.top + 1, action: 'pop' as const },
          ...(fault === 'far-end' ? [] : [{ inLabel: labels.vpn, action: 'pop' as const }]),
        ],
      },
    }));
  }
  // GRE, VXLAN: the middle router's cable to the far end is out.
  if (kind !== 'mpls' && fault === 'middle') {
    topology = {
      ...topology,
      edges: topology.edges.map((edge) =>
        edge.id === 'e-2' ? { ...edge, data: { ...edge.data, state: 'down' as const } } : edge,
      ),
    };
  }
  return {
    ...base,
    topology,
    kind,
    ends: kind === 'vxlan' ? { near: spare.a, far: spare.b } : { near, far },
    core: [near, toR2.b, toR3.a, far, spare.a, spare.b],
    loopback: spare.b,
    farTunnelSide: spare.b,
    ids: { near: ids.near, far: farId },
    labels,
  };
}
