# ARP - Address Resolution Protocol

**Status: Implemented**  
**Layer: L2 / L3 boundary**

## Purpose

ARP maps IPv4 addresses to Ethernet MAC addresses on a local broadcast domain. When a node
needs to send an Ethernet frame to an IP address on the same subnet, it first checks its ARP
cache. If no entry exists, it broadcasts an ARP request; the target replies with its MAC.

## Packet Format

### ARP Request (EtherType `0x0806`)

| Field | Value |
| --- | --- |
| Ethernet Dst | `ff:ff:ff:ff:ff:ff` (broadcast) |
| Ethernet Src | sender MAC |
| EtherType | `0x0806` |
| Hardware Type | `0x0001` (Ethernet) |
| Protocol Type | `0x0800` (IPv4) |
| HW Length | `6` |
| Proto Length | `4` |
| Operation | `1` (request) |
| Sender MAC | sender MAC |
| Sender IP | sender IP |
| Target MAC | `00:00:00:00:00:00` (unknown) |
| Target IP | IP to resolve |

### ARP Reply (EtherType `0x0806`)

ARP replies use the same structure with `Operation = 2`, the target MAC filled in, and the
sender/target roles reversed.

## Simulation Behavior

ARP is simulated by `SimulationEngine.precompute()`. For each forwarding decision:

1. The engine checks an in-run `arpCache` for the required next-hop IP.
2. On an ARP miss, two hops are injected before the blocked IP forwarding hop:
   - `arp-request` at the sending node using a broadcast Ethernet frame
   - `arp-reply` at the target node using a unicast Ethernet frame back to the sender
3. The resolved mapping is written back to the in-run `arpCache`.
4. `SimulationState.nodeArpTables` records the learned per-node `ip -> mac` mappings for UI use.

ARP hops are stored inside the same `PacketTrace` as the original IP packet so playback and
timeline views preserve the causal relationship between resolution and forwarding.

## ARP Cache Seeding

The per-run ARP cache is pre-seeded from explicit topology metadata:

- Router interface `ipAddress` + `macAddress` pairs from `node.data.interfaces`
- Endpoint `node.data.ip` + `node.data.mac` when the MAC is not a placeholder value

Pre-seeded entries are treated as already known and do not generate ARP request/reply hops.

## Scope and Limits

- ARP cache lifetime is limited to a single `send()` / `precompute()` run.
- ARP cache expiry and timeout behavior are not simulated in this version.
- IPv6 Neighbor Discovery Protocol (NDP) is out of scope.
- Gratuitous ARP is out of scope.
- Proxy ARP is out of scope.
