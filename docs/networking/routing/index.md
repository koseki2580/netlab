# Routing

> **Status**: ✅ Implemented

netlab supports multiple routing protocols that can coexist via `ProtocolRegistry`.
Each protocol computes routes, and the registry resolves conflicts using **administrative distance**.

## Admin Distance (Priority)

| Protocol | Admin Distance | Notes |
| -------- | -------------- | ----- |
| Static | 1 | Manually configured, highest priority |
| eBGP | 20 | External BGP |
| OSPF | 110 | Interior gateway protocol |
| RIP | 120 | Distance vector, older |
| iBGP | 200 | Internal BGP, lowest priority |

Lower admin distance = higher priority. If two protocols have routes to the same destination
on the same router, the one with the lower admin distance wins.
On a tie, lower `metric` wins.

## Protocol Status

| Protocol | Status | Import |
| -------- | ------ | ------ |
| Static | Implemented | Built-in (from `netlab`) |
| OSPF | Stub | `import { ospfProtocol } from 'netlab'` |
| BGP | Stub | `import { bgpProtocol } from 'netlab'` |
| RIP | Stub | `import { ripProtocol } from 'netlab'` |

The dynamic protocol exports already exist at the root package, but their current implementations are intentionally stubbed and return no learned routes.

## Route Resolution Algorithm

```
1. For each registered protocol, call computeRoutes(topology)
2. Collect all RouteEntry[] into a flat list
3. Group by (nodeId, destination)
4. Within each group, keep the entry with lowest adminDistance
5. On tie in adminDistance, keep lowest metric
6. Return Map<nodeId, RouteEntry[]>
```

## Protocol Details

- [Static Routing](./static.md)
- [OSPF](./ospf.md)
- [BGP](./bgp.md)
- [RIP](./rip.md)

## Custom Protocol

```typescript
import { protocolRegistry, RoutingProtocol } from 'netlab';

const myProtocol: RoutingProtocol = {
  name: 'my-protocol',
  adminDistance: 50,
  computeRoutes(topology) {
    return [ /* RouteEntry[] */ ];
  },
};

protocolRegistry.register(myProtocol);
```
