# Controlled Topology API

> **Status**: ✅ Implemented

## Overview

Netlab now supports a prop-based controlled topology workflow for applications that need to persist or restore topology state outside the canvas.

The API is intentionally hybrid:

- `NetlabProvider` can be controlled with `topology` or seeded once with `defaultTopology`
- `NetlabCanvas` still uses local React Flow state for smooth interaction
- When callback props are provided, `NetlabCanvas` synchronizes its local state from the canonical topology and reports committed mutations back to the parent

This preserves the existing uncontrolled behavior for current users while enabling parent-owned topology state for editors, persistence flows, and URL-driven restoration.

## Controlled vs Uncontrolled

### Controlled topology

Use this mode when the parent owns topology state and needs to react to mutations.

```tsx
const [topology, setTopology] = useState<NetworkTopology>(INITIAL_TOPOLOGY);

const handleTopologyChange = useCallback((snapshot: TopologySnapshot) => {
  setTopology((prev) => ({ ...prev, ...snapshot }));
}, []);

return (
  <NetlabProvider topology={topology}>
    <NetlabCanvas onTopologyChange={handleTopologyChange} />
  </NetlabProvider>
);
```

Controlled canvas behavior is enabled when any of these props are passed:

- `onNodesChange`
- `onEdgesChange`
- `onTopologyChange`

In controlled mode, canonical changes from the parent re-sync the canvas.

### Uncontrolled topology

Use this mode when you only need a fixed initial topology.

```tsx
<NetlabProvider defaultTopology={{ nodes, edges, areas: [] }}>
  <NetlabCanvas />
</NetlabProvider>
```

In uncontrolled mode, `NetlabCanvas` keeps its local React Flow state after mount, matching the legacy behavior.

## Public Types

### `TopologySnapshot`

```ts
type TopologySnapshot = Pick<NetworkTopology, 'nodes' | 'edges' | 'areas'>;
```

`TopologySnapshot` is serializable and excludes computed `routeTables`. It is compatible with `encodeTopology()` input and with the structural data returned by `decodeTopology()`.

## Component Signatures

### `NetlabProvider`

```tsx
type NetlabProviderProps =
  | {
      topology: NetworkTopology;
      defaultTopology?: TopologySnapshot;
      children: React.ReactNode;
    }
  | {
      topology?: undefined;
      defaultTopology: TopologySnapshot;
      children: React.ReactNode;
    };
```

Notes:

- `topology` is the canonical topology for controlled provider usage
- `defaultTopology` is captured once on the first render and ignored afterward
- If both are passed, `topology` wins

### `NetlabCanvas`

```tsx
interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
  onNodesChange?: (nodes: NetlabNode[]) => void;
  onEdgesChange?: (edges: NetlabEdge[]) => void;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}
```

Callback behavior:

- `onNodesChange` fires for committed node mutations such as drag-stop and delete
- `onEdgesChange` fires for edge add/remove mutations
- `onTopologyChange` fires with a full snapshot whenever the topology changes
- Area background nodes injected for rendering are excluded from callback payloads

## Example: Live JSON + Restore

```tsx
import { useCallback, useMemo, useState } from 'react';
import { NetlabCanvas, NetlabProvider, decodeTopology, encodeTopology } from 'netlab';
import type { NetworkTopology, TopologySnapshot } from 'netlab';

const INITIAL_TOPOLOGY: NetworkTopology = {
  nodes: [],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

export function ControlledTopologyExample() {
  const [topology, setTopology] = useState(INITIAL_TOPOLOGY);

  const json = useMemo(
    () =>
      JSON.stringify(
        { nodes: topology.nodes, edges: topology.edges, areas: topology.areas },
        null,
        2,
      ),
    [topology],
  );

  const handleTopologyChange = useCallback((snapshot: TopologySnapshot) => {
    setTopology((prev) => ({ ...prev, ...snapshot }));
  }, []);

  const handleEncode = () => {
    const search = encodeTopology(topology);
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  };

  const handleRestore = () => {
    const restored = decodeTopology(window.location.search);
    if (restored) setTopology(restored);
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 500 }}>
      <NetlabProvider topology={topology}>
        <div style={{ flex: 1 }}>
          <NetlabCanvas onTopologyChange={handleTopologyChange} />
        </div>
      </NetlabProvider>
      <aside style={{ width: 360 }}>
        <button onClick={handleEncode}>Encode to URL</button>
        <button onClick={handleRestore}>Restore from URL</button>
        <pre>{json}</pre>
      </aside>
    </div>
  );
}
```

## Serialization Workflow

`TopologySnapshot` works directly with the existing URL helpers.

```ts
const search = encodeTopology(snapshot);
const restored = decodeTopology(search);
```

Recommended restore flow:

1. Store the latest `TopologySnapshot` from `onTopologyChange`
2. Serialize it with `encodeTopology()`
3. Restore with `decodeTopology()`
4. Commit the restored value back into parent-owned state

## Migration

Existing usage does not change:

```tsx
<NetlabProvider topology={topology}>
  <NetlabCanvas />
</NetlabProvider>
```

That remains the default legacy behavior:

- the canvas initializes from the topology once
- local drag/connect/delete changes stay inside React Flow state
- no parent callbacks are required

To migrate to controlled topology:

1. Move topology into parent React state
2. Pass that state to `NetlabProvider topology={topology}`
3. Pass `onTopologyChange` to `NetlabCanvas`
4. Merge the callback snapshot back into the parent topology state

## Tradeoffs

| Dimension          | Controlled                                    | Uncontrolled                      |
| ------------------ | --------------------------------------------- | --------------------------------- |
| State owner        | Parent React state                            | React Flow local state            |
| Persistence        | Straightforward                               | Manual snapshotting required      |
| External restore   | `setTopology(...)`                            | Remount or recreate initial state |
| Mutation callbacks | Yes                                           | No                                |
| Extra renders      | Parent update + canvas sync                   | Lower overhead                    |
| Best fit           | Persistence, collaboration, editor-like flows | Static demos, quick visualization |
