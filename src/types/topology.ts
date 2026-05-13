import type { Node, Edge } from '@xyflow/react';
import type { LayerId } from './layers';
import type {
  BgpConfig,
  OspfConfig,
  OspfV3Config,
  PortForwardingRule,
  RipConfig,
  RouterInterface,
  StaticRoute6Config,
  StaticRouteConfig,
  RouteEntry,
} from './routing';
import type { LacpConfig } from './lacp';
import type { NetworkArea } from './areas';
import type { DhcpClientConfig, DhcpServerConfig, DnsServerConfig } from './services';
import type { LinkQosConfig } from './link';
import type { NetflowConfig, SflowConfig } from './observability';
import type { WifiConfig, WirelessLinkConfig } from './wireless';
import type { VrfConfig, VtepConfig } from './tunneling';

export interface NetlabNodeData extends Record<string, unknown> {
  label: string;
  layerId: LayerId;
  role: string;
  ip?: string;
  ipv6?: string;
  mac?: string;
  arpTable?: Record<string, string>;
  areaId?: string;
  // Router-specific
  interfaces?: RouterInterface[];
  staticRoutes?: StaticRouteConfig[];
  staticRoutes6?: StaticRoute6Config[];
  ospfConfig?: OspfConfig;
  ospfv3Config?: OspfV3Config;
  ripConfig?: RipConfig;
  bgpConfig?: BgpConfig;
  portForwardingRules?: PortForwardingRule[];
  statefulFirewall?: boolean;
  netflow?: NetflowConfig;
  vrfs?: VrfConfig[];
  vtep?: VtepConfig;
  // Service-specific
  dhcpServer?: DhcpServerConfig;
  dhcpClient?: DhcpClientConfig;
  dnsServer?: DnsServerConfig;
  // Switch-specific
  ports?: SwitchPort[];
  vlans?: VlanConfig[];
  stpConfig?: StpConfig;
  sflow?: SflowConfig;
  wifi?: WifiConfig;
}

export interface SwitchPort {
  id: string;
  name: string;
  macAddress: string;
  vlanMode?: 'access' | 'trunk';
  accessVlan?: number;
  trunkAllowedVlans?: number[];
  nativeVlan?: number;
  stpPathCost?: number;
  sflowEnabled?: boolean;
  lacp?: LacpConfig;
}

export interface VlanConfig {
  vlanId: number;
  name?: string;
}

export type NetlabNode = Node<NetlabNodeData>;

export interface NetlabEdgeData extends Record<string, unknown> {
  mtuBytes?: number;
  state?: 'up' | 'down';
  link?: LinkQosConfig;
  wireless?: WirelessLinkConfig;
}

export type NetlabEdge = Edge<NetlabEdgeData>;

export interface NetworkTopology {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  areas: NetworkArea[];
  routeTables: Map<string, RouteEntry[]>;
  stpStates?: Map<string, StpPortRuntime>;
  stpRoot?: BridgeId | null;
}

/**
 * Serializable topology snapshot used in controlled API callbacks.
 * Excludes computed route tables, which are recomputed by NetlabProvider.
 */
export type TopologySnapshot = Pick<NetworkTopology, 'nodes' | 'edges' | 'areas'>;

// --- STP (IEEE 802.1D) ---

/** 64-bit Bridge Identifier: 16-bit priority + 48-bit MAC address. */
export interface BridgeId {
  priority: number;
  mac: string;
}

export type StpPortRole = 'ROOT' | 'DESIGNATED' | 'BLOCKED' | 'DISABLED';

/** Simplified 3-state port state (educational). */
export type StpPortState = 'FORWARDING' | 'BLOCKING' | 'DISABLED';

/** Runtime STP metadata for a single switch port, produced by computeStp(). */
export interface StpPortRuntime {
  switchNodeId: string;
  portId: string;
  role: StpPortRole;
  state: StpPortState;
  designatedBridge: BridgeId;
  rootPathCost: number;
}

/** Per-switch admin overrides — all optional. */
export interface StpConfig {
  priority?: number;
  disabledPortIds?: string[];
}
