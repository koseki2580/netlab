# ECMP Multipath

ECMP (Equal-Cost Multipath) lets one route install multiple reachable next hops
when they share the same destination prefix, administrative distance, and metric.
Netlab models ECMP as deterministic per-flow hashing. The same flow always uses
the same bucket for a given router, while different source ports can spread over
the available next hops.

## Route Model

`RouteEntry` keeps the existing `nextHop` field for compatibility. When a route
has multiple equal-cost candidates, `equalCostNextHops` stores the canonical
sorted list:

```ts
{
  destination: '10.0.4.0/24',
  nextHop: '10.0.12.2',
  equalCostNextHops: [
    { nextHop: '10.0.12.2' },
    { nextHop: '10.0.13.2' }
  ]
}
```

Consumers that do not understand ECMP still see the first next hop. Forwarding
code that does understand ECMP expands the list, filters unreachable candidates,
and hashes the packet flow over the surviving candidates.

## Hash Contract

`src/utils/hashFlow.ts` is the shared ECMP hash surface. It serializes the flow
as:

```text
srcIp|dstIp|protocol|srcPort|dstPort
```

If an L4 port is absent, the field is `-`. The serialized key is hashed with
XXH32 and a router-local seed derived from the router id. LACP, tunneling, IPv6,
or future overlay ECMP must reuse this function instead of creating another hash.

## Routing Protocols

Static, OSPF, and RIP install ECMP automatically when equal-cost candidates are
available. BGP preserves legacy best-path behavior by default and installs
multiple next hops only when `BgpConfig.maxEcmpPaths` is greater than `1`.

## Trace Behavior

Whenever a router selects from multiple reachable candidates, the forwarding hop
gets `action: 'ecmp:bucketed'` and an `ecmpTrace` payload containing the flow
hash, selected bucket, candidate count, and chosen next hop. PacketTimeline and
HopInspector render this as an ECMP bucket annotation.

## Out Of Scope

Weighted ECMP, resilient hashing, policy-based routing, and L2 link aggregation
are outside this model. LACP is tracked separately by `plan/81d` and must reuse
`hashFlow` for its port-channel hashing.
