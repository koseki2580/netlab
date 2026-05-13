# DHCPv6 And Stateful SLAAC

Netlab's DHCPv6 model is a deterministic teaching subset of RFC 8415. It
supports the four-message stateful exchange and Router Advertisement M/O flag
semantics used by SLAAC.

## DHCPv6 Exchange

```text
Client: SOLICIT   -> ff02::1:2 UDP/547
Server: ADVERTISE -> client UDP/546
Client: REQUEST   -> server UDP/547
Server: REPLY     -> client UDP/546
```

The shipped message types are `Solicit`, `Advertise`, `Request`, and `Reply`.
Options use TLV encoding and include:

- Client Identifier (`1`)
- Server Identifier (`2`)
- IA_NA (`3`)
- IAADDR (`5`)
- Option Request (`6`)
- Elapsed Time (`8`)
- Status Code (`13`)
- DNS Servers (`23`)

Client identity uses DUID-LL: DUID type `3`, hardware type `1`, and the
interface MAC address.

## Deterministic Allocation

DHCPv6 leases are assigned from a configured IPv6 pool. The allocator hashes the
client DUID and probes forward until it finds a free address, so replaying the
same topology assigns the same client address.

Lease defaults:

- Preferred lifetime: configurable, default `43200` seconds.
- Valid lifetime: configurable, default `86400` seconds.
- T1: preferred lifetime / 2.
- T2: preferred lifetime \* 0.8.

## Router Advertisement M/O Flags

Router Advertisements carry two configuration flags:

- `M=1`: managed address configuration. The client uses DHCPv6 for an address.
- `M=0,O=1`: the client derives a SLAAC address and uses DHCPv6 for other
  configuration such as DNS.
- `M=0,O=0`: pure SLAAC, no DHCPv6 configuration.

This model does not include DHCPv6 prefix delegation, relay agents, Reconfigure,
or renew/rebind packet emission.

## Verification

- `src/services/dhcpv6/Dhcpv6Options.test.ts`
- `src/services/dhcpv6/Dhcpv6Server.test.ts`
- `src/services/dhcpv6/Dhcpv6Client.test.ts`
- `src/services/dhcpv6/Dhcpv6Server.property.test.ts`
- `src/simulation/icmpv6.ra.test.ts`
