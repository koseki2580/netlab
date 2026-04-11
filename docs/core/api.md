# Public API

## Components

### `<NetlabProvider>`

Context provider. Must wrap `<NetlabCanvas>` and any netlab hooks.

```typescript
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

Use `topology` for parent-owned state. Use `defaultTopology` when you only need an initial snapshot and do not want subsequent prop changes to re-seed the provider.

### `<NetlabCanvas>`

The main React Flow canvas. Renders the network topology with area backgrounds and supports interactive drag repositioning and edge creation.

```typescript
interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
  colorMode?: 'light' | 'dark';
  onNodesChange?: (nodes: NetlabNode[]) => void;
  onEdgesChange?: (edges: NetlabEdge[]) => void;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}
```

By default, node positions and edges are managed in local React state seeded from the provided topology. When any callback prop is provided, `NetlabCanvas` enters controlled-sync mode: committed changes are reported back to the parent and external topology updates re-sync the canvas.

See [../api/controlled-topology.md](../api/controlled-topology.md) for the controlled workflow and [ui-interaction.md](./ui-interaction.md) for the interaction design.

### `<NetlabThemeScope>`

Theme wrapper for manual primitive composition. Use it when you render `NetlabProvider`, `SimulationProvider`, `NetlabCanvas`, or the simulation/overlay controls directly instead of going through `NetlabApp`.

```typescript
interface NetlabThemeScopeProps {
  theme?: Partial<NetlabTheme>;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}
```

`NetlabThemeScope` merges partial overrides on top of `NETLAB_DARK_THEME`, injects the `--netlab-*` CSS variables for descendants, and provides the resolved `colorMode` to `NetlabCanvas`.

### `<NodeDetailPanel>`

Floating overlay that shows the full metadata for the currently selected node. Rendered automatically by `NetlabCanvas` — no manual placement required. Close with `✕` button or `Escape` key.

See [ui-interaction.md#node-detail-panel](./ui-interaction.md#node-detail-panel).

### `<RouteTable>`

Optional debug panel showing the resolved route table for all routers.

### `<AreaLegend>`

Optional legend showing area types and their colors.

## Functions

### `registerLayerPlugin(plugin: LayerPlugin): void`

Register a layer plugin before rendering. See [plugins.md](./plugins.md).

### `installFetchInterceptor(options): () => void` 🧪 Planned

> This API is not yet exported. It will be available in a future release.

Override `window.fetch` to simulate network traffic.
Returns a cleanup function that restores the original `fetch`.

```typescript
interface FetchInterceptorOptions {
  engine: SimulationEngine;
  clientNodeId: string;
  serverNodeId: string;
  mockResponse?: (url: string, init?: RequestInit) => Response | Promise<Response>;
}
```

## Hooks (React)

### `useNetlabHooks()`

Access the hook engine from within a `NetlabProvider` tree.

```typescript
const { on, emit } = useNetlabHooks();
```

### `useNetlabContext()`

Access the full netlab context (simulation data).

```typescript
const { topology, routeTable, areas } = useNetlabContext();
```

### `useNetlabUI()`

Access the UI interaction context. Must be called inside a `NetlabCanvas` tree.

```typescript
const { selectedNodeId, setSelectedNodeId } = useNetlabUI();
```

Use `setSelectedNodeId(nodeId)` to open the `NodeDetailPanel` for a specific node, or `setSelectedNodeId(null)` to close it.

## Classes

### `SimulationEngine`

Pure TypeScript simulation engine. See [architecture.md](./architecture.md).

```typescript
class SimulationEngine {
  on(listener: SimulationEventListener): () => void;
  step(packetId: string): void;
  run(packet: InFlightPacket): Promise<void>;
}
```

## Routing Protocol Registration

### `protocolRegistry.register(protocol: RoutingProtocol): void`

Register a routing protocol. See [routing/index.md](./routing/index.md).

## Theming

### `NetlabTheme`

Interface for color token configuration. See [theming.md](../ui/theming.md) for the full reference.

```typescript
import type { NetlabTheme } from 'netlab';
import { NETLAB_DARK_THEME, NETLAB_LIGHT_THEME, themeToVars } from 'netlab';
```

- `NETLAB_DARK_THEME` — default dark palette, including node background tokens
- `NETLAB_LIGHT_THEME` — built-in light palette
- `themeToVars(theme)` — converts a `NetlabTheme` to a `React.CSSProperties` object of `--netlab-*` variables
- `NetlabThemeScope` — the recommended theme wrapper when composing lower-level primitives directly

### `NetlabApp` `theme` prop

`NetlabApp` accepts an optional `theme?: Partial<NetlabTheme>` prop. Missing fields default to `NETLAB_DARK_THEME`.

```typescript
interface NetlabAppProps {
  topology: NetworkTopology;
  width?: number | string;
  height?: number | string;
  simulation?: boolean;
  timeline?: boolean;
  routeTable?: boolean;
  areaLegend?: boolean;
  theme?: Partial<NetlabTheme>;   // ← new
  style?: React.CSSProperties;
  className?: string;
}
```

---

## Types

All types are exported from the root `netlab` package:

```typescript
import type {
  // Layers
  LayerId, LayerPlugin, Forwarder, ForwarderFactory, ForwardDecision,
  // Routing
  RoutingProtocol, RouteEntry, ProtocolName, ADMIN_DISTANCES,
  // Areas
  NetworkArea, AreaType,
  // Hooks
  HookFn, HookMap, HookPoint,
  // Topology
  NetworkTopology, TopologySnapshot, NetlabNode, NetlabEdge, NetlabNodeData,
  // Packets
  InFlightPacket, EthernetFrame, IpPacket, TcpSegment, HttpMessage,
} from 'netlab';
```
