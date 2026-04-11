# Interface-Aware Forwarding

> **Status**: ✅ Implemented

This document specifies how the simulation engine annotates packet hops with ingress and egress interface information without changing the core graph-traversal logic.

---

## Overview

The simulation engine already knows how to move a packet from node to node. Interface-aware forwarding adds a second layer of information on top of that path:

- which router interface received the packet
- which router interface sent the packet onward
- which switch port was used when edge handles make that determinable

The forwarding decision itself remains graph-based. `resolveNextNode()` still selects the next neighbor exactly as before. Interface-aware forwarding only annotates the resulting `PacketHop`.

---

## Data Model

### `RouterInterface`

`RouterInterface` gains an optional metadata field:

```ts
interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  connectedEdgeId?: string;
}
```

`connectedEdgeId` is reserved for explicit topology wiring in cases such as parallel links. In this iteration it is stored as metadata only and does not alter forwarding or annotation behavior.

### `PacketHop`

`PacketHop` gains optional interface fields:

```ts
interface PacketHop {
  ingressInterfaceId?: string;
  ingressInterfaceName?: string;
  egressInterfaceId?: string;
  egressInterfaceName?: string;
}
```

These fields are populated only when the engine can determine them with confidence. `undefined` means "not determined", not "no interface exists".

---

## Resolution Algorithm

### Router egress interface

For router hops, the engine resolves the egress interface from the route table:

1. Find the best route for `dstIp` by longest-prefix match.
2. Compute the interface-selection target IP.
3. If the route is `direct`, use `dstIp`.
4. Otherwise, use `route.nextHop`.
5. Select the first router interface whose `ipAddress/prefixLength` subnet contains that target IP.

This makes direct routes and next-hop routes follow the same annotation rule.

### Router ingress interface

For a receiving router, the engine carries forward the previous sender IP:

- endpoint source hop: sender IP is the endpoint's `node.data.ip`
- router hop: sender IP is the chosen egress interface IP
- switch hop: sender IP passes through unchanged

The receiving router selects the first local interface whose subnet contains that sender IP.

### Switch port fallback

When a hop belongs to a switch, or when edge handles provide more explicit information than subnet matching, the engine may inspect the traversed edge:

- ingress lookup reads `edge.sourceHandle` or `edge.targetHandle` for the arrival side
- egress lookup reads `edge.sourceHandle` or `edge.targetHandle` for the departure side
- the handle ID is matched against `node.data.interfaces` first, then `node.data.ports`

If an edge has no handle metadata, the fallback returns `undefined`.

---

## Hop Population Rules

- Router hops may populate both ingress and egress fields.
- Switch hops may populate ingress and egress fields only through edge handles.
- Endpoint hops do not gain interface metadata unless future endpoint interface modeling is added.
- Drop hops can still include ingress interface data if the packet already arrived on that node.
- TTL-exceeded router drops do not gain a new routing decision; the existing TTL behavior stays unchanged.

---

## UI Behavior

`HopInspector` exposes interface metadata with two conditional rows:

- `Ingress If`
- `Egress If`

The rows are rendered only when at least one of the interface names is available for the selected hop. Compact views such as `PacketTimeline` do not show interface names.

---

## Topology Authoring

To make router interface annotations work reliably:

1. Give each router interface a correct `ipAddress` and `prefixLength`.
2. Ensure route-table entries point either to `direct` or to a reachable next-hop IP.
3. Use distinct subnets per router-facing link where possible.

To make switch port annotations work:

1. Define switch `ports` with stable IDs.
2. Set `edge.sourceHandle` and `edge.targetHandle` to those port IDs.

If multiple local interfaces overlap the same subnet, the first match wins.

---

## Demo

The feature includes an `InterfaceAwareDemo` with one dual-interface router:

- `Client A` on `192.168.1.0/24`
- `Client B` on `10.0.0.0/24`
- router `R1` with `eth0` on `192.168.1.1/24`
- router `R1` with `eth1` on `10.0.0.1/24`

Sending traffic from A to B should show `R1` egressing via `eth1`. Reversing the flow should show `R1` egressing via `eth0`.
