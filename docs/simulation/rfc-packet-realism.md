# RFC Packet Realism

This document specifies the packet-model and hop-mutation changes needed to make packet inspection more faithful to Ethernet and IPv4 behavior during simulation playback.

---

## Overview

The simulation already models the encapsulation chain `EthernetFrame -> IpPacket -> TcpSegment/UdpDatagram -> payload`, but several protocol fields are still missing from the type system and packet mutations stop at TTL decrement. This feature closes that gap in two ways:

- packet types gain optional RFC-relevant fields so the packet model can represent what the serializer already displays
- the simulation engine mutates packets at each router boundary so MAC addresses, IPv4 header checksum, and Ethernet FCS change as the packet moves hop by hop

The goal is realism for inspection and teaching, not bit-perfect wire emulation of every corner case.

---

## Data Model

### `EthernetFrame`

```ts
interface EthernetFrame {
  layer: 'L2';
  preamble?: number[];
  srcMac: string;
  dstMac: string;
  etherType: number;
  payload: IpPacket;
  fcs?: number;
}
```

- `preamble` defaults to `0xaa` repeated 7 times plus `0xab` for the start frame delimiter
- `fcs` stores the computed IEEE 802.3 CRC-32 of the frame bytes excluding preamble and FCS

### `IpPacket`

```ts
interface IpPacket {
  layer: 'L3';
  ihl?: number;
  dscp?: number;
  ecn?: number;
  totalLength?: number;
  identification?: number;
  flags?: { df: boolean; mf: boolean };
  fragmentOffset?: number;
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: number;
  headerChecksum?: number;
  payload: TcpSegment | UdpDatagram;
}
```

Default policy:

- `ihl`: `5`
- `dscp`: `0`
- `ecn`: `0`
- `flags`: `{ df: true, mf: false }`
- `fragmentOffset`: `0`
- `identification`: stable per packet, materialized once if omitted
- `totalLength`: derived from the serialized L4 + payload size when omitted
- `headerChecksum`: computed from the materialized IPv4 header

### `TcpSegment`

```ts
interface TcpSegment {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  seq: number;
  ack: number;
  flags: TcpFlags;
  windowSize?: number;
  checksum?: number;
  urgentPointer?: number;
  payload: HttpMessage | RawPayload;
}
```

Defaults:

- `windowSize`: `65535`
- `checksum`: `0`
- `urgentPointer`: `0`

### `UdpDatagram`

```ts
interface UdpDatagram {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  length?: number;
  checksum?: number;
  payload: RawPayload;
}
```

Defaults:

- `length`: `8 + payload byte length`
- `checksum`: `0`

TCP and UDP checksum values remain simulated placeholders in this iteration. They are displayed, serialized, and stored, but not derived from a pseudo-header.

### `PacketHop`

```ts
interface PacketHop {
  changedFields?: string[];
}
```

`changedFields` stores field names exactly as they appear in `AnnotatedField.name`, such as:

- `TTL`
- `Header Checksum`
- `Src IP`
- `Dst IP`
- `Src Port`
- `Dst Port`
- `Src MAC`
- `Dst MAC`
- `FCS`

---

## Packet Materialization

`SimulationEngine.precompute()` materializes stable packet defaults before storing the step-0 snapshot. That normalization pass:

- fills missing IPv4, TCP, and UDP defaults
- derives a stable IPv4 `identification` from `InFlightPacket.id`
- computes the initial IPv4 header checksum
- resolves endpoint MAC addresses from topology metadata when packet creation omitted them
- computes the initial Ethernet FCS

This ensures the create hop already shows a realistic packet in `HopInspector` and `PacketStructureViewer`.

---

## Router-Hop Mutation Rules

### IPv4 TTL and Header Checksum

`RouterForwarder.receive()` remains the owner of TTL mutation:

1. if `ttl <= 1`, drop with `ttl-exceeded`
2. otherwise decrement TTL by 1
3. rebuild the IPv4 header with the checksum field zeroed
4. compute and store the new IPv4 header checksum

This keeps the packet object internally consistent before the next hop is resolved.

### Ethernet MAC Rewrite

`SimulationEngine` performs MAC rewrite after router forwarding, because only the engine knows both:

- the router egress interface chosen for the hop
- the effective downstream L2 destination on the egress segment

Rules:

1. `Src MAC` becomes the egress router interface MAC.
2. `Dst MAC` becomes the effective downstream router or endpoint MAC on that broadcast domain.
3. If the immediate neighbor is a switch, the engine walks through transparent switches until it finds the downstream router or endpoint that actually owns the destination MAC.
4. If an endpoint has no explicit `data.mac`, the engine derives a deterministic locally administered MAC from the node id.
5. If resolution fails because of incomplete topology metadata, the existing MAC value is preserved instead of using broadcast.

### Ethernet FCS

After all mutations for that hop are complete, the engine recomputes `frame.fcs` from the full Ethernet frame bytes excluding preamble and FCS.

---

## Serialization Requirements

`src/utils/packetSerializer.ts` must serialize the packet model as materialized, not from hardcoded placeholder constants.

Requirements:

- prepend the 8-byte preamble and SFD
- serialize Ethernet header, IPv4 header, L4 header, and payload using actual field values or documented defaults
- append the 4-byte FCS
- expose `AnnotatedField` entries for `Preamble + SFD` and `FCS`
- shift all downstream byte offsets to account for the preamble
- keep field names stable so `PacketHop.changedFields` can reference serializer output directly

---

## UI Behavior

### `HopInspector`

When `hop.changedFields` is non-empty, show a `MUTATED FIELDS` section with compact badges.

### `PacketStructureViewer`

For the selected hop:

- field-table rows whose names appear in `changedFields` use a highlighted background
- hex-dump bytes belonging to changed fields use a highlighted outline
- preamble and FCS bytes appear in the dump and field table as L2 data

---

## Validation

Implementation is not complete unless all of the following are true:

- checksum utilities have direct unit coverage
- router-forwarding tests verify checksum changes after TTL decrement
- simulation-engine tests verify step-0 materialization, router MAC rewrite, transparent-switch handling, and changed-field tracking
- serializer tests verify preamble/FCS placement and display of materialized field values
- the packet structure viewer spec matches the actual serialized offsets after the preamble shift
