# Step-by-Step Simulation

This document specifies the routing decision data model, `StepSimulationController` API, and `StepControls` component that together form the step-by-step simulation feature.

---

## Overview

The step-by-step simulation mode allows users to trace a packet's path through the network one hop at a time. At each router hop, the system exposes the full LPM (Longest Prefix Match) routing decision — every candidate route, which ones matched the destination IP, and which one was selected as the winner.

---

## Data Model

### `RoutingCandidate`

Represents a single entry in a router's route table, evaluated against the destination IP.

```typescript
interface RoutingCandidate {
  destination: string;     // CIDR notation, e.g. "10.0.0.0/24"
  nextHop: string;         // IP address or 'direct'
  metric: number;          // routing metric
  protocol: string;        // 'static' | 'ospf' | 'rip' | 'bgp' — extensible
  adminDistance: number;   // administrative distance
  matched: boolean;        // true if isInSubnet(dstIp, destination)
  selectedByLpm: boolean;  // true for exactly one candidate: the LPM winner
}
```

### `RoutingDecision`

Encapsulates the full routing decision made at a router hop.

```typescript
interface RoutingDecision {
  dstIp: string;
  candidates: RoutingCandidate[];  // all routes, sorted by prefix length descending
  winner: RoutingCandidate | null; // null = no matching route (packet dropped)
  explanation: string;             // human-readable summary
}
```

**Explanation examples:**

- Success: `"Matched 10.0.0.0/24 via direct (static, AD=1)"`
- No route: `"No matching route for 10.0.0.5 — packet will be dropped"`

### `PacketHop.routingDecision` (extension)

The existing `PacketHop` interface gains an optional field:

```typescript
routingDecision?: RoutingDecision;
```

**Population rules:**

- Present **only** when `nodeId` belongs to a router node (`node.data.role === 'router'`)
- **Never** present on TTL-exceeded drops — the `RouterForwarder` checks TTL before routing, so the hop breaks before any routing lookup occurs
- Present on no-route drops (`winner: null`) — when the forwarder drops with `reason: 'no-route'`, the engine captures `routingDecision` before pushing the hop; this makes the empty/unmatched routing table visible to the user

---

## `buildRoutingDecision` (internal)

An internal function in `SimulationEngine.ts` that builds a `RoutingDecision` from a destination IP and the router's route table entries:

1. Sort all routes by prefix length descending (longest prefix first)
2. For each route, evaluate `isInSubnet(dstIp, destination)` → `matched`
3. The first matched route is the LPM winner → `selectedByLpm = true`
4. If no route matched, `winner` is `null`
5. Build the `explanation` string

---

## `StepSimulationController`

A pure TypeScript class (zero React dependencies) that wraps `SimulationEngine` to provide a step-by-step playback API with derived state.

### Status type

```typescript
type StepSimStatus = 'idle' | 'loaded' | 'stepping' | 'done';
```

| Status     | Meaning                                              |
|------------|------------------------------------------------------|
| `idle`     | No trace loaded                                      |
| `loaded`   | Trace ready, playback not started (`currentStep -1`) |
| `stepping` | At least one step has been taken                     |
| `done`     | Last hop reached                                     |

### State shape

```typescript
interface StepSimState {
  status: StepSimStatus;
  currentStep: number;         // -1 before first step
  totalSteps: number;          // total hop count
  currentHop: PacketHop | null;
  canStep: boolean;            // true when stepping is possible
  canReset: boolean;           // true when a trace is loaded
}
```

### API

| Method                | Description                                               |
|-----------------------|-----------------------------------------------------------|
| `load(packet)`        | Precomputes the trace via `engine.send()`                 |
| `nextStep()`          | Advances one hop; returns the new `PacketHop` or null     |
| `reset()`             | Resets playback position without clearing the trace       |
| `getState()`          | Returns the current derived `StepSimState`                |
| `subscribe(listener)` | Registers a state-change listener; returns unsubscribe fn |

**`canStep` logic:**
`(status === 'loaded' || status === 'stepping') && currentStep < totalSteps - 1`

**`canReset` logic:**
`status !== 'idle'`

---

## `StepControls` Component

A React component that consumes `useSimulation()` to display the current hop details and provide step/reset controls.

### Required context providers

The component must be wrapped in both `<NetlabProvider>` and `<SimulationProvider>`.

### Sections

#### 1. Header

- Label: `STEP-BY-STEP SIMULATION`
- If no hop selected: placeholder text
- If hop selected: `HopHeader` sub-component

#### 2. Routing Table (router hops only)

- Rendered only when `selectedHop.routingDecision` is defined
- Uses `RoutingTable` sub-component

#### 3. Drop reason (non-routing drops)

- Rendered when `selectedHop.event === 'drop' && !selectedHop.routingDecision && selectedHop.reason`
- Shows the drop reason string (e.g., TTL exceeded)

#### 4. Controls

- **Next Step** button: calls `engine.step()`; disabled when `status === 'running' || done || idle`
- **Reset** button: calls `engine.reset()`; disabled when `status === 'idle'`
- Status text below the buttons

### `HopHeader` sub-component

Displays:

- Hop counter (e.g., `Hop 2 of 4`)
- Event badge colored by event type:
  - `create` → `#7dd3fc`
  - `forward` → `#4ade80`
  - `deliver` → `#34d399`
  - `drop` → `#f87171`
- Node label

### `RoutingTable` sub-component

Displays all `RoutingCandidate` entries with columns:

| DESTINATION | NEXT HOP | PROTOCOL | AD | METRIC |
|-------------|----------|----------|----|--------|

**Row color coding:**

- `selectedByLpm: true` → green tint (`#052e16` background)
- `matched: true` only → amber tint (`#451a03` background)
- Neither → default dark background

**Status badge per row:**

- `selectedByLpm` → `"MATCH ✓"` (green)
- `matched` only → `"MATCHED"` (amber)
- Neither → empty

Below the table: the `explanation` string, colored green if `winner !== null`, amber if `winner === null`.

---

## Extensibility

The `protocol` field on `RoutingCandidate` is a plain string, not an enum. This allows future routing protocol implementations (OSPF, RIP, BGP) to populate their protocol name without requiring changes to the type system. The `RoutingTable` display renders the protocol name as-is.

---

## Demo: `StepSimDemo`

A three-router demo topology that showcases LPM with both specific routes and a default route (`0.0.0.0/0`):

- `client-1` (10.0.0.10) → `router-1` → `router-2` → `router-3` → `server-1` (203.0.113.10)
- `router-2` has both a `/24` specific route and a `0.0.0.0/0` default, making LPM selection visible
- The packet is auto-loaded on mount so the user can immediately start stepping
- Layout: canvas (flex: 1) + `StepControls` side panel (380px)
