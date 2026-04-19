# RIP (Routing Information Protocol)

> **Status**: ✅ Implemented (educational)

Admin Distance: `120`

netlab implements RIP as a deterministic Bellman-Ford style distance-vector computation over the
current topology graph. It models hop-count route learning, but not packetized updates or timers.

## Configuration

```typescript
interface RipConfig {
  version: 1 | 2;
  networks: string[]; // directly connected networks this router originates into RIP
}
```

## Configuration Example

```typescript
{
  id: 'router-2',
  type: 'router',
  data: {
    label: 'R2',
    role: 'router',
    layerId: 'l3',
    interfaces: [
      { id: 'to-r1', name: 'to-r1', ipAddress: '10.0.12.2', prefixLength: 30, macAddress: '00:00:00:02:00:00' },
      { id: 'to-r4', name: 'to-r4', ipAddress: '10.0.24.1', prefixLength: 30, macAddress: '00:00:00:02:00:01' },
    ],
    ripConfig: {
      version: 2,
      networks: ['10.0.12.0/30', '10.0.24.0/30'],
    },
  },
}
```

## Current Behavior

`computeRoutes(topology)` now:

1. Builds router-to-router adjacency from interfaces and edges
2. Seeds each RIP-enabled router with its configured directly connected networks
3. Runs Bellman-Ford iterations across RIP neighbors only
4. Installs learned routes with:
   `metric = neighbor metric + 1`
   `nextHop = neighbor interface IP facing the receiver`
5. Drops any route that would exceed RIP's maximum hop count (`16 = unreachable`)

## Algorithm Overview

```text
distance_table = directly connected configured networks

repeat N-1 times:
  for each rip router R:
    for each rip neighbor N:
      for each route known by N:
        new_metric = route.metric + 1
        if new_metric <= 15 and better than current:
          install via N's interface IP
```

## Limitations

- No multicast/broadcast update packets
- No split horizon, poison reverse, or triggered updates
- No update / invalid / holddown / flush timers
- Only routers with `ripConfig` participate in route exchange
