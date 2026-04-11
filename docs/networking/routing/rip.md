# RIP (Routing Information Protocol)

> **Status**: ⚠️ Experimental

Admin Distance: `120` (current export is a stub)

RIP is a distance-vector protocol. Routers periodically broadcast their entire routing table.
Maximum hop count is 15 (16 = unreachable).

## Versions

- **RIPv1**: Classful, broadcast updates, no authentication
- **RIPv2**: Classless (CIDR), multicast updates (224.0.0.9), MD5 authentication

## Planned Interface

```typescript
interface RipConfig {
  version: 1 | 2;
  networks: string[];       // directly connected networks to advertise
  timers?: {
    update: number;         // update interval in seconds (default: 30)
    invalid: number;        // route invalid timer (default: 180)
    holddown: number;       // holddown timer (default: 180)
    flush: number;          // flush timer (default: 240)
  };
}
```

## Metric

RIP uses **hop count** as its metric (each router = 1 hop). Routes with 16 hops are unreachable.

## Current Behavior

Stub returns `computeRoutes → []`.

## Limitations

RIP is slow to converge and unsuitable for large networks. It is provided for educational
purposes to demonstrate the contrast with link-state protocols (OSPF).
