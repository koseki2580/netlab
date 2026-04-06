// Failure simulation types
export type { FailureState } from './types/failure';
export { EMPTY_FAILURE_STATE } from './types/failure';

// Failure simulation context
export {
  FailureProvider,
  FailureContext,
  useFailure,
  useOptionalFailure,
} from './simulation/FailureContext';
export type { FailureContextValue } from './simulation/FailureContext';

// Failure simulation UI
export { FailureTogglePanel } from './components/simulation/FailureTogglePanel';

// Simulation types
export type {
  PacketHop,
  PacketTrace,
  SimulationStatus,
  SimulationState,
  RoutingDecision,
  RoutingCandidate,
} from './types/simulation';

// Simulation engine
export { SimulationEngine } from './simulation/SimulationEngine';

// Simulation React integration
export {
  SimulationProvider,
  SimulationContext,
  useSimulation,
} from './simulation/SimulationContext';
export type { SimulationProviderProps, SimulationContextValue } from './simulation/SimulationContext';

// Simulation UI components
export { SimulationControls } from './components/simulation/SimulationControls';
export { PacketViewer } from './components/simulation/PacketViewer';
export { PacketTimeline } from './components/simulation/PacketTimeline';
export { StepControls } from './components/simulation/StepControls';

// Step simulation controller
export { StepSimulationController } from './simulation/StepSimulationController';
export type { StepSimStatus, StepSimState } from './simulation/StepSimulationController';

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
export { ResizableSidebar } from './components/ResizableSidebar';
export type { ResizableSidebarProps } from './components/ResizableSidebar';
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

// Editor
export { TopologyEditor } from './editor/components/TopologyEditor';
export type { TopologyEditorProps } from './editor/components/TopologyEditor';
export type { EditorTopology, TopologyEditorState, PositionUpdate } from './editor/types';
export { useTopologyEditorContext } from './editor/context/TopologyEditorContext';
export type { TopologyEditorContextValue } from './editor/context/TopologyEditorContext';
export { TopologyEditorProvider } from './editor/context/TopologyEditorProvider';
export type { TopologyEditorProviderProps } from './editor/context/TopologyEditorProvider';
export {
  createRouterNode,
  createSwitchNode,
  createClientNode,
  createServerNode,
  randomPosition,
} from './editor/utils/nodeFactory';
