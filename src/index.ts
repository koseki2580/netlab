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
  NatTranslation,
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

// Session types
export type {
  NetworkSession,
  SessionPhase,
  SessionStatus,
  SessionEvent,
} from './types/session';

// Session tracker + context
export { SessionTracker } from './simulation/SessionTracker';
export {
  SessionProvider,
  SessionContext,
  useSession,
} from './simulation/SessionContext';
export type { SessionProviderProps, SessionContextValue } from './simulation/SessionContext';

// Simulation UI components
export { SimulationControls } from './components/simulation/SimulationControls';
export { PacketViewer } from './components/simulation/PacketViewer';
export { PacketTimeline } from './components/simulation/PacketTimeline';
export { HopInspector } from './components/simulation/HopInspector';
export { NatTableViewer } from './components/simulation/NatTableViewer';
export { StepControls } from './components/simulation/StepControls';
export { PacketStructureViewer } from './components/simulation/PacketStructureViewer';
export { TraceSummary } from './components/simulation/TraceSummary';
export { TraceSelector } from './components/simulation/TraceSelector';
export { SessionList } from './components/simulation/SessionList';
export { SessionDetail } from './components/simulation/SessionDetail';

// Packet serializer (byte-level packet visualization)
export { serializePacket, serializeArpFrame } from './utils/packetSerializer';
export type { LayerTag, AnnotatedField, SerializedPacket } from './utils/packetSerializer';

// Step simulation controller
export { StepSimulationController } from './simulation/StepSimulationController';
export type { StepSimStatus, StepSimState } from './simulation/StepSimulationController';

// Types
export type {
  TcpFlags,
  RawPayload,
  HttpMessage,
  DhcpOptions,
  DhcpMessage,
  DnsQuestion,
  DnsRecord,
  DnsMessage,
  IcmpMessage,
  TcpSegment,
  UdpDatagram,
  IpPacket,
  EthernetFrame,
  ArpPacket,
  ArpEthernetFrame,
  Packet,
  InFlightPacket,
} from './types/packets';

export type {
  LayerId,
  ForwardContext,
  ForwardDecision,
  Forwarder,
  ForwarderFactory,
  LayerPlugin,
} from './types/layers';

export type { Neighbor } from './types/simulation';

export type {
  ProtocolName,
  RouteEntry,
  TopologyChangeEvent,
  RoutingProtocol,
  StaticRouteConfig,
  PortForwardingRule,
  RouterInterface,
} from './types/routing';
export { ADMIN_DISTANCES } from './types/routing';
export type { NatType, NatEntry, NatTable } from './types/nat';
export type {
  AclAction,
  AclProtocol,
  AclPortRange,
  AclRule,
  AclMatchInfo,
  ConnState,
  ConnTrackEntry,
  ConnTrackTable,
} from './types/acl';

export type { AreaType, AreaVisualConfig, NetworkArea } from './types/areas';

export type {
  NetlabNodeData,
  VlanConfig,
  SwitchPort,
  NetlabNode,
  NetlabEdge,
  NetworkTopology,
  TopologySnapshot,
} from './types/topology';
export { ICMP_TYPE, ICMP_CODE } from './simulation/icmp';
export type { IcmpType, IcmpCode } from './simulation/icmp';

export type {
  DhcpServerConfig,
  DhcpClientConfig,
  DnsZoneEntry,
  DnsServerConfig,
  DhcpLeaseState,
  DnsCacheEntry,
  DnsCache,
} from './types/services';

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

// Theming
export type { NetlabTheme } from './theme';
export { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from './theme';

// Embeddable app component
export { NetlabApp } from './components/NetlabApp';
export type { NetlabAppProps } from './components/NetlabApp';
export { NetlabThemeScope } from './components/NetlabThemeScope';
export type { NetlabThemeScopeProps } from './components/NetlabThemeScope';

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
export { isInSubnet, parseCidr, isInSameSubnet } from './utils/cidr';
export { deriveDeterministicMac, extractHostname, isIpAddress } from './utils/network';
export { encodeTopology, decodeTopology } from './utils/topology-url';
export {
  isValidConnection,
  isValidConnectionBetweenNodes,
  isValidEdge,
  validateConnection,
} from './utils/connectionValidator';
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './utils/connectionValidator';

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
