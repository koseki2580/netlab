# Failure Simulation

Netlab supports injecting node and link failures into the simulation. When a node or edge is marked as "down", the simulation engine skips it during packet path precomputation. Failed components are also highlighted visually on the canvas.

## FailureState

```typescript
interface FailureState {
  readonly downNodeIds: ReadonlySet<string>;
  readonly downEdgeIds: ReadonlySet<string>;
}

const EMPTY_FAILURE_STATE: FailureState = {
  downNodeIds: new Set(),
  downEdgeIds: new Set(),
};
```

`FailureState` is an immutable snapshot passed to `SimulationEngine.send()` at the moment a packet is sent. The engine does not hold a live reference; it reads the snapshot once during `precompute`.

## Drop Reasons

When a packet encounters a failure, a `PacketHop` with `event: 'drop'` is emitted. The `reason` field describes the cause:

| Reason | Trigger |
|---|---|
| `'node-down'` | `currentNode` is in `downNodeIds`; packet dropped immediately on arrival |
| `'no-route'` | All edges to the LPM next-hop are in `downEdgeIds`; router has no reachable neighbor |

The existing reasons (`routing-loop`, `ttl-exceeded`, `node-not-found`) are unchanged.

## Engine Behavior

### Down Nodes (`downNodeIds`)

At the start of each hop, after the `node-not-found` guard, the engine checks:

```typescript
if (failureState.downNodeIds.has(current)) {
  // push drop hop with reason: 'node-down' and break
}
```

The packet is dropped without TTL decrement, routing lookup, or forwarder invocation.

### Down Edges (`downEdgeIds`)

`getNeighbors` skips edges present in `downEdgeIds`:

```typescript
for (const edge of topology.edges) {
  if (failureState.downEdgeIds.has(edge.id)) continue;
  // ...
}
```

When the LPM winner's next-hop cannot be resolved through any available neighbor (all edges to that neighbor are down), `resolveNextNode` returns `null`, causing a `no-route` drop. If an alternate neighbor matches a lower-priority route, the packet is automatically rerouted through it.

### Static Route Recalculation

Static route tables are not modified when failures are injected. Instead, the engine's neighbor resolution step (topology graph walk) reacts to down edges. If a router has two routes to the same destination (e.g., primary via R-2 and a fallback default route via R-3), toggling the primary link causes R-2 to disappear from the neighbor list, and the fallback route's next-hop (R-3) becomes the resolved path.

## FailureContext

```typescript
interface FailureContextValue {
  failureState: FailureState;
  toggleNode: (nodeId: string) => void;
  toggleEdge: (edgeId: string) => void;
  resetFailures: () => void;
  isNodeDown: (nodeId: string) => boolean;
  isEdgeDown: (edgeId: string) => boolean;
}
```

`FailureProvider` holds `FailureState` in React state and exposes immutable toggle operations. Each toggle creates new `Set` instances (immutable update pattern) to trigger React re-renders.

Two hooks are provided:

- `useFailure()` — throws if used outside `<FailureProvider>`
- `useOptionalFailure()` — returns `null` if no provider in tree; used by `SimulationContext` and `NetlabCanvas` for opt-in integration

## Provider Hierarchy

`FailureProvider` must wrap `SimulationProvider` so that `sendPacket` captures the current failure state:

```tsx
<NetlabProvider topology={topology}>
  <FailureProvider>
    <SimulationProvider>
      {/* NetlabCanvas, FailureTogglePanel, etc. */}
    </SimulationProvider>
  </FailureProvider>
</NetlabProvider>
```

`FailureProvider` is entirely optional. Apps that do not need failure simulation simply omit it.

## FailureTogglePanel Component

`<FailureTogglePanel />` renders a panel listing all topology nodes and edges with toggle buttons.

**Props:** none (reads from `useFailure()` and `useNetlabContext()`)

**Layout:**

```
┌──────────────────────────────────┐
│ FAILURE INJECTION                │
├──────────────────────────────────┤
│ NODES                            │
│  Client        ● UP   [Toggle]   │
│  Router-1      ● DOWN [Toggle]   │
├──────────────────────────────────┤
│ LINKS                            │
│  Client ↔ Router-1  ● UP  [Tgl] │
│  Router-1 ↔ Server  ● DOWN [Tgl]│
├──────────────────────────────────┤
│         [ Reset All ]            │
└──────────────────────────────────┘
```

- Status badge is green (`#4ade80`) for UP, red (`#f87171`) for DOWN
- Edge labels use `srcNode.data.label ↔ dstNode.data.label`
- "Reset All" calls `resetFailures()`

## Visual Styling

`NetlabCanvas` reads `useOptionalFailure()` and applies styles:

**Down edges:**
```typescript
{ stroke: '#ef4444', strokeDasharray: '6 3', strokeWidth: 2, opacity: 0.7 }
```

**Down nodes:**
```typescript
{ opacity: 0.4, filter: 'grayscale(80%)' }
```

These styles are applied via a `styledNodes` memo (parallel to the existing `styledEdges` memo) and override any other styles.
