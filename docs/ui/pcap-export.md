# PCAP Export

> **Status**: ⚠️ Experimental

This document specifies how netlab exports a single `PacketTrace` as a browser-downloaded libpcap (`.pcap`) file that Wireshark and tcpdump can open directly.

---

## Overview

Netlab already stores a byte-accurate `InFlightPacket` snapshot for every hop in `SimulationEngine.packetSnapshots`. PCAP export reuses that in-memory trace data and exposes it through:

- a pure serializer utility at `src/utils/pcapSerializer.ts`
- `SimulationEngine.exportPcap(traceId?)`
- `SimulationContext.exportPcap(traceId?)`
- a `Download PCAP` button in `PacketTimeline`

The feature is fully client-side. No server round-trip or asynchronous file generation is required.

---

## File Format

The exported file uses classic libpcap with:

- little-endian header encoding
- microsecond timestamp precision
- `LINKTYPE_ETHERNET` (`network = 1`)

### Global Header

The file starts with one 24-byte global header:

| Offset | Length | Field         | Value                     |
| ------ | -----: | ------------- | ------------------------- |
| 0      |      4 | magic_number  | `0xa1b2c3d4`              |
| 4      |      2 | version_major | `2`                       |
| 6      |      2 | version_minor | `4`                       |
| 8      |      4 | thiszone      | `0`                       |
| 12     |      4 | sigfigs       | `0`                       |
| 16     |      4 | snaplen       | `65535`                   |
| 20     |      4 | network       | `1` (`LINKTYPE_ETHERNET`) |

### Per-Packet Record Header

Each captured frame is emitted as:

- 16-byte record header
- followed immediately by the serialized Ethernet frame bytes

| Offset | Length | Field       | Value                          |
| ------ | -----: | ----------- | ------------------------------ |
| 0      |      4 | ts_sec      | Unix seconds                   |
| 4      |      4 | ts_usec     | microseconds within the second |
| 8      |      4 | incl_len    | captured byte length           |
| 12     |      4 | orig_len    | original byte length           |
| 16     |      N | packet data | Ethernet frame bytes           |

### Timestamp Derivation

`PacketHop.timestamp` is stored in milliseconds. For each exported record:

1. Start with `timestampMs = hop.timestamp`
2. Compute `baseUsec = (timestampMs % 1000) * 1000 + hop.step * 1000`
3. Carry overflow into seconds so `ts_usec < 1_000_000`

This preserves hop order even when multiple hops share the same millisecond timestamp.

---

## Frame Bytes

### Ethernet Frames

PCAP record data stores the Ethernet frame beginning at the destination MAC address.

The export therefore includes:

- destination MAC
- source MAC
- EtherType
- network / transport / application payload bytes

The export does **not** include:

- Ethernet preamble / SFD
- trailing FCS

Those fields are useful for netlab's packet structure viewer but are not part of the standard bytes expected by Wireshark for `LINKTYPE_ETHERNET`.

### Included Hop Types

The export includes all hops in the selected trace:

- regular IPv4 create / forward / deliver hops
- ARP request and ARP reply hops
- drop hops

For regular and drop hops, bytes come from the per-hop `InFlightPacket` snapshot. For ARP hops, bytes come from `PacketHop.arpFrame`.

---

## Serializer API

`src/utils/pcapSerializer.ts` defines:

```ts
export interface PcapRecord {
  hop: PacketHop;
  frame: EthernetFrame | ArpEthernetFrame;
}

export function buildPcap(records: PcapRecord[]): Uint8Array;
```

### Behavior

- `buildPcap([])` returns a valid 24-byte PCAP containing only the global header
- record order is preserved exactly as provided
- every record uses `incl_len === orig_len`
- no record padding is inserted

---

## Simulation Engine Integration

`SimulationEngine.exportPcap(traceId?)` exports one trace at a time.

### Trace Selection

- when `traceId` is provided, that trace is exported
- when omitted, the engine exports `state.currentTraceId`

### Missing Trace Handling

If no matching trace exists, the method returns an empty-but-valid PCAP containing only the 24-byte global header.

### ARP Priority

If a hop has `hop.arpFrame`, that frame is exported even if a same-index packet snapshot also exists.

---

## React Integration

`SimulationContextValue` exposes:

