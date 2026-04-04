# Layer Plugins

netlab supports custom layer plugins that extend the visualization and simulation behavior.

## What a Plugin Does

A `LayerPlugin` provides:

1. **`nodeTypes`** — React Flow custom node components for devices at this layer
2. **`deviceRoles`** (optional) — which device roles this plugin handles (e.g., `['switch', 'bridge']`)
3. **`forwarder`** (optional) — factory function that creates a `Forwarder` for packet processing

## Built-in Plugins

| Plugin | Import | Status |
| ------ | ------ | ------ |
| L1 Physical | `netlab/layers/l1-physical` | Stub |
| L2 Data Link | `netlab/layers/l2-datalink` | Implemented |
| L3 Network | `netlab/layers/l3-network` | Implemented |
| L4 Transport | `netlab/layers/l4-transport` | Stub |
| L7 Application | `netlab/layers/l7-application` | Visual only |

## Registering Built-in Plugins

Import as side-effects **before** rendering:

```typescript
import 'netlab/layers/l2-datalink';
import 'netlab/layers/l3-network';
import 'netlab/layers/l7-application';
```

## Writing a Custom Plugin

```typescript
import { registerLayerPlugin, LayerPlugin } from 'netlab';
import { MyFirewallNode } from './MyFirewallNode';
import { FirewallForwarder } from './FirewallForwarder';

const firewallPlugin: LayerPlugin = {
  layerId: 'l3',
  nodeTypes: {
    'firewall': MyFirewallNode,
  },
  deviceRoles: ['firewall'],
  forwarder: (nodeId, topology) => new FirewallForwarder(nodeId, topology),
};

registerLayerPlugin(firewallPlugin);
```

## `LayerPlugin` Interface

```typescript
interface LayerPlugin {
  layerId: LayerId;               // 'l1' | 'l2' | 'l3' | 'l4' | 'l7'
  nodeTypes: NodeTypes;           // React Flow node type map
  deviceRoles?: string[];         // device roles handled by this plugin
  forwarder?: ForwarderFactory;   // (nodeId, topology) => Forwarder
}
```

## `Forwarder` Interface

```typescript
interface Forwarder {
  receive(packet: Packet, ingressPort: string): Promise<ForwardDecision>;
}

type ForwardDecision =
  | { action: 'forward'; egressPort: string; packet: Packet }
  | { action: 'deliver'; packet: Packet }
  | { action: 'drop'; reason: string };
```

## Overriding a Built-in Plugin

Calling `registerLayerPlugin` with the same `layerId` as an existing plugin overwrites it.
A warning is printed to the console.

```typescript
// Replace the default L2 switch with a custom VLAN-aware switch
registerLayerPlugin({
  layerId: 'l2',
  nodeTypes: { switch: VlanSwitchNode, host: VlanHostNode },
  forwarder: (nodeId, topology) => new VlanSwitchForwarder(nodeId, topology),
});
```
