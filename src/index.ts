// Errors
export { NETLAB_ERROR_CODES, NetlabError } from './errors';
export type { NetlabErrorCode, NetlabErrorInit } from './errors';

// Failure simulation types
export { EMPTY_FAILURE_STATE } from './types/failure';
export type { FailureState } from './types/failure';

// Failure simulation context
export {
  FailureContext,
  FailureProvider,
  useFailure,
  useOptionalFailure,
} from './simulation/FailureContext';
export type { FailureContextValue } from './simulation/FailureContext';

// Failure simulation UI
export { FailureTogglePanel } from './components/simulation/FailureTogglePanel';

// Simulation types
export type {
  NatTranslation,
  PacketHop,
  PacketTrace,
  RoutingCandidate,
  RoutingDecision,
  SimulationState,
  SimulationStatus,
} from './types/simulation';

// Simulation engine
export { SimulationEngine } from './simulation/SimulationEngine';

// Simulation React integration
export {
  SimulationContext,
  SimulationProvider,
  useSimulation,
} from './simulation/SimulationContext';
export type {
  SimulationContextValue,
  SimulationProviderProps,
} from './simulation/SimulationContext';

// Session types
export type { NetworkSession, SessionEvent, SessionPhase, SessionStatus } from './types/session';
export type {
  ChunkDeliveryState,
  DataTransferState,
  DeliveryStatus,
  ReassemblyState,
  TransferChunk,
  TransferMessage,
} from './types/transfer';

// Session tracker + context
export {
  DataTransferContext,
  DataTransferProvider,
  useDataTransfer,
  useOptionalDataTransfer,
} from './simulation/DataTransferContext';
export type {
  DataTransferContextValue,
  DataTransferProviderProps,
} from './simulation/DataTransferContext';
export { DataTransferController } from './simulation/DataTransferController';
export type { DataTransferOptions } from './simulation/DataTransferController';
export { IPV4_DEFAULT_PMTU, IPV4_MIN_PMTU, PathMtuCache } from './simulation/PathMtuCache';
export { parseIcmpFragNeeded } from './simulation/pmtudParser';
export type { FragNeededSignal } from './simulation/pmtudParser';
export {
  SessionContext,
  SessionProvider,
  useOptionalSession,
  useSession,
} from './simulation/SessionContext';
export type { SessionContextValue, SessionProviderProps } from './simulation/SessionContext';
export { SessionTracker } from './simulation/SessionTracker';

// Simulation UI components
export { HopInspector } from './components/simulation/HopInspector';
export { NatTableViewer } from './components/simulation/NatTableViewer';
export { PacketStructureViewer } from './components/simulation/PacketStructureViewer';
export { PacketTimeline } from './components/simulation/PacketTimeline';
export { PacketViewer } from './components/simulation/PacketViewer';
export { SessionDetail } from './components/simulation/SessionDetail';
export { SessionList } from './components/simulation/SessionList';
export { SimulationControls } from './components/simulation/SimulationControls';
export { StepControls } from './components/simulation/StepControls';
export { TraceSelector } from './components/simulation/TraceSelector';
export { TraceSummary } from './components/simulation/TraceSummary';

// Packet serializer (byte-level packet visualization)
export { serializeArpFrame, serializePacket } from './utils/packetSerializer';
export type { AnnotatedField, LayerTag, SerializedPacket } from './utils/packetSerializer';

// Step simulation controller
export { StepSimulationController } from './simulation/StepSimulationController';
export type { StepSimState, StepSimStatus } from './simulation/StepSimulationController';

// Types
export type {
  ArpEthernetFrame,
  ArpPacket,
  DhcpMessage,
  DhcpOptions,
  DnsMessage,
  DnsQuestion,
  DnsRecord,
  EthernetFrame,
  HttpMessage,
  IcmpMessage,
  InFlightPacket,
  IpPacket,
  Packet,
  RawPayload,
  TcpFlags,
  TcpSegment,
  UdpDatagram,
  VlanTag,
} from './types/packets';
export type {
  TcpAction,
  TcpConnection,
  TcpEvent,
  TcpFourTuple,
  TcpState,
  TcpTransitionResult,
} from './types/tcp';

