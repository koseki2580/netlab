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
export { FlowCollectorPanel } from './components/observability/FlowCollectorPanel';
export type { FlowCollectorPanelProps } from './components/observability/FlowCollectorPanel';

// Simulation types
export type {
  NatTranslation,
  EcmpTrace,
  ObservabilityTrace,
  PacketHop,
  PacketTrace,
  RoutingCandidate,
  RoutingDecision,
  ShaperTrace,
  SimulationState,
  SimulationStatus,
} from './types/simulation';
export type { TlsAnnotation } from './types/tls';
export {
  NETFLOW_TEMPLATE_ID,
  NETFLOW_VERSION,
  SFLOW_SAMPLE_FORMAT_FLOW,
  SFLOW_VERSION,
} from './types/observability';
export type {
  FlowProtocol,
  NetflowConfig,
  NetflowRecord,
  SflowConfig,
  SflowSample,
} from './types/observability';
export { FlowCollector } from './observability/FlowCollector';
export type {
  FlowCollectorFilter,
  FlowCollectorOptions,
  FlowEvent,
  FlowSubscriber,
} from './observability/FlowCollector';
export {
  TLS_AES_128_GCM_SHA256,
  TLS_GROUP_X25519,
  TLS_RECORD_LEGACY_VERSION,
  TLS_SIGNATURE_ED25519,
  TLS_VERSION_1_3,
} from './types/tls';
export type {
  TlsAlertDescription,
  TlsAlertLevel,
  TlsClientHello,
  TlsConnectionContext,
  TlsContentType,
  TlsHandshakeState,
  TlsRecord,
  TlsServerConfig,
  TlsServerHello,
} from './types/tls';
export { FakeDeterministicProvider, buildHkdfLabel } from './crypto/FakeDeterministicProvider';
export { WebCryptoProvider, aeadNonce } from './crypto/WebCryptoProvider';
export { selectProvider, resolveProviderSync } from './crypto/select';
export type { CryptoProviderSelection } from './crypto/select';
export { CryptoContext, useCrypto } from './crypto/CryptoContext';
export type {
  CapabilitySet,
  CryptoCurve,
  CryptoHash,
  CryptoProvider,
  CryptoProviderId,
  ProviderInfo,
} from './crypto/CryptoProvider';
export {
  ProgressContext,
  ProgressProvider,
  createMemoryProgressStorage,
  createSafeProgressStorage,
  isValidLearnerId,
  parseProgressJson,
  progressStorageKey,
  safeStorage,
  useOptionalProgress,
  useProgress,
} from './progress';
export type {
  LearnerProgress,
  ProgressCompletion,
  ProgressCompletionInput,
  ProgressCompletionKind,
  ProgressContextValue,
  ProgressImportOptions,
  ProgressImportResult,
  ProgressProviderProps,
  ProgressScore,
  ProgressStorageBackend,
  SafeProgressStorage,
} from './progress';
export type { TlsHandshakeOptions, TlsHandshakeRun } from './layers/l5-tls/TlsOrchestrator';
export type {
  QuicAeadKeys,
  QuicAnnotation,
  QuicFrame,
  QuicHandshakeRun,
  QuicPathChallenge,
  QuicStreamChunk,
} from './layers/l4-transport';
export type {
  HeaderTuple,
  Http2Frame,
  Http2Run,
  Http2Setting,
  Http2StreamSummary,
  Http3Frame,
  Http3Run,
  Http3StreamSummary,
} from './layers/l7-application';

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
export {
  distanceMeters,
  lossPctFromRssi,
  rssiDbm,
  wirelessLinkQosFromRssi,
} from './utils/pathLoss';

