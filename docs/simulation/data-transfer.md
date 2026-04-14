# Data Transfer Simulation

> **Status**: 📝 Planned

This document specifies an application-level data transfer layer for Netlab simulations. The feature sits above the existing packet, trace, and session systems and models chunked message delivery, receiver-side reassembly, integrity verification, and per-hop packet inspection.

---

## Overview

The goal is educational clarity rather than a full transport-stack implementation.

The simulation should demonstrate:

- IP addresses identify endpoints end to end
- MAC addresses are rewritten at each L2 hop
- large payloads are split into multiple packets before transmission
- the receiver must collect all chunks before delivery is complete
- checksum verification confirms whether the reassembled payload matches the original

This feature is intentionally higher-level than `PacketTrace` and `NetworkSession`. It orchestrates multiple packet sends through the existing forwarding pipeline and exposes transfer-level progress as its own state model.

Layering:

```text
DataTransferController
  -> SessionTracker
  -> SimulationEngine
  -> ForwardingPipeline
  -> EthernetFrame / IpPacket / TcpSegment / UdpDatagram
```

---

## Data Model

### `DeliveryStatus`

```ts
export type DeliveryStatus =
  | 'pending'
  | 'in-progress'
  | 'delivered'
  | 'partial'
  | 'failed';
```

### `TransferMessage`

```ts
export interface TransferMessage {
  messageId: string;
  srcNodeId: string;
  dstNodeId: string;
  protocol: string;
  payloadPreview: string;
  payloadData: string;
  payloadSizeBytes: number;
  checksum: string;
  expectedChunks: number;
  status: DeliveryStatus;
  createdAt: number;
  completedAt?: number;
}
```

### `ChunkDeliveryState`

```ts
export type ChunkDeliveryState =
  | 'pending'
  | 'in-flight'
  | 'delivered'
  | 'dropped';
```

### `TransferChunk`

```ts
export interface TransferChunk {
  chunkId: string;
  messageId: string;
  sequenceNumber: number;
  totalChunks: number;
  data: string;
  sizeBytes: number;
  state: ChunkDeliveryState;
  traceId?: string;
}
```

### `ReassemblyState`

```ts
export interface ReassemblyState {
  messageId: string;
  receivedChunks: Map<number, TransferChunk>;
  expectedTotal: number;
  isComplete: boolean;
  reassembledPayload?: string;
  reassembledChecksum?: string;
  checksumVerified?: boolean;
}
```

### `DataTransferState`

```ts
export interface DataTransferState {
  transfers: Map<string, TransferMessage>;
  chunks: Map<string, TransferChunk[]>;
  reassembly: Map<string, ReassemblyState>;
  selectedTransferId: string | null;
}
```

Design notes:

- `TransferMessage` is separate from `NetworkSession` because the transfer lifecycle is multi-chunk and not request/response-shaped
- chunk payloads are modeled as strings for easy display and deterministic hashing
- each chunk links to a `PacketTrace` through `traceId`, so transfer inspection can reuse existing trace UI

---

## Controller API

### `DataTransferOptions`

```ts
export interface DataTransferOptions {
  chunkSize?: number;
  chunkDelay?: number;
  srcPort?: number;
  dstPort?: number;
  failureState?: FailureState;
}
```

### `DataTransferController`

```ts
export class DataTransferController {
  constructor(engine: SimulationEngine)

  async startTransfer(
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ): Promise<TransferMessage>

  getState(): DataTransferState
  getTransfer(messageId: string): TransferMessage | undefined
  getChunks(messageId: string): TransferChunk[]
  getReassembly(messageId: string): ReassemblyState | undefined
  clear(): void
  subscribe(listener: (state: DataTransferState) => void): () => void
}
```

`startTransfer()` is responsible for:

1. computing the message checksum
2. splitting the payload into application-level chunks
3. building one packet per chunk
4. sending or precomputing each chunk trace through the existing simulation engine
5. updating reassembly state at the destination
6. marking the final transfer status after checksum verification or failure detection

---

## Transfer Lifecycle

```text
pending -> in-progress -> delivered  (all chunks received and checksum matches)
                       -> partial    (some chunks delivered, some missing/dropped)
                       -> failed     (all chunks dropped or checksum mismatch)
```

