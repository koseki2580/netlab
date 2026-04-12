# Failure Simulation

> **Status**: ✅ Implemented

Netlab supports injecting node, link, and router-interface failures into the simulation. Failure state is captured as an immutable snapshot and applied during packet-path precomputation. Failed components are also surfaced in the UI so users can see why a trace was rerouted or dropped.

## FailureState

```typescript
interface FailureState {
  readonly downNodeIds: ReadonlySet<string>;
  readonly downEdgeIds: ReadonlySet<string>;
  readonly downInterfaceIds: ReadonlySet<string>;
}

const EMPTY_FAILURE_STATE: FailureState = {
  downNodeIds: new Set(),
  downEdgeIds: new Set(),
  downInterfaceIds: new Set(),
};
```

`FailureState` is passed to `SimulationEngine.send()` or `SimulationEngine.precompute()` as a snapshot. The engine does not subscribe to future changes.

### Interface ID semantics

`downInterfaceIds` stores node-scoped interface keys in the format `nodeId:interfaceId`, for example `router-1:eth1`.

- This avoids collisions when multiple routers use common interface names such as `eth0`.
- The control panel still shows human-friendly labels such as `R-1 / eth1`.
- Engine checks derive the same key from the current router node ID and the resolved egress interface ID.

## Drop Reasons

When a packet encounters a failure, a `PacketHop` with `event: 'drop'` is emitted.

| Reason | Trigger |
|---|---|
| `'node-down'` | The current node is in `downNodeIds` |
| `'interface-down'` | A router resolves an egress interface and its `nodeId:interfaceId` key is in `downInterfaceIds` |
| `'no-route'` | Neighbor resolution fails after `downEdgeIds` removes unusable links |

The existing reasons (`routing-loop`, `ttl-exceeded`, `node-not-found`, forwarder-specific drops) remain unchanged.

## Engine Behavior

### Down Nodes (`downNodeIds`)

At the start of each hop, the engine checks whether the current node is down. If it is, the packet is dropped immediately with `reason: 'node-down'`.

### Down Edges (`downEdgeIds`)

`getNeighbors()` skips edges in `downEdgeIds`, so forwarders only receive reachable neighbors in
their `ForwardContext`. If no remaining neighbor satisfies the forwarding decision, the forwarder
returns a `no-route` drop.

### Down Interfaces (`downInterfaceIds`)

Router interface failure is an egress-only check in this iteration:

1. The router forwarder resolves the definitive next hop and egress interface.
2. The engine annotates that egress interface on the hop.
3. If that interface is in `downInterfaceIds`, the packet is dropped with `reason: 'interface-down'`.

This preserves existing node-down and edge-down behavior while adding a more specific router-port failure mode.

### Failure precedence

| Order | Check | Outcome |
|---|---|---|
| 1 | current node in `downNodeIds` | `'node-down'` drop |
| 2 | router forwarder TTL / forwarding checks | existing router drop reasons |
| 3 | forwarder decision against failure-filtered neighbors | `'no-route'` drop |
| 4 | resolved router egress interface in `downInterfaceIds` | `'interface-down'` drop |
| 5 | successful traversal | create / forward / deliver |

## Egress Interface Resolution

Router interface-down checks reuse the same subnet-based egress resolution used for hop annotation:

1. Find the best route for `dstIp` by longest-prefix match.
2. Choose the lookup target:
   - `dstIp` for `direct` routes
   - `route.nextHop` for routed paths
3. Select the first local router interface whose `ipAddress/prefixLength` subnet contains that target IP.

If no interface can be resolved confidently, the engine leaves interface metadata unset and does not emit an `interface-down` drop for that hop.

## Static Routing and Failure Fallback

Static route tables are not recomputed when failures are toggled. However, route selection inside
`RouterForwarder` is failure-aware:

1. Matching routes for `dstIp` are sorted by prefix length, most specific first.
2. Each candidate is checked against the current failure-filtered neighbor list.
3. The first candidate whose next hop resolves to a reachable neighbor is used.
4. If no candidate resolves to a reachable neighbor, the packet drops with `reason: 'no-route'`.

This means a less-specific route such as `0.0.0.0/0` can automatically act as a fallback when a
more-specific route becomes unreachable because of a node or link failure.

### Routing Decision Annotation

`hop.routingDecision` distinguishes between the pure LPM winner and the route actually used:

- `selectedByLpm: true` marks the most-specific matching route.
- `selectedByFailover: true` marks the route actually used after skipping an unreachable primary.
- In the normal case, `selectedByFailover` is absent and the LPM winner is used directly.
- When different candidates carry the flags, the hop used a less-specific fallback route.

## FailureContext

```typescript
interface FailureContextValue {
  failureState: FailureState;
  toggleNode: (nodeId: string) => void;
  toggleEdge: (edgeId: string) => void;
  toggleInterface: (nodeId: string, interfaceId: string) => void;
  resetFailures: () => void;
  isNodeDown: (nodeId: string) => boolean;
  isEdgeDown: (edgeId: string) => boolean;
  isInterfaceDown: (nodeId: string, interfaceId: string) => boolean;
}
```

`FailureProvider` owns the current `FailureState` in React state. Each toggle creates new `Set` instances so React consumers re-render predictably.

Two hooks are provided:

- `useFailure()` throws if used outside `<FailureProvider>`
- `useOptionalFailure()` returns `null` when no provider is mounted

## Provider Hierarchy

`FailureProvider` must wrap `SimulationProvider` so packets are sent with the current failure snapshot:

```tsx
<NetlabProvider topology={topology}>
  <FailureProvider>
    <SimulationProvider>
      {/* NetlabCanvas, FailureTogglePanel, etc. */}
    </SimulationProvider>
  </FailureProvider>
</NetlabProvider>
```

## FailureTogglePanel

`<FailureTogglePanel />` renders sections for nodes, links, and router interfaces.

### Interface section

- Only nodes with `data.interfaces` are listed.
- Each row label uses `{node label} / {interface name}`.
- Toggling a row adds or removes the node-scoped interface key from `downInterfaceIds`.

Example layout:

```text
┌──────────────────────────────────┐
│ FAILURE INJECTION                │
├──────────────────────────────────┤
│ NODES                            │
│ LINKS                            │
│ INTERFACES                       │
│  R-1 / eth1      DOWN [Toggle]   │
├──────────────────────────────────┤
│         [ Reset All ]            │
└──────────────────────────────────┘
```

## Visual Styling

`NetlabCanvas` applies existing failure visuals and adds router-interface annotations:

- down nodes: `opacity: 0.4`, `filter: grayscale(80%)`
- down edges: red dashed stroke
- routers with one or more down interfaces: a small badge rendered by `RouterNode`

The badge is driven by a transient runtime field on node data:

```typescript
data._downInterfaceCount
```

This keeps authored topology data separate from canvas-only state.

## Demo Expectations

The existing failure demo is sufficient for interface failures because it already contains multi-interface routers. Users should be able to:

1. send a packet successfully with no failures
2. toggle a router interface down
3. send the packet again and observe an `interface-down` drop plus the router badge

## Future Extension

The current design is intentionally compatible with future routing-protocol integration:

- `FailureState` remains an immutable snapshot API
- `FailureContext` can notify future protocol orchestration
- routing protocols can later treat interface-down as a topology-change signal and recompute routes without redesigning the failure UI
