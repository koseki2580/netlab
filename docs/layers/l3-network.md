# L3 – Network Layer

**Status: Implemented**

The network layer handles IP packet routing using IP addresses and routing tables.

## Devices

- **Router**: Performs IP forwarding using a routing table
- **Host (IP)**: Has an IP address and subnet mask

## Packet Format: IP Packet

```typescript
interface IpPacket {
  layer: 'L3';
  srcIp: string;       // e.g. '10.0.0.10'
  dstIp: string;       // e.g. '203.0.113.10'
  ttl: number;         // decremented at each router hop (starts at 64)
  protocol: number;    // 6 = TCP, 17 = UDP
  payload: TcpSegment | UdpDatagram;
}
```

## Router Forwarding Specification

### Longest Prefix Match (LPM)

The router finds the most specific route matching the destination IP.
Routes are pre-sorted by `prefixLength` descending (most specific first).

```
lookup("203.0.113.10"):
  routes: [{ prefix: "203.0.113.0/24", ... }, { prefix: "0.0.0.0/0", ... }]
  → matches "203.0.113.0/24" first (length 24 > 0)
```

### TTL Decrement

TTL is decremented by 1 at each router. If TTL reaches 0, the packet is dropped
and `HookEngine.emit('packet:drop', { reason: 'ttl-exceeded' })` is called.

### No-Route Drop

If no route matches (and no default route `0.0.0.0/0` exists), the packet is dropped
with `reason: 'no-route'`.

### Route Entry

```typescript
interface RouteEntry {
  destination: string;    // CIDR e.g. '203.0.113.0/24'
  nextHop: string;        // IP address or 'direct' for connected networks
  metric: number;         // path cost (lower is better within same protocol)
  protocol: ProtocolName; // 'static' | 'ospf' | 'bgp' | 'rip'
  adminDistance: number;  // inter-protocol preference (lower is better)
  nodeId: string;         // which router owns this route
}
```

## Node Types

- `router` — L3 router node (shows IP interfaces)
- `host-l3` — Host node at L3 (shows IP address)

## Plugin Import

```typescript
import 'netlab/layers/l3-network';
```

See [router.md](../devices/router.md) and [routing/index.md](../routing/index.md).
