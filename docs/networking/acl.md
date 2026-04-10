# Firewalls & ACLs

This document specifies router interface ACL filtering and optional stateful connection tracking
for IPv4 traffic in Netlab.

The first implementation covers:

- ordered stateless ACL rule lists on router interfaces
- inbound and outbound ACL evaluation phases
- implicit default-deny when an ACL list exists and no rule matches
- optional per-router stateful return-traffic auto-permit for TCP/UDP flows
- `PacketHop` annotation so the trace inspector can show which rule matched

---

## Overview

Netlab already models routed forwarding, NAT, MAC rewrite, and IPv4 checksum recomputation.
ACL filtering adds policy enforcement without changing the packet payload itself.

ACL state does not belong in the stateless `RouterForwarder`. Runtime ACL evaluation is owned by
`SimulationEngine` through one `AclProcessor` per ACL-capable router. This keeps route lookup pure
while allowing persistent state for connection tracking.

ACL processing happens in two phases:

1. inbound ACL after packet arrival and after pre-routing NAT, but before route lookup
2. outbound ACL after route lookup and egress-interface resolution, but before post-routing NAT and
   hop finalization

---

## ACL Rule Structure (`AclRule`)

```ts
export type AclAction = 'permit' | 'deny';
export type AclProtocol = 'tcp' | 'udp' | 'icmp' | 'any';

export interface AclPortRange {
  from: number;
  to: number;
}

export interface AclRule {
  id: string;
  priority: number;
  action: AclAction;
  protocol: AclProtocol;
  srcIp?: string;
  dstIp?: string;
  srcPort?: number | AclPortRange;
  dstPort?: number | AclPortRange;
  description?: string;
}
```

### Protocol Matching

- `tcp`, `udp`, and `icmp` match only that protocol
- `any` matches all protocols
- port fields are ignored for `icmp` and `any`

### IP Address Matching (CIDR)

- `srcIp` and `dstIp` accept CIDR notation such as `192.168.1.0/24`
- omitted IP fields mean wildcard match
- the string `any` is treated as `0.0.0.0/0`
- matching reuses the existing CIDR utility used elsewhere in routing/NAT

### Port Matching (Exact and Range)

- omitted port fields mean wildcard match
- numeric values match exactly
- `{ from, to }` matches inclusively
- port matching is evaluated only for TCP and UDP packets

### Priority and Ordering

- rules are evaluated in ascending `priority`
- lower `priority` means higher precedence
- first match wins

---

## Interface ACL Attachment

ACLs attach directly to `RouterInterface`:

```ts
interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  connectedEdgeId?: string;
  nat?: 'inside' | 'outside';
  inboundAcl?: AclRule[];
  outboundAcl?: AclRule[];
}
```

### Inbound ACL

- evaluated when a packet enters the interface
- runs before `RouterForwarder.receive()`
- deny terminates the packet before route lookup

### Outbound ACL

- evaluated when a packet is about to leave the interface
- runs after route lookup and egress-interface resolution
- deny terminates the packet before the hop is emitted to the next node

### Default Policy (Implicit Deny)

- if `inboundAcl` or `outboundAcl` is defined, unmatched traffic is denied
- this implicit deny is represented as `matchedRule: null`
- if the ACL field is absent entirely, traffic is unconstrained and ACL evaluation is skipped
- an empty ACL list therefore behaves as deny-all

---

## Stateful Firewall (Connection Tracking)

Routers may opt in to stateful return-traffic handling:

```ts
interface NetlabNodeData {
  statefulFirewall?: boolean;
}
```

### Enabling Stateful Mode

- `statefulFirewall: true` enables per-router connection tracking
- routers without this flag behave as purely stateless ACL filters

### Connection Track Entries

```ts
export type ConnState = 'new' | 'established';

export interface ConnTrackEntry {
  id: string;
  proto: 'tcp' | 'udp';
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  state: ConnState;
  createdAt: number;
  lastSeenAt: number;
}

export interface ConnTrackTable {
  routerId: string;
  entries: ConnTrackEntry[];
}
```

### Return Traffic Auto-Permit

- only TCP and UDP flows create conn-track entries
- when a permit decision is made for a TCP/UDP packet, the router records the flow
- reverse-direction packets that match an existing entry are permitted before rule evaluation
- conn-track permits are surfaced as `byConnTrack: true`
- return traffic does not require an explicit reverse-direction permit rule

### Lifecycle

- `createdAt` records the simulation step where the flow was first permitted
- `lastSeenAt` updates on reuse or reverse-direction matches
- `SimulationEngine.reset()` clears all conn-track tables

---

## `PacketHop` Annotation (`AclMatchInfo`)

ACL results are attached to the hop that evaluated them:

```ts
export interface AclMatchInfo {
  direction: 'inbound' | 'outbound';
  interfaceId: string;
  interfaceName: string;
  matchedRule: AclRule | null;
  action: 'permit' | 'deny';
  byConnTrack: boolean;
}
```

- `matchedRule: null` means there was no explicit configured rule attached to the match
- `matchedRule: null` with `byConnTrack: false` represents the implicit default policy deny
- `matchedRule: null` with `byConnTrack: true` represents a conn-track permit with no explicit rule
- if both inbound and outbound ACLs permit on the same hop, the outbound match is retained on the
  final hop annotation because it is the last ACL evaluation for that hop

### Drop Hops

When ACL evaluation denies a packet:

- `PacketHop.event` becomes `'drop'`
- `PacketHop.reason` becomes `'acl-deny'`
- `PacketHop.aclMatch` contains the matching rule or `matchedRule: null` for default deny

ACL evaluation itself never rewrites packet fields.

---

## UI: Hop Inspector ACL Section

When `hop.aclMatch` exists, `HopInspector` renders an `ACL FILTER` section below `HOP FIELDS` and
below `NAT TRANSLATION` if both are present.

The section shows:

- direction
- interface name
- matched rule text or `(default policy)`
- action (`PERMIT` or `DENY`)

Visual behavior:

- `PERMIT` uses `--netlab-accent-green`
- `DENY` uses `--netlab-accent-red`
- `(default policy)` uses `--netlab-text-muted`
- conn-track permits append `(conn-track)` in `--netlab-text-secondary`

Drop badges and tooltips should label ACL failures as `ACL Deny`.

---

## Demo Topology

The ACL demo contains:

- one LAN client on `10.0.1.0/24`
- one firewall router with `statefulFirewall: true`
- one WAN-side server reachable through the firewall
- send actions for permitted HTTP, blocked SSH, and permitted return traffic via conn-track
- an empty WAN-side inbound ACL so return traffic must be permitted by conn-track instead of an
  explicit reverse rule

The primary ACL policy is:

- allow LAN TCP traffic to destination port `80`
- allow LAN TCP traffic to destination port `443`
- deny everything else via implicit default policy

---

## Limitations

- IPv4 only
- no named ACL sets
- no ICMP type/code matching
- no ACL hit counters
- no time-based rules
- no TCP finite-state machine beyond simplified conn-track lifecycle
- no dedicated conn-track table viewer in this iteration
