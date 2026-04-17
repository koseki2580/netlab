# OSPF (Open Shortest Path First)

> **Status**: ✅ Implemented (educational)

Admin Distance: `110`

netlab implements an education-focused OSPF model that computes routes directly from the static
topology graph. There is no Hello state machine, LSA flood, neighbor FSM, or timer-driven
convergence. The goal is deterministic SPF route generation for teaching and demos.

## Configuration

```typescript
interface OspfConfig {
  routerId: string;
  areas: OspfAreaConfig[];
}

interface OspfAreaConfig {
  areaId: string;      // backbone = '0.0.0.0'
  networks: string[];  // connected networks this router advertises in the area
  cost?: number;       // optional link cost override for matching interfaces
}
```

## Configuration Example

```typescript
{
  id: 'router-1',
  type: 'router',
  data: {
    label: 'R1',
    role: 'router',
    layerId: 'l3',
    interfaces: [
      { id: 'lan0', name: 'lan0', ipAddress: '10.1.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
      { id: 'to-r2', name: 'to-r2', ipAddress: '10.0.12.1', prefixLength: 30, macAddress: '00:00:00:01:00:01' },
      { id: 'to-r3', name: 'to-r3', ipAddress: '10.0.13.1', prefixLength: 30, macAddress: '00:00:00:01:00:02' },
    ],
    ospfConfig: {
      routerId: '1.1.1.1',
      areas: [
        { areaId: '0.0.0.0', networks: ['10.1.0.0/24'] },
        { areaId: '0.0.0.0', networks: ['10.0.12.0/30'], cost: 1 },
        { areaId: '0.0.0.0', networks: ['10.0.13.0/30'], cost: 3 },
      ],
    },
  },
}
```

## Current Behavior

`computeRoutes(topology)` now:

1. Builds router adjacency from topology nodes, edges, and interface handles
2. Runs Dijkstra SPF from each OSPF-enabled router
3. Installs local advertised networks as `nextHop: 'direct'`, `metric: 0`
4. Installs reachable remote advertised networks with:
   `nextHop = first-hop neighbor IP`
   `metric = cumulative SPF cost`

The output is regular `RouteEntry[]`, so OSPF routes compete with static, RIP, and BGP through
`ProtocolRegistry.resolveRouteTable()`.

## Algorithm Overview

```text
for each ospf router R:
  graph = buildRouterAdjacency(topology)
  spf = dijkstra(R)

  install R's own advertised networks with metric 0

  for each reachable ospf router T:
    for each network advertised by T:
      install route:
        destination = network
        nextHop = first hop from R toward T
        metric = shortest path cost to T
```

## Limitations

- No Hello packets, LSA flooding, or adjacency state
- No ABR / ASBR behavior, summarization, or external route types
- `areas[].cost` is used as a simple per-interface cost override for matching networks
- Recalculation is static and synchronous; there is no incremental convergence model