Rules:

- a transfer starts in `pending`
- once chunk sending begins, the transfer moves to `in-progress`
- `delivered` requires every chunk plus a successful checksum comparison after reassembly
- `partial` means at least one chunk arrived but the full payload is incomplete
- `failed` means nothing arrived or the final checksum does not match

---

## Chunk Lifecycle

```text
pending -> in-flight -> delivered
                    -> dropped
```

Rules:

- all chunks are created in `pending`
- a chunk moves to `in-flight` when its packet is being processed
- a delivered trace marks the chunk `delivered`
- a dropped trace marks the chunk `dropped`

Each chunk is independent at the transfer layer. This is application-level chunking, not IP fragmentation.

---

## Reassembly Logic

The receiver tracks a `ReassemblyState` per transfer.

Algorithm:

1. initialize `receivedChunks` as an empty `Map<number, TransferChunk>`
2. when a chunk is delivered, store it by `sequenceNumber`
3. once `receivedChunks.size === expectedTotal`, sort by `sequenceNumber`
4. concatenate chunk `data` to produce `reassembledPayload`
5. compute `reassembledChecksum`
6. compare the reassembled checksum with the sender checksum

Outcome rules:

- if all chunks arrive and the checksums match, the transfer is `delivered`
- if some chunks are missing, the transfer is `partial`
- if all chunks fail or the final checksum differs, the transfer is `failed`

The checksum is an educational integrity signal. It demonstrates end-to-end verification, not security.

---

## React Integration

React integration is provided by `DataTransferProvider` and `useDataTransfer()`.

Expected context shape:

```ts
interface DataTransferContextValue {
  controller: DataTransferController;
  state: DataTransferState;
  startTransfer: (
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ) => Promise<TransferMessage>;
  getChunks: (messageId: string) => TransferChunk[];
  getReassembly: (messageId: string) => ReassemblyState | undefined;
  clear: () => void;
  selectedTransferId: string | null;
  selectTransfer: (messageId: string | null) => void;
}
```

Provider hierarchy:

```tsx
<NetlabProvider topology={topology}>
  <FailureProvider>
    <SimulationProvider>
      <SessionProvider>
        <DataTransferProvider>
          <App />
        </DataTransferProvider>
      </SessionProvider>
    </SimulationProvider>
  </FailureProvider>
</NetlabProvider>
```

The provider owns a `DataTransferController`, subscribes to controller updates, exposes transfer state to React consumers, and keeps transfer selection separate from packet-trace selection.

---

## Per-Hop Behavior

This feature does not change forwarding behavior.

Per-hop packet mutation is still owned by the existing simulation stack:

- routing decisions and next-hop selection
- TTL decrement
- MAC rewrite per routed hop
- IPv4 header checksum and Ethernet FCS recomputation
- `PacketHop.changedFields[]` annotations

See [RFC Packet Realism](rfc-packet-realism.md) for the forwarding and mutation rules that the transfer feature relies on.

The data transfer layer consumes those existing traces to teach:

- source and destination IP remain constant end to end
- source and destination MAC change hop by hop
- each chunk has its own independent packet trace

---

## Demo Usage

The planned demo topology is a four-node chain:

```text
Server A -> Router 1 -> Router 2 -> Server B
```

The demo should support:

1. single-chunk delivery with a short default payload
2. multi-chunk delivery by reducing chunk size or increasing payload size
3. failure injection so some chunks drop and reassembly remains incomplete
4. chunk-to-trace selection so clicking a chunk opens the existing hop inspector for that packet

The UI should expose:

- transfer controls for payload and chunk size
- a list of transfers
- per-transfer chunk state
- reassembly status and checksum result
- the existing packet trace inspector for hop-by-hop behavior

---

## Constraints

This feature intentionally stays within the following boundaries:

- chunking is application-level only
- IP fragmentation and reassembly are deferred
- the checksum is an educational integrity check, not a cryptographic security feature
- this does not introduce a real TCP state machine, retransmission, flow control, or congestion control
- payloads are modeled as strings instead of arbitrary binary buffers

Deferred work:

- IP fragmentation support based on IPv4 `mf` / `fragmentOffset`
- richer L4 transport semantics
- binary file-transfer payload modeling
