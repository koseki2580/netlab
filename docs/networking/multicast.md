# Multicast (IGMPv2 + IGMP Snooping)

> **Status**: ✅ Implemented (RFC 2236 IGMPv2 subset + RFC 4541 snooping essentials)

## Overview

Multicast is a delivery mode where a single source sends traffic to a **group address** (Class D: `224.0.0.0/4`) and only receivers that have **joined** that group receive the packets. In Netlab, this is modelled with:

- **IGMP (Internet Group Management Protocol v2)** — control plane that lets hosts signal join/leave to routers and switches.
- **IGMP Snooping** — L2 optimization where switches inspect IGMP messages to learn which ports have interested receivers, restricting multicast forwarding to those ports instead of flooding.

## Data Model

### Types (`types/multicast.ts`)

| Export                     | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `IGMP_PROTOCOL`            | Constant `2` — IP protocol number for IGMP               |
| `ALL_HOSTS_GROUP`          | `224.0.0.1` — IGMPv2 General Query destination           |
| `ALL_ROUTERS_GROUP`        | `224.0.0.2` — IGMPv2 Leave destination                   |
| `MulticastGroup`           | `{ groupAddress: string; sourceIp?: string }`            |
| `isMulticastIp(ip)`        | Returns `true` for `224.0.0.0/4` addresses               |
| `isLinkLocalMulticast(ip)` | Returns `true` for `224.0.0.0/24` (always-flooded range) |

### IGMP Message (`types/packets.ts`)

```typescript
interface IgmpMessage {
  layer: 'L4';
  igmpType: 'membership-query' | 'membership-report' | 'leave-group';
  groupAddress: string;
  maxResponseTime?: number;
  checksum?: number;
}
```

Part of the `IpPacket.payload` union alongside TCP, UDP, and ICMP.

### IP → MAC Derivation (`utils/multicastMac.ts`)

Following RFC 1112 §6.4:

```
01:00:5E + low-order 23 bits of the multicast IP
```

- `ipToMulticastMac(ip)` — converts `224.x.y.z` to `01:00:5e:xx:yy:zz`
- `isMulticastMac(mac)` — checks the `01:00:5e:00:00:00 – 01:00:5e:7f:ff:ff` range

## MulticastTable (`layers/l2-datalink/MulticastTable.ts`)

Per-switch table tracking which ports have joined which multicast MAC within each VLAN.

| Method                                  | Description                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `addMembership(vlanId, mac, portId)`    | Registers a port as a receiver for a group                                             |
| `removeMembership(vlanId, mac, portId)` | Unregisters a port; deletes the group entry when the last port leaves (flood fallback) |
| `getJoinedPorts(vlanId, mac)`           | Returns the `Set<portId>` of interested ports                                          |
| `hasLearnedGroup(vlanId, mac)`          | `true` if at least one port is registered                                              |
| `snapshot()`                            | Returns `MulticastTableEntry[]` for UI display                                         |
| `clear()`                               | Removes all entries                                                                    |

### Flood Fallback

When `hasLearnedGroup()` returns `false` (no snooping entries exist for a group), the switch **floods** multicast to all eligible ports in the VLAN — identical to broadcast behavior. This is standard RFC 4541 behavior and ensures connectivity before any IGMP reports are processed.

## IgmpProcessor (`layers/l3-network/IgmpProcessor.ts`)

Router-side IGMP state machine:

| Method                             | Description                                       |
| ---------------------------------- | ------------------------------------------------- |
| `buildGeneralQuery()`              | Creates a Membership Query to `224.0.0.1`         |
| `buildMembershipReport(group)`     | Creates a Membership Report for a specific group  |
| `buildLeaveGroup(group)`           | Creates a Leave Group message to `224.0.0.2`      |
| `recordReport(interfaceId, group)` | Records that a group is active on an interface    |
| `recordLeave(interfaceId, group)`  | Removes a group from an interface                 |
| `snapshot()`                       | Returns `{ interfaceId, group }[]` for UI display |

## SwitchForwarder Snooping

`SwitchForwarder` integrates multicast into its existing L2 forwarding logic:

