import type { EthernetFrame, IpPacket } from './packets';

export interface GreHeader {
  readonly hasChecksum: boolean;
  readonly hasKey: boolean;
  readonly hasSequence: boolean;
  readonly version: 0;
  readonly protocolType: 0x0800 | 0x86dd;
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

export interface MplsLabel {
  readonly label: number;
  readonly tc: number;
  readonly endOfStack: boolean;
  readonly ttl: number;
}

export type MplsLabelStack = readonly MplsLabel[];

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
