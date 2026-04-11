# Packet Structure Viewer

> **Status**: ✅ Implemented

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

### L2 — Ethernet Framing (8-byte preamble/SFD + 14-byte Ethernet II header + 4-byte FCS)

**Reference**: [RFC 894](https://www.rfc-editor.org/rfc/rfc894) — Standard for the Transmission of IP Datagrams over Ethernet Networks  
**Implementation note**: For educational completeness, the viewer also includes the IEEE 802.3 preamble/SFD and FCS that are not described by RFC 894.

| Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|----------|------------|----------|
| 0 | 8 | Preamble + SFD | default `aa aa aa aa aa aa aa ab` unless `frame.preamble` is provided |
| 8 | 6 | Dst MAC | Six hex octets from `frame.dstMac` (e.g. `"aa:bb:cc:dd:ee:ff"` → `[0xaa, 0xbb, ...]`) |
| 14 | 6 | Src MAC | Six hex octets from `frame.srcMac` |
| 20 | 2 | EtherType | `frame.etherType` as uint16 big-endian (e.g. `0x0800` for IPv4) |
| end - 4 | 4 | FCS | `frame.fcs` as uint32 big-endian, computed from the frame bytes excluding preamble and FCS |

### L3 — IPv4 Header (20 bytes, fixed, no options)

**Reference**: [RFC 791](https://www.rfc-editor.org/rfc/rfc791) — Internet Protocol §3.1

All offsets below are relative to start of IP header (absolute offset = L2 offset + 22).

| Rel. Offset | Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|-------------|----------|------------|----------|
| 0 | 22 | 1 | Version + IHL | `version=4` plus `ip.ihl ?? 5` |
| 1 | 23 | 1 | DSCP / ECN | `(ip.dscp ?? 0) << 2 \| (ip.ecn ?? 0)` |
| 2 | 24 | 2 | Total Length | `ip.totalLength ?? 20 + L4 byte count` |
| 4 | 26 | 2 | Identification | `ip.identification ?? derived(packet.id)` |
| 6 | 28 | 2 | Flags + Frag Offset | derived from `ip.flags ?? { df: true, mf: false }` and `ip.fragmentOffset ?? 0` |
| 8 | 30 | 1 | TTL | `ip.ttl` |
| 9 | 31 | 1 | Protocol | `ip.protocol` (6 = TCP, 17 = UDP) |
| 10 | 32 | 2 | Header Checksum | `ip.headerChecksum ?? computed checksum` |
| 12 | 34 | 4 | Src IP | four octets from `ip.srcIp` |
| 16 | 38 | 4 | Dst IP | four octets from `ip.dstIp` |

### L4 — TCP Segment Header (20 bytes, no options)

**Reference**: [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) §3.1 — Transmission Control Protocol (supersedes RFC 793)

All offsets relative to start of TCP header (absolute = L2 + L3 offset + 42).

| Rel. Offset | Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|-------------|----------|------------|----------|
| 0 | 42 | 2 | Src Port | `tcp.srcPort` as uint16 BE |
| 2 | 44 | 2 | Dst Port | `tcp.dstPort` as uint16 BE |
| 4 | 46 | 4 | Seq Number | `tcp.seq` as uint32 BE |
| 8 | 50 | 4 | Ack Number | `tcp.ack` as uint32 BE |
| 12 | 54 | 1 | Data Offset + Reserved | fixed `0x50` (data offset = 5 words = 20 bytes) |
| 13 | 55 | 1 | Flags | bitmask: `(urg<<5) \| (ack<<4) \| (psh<<3) \| (rst<<2) \| (syn<<1) \| fin` |
| 14 | 56 | 2 | Window Size | `tcp.windowSize ?? 65535` |
| 16 | 58 | 2 | Checksum | `tcp.checksum ?? 0` |
| 18 | 60 | 2 | Urgent Pointer | `tcp.urgentPointer ?? 0` |

### L4 — UDP Datagram Header (8 bytes)

**Reference**: [RFC 768](https://www.rfc-editor.org/rfc/rfc768) — User Datagram Protocol

All offsets relative to start of UDP header (absolute = L2 + L3 offset + 42).

| Rel. Offset | Abs. Offset | Size (B) | Field Name | Encoding |
|-------------|-------------|----------|------------|----------|
| 0 | 42 | 2 | Src Port | `udp.srcPort` as uint16 BE |
| 2 | 44 | 2 | Dst Port | `udp.dstPort` as uint16 BE |
| 4 | 46 | 2 | Length | `udp.length ?? 8 + payload byte count` |
| 6 | 48 | 2 | Checksum | `udp.checksum ?? 0` |

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

1. Reads `state.selectedPacket` and `state.selectedHop` from `useSimulation()`.
2. If `null` → renders `<EmptyState />`.
3. Otherwise calls `serializePacket(selectedPacket.frame)` → `SerializedPacket`.
4. Highlights fields and bytes named in `selectedHop?.changedFields`.
5. Renders hex dump and field table from the result.

`selectedPacket` is kept in `SimulationState` and populated automatically whenever `step()`, `selectHop()`, `reset()`, or `send()` is called on `SimulationEngine`.

### Layout

```
┌──────────────────────────────────────────────────────┐
│ PACKET STRUCTURE        [L2] [L3] [L4] [L7]  legend  │  ← header + LegendPills
├──────────────────────────────────────────────────────┤
│  HEX DUMP (16 bytes/row, each byte colored by layer) │
│  AA AA AA AA AA AA AA AB  00 00 00 00 00 02 ...       │
│  ... 45 00 00 3C 12 34 40 00 40 06 A1 B2 ...          │
│  ... 12 34 56 78                                       │
│  (hover → tooltip shows field name, changed bytes are outlined) │
├──────────────────────────────────────────────────────┤
│ FIELD DETAILS                                         │
│  [L2] Preamble+SFD aa aa aa aa aa aa aa ab  8B        │
│  [L2] Dst MAC      00:00:00:00:00:02      6B          │
│  [L3] Header Checksum 0xA1B2            2B            │
│  [L2] FCS          0x12345678            4B           │
│  (changed rows are highlighted)                        │
│  ...                                                  │
└──────────────────────────────────────────────────────┘
```

### Sub-components

| Component | Description |
|---|---|
| `EmptyState` | Muted text: "No packet selected — step through the simulation to inspect bytes." |
| `LegendPills` | Inline row of colored layer badges for all layers present in `annotations` |
| `HexDump` | 16-byte rows; each byte `<span>` colored by layer, `title` = field name on hover, changed bytes outlined when the selected hop marks that field as mutated |
| `FieldTable` | Rows: layer badge \| field name \| decoded value \| byte size, with changed rows highlighted when the selected hop marks that field as mutated |

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