1. **`snoopIgmp(frame, ingressPortId, vlanId)`** — Inspects transit IGMP Reports and Leaves. On Report → `addMembership`; on Leave → `removeMembership`. Returns `true` for IGMP control messages.
2. **IGMP control flooding** — All IGMP messages (Query, Report, Leave) are flooded regardless of snooping state. This makes snooping transparent to endpoints.
3. **`forward()` multicast branch** — When `dstMac` is multicast:
   - **Link-local** (`224.0.0.0/24`): always flooded
   - **Learned group** (`hasLearnedGroup`): forwarded only to joined ports
   - **Unlearned group**: flooded to all VLAN ports (fallback)

### External MulticastTable Injection

`SwitchForwarder.forward()` accepts an optional `externalMulticastTable` parameter. When provided (via `ForwardContext.multicastTable`), the persistent table from `ServiceOrchestrator` takes priority over the forwarder's internal table. This enables demo-driven join/leave without relying on actual IGMP packet exchange.

## ForwardingPipeline Integration

In `ForwardingPipeline`, when the current node is a **router**:

- IGMP Report → `IgmpProcessor.recordReport()` with `IGMP REPORT` hop action
- IGMP Leave → `IgmpProcessor.recordLeave()` with `IGMP LEAVE` hop action

When the current node is a **switch**, the persistent `MulticastTable` from `ServiceOrchestrator` is injected into `ForwardContext` so `SwitchForwarder` can consult it.

## Per-VLAN Scoping

Multicast snooping is scoped to the VLAN:

- `MulticastTable` keys by `(vlanId, multicastMac)`
- A receiver in VLAN 10 joining `224.1.2.3` does **not** affect forwarding in VLAN 20
- The multicast demo demonstrates this with Receiver-C in VLAN 20 never receiving VLAN 10 multicast traffic

## SimulationEngine API

| Method                                                     | Description                              |
| ---------------------------------------------------------- | ---------------------------------------- |
| `getMulticastTableSnapshot(switchId)`                      | Read snooping table entries              |
| `getIgmpMembershipSnapshot(routerId)`                      | Read IGMP membership state               |
| `getJoinedGroups(nodeId)`                                  | Read which groups a node has joined      |
| `addMulticastMembership(switchId, vlanId, mac, portId)`    | Programmatically add a snooping entry    |
| `removeMulticastMembership(switchId, vlanId, mac, portId)` | Programmatically remove a snooping entry |
| `addJoinedGroup(nodeId, group)`                            | Register a node as having joined a group |
| `removeJoinedGroup(nodeId, group)`                         | Unregister a node from a group           |

## Educational Simplifications

| Real-world feature                          | Netlab approach                              |
| ------------------------------------------- | -------------------------------------------- |
| IGMP timers (query interval, group timeout) | Not implemented — joins/leaves are immediate |
| IGMPv3 source-specific multicast            | Not implemented — v2 any-source only         |
| PIM (Protocol Independent Multicast)        | Not implemented — single subnet model        |
| MLD (IPv6 multicast)                        | Out of scope for this plan                   |
| CGMP (Cisco Group Management Protocol)      | Not implemented                              |

## Configuration Example

The `MulticastDemo` uses this topology:

```
Sender ──[p1]── SW1 ──[p2]── Receiver-A  (VLAN 10)
                    ├──[p3]── Receiver-B  (VLAN 10)
                    └──[p4]── Receiver-C  (VLAN 20)
```

- Sender and Receivers A/B are on VLAN 10 (access ports p1, p2, p3)
- Receiver-C is on VLAN 20 (access port p4) — isolated from VLAN 10 multicast
- Join/Leave buttons manipulate snooping entries via `SimulationEngine` API
- Sending multicast to `224.1.2.3` shows delivery restricted by snooping state

## Related

- [VLAN (802.1Q)](vlan.md) — VLAN isolation that scopes multicast forwarding
- [L2 Data Link](layers/l2-datalink.md) — Switch forwarding and MAC learning
- [UDP](udp.md) — Multicast demo data plane uses UDP datagrams
