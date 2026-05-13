# Tunneling: GRE, MPLS L3VPN, and VXLAN EVPN

Netlab models tunneling as explicit, deterministic encapsulation primitives. The current shipped scope is a teaching subset: protocol byte layouts, pure encap/decap helpers, control-plane state helpers, sandbox topology metadata, and demos that make the overlay/underlay split visible. The helpers do not yet re-enter the live `ForwardingPipeline`; packets remain ordinary precomputed traces unless a demo or caller invokes the tunneling helper directly.

## GRE

GRE uses IPv4 protocol `47` outside and a GRE shim that identifies the inner payload.

```text
 C K S flags + version + protocol type +
 checksum? + key? + sequence? + inner IP packet
```

- `protocolType = 0x0800` for inner IPv4 and `0x86dd` for inner IPv6.
- `key` is treated as the tunnel identifier.
- `sequence` is preserved for teaching replay/order fields.
- A router interface can carry `greTunnel?: GreTunnelConfig`.

`encapGre(inner, config)` returns an outer `IpPacket` with `protocol: 47`. `decapGre(outer)` restores the inner packet and optional key/sequence.

## MPLS L3VPN

MPLS label stacks are represented top-most first. The 4-byte shim follows RFC 3032:

```text
 20-bit label + 3-bit TC + S bit + 8-bit TTL
```

The helpers preserve the end-of-stack invariant across `pushMplsLabel`, `swapMplsLabel`, and `popMplsLabel`. `convergeLdp(...)` is a deterministic LDP teaching model that assigns one FEC label mapping per router and reports bounded convergence steps.

For L3VPN, a PE node can carry `vrfs?: VrfConfig[]`. `VrfConfig` uses RD/RT metadata and attached CE-facing interfaces. `installVpnv4Route(...)` imports only routes whose route-targets match the VRF import RTs, and `lookupVrfRoute(...)` resolves traffic within that VRF instead of the global table.

## VXLAN EVPN

VXLAN uses UDP destination port `4789` and an 8-byte header:

```text
 flags(I=1) + reserved + 24-bit VNI + reserved
```

`encapVxlan(innerFrame, config)` wraps an Ethernet frame in UDP/4789 and uses the shared `hashFlow` helper to pick a deterministic source port. `replicateBum(...)` performs head-end replication by creating one unicast VXLAN packet per peer VTEP.

EVPN Type-2 and Type-5 routes are modeled as data objects:

- Type-2 advertises `(VNI, MAC, optional IP, origin VTEP)`.
- Type-5 advertises `(VNI, prefix, gateway IP, origin VTEP)`.
- `learnType2(...)` installs a remote MAC/IP cache entry.
- `answerArpFromEvpnCache(...)` locally answers ARP on cache hit, otherwise returns `flood`.

## Sandbox Metadata

The sandbox stores tunneling configuration with pure reducers:

- `node.gre` updates `RouterInterface.greTunnel`.
- `node.mpls-vrf` upserts or removes one VRF on a node.
- `node.vxlan-vni` updates `NetlabNodeData.vtep`.

All tunnel behavior is opt-in. Existing wired, wireless, routing, QoS, and observability demos are unaffected unless they explicitly add this metadata or call the tunneling helpers.

## Deferred Scope

Live GRE decap/re-injection, MPLS LFIB forwarding inside the runtime pipeline, PE-CE BGP VPNv4 integration, full EVPN MP-BGP propagation, multicast VXLAN, IPsec, RSVP-TE, SR-MPLS, SRv6, and VPLS are outside this shipped slice. Those require a broader forwarding lifecycle seam so the same underlay route lookup, ECMP, failure state, and trace observability remain shared.
