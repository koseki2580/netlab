# NAT / PAT

This document specifies IPv4 Network Address Translation (NAT) support for routers that bridge an
explicitly tagged inside network and outside network.

The first implementation covers:

- source NAT / PAT for inside-to-outside flows
- destination NAT for port forwarding
- reverse translation for return traffic
- a per-router live NAT table exposed through simulation state
- trace annotation so the UI can show exactly which IP and port fields changed

---

## Overview

Netlab already models routed forwarding, MAC rewrite, and IPv4 checksum recomputation. NAT adds
stateful address and port rewriting on top of that routing pipeline.

Because return traffic must reuse an earlier translation, NAT state cannot live in the stateless
`RouterForwarder`. NAT state is owned by `SimulationEngine` through one `NatProcessor` per
NAT-capable router.

---

## Terminology

- `inside local`: the original endpoint on the private side of the router
- `inside global`: the externally visible address and port allocated by the router
- `outside peer`: the remote host on the public side

The runtime table stores these values in `NatEntry`.

---

## Configuration

### Interface tagging

`RouterInterface` gains an optional NAT role:

```ts
interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  connectedEdgeId?: string;
  nat?: 'inside' | 'outside';
}
```

Direction is determined by interface tags, not by RFC 1918 heuristics.

### Port forwarding

Routers may define static port-forward rules:

```ts
interface PortForwardingRule {
  proto: 'tcp' | 'udp';
  externalPort: number;
  internalIp: string;
  internalPort: number;
}
```

These rules live on `NetlabNodeData.portForwardingRules`.

---

## Processing Model

NAT is split into two phases because the existing `RouterForwarder` performs route lookup.

### Pre-routing NAT

Runs before `RouterForwarder.receive()`.

Responsibilities:

- reverse translation for return traffic addressed to an existing inside-global mapping
- DNAT for inbound port-forward matches
- early drop with `no-nat-entry` when outside traffic targets an outside interface address but no
  dynamic or static mapping exists

This phase is required so inbound packets are routed using the translated inside destination.

### Post-routing NAT

Runs after route lookup and after the router egress interface has been resolved.

Responsibilities:

- SNAT / PAT for inside-to-outside traffic
- reuse of an existing SNAT mapping for the same inside-local and outside-peer flow
- reply translation for DNAT-created sessions so internal servers respond from the advertised
  outside address and port
- drop with `no-nat-entry` when traffic attempts to cross from an outside interface to an inside
  interface without a pre-routing NAT match

The existing MAC rewrite and FCS recomputation still happen after NAT.

---

## Runtime Types

```ts
export type NatType = 'snat' | 'dnat';

export interface NatEntry {
  id: string;
  proto: 'tcp' | 'udp';
  type: NatType;
  insideLocalIp: string;
  insideLocalPort: number;
  insideGlobalIp: string;
  insideGlobalPort: number;
  outsidePeerIp: string;
  outsidePeerPort: number;
  createdAt: number;
  lastSeenAt: number;
}

export interface NatTable {
  routerId: string;
  entries: NatEntry[];
}
```

`NatTable.entries` contains active translations only. Static port-forwarding rules are configuration,
not table rows.

---

## `PacketHop` Annotation

Translated router hops expose a `natTranslation` payload:

```ts
export interface NatTranslation {
  type: 'snat' | 'dnat';
  preSrcIp: string;
  preSrcPort: number;
  postSrcIp: string;
  postSrcPort: number;
  preDstIp: string;
  preDstPort: number;
  postDstIp: string;
  postDstPort: number;
}
```

Both source and destination fields are always populated. Unchanged values remain identical across
`pre*` and `post*`.

---

## Translation Rules

### SNAT / PAT

When a packet enters an `inside` interface and leaves an `outside` interface:

1. extract protocol, source address/port, and outside peer address/port
2. reuse an existing entry that matches the inside-local and outside-peer tuple, if present
3. otherwise allocate the next available public port starting at `1024`
4. rewrite source IP to the egress outside-interface IP
5. rewrite source port to the mapped public port
6. zero the IPv4 header checksum so the engine recomputes it

### Reverse traffic for SNAT

When a packet enters an `outside` interface and matches an existing inside-global tuple:

1. rewrite destination IP and port back to the inside-local endpoint
2. update `lastSeenAt`
3. continue route lookup using the translated destination

### DNAT / port forwarding

When a packet enters an `outside` interface and matches a `PortForwardingRule` on the router's
outside-interface address:

1. rewrite destination IP and port to the configured internal endpoint
2. create or update a `dnat` table entry keyed by the remote outside peer
3. zero the IPv4 header checksum so the engine recomputes it

### Reverse traffic for DNAT

When the internal server replies on an inside-to-outside path:

1. look up the `dnat` entry by inside-local and outside-peer tuple
2. rewrite source IP and port to the original external address and port
3. update `lastSeenAt`

---

## Port Allocation

- allocation is deterministic and sequential starting at `1024`
- ports already used by active translations or static `externalPort` rules are skipped
- when no free port remains, the packet is dropped with `nat-port-exhausted`

This implementation supports a single outside address per translated hop and does not model NAT
pool selection.

---

## Packet Mutation Tracking

`PacketHop.changedFields` must include NAT-visible field rewrites using the serializer-stable names:

- `Src IP`
- `Dst IP`
- `Src Port`
- `Dst Port`

Checksum, MAC, and FCS tracking remain unchanged.

---

## Simulation State

`SimulationState` gains:

```ts
interface SimulationState {
  natTables: NatTable[];
}
```

`SimulationEngine` serializes all active `NatProcessor` instances into `state.natTables`. Reset and
clear operations must clear NAT runtime state as well.

---

## UI

### `HopInspector`

When `hop.natTranslation` exists, render a `NAT TRANSLATION` section below `HOP FIELDS`.

- section header uses `--netlab-text-secondary`
- changed `Post` values use `--netlab-accent-green`
- unchanged `Post` values use `--netlab-text-muted`

### `NatTableViewer`

`NatTableViewer` is a zero-prop component that consumes simulation state and renders one router's
active table.

Selection behavior:

- if `NetlabUIContext` is available and a router node is selected, prefer that router's table
- otherwise, if the selected hop belongs to a router with a table, prefer that router
- otherwise, show the first non-empty NAT table
- if no active entries exist anywhere, show `No active NAT entries`

---

## Demo

The NAT demo contains:

- two inside clients on `192.168.1.0/24`
- one NAT edge router with `inside` and `outside` tags
- one upstream router
- one outside server
- controls to trigger an outbound SNAT flow and an inbound DNAT flow

The sidebar composes:

- `NatTableViewer`
- `PacketTimeline`
- `HopInspector`
- simulation controls and NAT-specific send buttons

---

## Limitations

- IPv4 only
- TCP and UDP only
- no ICMP query-id translation
- no translation timeout or eviction
- no hairpin NAT
- no multi-address NAT pool
- no stateful TCP lifecycle tracking beyond tuple reuse
