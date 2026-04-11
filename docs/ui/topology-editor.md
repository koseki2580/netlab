# Topology Editor — Specification

> **Status**: ✅ Implemented

## Purpose

`TopologyEditor` is an interactive React component that enables users to visually build and edit network topologies. It extends the existing read-only `NetlabProvider` + `NetlabCanvas` stack with full CRUD operations on nodes and edges, per-node property editing, and undo/redo history.

**Out of scope for v1:**
- Area (network zone) editing
- Simulation/packet forwarding from within the editor
- Drag-and-drop from external palette

---

## Component API

```typescript
interface TopologyEditorProps {
  initialTopology?: EditorTopology;   // nodes + edges to start with (default: empty)
  onTopologyChange?: (topology: EditorTopology) => void;
  style?: React.CSSProperties;
  className?: string;
}

interface EditorTopology {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
}
```

### Usage Example

```tsx
import { TopologyEditor } from 'netlab';

function App() {
  const [topology, setTopology] = useState<EditorTopology>({ nodes: [], edges: [] });
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <TopologyEditor
        initialTopology={topology}
        onTopologyChange={setTopology}
      />
    </div>
  );
}
```

---

## Component Tree

```
TopologyEditorProvider  (TopologyEditorContext — state + mutations)
  └─ NetlabProvider     (NetlabContext — computed route tables)
       └─ div.editor-root (width:100%, height:100%, position:relative, display:flex, flexDirection:column)
            ├─ EditorToolbar (height:44px, flexShrink:0)
            ├─ div.canvas-area (flex:1, position:relative)
            │    ├─ NetlabUIContext.Provider (selectedNodeId from editor state)
            │    │    └─ TopologyEditorCanvas (width:100%, height:100%)
            │    │         └─ EditorCanvasInner [key=reactFlowKey]
            │    │              └─ <ReactFlow>
            │    │                   └─ node components (RouterNode, SwitchNode, etc.)
            │    └─ NodeEditorPanel (absolute, right:12, top:12)
            └─ (end)
```

---

## State Management

### `TopologyEditorState`

```typescript
interface TopologyEditorState {
  topology: EditorTopology;
  past: HistoryEntry[];       // max 50 entries
  future: HistoryEntry[];
  reactFlowKey: number;       // incremented on undo/redo to force RF remount
  selectedNodeId: string | null;
}

interface HistoryEntry {
  topology: EditorTopology;
}
```

### Reducer Actions

| Action | History effect | `reactFlowKey` |
|--------|----------------|-----------------|
| `COMMIT { topology }` | Push current → `past` (cap 50), clear `future` | unchanged |
| `UNDO` | Pop `past` → current, current → `future` | +1 |
| `REDO` | Pop `future` → current, current → `past` | +1 |
| `UPDATE_POSITIONS { updates }` | None — patches positions in-place | unchanged |
| `SET_SELECTED { nodeId }` | None | unchanged |

### Why `UPDATE_POSITIONS` bypasses history

When the user drags a node, React Flow fires many intermediate position events. Committing each to history would flood the undo stack with positional micro-states, making undo effectively useless. Instead, drag-stop syncs the final position directly to canonical state without pushing to `past`. The user can still undo node *creation*, but not the precise final resting position of a drag.

### Why `reactFlowKey` forces remount on undo/redo

React Flow (`useNodesState`/`useEdgesState`) treats its argument as an initial value only — it does not re-sync when props change. For UNDO/REDO, incrementing `reactFlowKey` causes React to unmount and remount `EditorCanvasInner`, which re-runs `fitView` and cleanly reinitializes React Flow from the restored snapshot.

For normal COMMIT operations (addNode, deleteNode, addEdge, deleteEdge, updateNodeData), `EditorCanvasInner` uses `useEffect` hooks to sync its local ReactFlow state whenever `initialNodes` or `initialEdges` props change. This avoids the full remount (and associated viewport reset) while still reflecting changes immediately.

---

## Interactions

### Adding Nodes

Toolbar buttons: **[+ Router] [+ Switch] [+ Client] [+ Server]**

Each button creates a node with default data at a randomized position (`x: 200±200, y: 200±200`) and commits to history.

Default node data by role:

| Role | layerId | Default data |
|------|---------|--------------|
| router | l3 | `interfaces: [], staticRoutes: []` |
| switch | l2 | `ports: [fa0/0, fa0/1]` (2 default ports) |
| client | l7 | `ip: undefined, mac: undefined` |
| server | l7 | `ip: undefined, mac: undefined` |

### Connecting Nodes

Drag from any handle on one node to any handle on another. Connection validation uses `validateConnection()`:
- **Blocked**: self-loops, duplicate edges, handle reuse, and endpoint↔endpoint links (`client` / `server`)
- **Warn-only**: subnet mismatch and missing IP configuration
- Invalid connections still appear on the canvas (styled red) but are blocked during drag via `isValidConnection`.

### Deleting Nodes and Edges

1. Click to select a node or edge (React Flow selection ring)
2. Press `Delete` or `Backspace`
3. All selected nodes are removed; their connected edges are automatically removed too
4. All selected edges are removed

The `deleteKeyCode={null}` prop on `<ReactFlow>` disables the built-in delete behavior. A custom `window keydown` handler is the sole authority.

### Editing Node Properties

Click any node → `NodeEditorPanel` opens on the right side.

**Common fields (all roles):**
- Label — text input, committed on blur

**client / server:**
- IP address — text input, committed on blur
- MAC address — text input, committed on blur

**router:**
- Interface list: each interface shows name, IP/prefix (`10.0.0.1/24`), MAC
- [+ Add Interface] — adds a default interface immediately (commits to history)
- [×] per interface — removes that interface (commits to history)
- Interface field edits committed on blur

**switch:**
- Port list: each port shows name and MAC
- [+ Add Port] — adds a default port immediately (commits to history)
- [×] per port — removes that port (commits to history)
- Port field edits committed on blur

**Delete node** button at the bottom of the panel removes the node and its edges.

`Escape` key closes the panel (sets `selectedNodeId` to null).

### Undo / Redo

- **[↩ Undo]** button — disabled (`opacity: 0.4`) when no history
- **[↪ Redo]** button — disabled when no future
- Keyboard: not bound in v1 (Ctrl+Z / Ctrl+Y left for future work)

---

## Node ID Generation

Format: `${role}-${Date.now().toString(36)}`

Examples: `router-lz8k9a`, `switch-lz8kbc`, `client-lz8kce`

Sufficient uniqueness for a single-session editor. No UUID dependency.

## MAC Address Generation

Locally-administered MACs: `02:00:XX:XX:XX:XX` where the last 3 octets are random.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected nodes and edges |
| Escape | Close NodeEditorPanel (deselect node) |

---

## Export Surface

```typescript
// From 'netlab'
export { TopologyEditor } from './editor/components/TopologyEditor';
export type { TopologyEditorProps } from './editor/components/TopologyEditor';
export type { EditorTopology } from './editor/types';
export { useTopologyEditorContext } from './editor/context/TopologyEditorContext';
export { createRouterNode, createSwitchNode, createClientNode, createServerNode } from './editor/utils/nodeFactory';
```

---

## Known Limitations (v1)

1. **No area editing** — areas are not displayed or editable in the editor canvas
2. **Undo does not restore drag positions** — drag stop is not in history
3. **Viewport resets on undo/redo** — `reactFlowKey` increment causes `fitView` to re-run (normal add/delete does not reset viewport)
4. **No Ctrl+Z shortcut** — undo/redo via toolbar buttons only
5. **No node type validation on import** — `initialTopology` is trusted as-is