export type {
  ForwardContext,
  ForwardDecision,
  Forwarder,
  ForwarderFactory,
  LayerId,
  LayerPlugin,
} from './types/layers';

export type { Neighbor } from './types/simulation';

export type {
  AclAction,
  AclMatchInfo,
  AclPortRange,
  AclProtocol,
  AclRule,
  ConnState,
  ConnTrackEntry,
  ConnTrackTable,
} from './types/acl';
export type { NatEntry, NatTable, NatType } from './types/nat';
export { ADMIN_DISTANCES } from './types/routing';
export type {
  BgpConfig,
  BgpNeighborConfig,
  BgpPathAttributes,
  OspfAreaConfig,
  OspfConfig,
  PortForwardingRule,
  ProtocolName,
  RipConfig,
  RouteEntry,
  RouterInterface,
  RoutingProtocol,
  StaticRouteConfig,
  SubInterface,
  TopologyChangeEvent,
} from './types/routing';

export type { AreaType, AreaVisualConfig, NetworkArea } from './types/areas';

export { ICMP_CODE, ICMP_TYPE } from './simulation/icmp';
export type { IcmpCode, IcmpType } from './simulation/icmp';
export type {
  BridgeId,
  NetlabEdge,
  NetlabEdgeData,
  NetlabNode,
  NetlabNodeData,
  NetworkTopology,
  StpConfig,
  StpPortRole,
  StpPortRuntime,
  StpPortState,
  SwitchPort,
  TopologySnapshot,
  VlanConfig,
} from './types/topology';

export type {
  DhcpClientConfig,
  DhcpLeaseState,
  DhcpServerConfig,
  DnsCache,
  DnsCacheEntry,
  DnsServerConfig,
  DnsZoneEntry,
} from './types/services';

export type { HookFn, HookMap, HookPoint } from './types/hooks';

// Registry
export { layerRegistry, registerLayerPlugin } from './registry/LayerRegistry';
export { protocolRegistry } from './registry/ProtocolRegistry';

// Hook engine
export { HookEngine, hookEngine } from './hooks/HookEngine';
export { useNetlabHooks } from './hooks/useNetlabHooks';

// Scenarios + tutorials
export { scenarioRegistry, ScenarioRegistry } from './scenarios';
export type { Scenario, ScenarioMetadata, ScenarioSampleFlow } from './scenarios/types';
export { tutorialRegistry, TutorialRunner, TutorialProvider, useTutorialRunner } from './tutorials';
export type {
  HookEventLog,
  HookEventLogEntry,
  PredicateInput,
  StepPredicate,
  Tutorial,
  TutorialRunnerState,
  TutorialStep,
} from './tutorials/types';

// Interactive sandbox primitives
export {
  BranchedSimulationEngine,
  EditSession,
  SANDBOX_STATE_PARAM,
  SandboxProvider,
  decodeSandboxEdits,
  encodeSandboxEdits,
  updateSandboxSearch,
  useSandbox,
} from './sandbox';
export type {
  EdgeRef,
  Edit,
  InterfaceRef,
  NodeRef,
  PacketRef,
  ProtocolParameterSet,
  SandboxMode,
  SimulationSnapshot,
} from './sandbox';
export { BeforeAfterView, DiffTimeline, EditPopover, SandboxPanel } from './components/sandbox';