```ts
exportPcap: (traceId?: string) => Uint8Array;
```

The context callback is synchronous and forwards directly to `SimulationEngine.exportPcap()`.

---

## PacketTimeline UI

`PacketTimeline` renders a `Download PCAP` button in the header area beside the trace selector.

### Button Rules

- enabled only when `state.currentTraceId` is set
- disabled when no trace is selected
- uses `exportPcap(state.currentTraceId ?? undefined)` on click

### Download Behavior

The component creates a browser download using:

- `Blob`
- `URL.createObjectURL`
- a temporary `<a>` element

### File Naming

Downloaded files use:

```text
netlab-trace-<traceId>.pcap
```

When no explicit trace id is available during a manual fallback path, use `netlab-trace-export.pcap`.

### MIME Type

The download uses:

```text
application/vnd.tcpdump.pcap
```

---

## Validation Notes

Manual validation should confirm:

- Wireshark opens the exported file without error
- ARP exchanges appear as separate frames
- routed traces show TTL changes across forwarded frames
- dropped traces still include the final seen-on-wire frame

---

## Sandbox Mode

Sandbox PCAP export is implemented in `src/sandbox/pcap/exportSandboxPcap.ts` and surfaces through:

- a **PCAP** button in the `SandboxPanel` header
- per-track **PCAP** buttons in `DiffTimeline`

### α (Live) Mode

A single button downloads the current what-if trace as a classic libpcap file:

```text
netlab-sandbox-{scenarioId}-{stamp}.pcap
```

### β (Compare) Mode

The panel header shows a branch selector (`What-if`, `Baseline`, `Combined`) next to the **PCAP** button. `DiffTimeline` adds per-track buttons for `baseline` and `whatif`, plus a `Combined` button in the header row.

| Selection  | Output              | Format                               |
| ---------- | ------------------- | ------------------------------------ |
| `What-if`  | what-if trace only  | classic libpcap                      |
| `Baseline` | baseline trace only | classic libpcap                      |
| `Combined` | both traces, tagged | **pcapng** with EPB `Comment` option |

#### Combined pcapng Format

The combined file follows the [pcapng specification](https://www.ietf.org/archive/id/draft-tuexen-opsawg-pcapng-05.txt):

1. Section Header Block (SHB) — 28 bytes, little-endian
2. Interface Description Block (IDB) — 20 bytes, `LINKTYPE_ETHERNET`
3. Enhanced Packet Blocks (EPB) — one per hop, with an `opt_comment` (option code 1) containing either `"baseline"` or `"whatif"`

Wireshark 4.x reads the `opt_comment` field in the packet detail pane. The tag identifies which simulation branch each frame came from.

#### Safari < 16 Fallback

Older Safari versions do not reliably parse pcapng `Comment` options. When Safari < 16 is detected via `navigator.userAgent`, the export falls back to two separate classic libpcap files:

```text
netlab-sandbox-{scenarioId}-baseline-{stamp}.pcap
netlab-sandbox-{scenarioId}-whatif-{stamp}.pcap
```

### Frame Limit

Each export is capped at **10,000 frames**. If the trace exceeds this limit, the `SandboxPcapExport.truncated` flag is `true` and only the first 10,000 frames are written.

### Hook

`sandbox:pcap-exported` is emitted after every successful download:

```ts
hookEngine.emit('sandbox:pcap-exported', {
  branch: 'alpha' | 'baseline' | 'whatif' | 'combined',
  bytes: number, // total bytes across all downloaded files
});
```

### Sandbox Serializer API

`src/sandbox/pcap/exportSandboxPcap.ts` defines:

```ts
export type PcapBranch = 'alpha' | 'baseline' | 'whatif' | 'combined';

export interface SandboxPcapExport {
  blob: Blob;
  filename: string;
  truncated: boolean;
}

export function exportSandboxPcap(
  engine: BranchedSimulationEngine,
  branch: PcapBranch,
  opts: { scenarioId: string; now?: Date },
): SandboxPcapExport[];
```

---

## Limitations

- only one trace is exported per file (sandbox combined exports two, tagged via pcapng)
- TraceInspector export emits classic libpcap; sandbox combined export emits pcapng
- export is based on stored simulation snapshots; it does not capture live playback timing
