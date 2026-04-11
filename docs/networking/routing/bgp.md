# BGP (Border Gateway Protocol)

> **Status**: ⚠️ Experimental

Admin Distance: `eBGP=20`, `iBGP=200` (current export is a stub)

BGP is a path-vector protocol used for inter-AS routing (the routing protocol of the Internet).

## Planned Interface

```typescript
interface BgpConfig {
  localAs: number;            // Autonomous System number
  routerId: string;           // BGP Router ID
  neighbors: BgpNeighbor[];
  networks: string[];         // prefixes to originate
}

interface BgpNeighbor {
  address: string;            // peer IP address
  remoteAs: number;           // peer AS number (same AS = iBGP, different = eBGP)
  updateSource?: string;      // interface name for BGP session source
}
```

## BGP Path Attributes (Planned)

| Attribute | Type | Description |
| --------- | ---- | ----------- |
| AS_PATH | Well-known | List of ASes the route has traversed |
| NEXT_HOP | Well-known | IP address of next hop |
| LOCAL_PREF | Well-known discrete | Preference within an AS (higher = preferred) |
| MED | Optional | Multi-Exit Discriminator (lower = preferred) |
| COMMUNITY | Optional | Tag for policy grouping |

## BGP Best Path Selection (Planned)

1. Highest `LOCAL_PREF`
2. Shortest AS_PATH
3. Lowest origin type (IGP < EGP < Incomplete)
4. Lowest MED
5. eBGP over iBGP
6. Lowest IGP metric to NEXT_HOP
7. Lowest router ID

## Current Behavior

Stub returns `computeRoutes → []`.

## Use Case in netlab

BGP enables simulation of:
- Internet peering between ISP networks (Public areas)
- Multi-homed enterprise networks
- Traffic engineering with communities
