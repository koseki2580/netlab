# Trace Inspector

This document specifies the Trace Inspector UI for inspecting a full `PacketTrace` outside the canvas overlay. The feature is composed of `PacketTimeline`, `HopInspector`, and `TraceSummary`.

---

## Overview

The simulation engine already produces a complete hop-by-hop trace for each packet. The Trace Inspector exposes that data in a sidebar-friendly layout so users can inspect:

- the ordered sequence of hops
- the selected hop's packet and routing details
- the final outcome of the trace

All three components are zero-prop React components that consume `useSimulation()`. Components that resolve node labels additionally consume `useNetlabContext()`. They are intended for composition inside a tree that already provides `<NetlabProvider>` and `<SimulationProvider>`.

---

## Components

### `PacketTimeline`

`PacketTimeline` remains the ordered hop list and click target for hop selection.

#### Behavior

- Renders every hop in the current trace in step order
- Keeps the existing click-to-`selectHop` interaction
- Keeps the per-hop event badge styling
- Resolves `hop.toNodeId` to a human-readable node label via `useNetlabContext().topology.nodes`
- Falls back to the raw `toNodeId` when the topology lookup fails

#### Empty state

- If `currentTraceId` is `null` or no trace is found, show the existing "No trace yet" placeholder

### `HopInspector`

`HopInspector` is a standalone detail panel for `state.selectedHop`. It does not replace `PacketViewer`; it serves a different embedding context.

#### Behavior

- Renders a placeholder when `selectedHop` is `null`
- Shows a sticky header with the hop counter and event badge
- Shows key packet fields for the selected hop
- Shows routing details when `hop.routingDecision` exists
- Shows a red-tinted drop reason block when `hop.event === 'drop'` and `hop.reason` is present

#### Display fields

- Node label
- Next hop label
- Source IP
- Destination IP
- TTL In
- TTL Out
- Protocol

#### TTL derivation

`PacketHop` does not gain a new `ttlAfter` field. `HopInspector` derives the display value locally:

```text
ttlAfter =
  hop.event === 'forward' && selected node is a router -> hop.ttl - 1
  otherwise                                        -> hop.ttl
```

Router detection is based on `useNetlabContext().topology.nodes` and `node.data.role === 'router'`.

#### Routing section

The routing section follows the same information model already used in `StepControls`:

- explanation string from `RoutingDecision.explanation`
- candidate table with destination, next hop, protocol, AD, and metric
- row badges for matched and LPM-selected candidates

If `decision.winner` is present, the explanation uses a success tint. If no winner exists, the explanation uses a warning tint.

### `TraceSummary`

`TraceSummary` displays the high-level state of the current trace and renders nothing when no current trace exists.

#### Display fields

- hop count: `trace.hops.length`
- final status:
  - `delivered`
  - `dropped`
  - `in-progress` for `trace.status === 'in-flight'`
- destination label and IP resolved from `trace.dstNodeId`

#### Status colors

- `delivered` -> `#34d399`
- `dropped` -> `#f87171`
- `in-flight` -> `#94a3b8`

---

## Public API

The package export surface includes:

```ts
export { PacketTimeline } from './components/simulation/PacketTimeline';
export { HopInspector } from './components/simulation/HopInspector';
export { TraceSummary } from './components/simulation/TraceSummary';
```

Each component is zero-prop:

```tsx
<PacketTimeline />
<HopInspector />
<TraceSummary />
```

---

## Demo

The feature includes a dedicated `TraceInspectorDemo` registered in the Gallery.

### Layout

```text
┌────────────────────┬─────────────────────────┐
│                    │ TraceSummary            │
│                    ├─────────────────────────┤
│    NetlabCanvas    │ PacketTimeline          │
│                    │ scrollable              │
│                    ├─────────────────────────┤
│                    │ HopInspector            │
│                    │ scrollable              │
├────────────────────┴─────────────────────────┤
│ SimulationControls                           │
└──────────────────────────────────────────────┘
```

#### Demo rules

- Reuse the existing three-router step-simulation topology
- Auto-send a packet on mount so the timeline is immediately clickable
- Use `ResizableSidebar` with a default width of 420px

---

## Styling

- Styling uses inline React styles
- Colors should respect existing `var(--netlab-*)` CSS custom properties where available
- The new panels should visually align with existing simulation UI components rather than introducing a separate design system
