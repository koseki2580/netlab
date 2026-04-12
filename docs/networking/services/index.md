# Networking Services

> **Status**: ✅ Implemented

Netlab models selected UDP application services as explicit multi-packet simulation flows rather
than as opaque payloads. The initial service set is:

- DHCP address assignment for hosts with `dhcpClient.enabled`
- DNS A-record resolution for hosts that target an HTTP URL with a hostname

These services are simulated in `SimulationEngine` as chained packet traces. Each service message
is still a normal `InFlightPacket`, so the Trace Inspector and packet structure viewer can inspect
each exchange hop-by-hop.

## Scope

The first implementation intentionally keeps the service layer small:

- DHCP is limited to a single server discovered directly from topology node config
- DNS is limited to static A records served directly from node config
- UDP service dispatch is handled directly in `SimulationEngine`

`UdpListenerRegistry` is documented as a future extensibility direction, but it is not part of the
initial implementation. DHCP and DNS do not need dynamic registration because both services are
resolved from topology metadata (`node.data.dhcpServer`, `node.data.dnsServer`).

## Engine Integration

`SimulationEngine` maintains service runtime state separately from the immutable topology:

```typescript
private runtimeNodeIps = new Map<string, string>();
private dhcpLeaseStates = new Map<string, DhcpLeaseState>();
private dnsCaches = new Map<string, DnsCache>();
```

This avoids mutating `topology.nodes` after the engine is constructed.

### Service Trace Sessions

Service exchanges are represented as multiple packet traces that share one `sessionId`.

- DHCP: `DISCOVER → OFFER → REQUEST → ACK|NAK`
- DNS: `QUERY → RESPONSE`
- Application traffic may follow in the same service session when the user action caused it

Each trace keeps its own `packetId`, while the shared `sessionId` is used to correlate traces that
belong to the same higher-level action.

### Automatic Prerequisites

When `sendPacket()` is invoked for a node with `dhcpClient.enabled`, the engine ensures the source
host has a runtime IP before sending application traffic.

When the outgoing HTTP request URL contains a hostname instead of an IPv4 address, the engine
performs DNS resolution first and rewrites the destination IP before precomputing the HTTP trace.

## Switch Traversal for Service Demos

The services demo uses a flat topology with one switch and several endpoints. To support that
layout, `SwitchForwarder` is destination-aware when the MAC table has no learned entry yet:
it uses the packet's destination node/IP metadata to choose the neighbor path that leads toward
the intended endpoint instead of blindly returning the first flooded port.

This keeps the packet trace deterministic while still matching the educational intent of a shared
LAN segment.

## Related Specs

- [DHCP](dhcp.md)
- [DNS](dns.md)
- [L4 – Transport Layer](../layers/l4-transport.md)
- [L7 – Application Layer](../layers/l7-application.md)
