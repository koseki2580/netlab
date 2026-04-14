# Architecture

> **Status**: ✅ Implemented

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│  Consumer Application                               │
│  (registerLayerPlugin, installFetchInterceptor)     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  NetlabProvider                                     │
│  ├─ HookEngine  (middleware chain)                  │
│  ├─ ProtocolRegistry  (route resolution)            │
│  └─ NetlabContext  (topology, routeTable, areas)    │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  SimulationEngine (facade)                          │
│  ├─ ForwardingPipeline   (routing, ARP, ICMP loop)  │
│  ├─ ServiceOrchestrator (DHCP, DNS, NAT, ACL state) │
│  └─ TraceRecorder       (trace snapshots, PCAP)     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  NetlabCanvas  (React Flow wrapper)                 │
│  ├─ LayerRegistry.getAllNodeTypes()                  │
│  ├─ AreaBackground nodes (zIndex: -1)               │
│  ├─ NetlabUIContext  (selectedNodeId, setter)        │
│  └─ NodeDetailPanel  (overlay, zIndex: 200)         │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌────────────────┐   ┌──────────────────────┐
│  LayerRegistry │   │  ProtocolRegistry    │
│  l1 plugin     │   │  static (AD=1)       │
│  l2 plugin ✓   │   │  ospf   (AD=110)     │
│  l3 plugin ✓   │   │  bgp    (AD=20/200)  │
│  l4 plugin     │   │  rip    (AD=120)     │
│  l7 plugin     │   └──────────────────────┘
└────────────────┘
```

## Data Flow: fetch() Interception

```
window.fetch(url)
  │
  ▼ fetchInterceptor.ts
  ├─ HookEngine.emit('fetch:intercept')
  ├─ Build InFlightPacket  (L7 → L4 → L3 → L2)
  ├─ SimulationEngine.send(packet)
  │    ├─ ServiceOrchestrator.simulateDhcp()/simulateDns()
  │    ├─ ForwardingPipeline.precompute()
  │    │    ├─ SwitchForwarder.receive()   → 'forward' | 'deliver'
  │    │    │    └─ HookEngine.emit('switch:learn', 'packet:forward')
  │    │    └─ RouterForwarder.receive()  → 'forward' | 'deliver' | 'drop'
  │    │         └─ HookEngine.emit('router:lookup', 'packet:forward')
  │    └─ TraceRecorder.appendTrace()/exportPcap()
  ├─ HookEngine.emit('packet:deliver')
  ├─ HookEngine.emit('fetch:respond')
  └─ return mock Response
```

## Key Design Decisions

### Pure TypeScript Simulation Core

`SimulationEngine`, `ForwardingPipeline`, `ServiceOrchestrator`, `TraceRecorder`,
`SwitchForwarder`, `RouterForwarder`, and all routing protocols have zero React
dependencies. This enables unit testing without a DOM and clean separation from the render cycle.

### SimulationEngine Is a Thin Facade

`SimulationEngine` now owns playback state, selection state, and hook emission only.
Forwarding and packet mutation live in `ForwardingPipeline`, runtime service state lives in
`ServiceOrchestrator`, and trace/snapshot export logic lives in `TraceRecorder`.

### Forwarders Own Next-Hop Selection

Transit forwarding is protocol-driven:

- `RouterForwarder` returns the definitive next-hop node, traversed edge, selected route, and egress interface
- `SwitchForwarder` returns the definitive next-hop node and traversed edge, including deterministic handling of unknown unicast on shared LAN demos
- `ForwardingPipeline` executes those decisions and no longer performs a second router LPM or switch-path search for transit hops

### Module-Level Singletons for Registries

`layerRegistry` and `protocolRegistry` are module-level singletons.
Importers always receive the same instance due to Node/bundler module caching.
Side-effect imports (`import 'netlab/layers/l2-datalink'`) auto-register plugins.

### Admin Distance Resolution

When multiple routing protocols provide routes to the same destination on the same router,
`ProtocolRegistry.resolveRouteTable()` picks the winner by lowest `adminDistance`, then lowest `metric`.
See [routing/index.md](./routing/index.md).

### Koa-style Hook Middleware

Hooks use the same `compose()` pattern as Koa.js: each handler receives `(ctx, next)` and must call
`next()` to continue the chain. Handlers that don't call `next()` short-circuit the pipeline.
See [hooks.md](./hooks.md).

### Layer nodeTypes Isolation

Each layer plugin contributes its own `NodeTypes` object. These are merged once via
`LayerRegistry.getAllNodeTypes()` and passed to React Flow. This avoids per-render object creation
that would cause React Flow to remount all nodes.

### Separation of Simulation and UI Contexts

`NetlabContext` (provided by `NetlabProvider`) carries simulation data: topology, route tables, hook engine.
`NetlabUIContext` (provided by `NetlabCanvas`) carries view-only state: the currently selected node ID.

Keeping them separate ensures node components can trigger the detail panel without coupling to the simulation
layer, and simulation logic never depends on display state.

### Local Canvas State for Interactivity

`NetlabCanvas` seeds `useNodesState`/`useEdgesState` from the topology on first render, then owns those
arrays independently. Drag operations and new connections modify only the local canvas state and are never
written back to `NetlabProvider`. This keeps the simulation topology immutable and predictable while giving
users a freely editable canvas.
