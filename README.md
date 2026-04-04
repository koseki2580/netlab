# netlab

Browser-based network visualization library with OSI layer simulation, built on top of [React Flow](https://reactflow.dev/).

**[Live Demo](https://koseki2580.github.io/netlab/)**

## Features

- Interactive network topology canvas powered by React Flow
- OSI layer plugin architecture (L1–L7)
- Routing protocol simulation: Static, OSPF, RIP, BGP
- Packet forwarding simulation with TTL handling and longest-prefix matching
- Network area visualization (private/public subnets)
- Extensible hook engine for observing packet events
- Built-in controls: route table overlay, area legend

## Installation

```bash
npm install netlab
```

**Peer dependencies** (install separately):

```bash
npm install react react-dom @xyflow/react
```

## Quick Start

Register the layer plugins you want to use, then wrap your topology in `NetlabProvider` and render `NetlabCanvas`.

```tsx
// 1. Register layer plugins (do this once at app entry point)
import 'netlab/layers/l1-physical';
import 'netlab/layers/l2-datalink';
import 'netlab/layers/l3-network';
import 'netlab/layers/l7-application';

// 2. Import components and types
import {
  NetlabProvider,
  NetlabCanvas,
  RouteTable,
  AreaLegend,
} from 'netlab';
import type { NetworkTopology } from 'netlab';

// 3. Define your topology
const topology: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 170 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 300, y: 170 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '0.0.0.0/0', nextHop: '203.0.113.1' },
        ],
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

// 4. Render
export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <NetlabProvider topology={topology}>
        <NetlabCanvas />
        <RouteTable />
        <AreaLegend />
      </NetlabProvider>
    </div>
  );
}
```

## Network Areas

Group nodes into named subnets with visual backgrounds.

```tsx
import type { NetworkArea, NetworkTopology } from 'netlab';

const areas: NetworkArea[] = [
  {
    id: 'private',
    name: 'Private Network',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: ['client-1', 'switch-1'],
    visualConfig: { x: 20, y: 40, width: 380, height: 340 },
  },
];

const topology: NetworkTopology = {
  // ...nodes, edges...
  areas,
  routeTables: new Map(),
};
```

## Routing Protocols

Register one or more routing protocols with the `ProtocolRegistry`. Routes are computed automatically when the topology changes.

```tsx
import { protocolRegistry, staticProtocol, ospfProtocol } from 'netlab';

// Register protocols at startup
protocolRegistry.register(staticProtocol);
protocolRegistry.register(ospfProtocol);
```

### Static routes

Define routes directly on router nodes via `staticRoutes`:

```ts
staticRoutes: [
  { destination: '10.0.0.0/24', nextHop: 'direct' },    // connected network
  { destination: '0.0.0.0/0',   nextHop: '203.0.113.1' }, // default route
  { destination: '192.168.0.0/24', nextHop: '10.0.0.254', metric: 10 },
]
```

| Field | Description |
|---|---|
| `destination` | CIDR notation (e.g. `10.0.0.0/24`) |
| `nextHop` | Next-hop IP address, or `"direct"` for connected networks |
| `metric` | Optional metric (default `0`) |

## Hook Engine

Observe or intercept packet events using the hook engine.

```tsx
import { hookEngine } from 'netlab';
import { useEffect } from 'react';

function PacketLogger() {
  useEffect(() => {
    const unsub = hookEngine.on('packet:forward', async (ctx, next) => {
      console.log(`Packet: ${ctx.fromNodeId} → ${ctx.toNodeId}`);
      await next(); // continue forwarding
    });
    return unsub; // cleanup on unmount
  }, []);

  return null;
}
```

### Available hook points

| Hook | Payload |
|---|---|
| `packet:forward` | `{ fromNodeId, toNodeId, packet }` |

You can also use the `useNetlabHooks` React hook for convenience:

```tsx
import { useNetlabHooks } from 'netlab';

function MyComponent() {
  useNetlabHooks({
    'packet:forward': async (ctx, next) => {
      console.log(ctx.fromNodeId, '->', ctx.toNodeId);
      await next();
    },
  });
  return null;
}
```

## API Reference

### Components

| Component | Description |
|---|---|
| `<NetlabProvider topology={...}>` | State provider; wrap your canvas with this |
| `<NetlabCanvas>` | React Flow canvas with registered node types |
| `<RouteTable>` | Overlay showing the current routing table |
| `<AreaLegend>` | Overlay showing network area colors |

### Utilities

```ts
import { isInSubnet, parseCidr } from 'netlab';

isInSubnet('10.0.0.5', '10.0.0.0/24'); // true
parseCidr('10.0.0.0/24');               // { prefix: '10.0.0.0', length: 24 }
```

## Layer Plugins

Import only the layers you need:

```ts
import 'netlab/layers/l1-physical';   // Physical layer
import 'netlab/layers/l2-datalink';   // Switch / L2 forwarding
import 'netlab/layers/l3-network';    // Router / IP forwarding
import 'netlab/layers/l4-transport';  // TCP/UDP
import 'netlab/layers/l7-application'; // Client / Server nodes
```

## Development

```bash
# Install dependencies
npm install

# Start demo dev server
npm run dev

# Run unit tests
npm test

# Type check
npm run typecheck

# Build library
npm run build

# Build demo (for GitHub Pages)
npm run build:demo
```

## License

MIT