// Routing protocols
export {
  collectSwitchBridges,
  compareBridgeId,
  computeStp,
  DEFAULT_BRIDGE_PRIORITY,
  DEFAULT_STP_PATH_COST,
  electRoot,
  formatBridgeId,
  makeBridgeId,
} from './layers/l2-datalink';
export type { StpResult, SwitchBridge } from './layers/l2-datalink';
export { TcpConnectionTracker } from './layers/l4-transport/TcpConnectionTracker';
export { TcpOrchestrator } from './layers/l4-transport/TcpOrchestrator';
export type { TcpHandshakeResult, TcpTeardownResult } from './layers/l4-transport/TcpOrchestrator';
export {
  buildAckPacket,
  buildFinPacket,
  buildRstPacket,
  buildSynAckPacket,
  buildSynPacket,
  generateISN,
} from './layers/l4-transport/tcpPacketBuilder';
export type { TcpPacketOptions } from './layers/l4-transport/tcpPacketBuilder';
export {
  describeTransition as describeTcpTransition,
  TcpStateMachine,
  transition as transitionTcpState,
} from './layers/l4-transport/TcpStateMachine';
export { buildUdpPacket, generateEphemeralPort } from './layers/l4-transport/udpPacketBuilder';
export type { UdpPacketOptions } from './layers/l4-transport/udpPacketBuilder';
export { BgpProtocol, bgpProtocol } from './routing/bgp/BgpProtocol';
export { OspfProtocol, ospfProtocol } from './routing/ospf/OspfProtocol';
export { RipProtocol, ripProtocol } from './routing/rip/RipProtocol';
export { StaticProtocol, staticProtocol } from './routing/static/StaticProtocol';
export {
  UDP_EPHEMERAL_PORT_MAX,
  UDP_EPHEMERAL_PORT_MIN,
  UDP_MAX_PORT,
  UDP_MIN_PORT,
  UDP_PROTOCOL,
} from './types/udp';
export type { UdpSegment } from './types/udp';

// Theming
export { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from './theme';
export type { NetlabTheme } from './theme';

// Embeddable app component
export { NetlabApp } from './components/NetlabApp';
export type { NetlabAppProps } from './components/NetlabApp';
export { NetlabThemeScope } from './components/NetlabThemeScope';
export type { NetlabThemeScopeProps } from './components/NetlabThemeScope';

// Components
export { AreaLegend } from './components/controls/AreaLegend';
export { RouteTable } from './components/controls/RouteTable';
export { NetlabCanvas } from './components/NetlabCanvas';
export type { NetlabCanvasProps } from './components/NetlabCanvas';
export { useNetlabContext } from './components/NetlabContext';
export { NetlabProvider } from './components/NetlabProvider';
export type { NetlabProviderProps } from './components/NetlabProvider';
export { useNetlabUI } from './components/NetlabUIContext';
export { NodeDetailPanel } from './components/NodeDetailPanel';
export { ResizableSidebar } from './components/ResizableSidebar';
export type { ResizableSidebarProps } from './components/ResizableSidebar';

// Utilities
export { isInSameSubnet, isInSubnet, parseCidr } from './utils/cidr';
export {
  isValidConnection,
  isValidConnectionBetweenNodes,
  isValidEdge,
  validateConnection,
  validateTopology,
} from './utils/connectionValidator';
export type {
  TopologyValidationResult,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from './utils/connectionValidator';
export { deriveDeterministicMac, extractHostname, isIpAddress } from './utils/network';
export { decodeTopology, encodeTopology } from './utils/topology-url';

// Editor
export { TopologyEditor } from './editor/components/TopologyEditor';
export type { TopologyEditorProps } from './editor/components/TopologyEditor';
export { ValidationPanel } from './editor/components/ValidationPanel';
export type { ValidationPanelProps } from './editor/components/ValidationPanel';
export { useTopologyEditorContext } from './editor/context/TopologyEditorContext';
export type { TopologyEditorContextValue } from './editor/context/TopologyEditorContext';
export { TopologyEditorProvider } from './editor/context/TopologyEditorProvider';
export type { TopologyEditorProviderProps } from './editor/context/TopologyEditorProvider';
export type { EditorTopology, PositionUpdate, TopologyEditorState } from './editor/types';
export {
  createClientNode,
  createRouterNode,
  createServerNode,
  createSwitchNode,
  randomPosition,
} from './editor/utils/nodeFactory';
