# Public API

## Components

### `<NetlabProvider>`

Context provider. Must wrap `<NetlabCanvas>` and any netlab hooks.

```typescript
interface NetlabProviderProps {
  topology: NetworkTopology;
  children: React.ReactNode;
}
```

### `<NetlabCanvas>`

The main React Flow canvas. Renders the network topology with area backgrounds and packet animations.

```typescript
interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
}
```

### `<RouteTable>`

Optional debug panel showing the resolved route table for all routers.

### `<AreaLegend>`

Optional legend showing area types and their colors.

## Functions

### `registerLayerPlugin(plugin: LayerPlugin): void`

Register a layer plugin before rendering. See [plugins.md](./plugins.md).

### `installFetchInterceptor(options): () => void`

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

Access the full netlab context.

```typescript
const { topology, routeTable, areas } = useNetlabContext();
```

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
  NetworkTopology, NetlabNode, NetlabEdge, NetlabNodeData,
  // Packets
  InFlightPacket, EthernetFrame, IpPacket, TcpSegment, HttpMessage,
} from 'netlab';
```
