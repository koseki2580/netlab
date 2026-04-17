import type { Node, Edge } from '@xyflow/react';
import type { LayerId } from './layers';
import type {
  BgpConfig,
  OspfConfig,
  PortForwardingRule,
  RipConfig,
  RouterInterface,
  StaticRouteConfig,
  RouteEntry,
} from './routing';
import type { NetworkArea } from './areas';
import type { DhcpClientConfig, DhcpServerConfig, DnsServerConfig } from './services';

export interface NetlabNodeData extends Record<string, unknown> {
  label: string;
  layerId: LayerId;
  role: string;
  ip?: string;
  mac?: string;
  arpTable?: Record<string, string>;
  areaId?: string;
  // Router-specific
  interfaces?: RouterInterface[];
  staticRoutes?: StaticRouteConfig[];
  ospfConfig?: OspfConfig;
  ripConfig?: RipConfig;
  bgpConfig?: BgpConfig;
  portForwardingRules?: PortForwardingRule[];
  statefulFirewall?: boolean;
  // Service-specific
  dhcpServer?: DhcpServerConfig;
  dhcpClient?: DhcpClientConfig;
  dnsServer?: DnsServerConfig;
  // Switch-specific
  ports?: SwitchPort[];
}

export interface SwitchPort {
  id: string;
  name: string;
  macAddress: string;
  vlanMode?: 'access' | 'trunk';
  accessVlan?: number;
  trunkAllowedVlans?: number[];
}

export interface VlanConfig {
  vlanId: number;
  name?: string;
}

export type NetlabNode = Node<NetlabNodeData>;
export type NetlabEdge = Edge;

export interface NetworkTopology {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  areas: NetworkArea[];
  routeTables: Map<string, RouteEntry[]>;
}

/**
 * Serializable topology snapshot used in controlled API callbacks.
 * Excludes computed route tables, which are recomputed by NetlabProvider.
 */
export type TopologySnapshot = Pick<NetworkTopology, 'nodes' | 'edges' | 'areas'>;