// Simulation UI components
export { DropEventCard, pulseDroppingNode } from './components/simulation/DropEventCard';
export type { DropEventCardProps, DropNavigateTarget } from './components/simulation/DropEventCard';
export { DropEventOverlay } from './components/simulation/DropEventOverlay';
export type { DropEventOverlayProps } from './components/simulation/DropEventOverlay';
export { getDropLesson, DROP_LESSONS } from './components/simulation/dropLessons';
export type { DropLesson, DropLessonRef } from './components/simulation/dropLessons';
export { Marker, MARKER_SHAPES } from './components/simulation/Marker';
export type { MarkerProps, MarkerShape } from './components/simulation/Marker';
export { StateDiffTable } from './components/simulation/StateDiffTable';
export type {
  StateDiffTableProps,
  StateDiffTableKind,
} from './components/simulation/StateDiffTable';
export { HopInspector } from './components/simulation/HopInspector';
export { NatTableViewer } from './components/simulation/NatTableViewer';
export { PacketStructureViewer } from './components/simulation/PacketStructureViewer';
export { PacketTimeline } from './components/simulation/PacketTimeline';
export { PacketViewer } from './components/simulation/PacketViewer';
export { SessionDetail } from './components/simulation/SessionDetail';
export { SessionList } from './components/simulation/SessionList';
export { SimulationControls } from './components/simulation/SimulationControls';
export { StepControls } from './components/simulation/StepControls';
export { TlsHandshakeView } from './components/simulation/TlsHandshakeView';
export type { TlsHandshakeViewProps } from './components/simulation/TlsHandshakeView';
export { TraceSelector } from './components/simulation/TraceSelector';
export { TraceSummary } from './components/simulation/TraceSummary';

// Packet serializer (byte-level packet visualization)
export { serializeArpFrame, serializePacket } from './utils/packetSerializer';
export type { AnnotatedField, LayerTag, SerializedPacket } from './utils/packetSerializer';

// Step simulation controller
export { StepSimulationController } from './simulation/StepSimulationController';
export type { StepSimState, StepSimStatus } from './simulation/StepSimulationController';

// Per-step state snapshots + diff (M3)
export { buildStepSnapshots, diffRoutes, diffArp, diffMac } from './simulation/snapshots';
export type {
  StepSnapshots,
  NodeStepState,
  RouteRow,
  ArpRow,
  MacRow,
  RouteDiffRow,
  ArpDiffRow,
  MacDiffRow,
  DiffStatus,
} from './simulation/snapshots';

// Types
export type {
  ArpEthernetFrame,
  ArpPacket,
  DhcpMessage,
  DhcpOptions,
  DnsMessage,
  DnsQuestion,
  DnsRecord,
  DscpCodePointName,
  EthernetFrame,
  HttpMessage,
  IcmpMessage,
  Icmpv6Message,
  InFlightPacket,
  IpPacket,
  Ipv6Packet,
  Packet,
  RawPayload,
  TcpFlags,
  TcpSegment,
  UdpDatagram,
  VlanTag,
} from './types/packets';
export {
  DSCP_CODE_POINTS,
  assertDscp,
  dscpFromTos,
  isIpv6Packet,
  tosFromDscp,
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
  TcpCongestionEvent,
  TcpCongestionPhase,
  TcpCongestionState,
} from './types/tcp-congestion';
export {
  isAckReceivedEvent,
  isCwndUpdateEvent,
  isDupAckEvent,
  isFastRetransmitEvent,
  isPhaseChangeEvent,
  isRtoFireEvent,
  isSegmentSentEvent,
  isTcpCongestionEvent,
} from './types/tcp-congestion';

export type {
  LinkQosConfig,
  LinkQosDropReason,
  LinkQosTrace,
  LinkShaperClass,
  LinkShaperConfig,
  NormalizedLinkQosConfig,
} from './types/link';
export { hasActiveLinkQos, normalizeLinkQos } from './types/link';
export type { LacpConfig, LacpPdu, LacpPortState, LacpRuntimePort } from './types/lacp';
export type { VrrpConfig, VrrpEvent, VrrpMember, VrrpRole, VrrpState } from './types/vrrp';
export type {
  WifiConfig,
  WifiRole,
  WirelessAssociationPhase,
  WirelessAssociationState,
  WirelessEvent,
  WirelessLinkConfig,
} from './types/wireless';
export type {
  EvpnMacIpEntry,
  EvpnRoute,
  EvpnType2,
  EvpnType5,
  GreEnvelope,
  GreHeader,
  GreTunnelConfig,
  MplsLabel,
  MplsLabelStack,
  RouteDistinguisher,
  RouteTarget,
  Vpnv4Route,
  VrfConfig,
  VrfRuntime,
  VtepConfig,
  VxlanEncapConfig,
  VxlanEnvelope,
  VxlanHeader,
} from './types/tunneling';

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
  EqualCostNextHop,
  OspfAreaConfig,
  OspfConfig,
  PortForwardingRule,
  ProtocolName,
  RipConfig,
  RouteEntry,
  RouterInterface,
  RoutingProtocol,
  StaticRoute6Config,
  StaticRouteConfig,
  SubInterface,
  TopologyChangeEvent,
} from './types/routing';
export {
  bucketFlow,
  flowKeyFromIpPacket,
  flowKeyFromPacket,
  hashFlow,
  hashString32,
  serializeFlowKey,
} from './utils/hashFlow';
export type { FlowKey } from './utils/hashFlow';
export type { AreaType, AreaVisualConfig, NetworkArea } from './types/areas';

