# Protocol-Driven Forwarding

> **Status**: ✅ Implemented

This document specifies the forwarding contract between device forwarders and `SimulationEngine`.
Forwarders own the routing or switching decision, including the next-hop node and traversed edge.
The engine executes that decision, annotates hops, and handles surrounding concerns such as ARP,
NAT, ACLs, ICMP generation, and trace snapshots.

---

## Overview

Forwarding is split by responsibility:

- `RouterForwarder` performs longest-prefix match, failure-aware neighbor selection, TTL decrement,
  checksum recomputation, and egress-interface resolution
- `SwitchForwarder` performs MAC learning / flooding logic and resolves the concrete next-hop node
- `SimulationEngine` does not perform independent router LPM or switch-fabric search for transit hops

Only source endpoints use a trivial graph rule: they forward to their first reachable neighbor.
All transit router and switch hops are protocol-driven.

---

## Data Model

### `Neighbor`

`Neighbor` is the failure-filtered topology adjacency passed into forwarders:

```ts
interface Neighbor {
  nodeId: string;
  edgeId: string;
}
```

Neighbors are produced by `SimulationEngine.getNeighbors()`, which already excludes failed edges.

### `ForwardContext`

Forwarders receive topology context through `ForwardContext`:

```ts
interface ForwardContext {
  neighbors: Neighbor[];
}
```

This keeps failure filtering in the engine while moving forwarding choice into the protocol implementation.

### `ForwardDecision`

The forwarding variant carries definitive topology-level information:

```ts
type ForwardDecision =
  | {
      action: 'forward';
      nextNodeId: string;
      edgeId: string;
      egressPort: string;
      egressInterfaceId?: string;
      packet: InFlightPacket;
      selectedRoute?: RouteEntry;
    }
  | { action: 'deliver'; packet: InFlightPacket }
  | { action: 'drop'; reason: string };
```

`egressPort` remains as device-local detail, but `nextNodeId` and `edgeId` are the authoritative execution target.

### `PacketHop`

Hop annotations remain optional:

```ts
interface PacketHop {
  ingressInterfaceId?: string;
  ingressInterfaceName?: string;
  egressInterfaceId?: string;
  egressInterfaceName?: string;
}
```

These fields are populated only when the engine can determine them with confidence.
`undefined` means "not determined", not "no interface exists".

---

## Forwarder Contract

Every forwarder implements:

```ts
receive(
  packet: InFlightPacket,
  ingressPort: string,
  ctx: ForwardContext,
): Promise<ForwardDecision>;
```

The returned `ForwardDecision` must already encode the chosen next hop.
The engine does not reinterpret `egressPort` into a different neighbor.

---

## Router Forwarding

For router hops, `RouterForwarder` is responsible for:

1. Rejecting TTL-expired packets
2. Performing longest-prefix match over the node's route table
3. Skipping routes whose next hop is not present in `ctx.neighbors`
4. Resolving the neighbor that corresponds to the route
5. Resolving the router's egress interface from the selected edge
6. Returning `nextNodeId`, `edgeId`, `egressInterfaceId`, the mutated packet, and `selectedRoute`

For `direct` routes, neighbor resolution matches the destination IP or a switch neighbor.
For next-hop routes, neighbor resolution matches the neighbor interface IP or a switch neighbor.

---

## Switch Forwarding

For switch hops, `SwitchForwarder` is responsible for:

1. Learning the source MAC on the ingress port
2. Selecting one or more candidate egress ports from the MAC table
3. Choosing the primary egress port for the current forward decision
4. Resolving the edge attached to that port
5. Returning the node ID on the other side of that edge as `nextNodeId`

Broadcast and unknown-unicast flooding remain modeled by the simulation layer as packet duplication;
when the MAC table does not identify a single egress port, `SwitchForwarder` uses packet
destination metadata to pick a deterministic next hop for the current trace.

---

## Engine Execution Model

`SimulationEngine` is responsible for:

1. Building `ForwardContext` from reachable neighbors
2. Calling the node's forwarder for router and switch transit hops
3. Using `decision.nextNodeId` and `decision.edgeId` directly
4. Annotating routing decisions for trace display using `selectedRoute`
5. Resolving ingress/egress interface names for hop visualization
6. Applying ARP, NAT, ACL, generated ICMP, and snapshot tracking around the forwarding decision

The engine must not:

- rerun router longest-prefix match after a forwarder already selected a route
- independently map `egressPort` to a different neighbor
- recursively search through switch fabrics to find a better destination during transit forwarding

---

## Endpoint Behavior

Endpoints do not implement `Forwarder`.

- A source endpoint forwards to its first reachable neighbor
- A non-source endpoint that is not the final destination does not forward transit traffic
- Endpoint packet materialization uses the first reachable neighbor; router-generated control packets keep their L2 framing mutable until the first forward hop resolves the egress segment

---

## Interface Annotation Rules

- Router hops may populate both ingress and egress interface fields
- Switch hops may populate ingress and egress port fields via edge handles
- Drop hops may still include ingress metadata if the packet already arrived
- TTL-exceeded router drops still omit a routing decision because the drop occurs before route selection

---

## UI Behavior

`HopInspector` exposes interface metadata with two conditional rows:

- `Ingress If`
- `Egress If`

The rows are rendered only when at least one of the interface names is available for the selected hop.
Compact views such as `PacketTimeline` do not show interface names.

---

## Topology Authoring

To make protocol-driven router forwarding work reliably:

1. Give each router interface a correct `ipAddress` and `prefixLength`.
2. Ensure route-table entries point either to `direct` or to a reachable next-hop IP.
3. Ensure reachable next hops appear on a live adjacent node or through an adjacent switch.
4. Use distinct subnets per router-facing link where possible.

To make switch forwarding and port annotations work:

1. Define switch `ports` with stable IDs.
2. Set `edge.sourceHandle` and `edge.targetHandle` to those port IDs.

If multiple local interfaces overlap the same subnet, the first match wins unless explicit edge handles disambiguate the hop.

---

## Validation Expectations

The forwarding refactor must preserve:

- router failover behavior that skips unreachable neighbors
- hop-by-hop switch traversal instead of switch-fabric shortcutting
- interface annotations remaining visible in trace inspection
- `ping()` and `traceroute()` continuing to work on the refactored forwarding path
