import type { AclRule } from './acl';
import type { NetworkTopology } from './topology';
import type { AddressFamily } from '../routing/AddressFamily';
import type { VrrpConfig } from './vrrp';
import type { GreTunnelConfig } from './tunneling';

export type ProtocolName = 'static' | 'ospf' | 'bgp' | 'rip' | (string & Record<never, never>);

export const ADMIN_DISTANCES = {
  static: 1,
  ebgp: 20,
  ospf: 110,
  rip: 120,
  ibgp: 200,
} as const;

export interface RouteEntry {
  af?: AddressFamily;
  destination: string; // CIDR notation e.g. '10.0.0.0/24'
  nextHop: string; // IP address or 'direct' (connected network)
  outIfId?: string; // optional egress interface id used by ECMP candidates
  equalCostNextHops?: readonly EqualCostNextHop[];
  metric: number;
  protocol: ProtocolName;
  adminDistance: number;
  nodeId: string; // which router owns this route
  /** Set by OSPF's area-by-area calculation: what kind of path the route is. */
  ospfPathType?: OspfPathType;
}

export type OspfPathType = 'intra-area' | 'inter-area' | 'external-1' | 'external-2';

export interface EqualCostNextHop {
  nextHop: string;
  outIfId?: string;
}

export interface TopologyChangeEvent {
  type: 'node:add' | 'node:remove' | 'link:add' | 'link:remove';
  nodeId?: string;
  linkId?: string;
}

export interface RoutingProtocol {
  name: ProtocolName;
  adminDistance: number;
  computeRoutes(topology: NetworkTopology): RouteEntry[];
  onTopologyChange?(event: TopologyChangeEvent): void;
}

export interface StaticRouteConfig {
  destination: string;
  nextHop: string;
  metric?: number;
}

export interface StaticRoute6Config {
  destination: string;
  nextHop: string;
  metric?: number;
}

export interface PortForwardingRule {
  proto: 'tcp' | 'udp';
  externalPort: number;
  internalIp: string;
  internalPort: number;
}

export interface SubInterface {
  id: string;
  parentInterfaceId: string;
  vlanId: number;
  ipAddress: string;
  prefixLength: number;
  ipv6Address?: string;
  prefixLength6?: number;
  mtu?: number;
}

export interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  ipv6Address?: string;
  prefixLength6?: number;
  macAddress: string;
  mtu?: number;
  connectedEdgeId?: string;
  /** OSPF priority for the DR election on this interface (default 1; 0 never stands). */
  ospfPriority?: number;
  nat?: 'inside' | 'outside';
  inboundAcl?: AclRule[];
  outboundAcl?: AclRule[];
  vrrp?: VrrpConfig;
  greTunnel?: GreTunnelConfig;
  mplsEnabled?: boolean;
  subInterfaces?: SubInterface[];
}

// --- Dynamic Routing Protocol Configs ---

export interface OspfConfig {
  routerId: string;
  areas: OspfAreaConfig[];
  /** Networks from outside OSPF this router brings in: it is an ASBR. */
  externals?: OspfExternalConfig[];
}

export interface OspfExternalConfig {
  network: string;
  metric: number;
  /** E2 (the default) keeps the metric; E1 adds the cost of the way to the ASBR. */
  metricType?: 1 | 2;
}

export interface OspfV3Config {
  routerId: string;
  areas: OspfV3AreaConfig[];
  instanceId?: number;
}

export interface OspfV3AreaConfig {
  areaId: string;
  networks: string[];
  cost?: number;
}

export interface OspfAreaConfig {
  areaId: string;
  networks: string[];
  cost?: number;
  /** Ranges an ABR summarises this area's networks into. */
  ranges?: string[];
}

export interface RipConfig {
  version: 1 | 2;
  networks: string[];
}

export interface BgpConfig {
  localAs: number;
  routerId: string;
  neighbors: BgpNeighborConfig[];
  networks: string[];
  maxEcmpPaths?: number;
}

export type BgpAddressFamily = AddressFamily;

export interface BgpNeighborConfig {
  address: string;
  remoteAs: number;
  families?: BgpAddressFamily[];
  localPref?: number;
  med?: number;
  /** Import policy: the ORIGIN given to routes learned from this neighbour. */
  origin?: BgpPathAttributes['origin'];
}

export interface BgpPathAttributes {
  asPath: number[];
  localPref: number;
  med: number;
  origin: 'igp' | 'egp' | 'incomplete';
}
