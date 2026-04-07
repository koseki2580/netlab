# Packet Structure Viewer

> **Implementation note**: All byte-level protocol encodings in this specification and in `src/utils/packetSerializer.ts` are derived directly from the authoritative RFCs listed in each section.

## Overview

The Packet Structure Viewer is an educational UI panel that exposes the raw byte representation of any selected simulation packet. It color-codes each byte by its OSI layer and shows a field-by-field breakdown with decoded values, making encapsulation concrete and inspectable for learners.

---

## Data Model

Implemented in `src/utils/packetSerializer.ts`.

### `LayerTag`

```typescript
export type LayerTag = 'L2' | 'L3' | 'L4' | 'L7' | 'raw';
```

### `AnnotatedField`

Describes one protocol field and its position in the byte array.

```typescript
export interface AnnotatedField {
  name: string;         // human-readable field name, e.g. "Dst MAC"
  layer: LayerTag;      // which layer this field belongs to
  byteOffset: number;   // absolute offset from start of the Ethernet frame
  byteLength: number;   // number of bytes this field occupies
  displayValue: string; // decoded human-readable value, e.g. "00:00:00:00:00:02"
}
```

### `SerializedPacket`

The output of `serializePacket(frame: EthernetFrame)`.

```typescript
export interface SerializedPacket {
  bytes: Uint8Array;         // raw byte sequence of the full frame
  annotations: LayerTag[];   // parallel array: annotations[i] = layer of byte i
  fields: AnnotatedField[];  // ordered list of all fields (no gaps, no overlaps)
}
```

---

## Byte Encoding

### L2 — Ethernet II Header (14 bytes)