export { ICMP_CODE, ICMP_TYPE } from './simulation/icmp';
export type { IcmpCode, IcmpType } from './simulation/icmp';
export {
  ICMPV6_CODE,
  ICMPV6_TYPE,
  buildIcmpv6EchoReply,
  buildIcmpv6EchoRequest,
  buildNeighborAdvertisement,
  buildNeighborSolicitation,
  applyRouterAdvertisement,
  buildRouterAdvertisement,
} from './simulation/icmpv6';
export type { Icmpv6Code, Icmpv6Type, RouterAdvertisementResult } from './simulation/icmpv6';
export { NdpCache } from './simulation/NdpCache';
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
export { scenarioRegistry, ScenarioRegistry } from './scenarios/ScenarioRegistry';
export { getScenarioBrief, scenariosInGroup } from './scenarios';
export type { Scenario, ScenarioMetadata, ScenarioSampleFlow } from './scenarios/types';
export type {
  BriefConclusion,
  BriefConclusionAction,
  BriefPrereq,
  BriefWatchPoint,
  ScenarioBrief,
} from './scenarios/types';
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
export type {
  AssessmentConstraint,
  AssessmentHint,
  AssessmentHintUsage,
  AssessmentPredicate,
  AssessmentPredicateInput,
  AssessmentRubric,
  AssessmentStatus,
  AssessmentStatusKind,
  AssessmentSubgoal,
  AssessmentSubgoalResult,
} from './assessments/types';

// Learning — active-recall skill drills (framework-agnostic)
export {
  subnetFacts,
  generateProblem,
  generateSet,
  grade,
  expectedAnswer,
  startSession,
  recordAnswer,
  sessionProblem,
  sessionSummary,
  currentIndex,
  isComplete,
  DEFAULT_SESSION_LENGTH,
} from './learning/subnetting';
export type {
  SubnetFacts,
  SubnetProblem,
  SubnetQuestionKind,
  GradeResult,
  DrillSession,
  DrillSummary,
  DrillAnswer,
  KindMastery,
} from './learning/subnetting';

// Interactive sandbox primitives
export {
  BranchedSimulationEngine,
  EditSession,
  SANDBOX_STATE_PARAM,
  SandboxProvider,
  decodeEdit,
  decodeSandboxEdits,
  encodeEdit,
  encodeSandboxEdits,
  registerSandboxEdit,
  registeredSandboxEditKinds,
  testPlugin,
  updateSandboxSearch,
  useSandboxAnnotations,
  useSandbox,
  useUndoRedo,
} from './sandbox';
export type {
  EdgeRef,
  Edit,
  InterfaceRef,
  NodeRef,
  PacketRef,
  PluginEdit,
  PluginEditKind,
  PluginEditSerializer,
  PluginEditSpec,
  PluginEditorProps,
  PluginEditorTarget,
  PluginTestOptions,
  PluginTestResult,
  ProtocolParameterSet,
  SandboxMode,
  SimulationSnapshot,
  AnnotationAuthor,
  TraceAnnotation,
  TraceAnnotationEdit,
} from './sandbox';
export { BeforeAfterView, DiffTimeline, EditPopover, SandboxPanel } from './components/sandbox';
export {
  forkScenario,
  getSandbox,
  getSandboxes,
  recordSandboxDiff,
  removeSandbox,
  resetSandbox,
} from './sandbox/fork';
export type { Sandbox, SandboxDiff } from './sandbox/fork';
export { buildSandboxEmbedUrl } from './embed/buildSandboxEmbedUrl';
export type {
  EmbedUrlParams,
  NetlabEmbedMode,
  ParentOrigin,
  SandboxChildEvent,
} from './embed/protocol';

