# Public API

> **Status**: ✅ Implemented

All documented exports below are available from the root `netlab` package unless noted otherwise.
If you compose the lower-level primitives directly, you must also register the built-in layer
plugins via the published side-effect imports:

```typescript
import 'netlab/layers/l1-physical';
import 'netlab/layers/l2-datalink';
import 'netlab/layers/l3-network';
import 'netlab/layers/l4-transport';
import 'netlab/layers/l7-application';
```

`installFetchInterceptor()` is intentionally excluded from this page's runnable examples because it
is still a planned API and is not exported in the current package build.

## Components

### `<NetlabApp>`

High-level embeddable component that auto-registers the built-in layers and internally mounts
`<NetlabProvider>` plus `<SimulationProvider>` when `simulation={true}`.

```typescript
import { NetlabApp } from 'netlab';
import type { NetlabAppProps, NetworkTopology } from 'netlab';
```

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `topology` | `NetworkTopology` | Required topology including `routeTables` |
| `width` | `number \| string` | Defaults to `'100%'` |
| `height` | `number \| string` | Defaults to `500` |
| `simulation` | `boolean` | Enables toolbar, packet overlay, and simulation context |
| `timeline` | `boolean` | Controls the `PacketTimeline` sidebar |
| `routeTable` | `boolean` | Controls the `RouteTable` overlay |
| `areaLegend` | `boolean` | Controls the `AreaLegend` overlay |
| `theme` | `Partial<NetlabTheme>` | Merged with `NETLAB_DARK_THEME` |
| `style`, `className` | DOM props | Applied to the outer container |

### `<NetlabProvider>`

Context provider for topology, computed route tables, and the per-tree `HookEngine`.

```typescript
import { NetlabProvider } from 'netlab';
import type { NetlabProviderProps, NetworkTopology, TopologySnapshot } from 'netlab';

type NetlabProviderProps =
  | {
      topology: NetworkTopology;
      defaultTopology?: TopologySnapshot;
      children: React.ReactNode;
    }
  | {
      topology?: undefined;
      defaultTopology: TopologySnapshot;
      children: React.ReactNode;
    };
```

Use `topology` for parent-owned state. Use `defaultTopology` when you want an initial
snapshot and want `NetlabProvider` to own the internal route-table recomputation.

See [Controlled Topology API](../api/controlled-topology.md) for the controlled workflow.

### `<NetlabCanvas>`

Primary React Flow canvas for nodes, edges, area backgrounds, and simulation overlays.

```typescript
import { NetlabCanvas } from 'netlab';
import type { NetlabCanvasProps } from 'netlab';

interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
  colorMode?: 'light' | 'dark';
  onNodesChange?: (nodes: NetlabNode[]) => void;
  onEdgesChange?: (edges: NetlabEdge[]) => void;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}
```

Providing any of the change callbacks switches the canvas into controlled-sync mode.

See [Controlled Topology API](../api/controlled-topology.md) and
[UI Interaction](../ui/ui-interaction.md).

### `<NetlabThemeScope>`

Theme wrapper for manual composition of lower-level primitives.

```typescript
import { NetlabThemeScope } from 'netlab';
import type { NetlabThemeScopeProps, NetlabTheme } from 'netlab';

interface NetlabThemeScopeProps {
  theme?: Partial<NetlabTheme>;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}
```

### Supporting Components

| Export | Description |
| ------ | ----------- |
| `<NodeDetailPanel>` | Floating overlay for the currently selected node |
| `<RouteTable>` | Debug/teaching overlay showing resolved routes |
| `<AreaLegend>` | Legend for configured network areas |
| `<ResizableSidebar>` | Generic right-side drag-resizable panel |
| `<FailureTogglePanel>` | Interactive node/edge/interface failure toggles |
| `<TopologyEditor>` | High-level editor UI for adding and wiring nodes |
| `<TopologyEditorProvider>` | Editor state provider used by `TopologyEditor` and custom editor shells |

### Simulation UI Components

These components are auto-rendered by `<NetlabApp>` when `simulation={true}` and can also be
composed manually inside a `NetlabThemeScope` + `NetlabProvider` + `SimulationProvider` tree.

| Component | Description |
| --------- | ----------- |
| `<SimulationControls>` | Toolbar with send/play/pause/step/reset controls |
| `<PacketViewer>` | Overlay showing the currently animated packet |
| `<PacketTimeline>` | Sidebar timeline of traces and hop events |
| `<HopInspector>` | Per-hop detail view for the selected trace step |
| `<NatTableViewer>` | NAT translation overlay panel |
| `<StepControls>` | UI for step-by-step playback |
| `<PacketStructureViewer>` | Byte-level packet inspector |
| `<TraceSummary>` | Compact end-to-end trace summary |
| `<TraceSelector>` | Trace picker for multiple recorded traces |
| `<SessionList>` | Session list derived from `SessionTracker` |
| `<SessionDetail>` | Detail pane for one selected session |

