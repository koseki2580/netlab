// Types
export type {
  TcpFlags,
  RawPayload,
  HttpMessage,
  TcpSegment,
  UdpDatagram,
  IpPacket,
  EthernetFrame,
  Packet,
  InFlightPacket,
} from './types/packets';

export type {
  LayerId,
  ForwardDecision,
  Forwarder,
  ForwarderFactory,
  LayerPlugin,
} from './types/layers';

export type {
  ProtocolName,
  RouteEntry,
  TopologyChangeEvent,
  RoutingProtocol,
  StaticRouteConfig,
  RouterInterface,
} from './types/routing';
export { ADMIN_DISTANCES } from './types/routing';

export type { AreaType, AreaVisualConfig, NetworkArea } from './types/areas';

export type {
  NetlabNodeData,
  SwitchPort,
  NetlabNode,
  NetlabEdge,
  NetworkTopology,
} from './types/topology';

export type { HookFn, HookMap, HookPoint } from './types/hooks';

// Registry
export { registerLayerPlugin, layerRegistry } from './registry/LayerRegistry';
export { protocolRegistry } from './registry/ProtocolRegistry';

// Hook engine
export { HookEngine, hookEngine } from './hooks/HookEngine';
export { useNetlabHooks } from './hooks/useNetlabHooks';

// Routing protocols
export { StaticProtocol, staticProtocol } from './routing/static/StaticProtocol';
export { OspfProtocol, ospfProtocol } from './routing/ospf/OspfProtocol';
export { BgpProtocol, bgpProtocol } from './routing/bgp/BgpProtocol';
export { RipProtocol, ripProtocol } from './routing/rip/RipProtocol';

// Components
export { NetlabProvider } from './components/NetlabProvider';
export type { NetlabProviderProps } from './components/NetlabProvider';
export { NetlabCanvas } from './components/NetlabCanvas';
export type { NetlabCanvasProps } from './components/NetlabCanvas';
export { RouteTable } from './components/controls/RouteTable';
export { AreaLegend } from './components/controls/AreaLegend';
export { useNetlabContext } from './components/NetlabContext';
export { useNetlabUI } from './components/NetlabUIContext';
export { NodeDetailPanel } from './components/NodeDetailPanel';

// Utilities
export { isInSubnet, parseCidr } from './utils/cidr';
export { encodeTopology, decodeTopology } from './utils/topology-url';
export { isValidConnection, isValidConnectionBetweenNodes, isValidEdge } from './utils/connectionValidator';