// Routing protocols
export type {
  HiddenNodeCollisionInput,
  HiddenNodeTransmission,
  WpaFourWayHandshakeInput,
  WpaFourWayHandshakeResult,
  WpaHandshakeMessage,
} from './layers/l1-physical';
export type { PortChannelConfig, StpResult, SwitchBridge } from './layers/l2-datalink';
export type { TcpHandshakeResult, TcpTeardownResult } from './layers/l4-transport/TcpOrchestrator';
export type { TcpPacketOptions } from './layers/l4-transport/tcpPacketBuilder';
export type { UdpPacketOptions } from './layers/l4-transport/udpPacketBuilder';
export type { MpReachNlri } from './routing/bgp/BgpMpReachNlri';
export type { AddressFamily, FamilyAware } from './routing/AddressFamily';
export type {
  OspfV3Hello,
  OspfV3IntraAreaPrefixLsa,
  OspfV3LinkLsa,
} from './routing/ospf/OspfV3Protocol';
export { Dhcpv6Client } from './services/dhcpv6/Dhcpv6Client';
export { Dhcpv6Server } from './services/dhcpv6/Dhcpv6Server';
export {
  buildDuidLl,
  decodeDhcpv6Options,
  encodeDhcpv6Options,
} from './services/dhcpv6/Dhcpv6Options';
export type { Dhcpv6RawOption } from './services/dhcpv6/Dhcpv6Options';
export { DHCPV6_MESSAGE_TYPE } from './services/dhcpv6/Dhcpv6MessageTypes';
export type {
  Dhcpv6IaAddress,
  Dhcpv6IaNa,
  Dhcpv6Lease,
  Dhcpv6Message,
  Dhcpv6MessageType,
} from './services/dhcpv6/Dhcpv6MessageTypes';
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
export { PreFlightBrief } from './components/PreFlightBrief';
export type { PreFlightBriefProps } from './components/PreFlightBrief';
export { NodeGlyph, NODE_GLYPHS } from './components/NodeGlyph';
export type { NodeGlyphProps, NodeGlyphKind } from './components/NodeGlyph';
export { LegendPanel } from './components/LegendPanel';
export { LineageBanner } from './components/LineageBanner';
export type { LineageBannerProps } from './components/LineageBanner';
export type { LegendPanelProps } from './components/LegendPanel';
export { AreaLegend } from './components/controls/AreaLegend';
export { RouteTable } from './components/controls/RouteTable';
export { NetlabCanvas } from './components/NetlabCanvas';
export type { NetlabCanvasProps } from './components/NetlabCanvas';
export { useNetlabContext } from './components/NetlabContext';
export { NetlabProvider } from './components/NetlabProvider';
export type { NetlabProviderProps } from './components/NetlabProvider';
export {
  DEFAULT_I18N_VALUE,
  I18nContext,
  I18nProvider,
  createTranslator,
  en,
  substitute,
  useI18n,
} from './i18n';
export type {
  Catalog,
  I18nContextValue,
  I18nProviderProps,
  TranslatorFn,
  TranslatorParams,
} from './i18n';
export { DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS } from './controlled/sandbox-mode';
export type {
  ControlledTopologyChangeHandler,
  SandboxControlMode,
  SandboxEditProposal,
  SandboxEditProposalHandler,
  TopologyChangeMeta,
} from './controlled/sandbox-mode';
export { useNetlabUI } from './components/NetlabUIContext';
export { NodeDetailPanel } from './components/NodeDetailPanel';
export { ResizableSidebar } from './components/ResizableSidebar';
export type { ResizableSidebarProps } from './components/ResizableSidebar';

// Utilities
export { isInSameSubnet, isInSubnet, parseCidr } from './utils/cidr';
export {
  canonicalizeIpv6,
  deriveEui64InterfaceId,
  isInIpv6Subnet,
  isIpv6Address,
  parseIpv6,
  parseIpv6Cidr,
  prefixLength6,
} from './utils/ipv6';
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

// UI primitives
export {
  Checkbox,
  EmptyState,
  Input,
  Modal,
  Select,
  Slider,
  ToastProvider,
  useToast,
} from './components/ui';
export type {
  CheckboxProps,
  EmptyStateProps,
  InputProps,
  ModalProps,
  SelectOption,
  SelectProps,
  SliderProps,
  ToastApi,
  ToastInput,
  ToastKind,
} from './components/ui';