## Hooks And Contexts

### Hook Engine

```typescript
import { HookEngine, hookEngine, useNetlabHooks } from 'netlab';
import type { HookFn, HookMap, HookPoint } from 'netlab';
```

| Export | Type | Description |
| ------ | ---- | ----------- |
| `HookEngine` | Class | Register and emit hook handlers with middleware-style `next()` chaining |
| `hookEngine` | Shared instance | Convenience singleton for non-React integrations |
| `useNetlabHooks()` | Hook | Returns the provider-scoped `HookEngine` instance |

### Netlab Tree Hooks

```typescript
import { useNetlabContext, useNetlabUI } from 'netlab';
```

| Hook | Description |
| ---- | ----------- |
| `useNetlabContext()` | Access the enriched topology, route table, areas, and provider `HookEngine` |
| `useNetlabUI()` | Access selection state used by `NodeDetailPanel` and canvas UI |

### Simulation Context

```typescript
import { SimulationProvider, SimulationContext, useSimulation } from 'netlab';
import type { SimulationProviderProps, SimulationContextValue } from 'netlab';
```

| Export | Type | Description |
| ------ | ---- | ----------- |
| `SimulationProvider` | Component | Creates and owns a `SimulationEngine` for the current topology |
| `SimulationContext` | React context | Raw context object for advanced composition |
| `useSimulation()` | Hook | Access engine, state, send helpers, DHCP/DNS helpers, and PCAP export |

`SimulationProvider` must be rendered inside `<NetlabProvider>`.

### Failure Context

```typescript
import {
  FailureProvider,
  FailureContext,
  useFailure,
  useOptionalFailure,
  EMPTY_FAILURE_STATE,
} from 'netlab';
import type { FailureState, FailureContextValue } from 'netlab';
```

| Export | Type | Description |
| ------ | ---- | ----------- |
| `FailureProvider` | Component | Stores node, edge, and interface failure state |
| `FailureContext` | React context | Raw failure context object |
| `useFailure()` | Hook | Strict hook that throws outside a provider |
| `useOptionalFailure()` | Hook | Nullable variant for optional integration |
| `EMPTY_FAILURE_STATE` | Constant | Default empty failure set |

### Session Management

```typescript
import {
  SessionTracker,
  SessionProvider,
  SessionContext,
  useSession,
} from 'netlab';
import type {
  NetworkSession,
  SessionPhase,
  SessionStatus,
  SessionEvent,
  SessionProviderProps,
  SessionContextValue,
} from 'netlab';
```

| Export | Type | Description |
| ------ | ---- | ----------- |
| `SessionTracker` | Class | Correlates hook events and traces into request/response sessions |
| `SessionProvider` | Component | React wrapper around `SessionTracker` |
| `SessionContext` | React context | Raw session context object |
| `useSession()` | Hook | Access sessions, selection, and trace attachment helpers |

### Topology Editor Context

```typescript
import {
  TopologyEditorProvider,
  useTopologyEditorContext,
} from 'netlab';
import type {
  TopologyEditorProviderProps,
  TopologyEditorContextValue,
  TopologyEditorProps,
  EditorTopology,
  TopologyEditorState,
  PositionUpdate,
} from 'netlab';
```

| Export | Type | Description |
| ------ | ---- | ----------- |
| `TopologyEditorProvider` | Component | Provides editor state/history to custom editor shells |
| `useTopologyEditorContext()` | Hook | Access topology mutations, selection, and undo/redo state |
| `TopologyEditor` | Component | Opinionated editor built on the provider plus built-in UI |

## Classes

### `SimulationEngine`

Pure TypeScript simulation engine used by both the React context and direct integration code.

```typescript
class SimulationEngine {
  subscribe(listener: (state: SimulationState) => void): () => void;
  getState(): SimulationState;
  send(packet: InFlightPacket, failureState?: FailureState): Promise<void>;
  ping(srcNodeId: string, dstIp: string, options?: { ttl?: number }): Promise<PacketTrace>;
  traceroute(srcNodeId: string, dstIp: string, maxHops?: number): Promise<PacketTrace[]>;
  simulateDhcp(clientNodeId: string, failureState?: FailureState, sessionId?: string): Promise<boolean>;
  simulateDns(clientNodeId: string, hostname: string, failureState?: FailureState, sessionId?: string): Promise<string | null>;
  exportPcap(traceId?: string): Uint8Array;
  step(): void;
  play(ms?: number): void;
  pause(): void;
  reset(): void;
  clear(): void;
  clearTraces(): void;
  selectTrace(packetId: string): void;
  selectHop(step: number): void;
  getRuntimeNodeIp(nodeId: string): string | null;
  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null;
  getDnsCache(nodeId: string): DnsCache | null;
}
```