**Reference**: [RFC 894](https://www.rfc-editor.org/rfc/rfc894) — Standard for the Transmission of IP Datagrams over Ethernet Networks

| Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|----------|------------|----------|
| 0 | 6 | Dst MAC | Six hex octets from `frame.dstMac` (e.g. `"aa:bb:cc:dd:ee:ff"` → `[0xaa, 0xbb, ...]`) |
| 6 | 6 | Src MAC | Six hex octets from `frame.srcMac` |
| 12 | 2 | EtherType | `frame.etherType` as uint16 big-endian (e.g. `0x0800` for IPv4) |

### L3 — IPv4 Header (20 bytes, fixed, no options)

**Reference**: [RFC 791](https://www.rfc-editor.org/rfc/rfc791) — Internet Protocol §3.1

All offsets below are relative to start of IP header (absolute offset = L2 offset + 14).

| Rel. Offset | Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|-------------|----------|------------|----------|
| 0 | 14 | 1 | Version + IHL | fixed `0x45` (version=4, IHL=5 × 4B = 20B) |
| 1 | 15 | 1 | DSCP / ECN | fixed `0x00` |
| 2 | 16 | 2 | Total Length | uint16 BE = 20 + L4 byte count |
| 4 | 18 | 2 | Identification | fixed `0x0000` |
| 6 | 20 | 2 | Flags + Frag Offset | fixed `0x4000` (DF bit set, no fragmentation) |
| 8 | 22 | 1 | TTL | `ip.ttl` |
| 9 | 23 | 1 | Protocol | `ip.protocol` (6 = TCP, 17 = UDP) |
| 10 | 24 | 2 | Header Checksum | fixed `0x0000` (not computed in simulation) |
| 12 | 26 | 4 | Src IP | four octets from `ip.srcIp` |
| 16 | 30 | 4 | Dst IP | four octets from `ip.dstIp` |

### L4 — TCP Segment Header (20 bytes, no options)

**Reference**: [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) §3.1 — Transmission Control Protocol (supersedes RFC 793)

All offsets relative to start of TCP header (absolute = L2 + L3 offset + 34).

| Rel. Offset | Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|-------------|----------|------------|----------|
| 0 | 34 | 2 | Src Port | `tcp.srcPort` as uint16 BE |
| 2 | 36 | 2 | Dst Port | `tcp.dstPort` as uint16 BE |
| 4 | 38 | 4 | Seq Number | `tcp.seq` as uint32 BE |
| 8 | 42 | 4 | Ack Number | `tcp.ack` as uint32 BE |
| 12 | 46 | 1 | Data Offset + Reserved | fixed `0x50` (data offset = 5 words = 20 bytes) |
| 13 | 47 | 1 | Flags | bitmask: `(urg<<5) \| (ack<<4) \| (psh<<3) \| (rst<<2) \| (syn<<1) \| fin` |
| 14 | 48 | 2 | Window Size | fixed `0xFFFF` |
| 16 | 50 | 2 | Checksum | fixed `0x0000` |
| 18 | 52 | 2 | Urgent Pointer | fixed `0x0000` |

### L4 — UDP Datagram Header (8 bytes)

**Reference**: [RFC 768](https://www.rfc-editor.org/rfc/rfc768) — User Datagram Protocol

All offsets relative to start of UDP header (absolute = L2 + L3 offset + 34).

| Rel. Offset | Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|-------------|----------|------------|----------|
| 0 | 34 | 2 | Src Port | `udp.srcPort` as uint16 BE |
| 2 | 36 | 2 | Dst Port | `udp.dstPort` as uint16 BE |
| 4 | 38 | 2 | Length | uint16 BE = 8 + payload byte count |
| 6 | 40 | 2 | Checksum | fixed `0x0000` |

### L7 — Application Payload (variable)

**Reference for HTTP/1.1**: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) (HTTP Semantics) + [RFC 9112](https://www.rfc-editor.org/rfc/rfc9112) (HTTP/1.1 Message Syntax)

| Payload type | Encoding | Layer tag |
|---|---|---|
| `RawPayload` | UTF-8 encode `.data` string | `'raw'` |
| `HttpMessage` | UTF-8 encode `"METHOD URL HTTP/1.1\r\n" + headers + "\r\n\r\n" + body` | `'L7'` |

---

## Layer Color Palette

Consistent with the existing event badge colors in `PacketViewer` and `StepControls`.

| Layer | Color | Hex |
|-------|-------|-----|
| L2 Ethernet | sky-300 | `#7dd3fc` |
| L3 IPv4 | violet-400 | `#a78bfa` |
| L4 TCP / UDP | green-400 | `#4ade80` |
| L7 Application | pink-400 | `#f472b6` |
| raw | slate-400 | `#94a3b8` |

---

## `PacketStructureViewer` Component

**File**: `src/components/simulation/PacketStructureViewer.tsx`

### Data flow

1. Reads `state.selectedPacket` from `useSimulation()`.
2. If `null` → renders `<EmptyState />`.
3. Otherwise calls `serializePacket(selectedPacket.frame)` → `SerializedPacket`.
4. Renders hex dump and field table from the result.

`selectedPacket` is kept in `SimulationState` and populated automatically whenever `step()`, `selectHop()`, `reset()`, or `send()` is called on `SimulationEngine`.

### Layout

```
┌──────────────────────────────────────────────────────┐
│ PACKET STRUCTURE        [L2] [L3] [L4] [L7]  legend  │  ← header + LegendPills
├──────────────────────────────────────────────────────┤
│  HEX DUMP (16 bytes/row, each byte colored by layer) │
│  00 00 00 00 00 02  00 00 00 00 00 01  08 00          │
│  45 00 00 3c 00 00  40 00 40 06 00 00                 │
│  0a 00 00 0a  cb 00 71 0a  ...                        │
│  (hover → tooltip shows field name)                   │
├──────────────────────────────────────────────────────┤
│ FIELD DETAILS                                         │
│  [L2] Dst MAC      00:00:00:00:00:02   6B             │
│  [L2] Src MAC      00:00:00:00:00:01   6B             │
│  [L2] EtherType    0x0800              2B             │
│  [L3] Version+IHL  0x45                1B             │
│  [L3] TTL          64                  1B             │
│  ...                                                  │
└──────────────────────────────────────────────────────┘
```

### Sub-components

| Component | Description |
|---|---|
| `EmptyState` | Muted text: "No packet selected — step through the simulation to inspect bytes." |
| `LegendPills` | Inline row of colored layer badges for all layers present in `annotations` |
| `HexDump` | 16-byte rows; each byte `<span>` colored by layer, `title` = field name on hover |
| `FieldTable` | Rows: layer badge \| field name \| decoded value \| byte size |

### Container dimensions

```typescript
height: 320, overflowY: 'auto', flexShrink: 0,
borderTop: '1px solid #1e293b', padding: '10px 12px',
background: '#0f172a', fontFamily: 'monospace', color: '#e2e8f0',
```

Hex dump caps at **512 bytes** for DOM performance (a `+N more bytes…` indicator is appended if truncated). The `SerializedPacket` always contains the full byte array.

---

## `SimulationState` Change

`selectedPacket: InFlightPacket | null` is added to `SimulationState` in `src/types/simulation.ts`.

Lifecycle:

| Engine method | `selectedPacket` after call |
|---|---|
| `send()` | `null` |
| `step()` | `InFlightPacket` snapshot for the advanced step |
| `selectHop(n)` | `InFlightPacket` snapshot for step `n` |
| `reset()` | `null` |

---

## Integration

`PacketStructureViewer` is rendered in `demo/simulation/StepSimDemo.tsx` below `StepControls` inside the resizable sidebar:

```tsx
<ResizableSidebar defaultWidth={480} maxWidth={700} ...>
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <StepControls />
    </div>
    <PacketStructureViewer />
  </div>
</ResizableSidebar>
```

---

## Public API

Exported from `src/index.ts`:

```typescript
export { PacketStructureViewer } from './components/simulation/PacketStructureViewer';
export { serializePacket } from './utils/packetSerializer';
export type { LayerTag, AnnotatedField, SerializedPacket } from './utils/packetSerializer';
```
