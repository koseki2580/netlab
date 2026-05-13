# IPv6 Dual-Stack

Netlab models IPv6 as an additive sibling to the existing IPv4 path. IPv4 node `ip`,
ARP, and route behavior remain unchanged. IPv6 is active only for frames with
EtherType `0x86DD` or for addresses containing `:`.

## Addressing

- Hosts may define `data.ipv6`.
- Router interfaces may define `ipv6Address` and `prefixLength6`.
- IPv6 addresses are canonicalized to RFC 5952 lowercase form.
- `deriveEui64InterfaceId(mac)` exposes the modified EUI-64 interface-ID rule for
  teaching address construction.

## Packets

`Ipv6Packet` is a subtype of the existing `IpPacket` shape so older trace and
serializer code can keep reading `srcIp`, `dstIp`, `ttl`, and `protocol`.
IPv6 packets additionally carry:

- `version: 6`
- `trafficClass`
- `flowLabel`
- `nextHeader`
- `hopLimit`

For compatibility, `ttl` is retained as a hop-limit alias in traces. Routers
decrement both `ttl` and `hopLimit` on IPv6 forwarding.

## Forwarding

Static IPv6 routes are configured with `staticRoutes6`. The route table stores
both IPv4 and IPv6 entries in the same `RouteEntry` list, and longest-prefix
match automatically uses 128-bit IPv6 arithmetic for IPv6 CIDRs.

The shipped teaching subset supports:

- ICMPv6 Echo Request and Echo Reply
- Static IPv6 routing
- Dual-stack route-table display
- Deterministic packet bytes for IPv6 Ethernet frames
- NDP cache primitives for canonical IPv6-to-MAC mappings

## Deliberate Limits

OSPFv3, BGP-for-v6, DHCPv6, and SLAAC stateful behavior are covered by the
companion IPv6 ecosystem specs:

- [IPv6 Routing Ecosystem](ipv6-routing.md)
- [DHCPv6 And Stateful SLAAC](dhcpv6.md)

IPv6 fragmentation and extension headers remain out of scope; oversized IPv6
packet behavior should be added as a future teaching slice before exposing
packet-too-big workflows broadly.

## Verification

- `src/utils/ipv6.test.ts`
- `src/simulation/NdpCache.test.ts`
- `src/simulation/icmpv6.test.ts`
- `src/routing/static/StaticProtocol.ipv6.test.ts`
- `src/layers/l3-network/RouterForwarder.ipv6.test.ts`
- `src/simulation/ForwardingPipeline.ipv6.test.ts`
- `demo/networking/Ipv6Demo.test.tsx`
- `e2e/ipv6.spec.ts`