### `StepSimulationController`

```typescript
import { StepSimulationController } from 'netlab';
import type { StepSimStatus, StepSimState } from 'netlab';
```

Wrapper around `SimulationEngine` that exposes a smaller stepping-oriented interface.

| Method / Property | Description |
| ----------------- | ----------- |
| `load(packet)` | Sends a packet into the wrapped engine and prepares step state |
| `nextStep()` | Advances one hop and returns the new `PacketHop` or `null` |
| `reset()` | Resets engine step state |
| `getState()` | Returns the derived `StepSimState` |
| `subscribe(listener)` | Subscribe to derived step-state updates |

### Routing Protocol Classes

```typescript
import {
  StaticProtocol,
  staticProtocol,
  OspfProtocol,
  ospfProtocol,
  BgpProtocol,
  bgpProtocol,
  RipProtocol,
  ripProtocol,
} from 'netlab';
```

| Export | Description |
| ------ | ----------- |
| `StaticProtocol` / `staticProtocol` | Static-route protocol implementation and shared singleton |
| `OspfProtocol` / `ospfProtocol` | Exported OSPF stub; currently returns no learned routes |
| `BgpProtocol` / `bgpProtocol` | Exported BGP stub; currently returns no learned routes |
| `RipProtocol` / `ripProtocol` | Exported RIP stub; currently returns no learned routes |

## Registries And Constants

### Layer And Protocol Registries

```typescript
import {
  registerLayerPlugin,
  layerRegistry,
  protocolRegistry,
} from 'netlab';
```

| Export | Description |
| ------ | ----------- |
| `registerLayerPlugin(plugin)` | Recommended entry point for custom layer registration |
| `layerRegistry` | Low-level registry with `register()`, `getPlugin()`, `getAllNodeTypes()`, `getForwarder()`, and `list()` |
| `protocolRegistry` | Routing registry with `register()`, `unregister()`, `resolveRouteTable()`, `notifyTopologyChange()`, and `list()` |

### ICMP And Routing Constants

```typescript
import { ADMIN_DISTANCES, ICMP_TYPE, ICMP_CODE } from 'netlab';
import type { IcmpType, IcmpCode } from 'netlab';
```

| Export | Description |
| ------ | ----------- |
| `ADMIN_DISTANCES` | Built-in routing admin distances for static, eBGP, OSPF, RIP, and iBGP |
| `ICMP_TYPE` | ICMP message type constants used by `ping()` and `traceroute()` |
| `ICMP_CODE` | ICMP code constants including TTL-exceeded |

### Theming

```typescript
import {
  NETLAB_DARK_THEME,
  NETLAB_LIGHT_THEME,
  themeToVars,
} from 'netlab';
import type { NetlabTheme } from 'netlab';
```

| Export | Description |
| ------ | ----------- |
| `NetlabTheme` | Theme token interface used by `NetlabApp` and `NetlabThemeScope` |
| `NETLAB_DARK_THEME` | Default dark palette |
| `NETLAB_LIGHT_THEME` | Built-in light palette |
| `themeToVars(theme)` | Converts theme tokens into `--netlab-*` CSS variables |

## Packet Serialization

```typescript
import { serializePacket, serializeArpFrame } from 'netlab';
import type { LayerTag, AnnotatedField, SerializedPacket } from 'netlab';
```

| Export | Description |
| ------ | ----------- |
| `serializePacket(packet)` | Serializes an `InFlightPacket` into bytes, layer annotations, and named fields |
| `serializeArpFrame(frame)` | Serializes an `ArpEthernetFrame` for the packet structure viewer |
| `LayerTag` | Byte-annotation layer tag union (`'L2'`, `'L3'`, `'L4'`, `'L7'`, `'ARP'`, `'raw'`) |
| `AnnotatedField` | Named byte-range metadata for rendered packet fields |
| `SerializedPacket` | Result object consumed by packet-inspection UI |

## Utilities

```typescript
import {
  isInSubnet,
  parseCidr,
  isInSameSubnet,
  deriveDeterministicMac,
  extractHostname,
  isIpAddress,
  encodeTopology,
  decodeTopology,
  isValidConnection,
  isValidConnectionBetweenNodes,
  isValidEdge,
  validateConnection,
} from 'netlab';
import type { ValidationResult, ValidationError, ValidationWarning } from 'netlab';
```

### CIDR Utilities

