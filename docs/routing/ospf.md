# OSPF (Open Shortest Path First)

**Status: Stub** | Admin Distance: 110

OSPF is a link-state interior gateway protocol. Routers exchange LSAs (Link State Advertisements)
and each router computes the shortest path tree using Dijkstra's algorithm.

## Planned Interface

```typescript
interface OspfConfig {
  processId: number;       // OSPF process ID (locally significant)
  routerId: string;        // Router ID (usually highest loopback IP)
  areas: OspfAreaConfig[];
}

interface OspfAreaConfig {
  areaId: string;          // '0.0.0.0' for backbone, or any dotted-decimal
  type: 'normal' | 'stub' | 'nssa';
  networks: string[];      // CIDR prefixes advertised into this area
}
```

## OSPF Areas

- **Area 0 (Backbone)**: All other areas must connect to Area 0
- **Stub area**: Does not receive external LSAs; uses default route
- **NSSA**: Can receive external routes via Type-7 LSAs

## Current Behavior

The stub returns `computeRoutes → []` (no routes generated).
Static routes with `adminDistance: 1` take precedence over OSPF (AD=110) regardless.

## Future Implementation

1. OSPF Hello protocol (neighbor discovery)
2. Database Exchange (LSA flood)
3. SPF calculation (Dijkstra)
4. Route installation with metric = cost (based on link bandwidth)
5. Area types and summarization
