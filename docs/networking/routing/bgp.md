# BGP (Border Gateway Protocol)

> **Status**: ✅ Implemented (educational)

Admin Distance: `eBGP=20`, `iBGP=200`

netlab implements a simplified path-vector BGP model over explicitly configured neighbors.
It is intended for teaching route selection and AS_PATH behavior, not for simulating full Internet
control-plane exchange.

## Configuration

```typescript
interface BgpConfig {
  localAs: number;
  routerId: string;
  neighbors: BgpNeighborConfig[];
  networks: string[]; // prefixes originated by this router
}

interface BgpNeighborConfig {
  address: string; // peer interface IP
  remoteAs: number;
  localPref?: number; // optional local policy override for routes learned from this peer
  med?: number; // optional teaching/demo MED override for routes learned from this peer
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
      { id: 'to-r2', name: 'to-r2', ipAddress: '10.0.12.1', prefixLength: 30, macAddress: '00:00:00:01:00:00' },
      { id: 'to-r3', name: 'to-r3', ipAddress: '10.0.13.1', prefixLength: 30, macAddress: '00:00:00:01:00:01' },
    ],
    bgpConfig: {
      localAs: 65001,
      routerId: '1.1.1.1',
      neighbors: [
        { address: '10.0.12.2', remoteAs: 65002, localPref: 200 },
        { address: '10.0.13.2', remoteAs: 65003, localPref: 100 },
      ],
      networks: ['10.1.0.0/24'],
    },
  },
}
```

## Current Behavior

`computeRoutes(topology)` now:

1. Resolves peers by matching `neighbors[].address` to router interface IPs
2. Classifies each session as eBGP or iBGP from `localAs` / `remoteAs`
3. Seeds each router with locally originated prefixes
4. Iteratively propagates routes until convergence or router-count rounds
5. Applies simplified best-path selection:
   highest `LOCAL_PREF`
   shortest `AS_PATH`
   lowest `MED`
   eBGP over iBGP
   lowest advertiser `routerId`

The exported `RouteEntry.metric` is the installed AS_PATH length.

## Algorithm Overview

```text
for each bgp router:
  originate configured prefixes

repeat up to N rounds:
  for each router R:
    for each configured peer P:
      for each route known by P:
        derive exported AS_PATH
        reject if R.localAs already appears in the path
        compare against current best path for the prefix
```

## Limitations

- No TCP session establishment, OPEN/KEEPALIVE/UPDATE messages, or timers
- No route reflection, confederations, or community-based policy
- Neighbor relationships are explicit; there is no auto-discovery from edges
- `localPref` / `med` are optional teaching knobs, not a full policy engine