| Function | Signature | Description |
| -------- | --------- | ----------- |
| `parseCidr(cidr)` | `(cidr: string) => { prefix: string; length: number }` | Splits a CIDR string into prefix and prefix length |
| `isInSubnet(ip, cidr)` | `(ip: string, cidr: string) => boolean` | Checks IPv4 membership in a CIDR |
| `isInSameSubnet(cidr1, cidr2)` | `(cidr1: string, cidr2: string) => boolean` | Compares network addresses for equal-length CIDRs |

### Network Utilities

| Function | Description |
| -------- | ----------- |
| `deriveDeterministicMac(nodeId)` | Stable locally-administered MAC derived from a string seed |
| `extractHostname(url)` | Hostname extraction helper that returns `null` for invalid URLs |
| `isIpAddress(value)` | Lightweight IPv4 string check |

### Topology URL Utilities

| Function | Description |
| -------- | ----------- |
| `encodeTopology(topology)` | Encodes a `TopologySnapshot` into `?topo=<base64url>` |
| `decodeTopology(search)` | Decodes `window.location.search` into a `NetworkTopology \| null` |

### Connection Validation

| Function | Description |
| -------- | ----------- |
| `validateConnection(nodes, edges, sourceId, targetId, sourceHandle?, targetHandle?)` | Returns full `ValidationResult` with errors and warnings |
| `isValidConnection(sourceRole, targetRole)` | Fast role-level compatibility check |
| `isValidConnectionBetweenNodes(nodes, sourceId, targetId)` | Convenience wrapper that looks up node roles |
| `isValidEdge(nodes, edge)` | Convenience wrapper for existing edges |

## Node Factory Utilities

```typescript
import {
  createRouterNode,
  createSwitchNode,
  createClientNode,
  createServerNode,
  randomPosition,
} from 'netlab';
```

| Function | Description |
| -------- | ----------- |
| `createRouterNode(position?)` | Creates a router node with empty interfaces and static routes |
| `createSwitchNode(position?)` | Creates a switch node with default ports |
| `createClientNode(position?)` | Creates a client endpoint node |
| `createServerNode(position?)` | Creates a server endpoint node |
| `randomPosition()` | Returns a slightly randomized `{ x, y }` editor placement |

## Types

All type exports are also available from the root package:

### App, Theme, And Provider Types

```typescript
import type {
  NetlabAppProps,
  NetlabTheme,
  NetlabThemeScopeProps,
  NetlabProviderProps,
  NetlabCanvasProps,
  ResizableSidebarProps,
  TopologyEditorProps,
  TopologyEditorProviderProps,
  TopologyEditorContextValue,
} from 'netlab';
```

### Simulation, Failure, Session, And Stepping Types

```typescript
import type {
  FailureState,
  FailureContextValue,
  PacketHop,
  PacketTrace,
  SimulationStatus,
  SimulationState,
  RoutingDecision,
  RoutingCandidate,
  NatTranslation,
  SimulationProviderProps,
  SimulationContextValue,
  NetworkSession,
  SessionPhase,
  SessionStatus,
  SessionEvent,
  SessionProviderProps,
  SessionContextValue,
  StepSimStatus,
  StepSimState,
} from 'netlab';
```

### Packet And Protocol Payload Types

```typescript
import type {
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
  IcmpType,
  IcmpCode,
} from 'netlab';
```

### Layer, Routing, Topology, NAT, ACL, And Area Types

```typescript
import type {
  LayerId,
  ForwardContext,
  ForwardDecision,
  Forwarder,
  ForwarderFactory,
  LayerPlugin,
  Neighbor,
  ProtocolName,
  RouteEntry,
  TopologyChangeEvent,
  RoutingProtocol,
  StaticRouteConfig,
  PortForwardingRule,
  RouterInterface,
  NatType,
  NatEntry,
  NatTable,
  AclAction,
  AclProtocol,
  AclPortRange,
  AclRule,
  AclMatchInfo,
  ConnState,
  ConnTrackEntry,
  ConnTrackTable,
  AreaType,
  AreaVisualConfig,
  NetworkArea,
  NetlabNodeData,
  VlanConfig,
  SwitchPort,
  NetlabNode,
  NetlabEdge,
  NetworkTopology,
  TopologySnapshot,
  EditorTopology,
  TopologyEditorState,
  PositionUpdate,
} from 'netlab';
```

### Services, Hooks, Validation, And Serialization Types

```typescript
import type {
  DhcpServerConfig,
  DhcpClientConfig,
  DnsZoneEntry,
  DnsServerConfig,
  DhcpLeaseState,
  DnsCacheEntry,
  DnsCache,
  HookFn,
  HookMap,
  HookPoint,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  LayerTag,
  AnnotatedField,
  SerializedPacket,
} from 'netlab';
```
