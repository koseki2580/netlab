# Packet Visualization

> **Status**: ✅ Implemented

Specification for the step-by-step packet flow visualization system in netlab.

---

## Overview

The packet visualization system traces a network packet through the topology hop by hop, exposing:

- Packet metadata at each hop (srcIP, dstIP, TTL, protocol)
- Timeline of all hops across the full path
- Active edge highlighting in the canvas
- Pause / resume / step-by-step playback controls

The system is layered:

```
SimulationEngine          — pure TypeScript, no React
  └─ SimulationContext    — React wrapper (Provider + useSimulation hook)
       └─ SimulationControls, PacketViewer, PacketTimeline  — UI components
```

---

## Scope

### In scope (v1)
- Single-packet traces (one packet at a time)
- Node-level traversal (not port-level; edges in current topologies have no `sourceHandle`/`targetHandle`)
- Pre-computed paths played back step by step
- HookEngine event emission at each playback step
- Edge highlighting via ReactFlow `animated` prop

### Out of scope (v1)
- Concurrent multi-packet simulation
- Port-level routing (requires handle-mapped edges)
- Packet broadcasting / multicasting
- Real-time latency modelling
- Animations between nodes (only static highlight)

---

## Types (`src/types/simulation.ts`)

```typescript
interface PacketHop {
  step: number;
  nodeId: string;
  nodeLabel: string;
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: string;         // 'TCP' | 'UDP' | 'ICMP' | '<number>'
  event: 'create' | 'forward' | 'deliver' | 'drop';
  fromNodeId?: string;      // absent on step 0 (create)
  toNodeId?: string;        // absent on deliver / drop
  activeEdgeId?: string;    // ReactFlow edge.id to highlight; absent on deliver / drop
  reason?: string;          // populated only when event === 'drop'
  timestamp: number;        // Date.now() captured at precompute time
}

interface PacketTrace {
  packetId: string;
  srcNodeId: string;
  dstNodeId: string;
  hops: PacketHop[];
  status: 'in-flight' | 'delivered' | 'dropped';
}

type SimulationStatus = 'idle' | 'running' | 'paused' | 'done';

interface SimulationState {
  status: SimulationStatus;
  traces: PacketTrace[];
  currentTraceId: string | null;
  currentStep: number;      // -1 = trace loaded but playback not started
  activeEdgeIds: string[];  // edge IDs to highlight in the canvas
  selectedHop: PacketHop | null;
}
```

### Amendment to `InFlightPacket` (`src/types/packets.ts`)

Two fields are added to carry end-to-end route intent:

```typescript
interface InFlightPacket {
  id: string;
  srcNodeId: string;   // origin node ID
  dstNodeId: string;   // destination node ID
  frame: EthernetFrame;
  currentDeviceId: string;
  ingressPortId: string;
  egressPortId?: string;
  path: string[];
  timestamp: number;
}
```

---

## SimulationEngine (`src/simulation/SimulationEngine.ts`)

### Design

- Instantiated with a `NetworkTopology` (enriched, with `routeTables`) and a `HookEngine`.
- Traversal is **node-level**: for each hop it finds the next node via topology edges + route tables, independently of `ForwardDecision.egressPort` (which uses interface IDs, not node IDs).
- Forwarders (RouterForwarder, SwitchForwarder) are still called **for TTL decrement and drop detection**, but not for next-node resolution.
- `precompute()` builds the full `PacketHop[]` list without mutating React state or emitting hooks.
- `step()` advances the playback cursor, emits the appropriate HookEngine event, and notifies React subscribers.

### Traversal Rules

#### Router
1. Look up the destination IP in the routing table (longest prefix match).
2. If no route: drop with `reason: 'no-route'`.
3. If `nextHop === 'direct'`: find the neighbor node whose `data.ip` matches `dstIp`, or the first switch neighbor (switches are transparent pass-throughs toward the destination).
4. If `nextHop` is an IP: find the neighbor router whose interfaces include that IP, or the first switch neighbor.

#### Switch
1. Flood: return the first non-ingress neighbor.
2. (MAC learning is performed by `SwitchForwarder.receive()` as a side effect but does not affect next-node resolution.)

#### Client / Server (endpoint)
- If `data.ip === dstIp`: deliver.
- Otherwise: they do not forward; drop with `reason: 'no-route'`.

### Loop Guard
A `visitedNodes: Set<string>` tracks every node the packet has visited in the current trace. If `current` is already in the set, drop with `reason: 'routing-loop'`. Additionally, a `MAX_HOPS = 64` hard limit prevents runaway loops.

### Public API

