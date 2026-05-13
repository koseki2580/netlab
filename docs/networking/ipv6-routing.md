# IPv6 Routing Ecosystem

Netlab models IPv6 routing as an additive address family on top of the existing
route table. Legacy IPv4 routes are treated as `v4`; IPv6-capable protocols set
`af: 'v6'` and install IPv6 CIDR destinations.

## OSPFv3 Teaching Subset

OSPFv3 reuses the same SPF and ECMP concepts as the OSPFv2 model, but advertises
IPv6 prefixes separately from router connectivity:

- Hello packets use version `3`, type `1`, and the all-OSPF-routers multicast
  destination `ff02::5`.
- Instance ID is per link and defaults to `0`.
- Link-LSA (type 8) carries the link-local address and on-link prefixes.
- Intra-Area-Prefix-LSA (type 9) carries reachable IPv6 prefixes for the area.
- Computed routes install `af: 'v6'` and may carry `equalCostNextHops` inherited
  from the ECMP route shape.

This subset does not model OSPFv3 AH/IPsec authentication or full flooding
timers. It is deterministic and suitable for trace comparison.

## MP-BGP For IPv6

BGP keeps IPv4 UPDATE behavior unchanged. IPv6 unicast NLRI uses RFC 4760
multiprotocol attributes:

```text
----------------------+-------------------+
| Capability code = 1  | AFI=2, SAFI=1     |
+----------------------+-------------------+
| MP_REACH_NLRI        | type code 14      |
| MP_UNREACH_NLRI      | type code 15      |
+----------------------+-------------------+
```

`MP_REACH_NLRI` carries an IPv6 next hop plus one or more IPv6 prefixes. A
direct link-local next hop can be represented separately from the global next
hop, but the teaching route table uses the forwarding next hop string.

## Route Selection

The protocol registry compares routes by `(nodeId, af, destination)` so an IPv4
and IPv6 prefix with similar text never collide. Existing callers that do not
set `af` are inferred as IPv4 unless the destination contains `:`.

## Verification

- `src/routing/AddressFamily.test.ts`
- `src/routing/ospf/OspfV3Protocol.test.ts`
- `src/routing/ospf/OspfV3Protocol.property.test.ts`
- `src/routing/bgp/BgpMpReachNlri.test.ts`
- `src/routing/bgp/BgpProtocol.mp.test.ts`
