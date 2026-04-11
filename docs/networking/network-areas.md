# Network Areas

> **Status**: ✅ Implemented

Network areas represent logical zones in the topology (Private, Public, DMZ, etc.).
They are visualized as semi-transparent background regions on the React Flow canvas.

## Area Types

| Type | Description | Default Color |
| ---- | ----------- | ------------- |
| `private` | Internal/LAN network | Blue (`rgba(59,130,246,0.08)`) |
| `public` | Internet-facing network | Green (`rgba(34,197,94,0.08)`) |
| `dmz` | Demilitarized zone | Orange (`rgba(251,146,60,0.08)`) |
| `management` | Out-of-band management | Purple (`rgba(168,85,247,0.08)`) |

Custom types are also supported as any string value.

## `NetworkArea` Interface

```typescript
interface NetworkArea {
  id: string;
  name: string;
  type: AreaType;           // 'private' | 'public' | 'dmz' | 'management' | string
  subnet: string;           // CIDR notation, e.g. '10.0.0.0/24'
  devices: string[];        // node IDs of devices in this area
  visualConfig?: {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;         // override background color (CSS rgba/hex)
    label?: string;         // override display label (defaults to area name)
  };
}
```

## Usage

```typescript
const areas: NetworkArea[] = [
  {
    id: 'private',
    name: 'Private Network',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: ['client-1', 'switch-1'],
    visualConfig: { x: 0, y: 0, width: 400, height: 500 },
  },
  {
    id: 'public',
    name: 'Public Network',
    type: 'public',
    subnet: '203.0.113.0/24',
    devices: ['switch-2', 'server-1'],
    visualConfig: { x: 500, y: 0, width: 400, height: 500 },
  },
];

<NetlabProvider topology={{ nodes, edges, areas, routeTables: new Map() }}>
  <NetlabCanvas />
</NetlabProvider>
```

## Visualization

Areas are rendered as React Flow nodes with `zIndex: -1` (behind all device nodes).
They use a custom node type `'netlab-area'` registered internally by netlab.

Properties:
- `selectable: false` — clicking an area does not select it
- `draggable: false` — areas cannot be dragged

## Router Spanning Multiple Areas

A router that connects two areas (e.g., a NAT router between Private and Public) should **not**
be listed in `devices` for either area. Its position in `visualConfig` should be at the boundary
between the two area backgrounds.
