# netlab Overview

> **Status**: ✅ Implemented

**netlab** is a browser-based network visualization and simulation library built on React Flow.

## Purpose

netlab allows developers to:

- Visualize OSI model network topologies in the browser
- Simulate packet-level communication across network devices
- Intercept `window.fetch` calls and animate them as real network traffic
- Build custom network education tools, debugging dashboards, and protocol demos

## Key Concepts

| Concept | Description |
| ------- | ----------- |
| **Layer** | An OSI model layer (L1–L7). Each layer has its own node types and forwarding logic. |
| **Device** | A network node: host, switch, router, hub, etc. |
| **Packet** | An encapsulated data unit traveling through the simulated network. |
| **Area** | A logical network zone (Private, Public, DMZ) visualized as a background region. |
| **Hook** | A middleware function injected at a named event point in the simulation pipeline. |
| **Plugin** | A layer extension that registers custom React Flow node types and forwarding logic. |
| **Routing Protocol** | An algorithm that computes route tables (static, OSPF, BGP, RIP). |

## Quick Example

```tsx
import { NetlabProvider, NetlabCanvas } from 'netlab';
import 'netlab/layers/l2-datalink';
import 'netlab/layers/l3-network';

const devices = [ /* NetlabNode[] */ ];
const links   = [ /* NetlabEdge[] */ ];
const areas   = [ /* NetworkArea[] */ ];

function App() {
  return (
    <NetlabProvider topology={{ nodes: devices, edges: links, areas, routeTables: new Map() }}>
      <NetlabCanvas style={{ height: '100vh' }} />
    </NetlabProvider>
  );
}
```

## Architecture

See [architecture.md](./architecture.md) for the full design.

## Supported OSI Layers

See [layers/index.md](../networking/layers/index.md).