| Method | Description |
|---|---|
| `async send(packet)` | Precompute trace, store it, set status to `'paused'`, `currentStep = -1`, notify listeners. |
| `step()` | Advance `currentStep` by 1, emit hook for that hop, update `activeEdgeIds` + `selectedHop`, notify. Sets `status = 'done'` at last hop. No-op if already done. |
| `play(ms = 500)` | Set `status = 'running'`, auto-call `step()` every `ms` milliseconds. Clears itself on done. |
| `pause()` | Clear interval, set `status = 'paused'`, notify. |
| `reset()` | Set `currentStep = -1`, `activeEdgeIds = []`, `selectedHop = null`, `status = 'paused'`, notify. Does NOT clear traces. |
| `selectHop(step)` | Update `selectedHop` and `activeEdgeIds` without advancing `currentStep` (used by timeline click). |
| `getState()` | Return current `SimulationState` synchronously. |
| `subscribe(fn)` | Register a listener; return an unsubscribe function. |

### Hook Emissions

Each `step()` call emits one hook based on `hops[currentStep].event`:

| event | hook point | context |
|---|---|---|
| `'create'` | `packet:create` | `{ packet, sourceNodeId }` |
| `'forward'` | `packet:forward` | `{ packet, fromNodeId, toNodeId, decision }` |
| `'deliver'` | `packet:deliver` | `{ packet, destinationNodeId }` |
| `'drop'` | `packet:drop` | `{ packet, nodeId, reason }` |

`packet` is the `InFlightPacket` snapshot captured during `precompute` at that step.

---

## React Integration

### `SimulationProvider` (`src/simulation/SimulationContext.tsx`)

Must be nested **inside** `NetlabProvider`:

```tsx
<NetlabProvider topology={...}>
  <SimulationProvider>
    <NetlabCanvas />
    <SimulationControls />
    <PacketViewer />
    <PacketTimeline />
  </SimulationProvider>
</NetlabProvider>
```

- Creates `SimulationEngine` via `useMemo` from `useNetlabContext()`.
- Re-creates engine when `topology` or `hookEngine` reference changes (correct: stale traces are invalid on topology change).
- Subscribes to engine state changes, syncs to React state via `useState`.

### `useSimulation()` hook

Throws if called outside `SimulationProvider`. Returns `{ engine, state, sendPacket }`.

### `SimulationContext` (raw context object)

Exported separately so `NetlabCanvas` can do an **optional** read (`useContext(SimulationContext)`) without throwing when `SimulationProvider` is absent.

---

## UI Components

### `SimulationControls`

Toolbar row containing:
- **Send Packet** — builds a default `InFlightPacket` from topology's first client→server pair, calls `sendPacket`.
- **▶ Play** — disabled when `status === 'running' || 'done'`
- **⏸ Pause** — disabled when `status !== 'running'`
- **→ Step** — disabled when `status === 'running' || 'done'`
- **⟳ Reset** — disabled when `status === 'idle'`

### `PacketViewer`

Absolute-positioned dark panel (right side). Displays `state.selectedHop` fields:
- Hop N of M (step + 1 of total hops)
- Node label
- Source IP
- Destination IP
- TTL
- Protocol (`'TCP'`, `'UDP'`, `'ICMP'`, or numeric)
- Event badge with directional indicator

Shows placeholder text when `selectedHop === null`.

#### Overlay layout rule

- When `PacketViewer` is rendered together with `RouteTable` in the same canvas region, the two panels must not occupy the same top-right coordinates
- `NetlabApp` simulation mode and the client-server demo compose them inside one shared right-aligned overlay stack
- The stack keeps `RouteTable` above `PacketViewer` with a visible gap so both panels remain readable at the same time
- Standalone uses of either component may still render as independent floating overlays

### `PacketTimeline`

Scrollable list of all hops in the current trace. Each row:
```
[N]  nodeLabel  EVENT-BADGE  → nextNodeLabel
```
- Clicking a row calls `engine.selectHop(step)`.
- Active row (matching `currentStep`) is highlighted.
- Auto-scrolls to the latest row when `currentStep` advances.

---

## Edge Highlighting in `NetlabCanvas`

`NetlabCanvas` reads `SimulationContext` optionally:

```typescript
const simCtx = useContext(SimulationContext);
const activeEdgeIds = simCtx?.state.activeEdgeIds ?? [];
```

Active edges receive:
```typescript
{ ...edge, animated: true, style: { stroke: '#7dd3fc', strokeWidth: 2 } }
```

This is layered after the existing invalid-edge (red) check, so active edges always appear highlighted even if they would otherwise be flagged invalid.

---

## Public API Exports

```typescript
// Types
export type { PacketHop, PacketTrace, SimulationStatus, SimulationState } from './types/simulation';

// Engine
export { SimulationEngine } from './simulation/SimulationEngine';

// React
export { SimulationProvider, SimulationContext, useSimulation } from './simulation/SimulationContext';

// Components
export { SimulationControls } from './components/simulation/SimulationControls';
export { PacketViewer } from './components/simulation/PacketViewer';
export { PacketTimeline } from './components/simulation/PacketTimeline';
```
