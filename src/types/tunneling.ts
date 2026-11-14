import type { EthernetFrame, IpPacket, RawPayload } from './packets';

export interface GreHeader {
  readonly hasChecksum: boolean;
  readonly hasKey: boolean;
  readonly hasSequence: boolean;
  readonly version: 0;
  /** EtherType of the payload (RFC 2784 §2.4), e.g. 0x0800 IPv4, 0x86DD IPv6, 0x6558 Ethernet. */
  readonly protocolType: number;
  readonly checksum?: number;
  readonly key?: number;
  readonly sequence?: number;
}

export interface GreTunnelConfig {
  readonly sourceIp: string;
  readonly destinationIp: string;
  readonly key?: number;
  readonly sequence?: number;
}

export interface GreEnvelope {
  readonly kind: 'gre';
  readonly header: GreHeader;
  readonly inner: IpPacket;
}

/** A GRE packet in an outer IPv4 packet: the wire bytes in `data`, the structure in `gre`. */
export interface GreRawPayload extends RawPayload {
  readonly gre: GreEnvelope;
}

export interface MplsLabel {
  readonly label: number;
  readonly tc: number;
  readonly endOfStack: boolean;
  readonly ttl: number;
}

export type MplsLabelStack = readonly MplsLabel[];

/** A router's MPLS tables (REQ-334): what it pushes onto IP packets, and what it does with a label. */
export interface MplsTables {
  /**
   * FEC to NHLFE: for a destination in `prefix`, push `push` (top first) and send to `nextHop`.
   * In an L3VPN the FEC is a provider address, the egress PE's loopback (RFC 5036), not a customer route.
   */
  readonly ftn?: readonly {
    readonly prefix: string;
    readonly push: readonly number[];
    readonly nextHop: string;
  }[];
  /**
   * VPN routes (RFC 4364 §5–6, REQ-351): for a destination in `prefix`, push the VPN `label` (from
   * MP-BGP) under the transport label of the `ftn` entry whose FEC holds `egress`, the egress PE.
   * With no such entry the route is not used.
   */
  readonly vpn?: readonly {
    readonly prefix: string;
    readonly label: number;
    readonly egress: string;
  }[];
  /** The label table: swap `inLabel` for `outLabel`, or pop it; send to `nextHop` when labels remain. */
  readonly lfib?: readonly {
    readonly inLabel: number;
    readonly action: 'swap' | 'pop';
    readonly outLabel?: number;
    readonly nextHop?: string;
  }[];
}

export interface RouteDistinguisher {
  readonly type: 0 | 1 | 2;
  readonly value: string;
}

export interface RouteTarget {
  readonly type: 0x0002;
  readonly value: string;
}

export interface VrfConfig {
  readonly name: string;
  readonly rd: RouteDistinguisher;
  readonly importRts: readonly RouteTarget[];
  readonly exportRts: readonly RouteTarget[];
  readonly attachedInterfaces: readonly string[];
}

export interface Vpnv4Route {
  readonly rd: RouteDistinguisher;
  readonly prefix: string;
  readonly routeTargets: readonly RouteTarget[];
  readonly nextHopPe: string;
  readonly vpnLabel: number;
}

export interface VrfRuntime {
  readonly config: VrfConfig;
  readonly routes: readonly Vpnv4Route[];
}

export interface VtepConfig {
  readonly vni: number;
  readonly sourceVtepIp: string;
  readonly peerVtepIps: readonly string[];
  readonly arpSuppression?: boolean;
}

export interface VxlanHeader {
  readonly vni: number;
}

export interface VxlanEnvelope {
  readonly kind: 'vxlan';
  readonly header: VxlanHeader;
  readonly inner: EthernetFrame;
}

/** A VXLAN packet in UDP: the wire bytes in `data`, the structure in `vxlan` (REQ-331). */
export interface VxlanRawPayload extends RawPayload {
  readonly vxlan: VxlanEnvelope;
}

export interface VxlanEncapConfig {
  readonly vni: number;
  readonly sourceVtepIp: string;
  readonly destinationVtepIp: string;
}

export interface EvpnType2 {
  readonly kind: 'evpn-mac-ip';
  readonly rd: RouteDistinguisher;
  readonly vni: number;
  readonly mac: string;
  readonly ip?: string;
  readonly originVtepIp: string;
  readonly label1: number;
}

export interface EvpnType5 {
  readonly kind: 'evpn-ip-prefix';
  readonly rd: RouteDistinguisher;
  readonly vni: number;
  readonly prefix: string;
  readonly gatewayIp: string;
  readonly originVtepIp: string;
  readonly label: number;
}

export type EvpnRoute = EvpnType2 | EvpnType5;

export interface EvpnMacIpEntry {
  readonly vni: number;
  readonly mac: string;
  readonly ip?: string;
  readonly remoteVtepIp: string;
}
