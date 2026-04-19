# Path MTU Discovery (PMTUD)

> **Status**: 🚧 Planned (educational RFC 1191 subset)

Netlab models a small, education-focused subset of IPv4 Path MTU Discovery for TCP traffic.
Routers already enforce per-hop MTU and emit ICMP Destination Unreachable, code 4
("Fragmentation Needed") when a `DF=1` packet is too large for the selected egress path. PMTUD is
the host-side consumer for that signal: the sender learns the reported MTU, caches it per
destination, and shrinks later TCP payload chunks so the path stops dropping them.

This document describes the intended PMTUD behavior for `plan/34.md`.

## Overview

- TCP packets are emitted with `IP.flags.df = true` by default.
- Each host keeps a per-destination Path MTU cache keyed by destination IP.
- When an ICMP type `3`, code `4` packet returns to the sender, the host reads the reported
  next-hop MTU from `IcmpMessage.sequenceNumber`.
- The quoted packet bytes inside the ICMP `data` field identify the original destination IP.
- `DataTransferController` consults the cache before each chunk send and clamps the payload size to
  `min(DEFAULT_CHUNK_SIZE, pathMtu - 20 - 20)`.
- On a previously unknown low-MTU path, the first oversized TCP send drops and teaches the cache;
  the next chunk send uses the smaller MSS-sized payload and succeeds.

## Data Model

### `PathMtuCache`

```typescript
export const IPV4_DEFAULT_PMTU = 1500;
export const IPV4_MIN_PMTU = 68;

export class PathMtuCache {
  get(dstIp: string): number;
  update(dstIp: string, nextHopMtu: number): void;
  clear(): void;
  snapshot(): Record<string, number>;
  size(): number;
}
```

- `get()` returns `1500` when the destination is not cached.
- `update()` only decreases an existing entry; it never increases a cached PMTU.
- `update()` clamps values below `68` up to `68` and ignores non-positive input.
- The cache is in-memory only and owned per source host.

### `FragNeededSignal`

```typescript
export interface FragNeededSignal {
  originalDstIp: string;
  nextHopMtu: number;
}
```

- `nextHopMtu` comes from `IcmpMessage.sequenceNumber`.
- `originalDstIp` is decoded from the quoted IPv4 header bytes carried in the ICMP `data` field.

## Algorithm

### 1. TCP emits `DF=1`

All TCP packets produced by the shared packet builder carry:

```typescript
flags: { df: true, mf: false }
```

That matches the educational PMTUD model: routers must not fragment TCP traffic on behalf of the
sender.

### 2. Routers report the constraining MTU

When an oversized IPv4 packet reaches a lower-MTU routed egress and `DF=1`:

1. The router drops the packet.
2. The trace records `reason = "fragmentation-needed"`.
3. The router generates ICMP type `3`, code `4`.
4. `IcmpMessage.sequenceNumber` carries the next-hop MTU.
5. `IcmpMessage.data` carries the original IPv4 header plus the first 8 bytes of transport bytes,
   stored as a raw byte string.

### 3. The source host updates its PMTU cache

`SimulationEngine` inspects delivered traces, finds ICMP Frag-Needed packets, maps the returning
packet's destination IP back to the receiving host, and updates that host's `PathMtuCache` using
the original destination IP as the cache key.

### 4. Data transfer re-evaluates chunk size per chunk

`DataTransferController` computes an effective payload cap before each chunk send:

```typescript
effectiveChunkSize = min(configuredChunkSize, max(1, pathMtu - 20 - 20));
```

- Unknown PMTU behaves as `Infinity`, so existing behavior remains unchanged.
- A cached PMTU of `600` yields a TCP payload limit of `560`.
- The remaining unsent payload is re-split before every chunk send so a newly learned PMTU affects
  the next attempt immediately.

## Convergence Property

For the demo topology with a `600`-byte routed bottleneck:

1. First transfer attempt sends a `1400`-byte TCP payload chunk and drops with ICMP Frag-Needed.
2. The sender caches `600` for that destination.
3. The next chunk send uses `560` bytes and delivers.
4. Subsequent transfers to the same destination start at `560` bytes and avoid further drops until
   the topology changes.

## Cache Lifetime

- Cache scope is per host, keyed by destination IP.
- Cache contents are stored only in the running `SimulationEngine`.
- Cache is cleared on topology change or when a new engine instance replaces the old one.
- There is no PMTU aging or periodic re-probing.

## Educational Simplifications

- No RFC 4821 packetization-layer PMTUD probes.
- No black-hole detection for ICMP-filtering paths.
- No per-flow PMTU tracking; the cache is keyed only by destination IP.
- No IPv6 Packet Too Big support.
- No TCP MSS option negotiation; `DataTransferController` derives an MSS-like cap from the cached
  PMTU instead.

## Related Specs

- [MTU & IPv4 Fragmentation](mtu-fragmentation.md)
- [L4 – Transport Layer](layers/l4-transport.md)
