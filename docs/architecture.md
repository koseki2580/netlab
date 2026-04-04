# Architecture

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
│  NetlabCanvas  (React Flow wrapper)                 │
│  ├─ LayerRegistry.getAllNodeTypes()                  │
│  ├─ AreaBackground nodes (zIndex: -1)               │
│  └─ PacketAnimator (requestAnimationFrame)          │
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
  ├─ SimulationEngine.run(packet)
  │    ├─ SwitchForwarder.receive()   → 'forward' | 'deliver'
  │    │    └─ HookEngine.emit('switch:learn', 'packet:forward')
  │    └─ RouterForwarder.receive()  → 'forward' | 'deliver' | 'drop'
  │         └─ HookEngine.emit('router:lookup', 'packet:forward')
  ├─ HookEngine.emit('packet:deliver')
  ├─ HookEngine.emit('fetch:respond')
  └─ return mock Response
```

## Key Design Decisions

### Pure TypeScript Simulation Core

`SimulationEngine`, `SwitchForwarder`, `RouterForwarder`, and all routing protocols have zero React
dependencies. This enables unit testing without a DOM and clean separation from the render cycle.

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
