import type { NetworkTopology } from './topology';

export type ProtocolName = 'static' | 'ospf' | 'bgp' | 'rip' | (string & Record<never, never>);

export const ADMIN_DISTANCES: Record<string, number> = {
  static: 1,
  ebgp: 20,
  ospf: 110,
  rip: 120,
  ibgp: 200,
};

export interface RouteEntry {
  destination: string;    // CIDR notation e.g. '10.0.0.0/24'
  nextHop: string;        // IP address or 'direct' (connected network)
  metric: number;
  protocol: ProtocolName;
  adminDistance: number;
  nodeId: string;         // which router owns this route
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

export interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  connectedEdgeId?: string;
}
