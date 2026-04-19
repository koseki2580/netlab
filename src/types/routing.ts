import type { AclRule } from './acl';
import type { NetworkTopology } from './topology';

export type ProtocolName = 'static' | 'ospf' | 'bgp' | 'rip' | (string & Record<never, never>);

export const ADMIN_DISTANCES = {
  static: 1,
  ebgp: 20,
  ospf: 110,
  rip: 120,
  ibgp: 200,
} as const;

export interface RouteEntry {
  destination: string; // CIDR notation e.g. '10.0.0.0/24'
  nextHop: string; // IP address or 'direct' (connected network)
  metric: number;
  protocol: ProtocolName;
  adminDistance: number;
  nodeId: string; // which router owns this route
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
  mtu?: number;
}

export interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  mtu?: number;
  connectedEdgeId?: string;
  nat?: 'inside' | 'outside';
  inboundAcl?: AclRule[];
  outboundAcl?: AclRule[];
  subInterfaces?: SubInterface[];
}

// --- Dynamic Routing Protocol Configs ---

export interface OspfConfig {
  routerId: string;
  areas: OspfAreaConfig[];
}

export interface OspfAreaConfig {
  areaId: string;
  networks: string[];
  cost?: number;
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
}

export interface BgpNeighborConfig {
  address: string;
  remoteAs: number;
  localPref?: number;
  med?: number;
}

export interface BgpPathAttributes {
  asPath: number[];
  localPref: number;
  med: number;
  origin: 'igp' | 'egp' | 'incomplete';
}
