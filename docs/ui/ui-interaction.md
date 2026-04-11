# UI Interaction

> **Status**: ✅ Implemented

This document describes the visual design system for network node components and the interactive features of `NetlabCanvas`.

---

## Node Display Design

All network device nodes use a compact icon-centric card layout:

```
┌──────────────┐
│              │
│  [SVG Icon]  │  40×40 px inline SVG
│              │
│    Label     │  device label (monospace, 11px)
└──────────────┘
```

Cards are `80px` wide with `12px 8px` padding. Metadata (IP addresses, interfaces, ports) is **not** shown inline on the card. It is accessible via the [Node Detail Panel](#node-detail-panel).

### Icon Designs

Each device type has a unique inline SVG icon:

| Device | Icon Description | Accent Color |
|--------|-----------------|--------------|
| Router | Circle with 4 directional arrows + center dot | `#4ade80` (green) |
| Switch | Chassis rectangle with port slots and status LEDs | `#60a5fa` (blue) |
| Client | Laptop outline (screen + base) | `#7dd3fc` (light blue) |
| Server | Rack chassis with drive bays + status LEDs | `#4ade80` (green) |

Icons are defined as named components within each node file (e.g. `RouterIcon`, `SwitchIcon`) using no external dependencies.

### Connection Handles

Every node exposes 4 handles — one on each side — all typed as `source`:

```
               [top]
                 │
[left] ─── [NODE CARD] ─── [right]
                 │
              [bottom]
```

Each handle has a unique `id` (`"top"`, `"right"`, `"bottom"`, `"left"`) so React Flow can distinguish them in edge data. `NetlabCanvas` sets `connectionMode={ConnectionMode.Loose}`, which allows any handle to connect to any other handle regardless of `source`/`target` type.

---

## Node Detail Panel

`NodeDetailPanel` is a floating overlay rendered inside `NetlabCanvas`. It displays the full metadata for the currently selected node.

### Appearance

- Position: top-left of the canvas (`left: 12, top: 12`)
- z-index: `200` (above `RouteTable` at `100` and `AreaLegend` at `100`)
- Style: dark panel matching `RouteTable` (`rgba(15,23,42,0.95)` background, monospace font)
- Close: click the `✕` button or press `Escape`

### Content by Role

| Role | Fields Displayed |
|------|-----------------|
| `router` | Per-interface: name, IP/prefix, MAC address |
| `switch` | Per-port: name, MAC address |
| `client` | IP address, MAC address (if present) |
| `server` | IP address, MAC address (if present) |

### Usage

`NodeDetailPanel` is rendered automatically by `NetlabCanvas`. No manual placement is required:

```tsx
<NetlabProvider topology={topology}>
  <NetlabCanvas />        {/* NodeDetailPanel is included */}
  <RouteTable />
  <AreaLegend />
</NetlabProvider>
```

To open the panel programmatically, use `useNetlabUI()`:

```tsx
import { useNetlabUI } from 'netlab';

function MyComponent() {
  const { setSelectedNodeId } = useNetlabUI();
  // Must be inside NetlabCanvas (which provides NetlabUIContext)
  return <button onClick={() => setSelectedNodeId('router-1')}>Select Router</button>;
}
```

---

## Interactive Canvas

`NetlabCanvas` uses React Flow's `useNodesState` and `useEdgesState` hooks to maintain mutable local state, enabling drag repositioning and edge creation.

### Node Dragging

Nodes can be freely repositioned by dragging. Position changes are stored in the canvas's local React state (initialized from `topology.nodes` on first render). They are **not** written back to the `NetlabProvider` topology or persisted across remounts.

### Drawing Connections

New edges can be drawn by dragging from any node handle to another node. Released connections are added to the canvas edge state as `type: 'smoothstep'` edges.

```
Drag from handle ──► drop onto another node/handle ──► new smoothstep edge appears
```

Connections use `ConnectionMode.Loose`, so dragging from any handle connects to the nearest compatible handle on the target node.

#### Connection Validation

Not all connections are topologically meaningful. Netlab enforces the following rule at draw time:

- **Invalid**: both endpoints are L7 devices (`client` or `server`). Direct endpoint-to-endpoint links bypass all network infrastructure (switches and routers) and are not permitted.
- **Valid**: all other role combinations (e.g., client↔switch, router↔router).

During an invalid drag, React Flow shows a **red connection line** and a blocked cursor. Releasing the drag does not create the edge.

If a topology is loaded that already contains invalid edges (e.g., from an external source), those edges are displayed in **red** to signal the problem without blocking the view.

See [`docs/connection-validation.md`](./connection-validation.md) for the full rule matrix and implementation details.

### State Initialization

On mount, canvas state is seeded from the topology passed to `NetlabProvider`:

| Canvas state | Seeded from |
|---|---|
| `nodes` | `[...areasToNodes(areas), ...topology.nodes]` |
| `edges` | `topology.edges` |

If `topology` changes after mount (e.g. a new node is added externally), the canvas state is **not** updated automatically. The canvas must be remounted to re-seed from the new topology.

---

## NetlabUIContext

`NetlabUIContext` is an internal React context scoped to `NetlabCanvas`. It carries the selected node ID and its setter, allowing node components to trigger the detail panel without prop drilling.

```typescript
interface NetlabUIContextValue {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}
```

Access it via `useNetlabUI()`:

```typescript
import { useNetlabUI } from 'netlab';

const { selectedNodeId, setSelectedNodeId } = useNetlabUI();
```

`useNetlabUI()` throws if called outside a `NetlabCanvas` tree.

### Context Hierarchy

```
NetlabProvider  (NetlabContext — simulation data)
  └─ NetlabCanvas
       └─ NetlabUIContext.Provider  (UI interaction state)
            ├─ <ReactFlow>
            │    └─ node components  (read useNetlabUI)
            └─ <NodeDetailPanel>     (read useNetlabUI + useNetlabContext)
```

Simulation context (`NetlabContext`) and UI context (`NetlabUIContext`) are intentionally separate. View state does not pollute the simulation layer.

---

## Overlay Panel Z-Index Reference

| Component | Position | z-index |
|-----------|----------|---------|
| `NodeDetailPanel` | `left: 12, top: 12` | `200` |
| `RouteTable` | `right: 12, top: 12` | `100` |
| `AreaLegend` | `left: 12, bottom: 60` | `100` |
| React Flow Controls | bottom-left | ~5 |
| React Flow MiniMap | bottom-right | ~5 |
