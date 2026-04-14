import type { FailureState } from '../types/failure';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import type { InFlightPacket } from '../types/packets';
import type { PacketTrace } from '../types/simulation';
import type {
  DataTransferState,
  ReassemblyState,
  TransferChunk,
  TransferMessage,
} from '../types/transfer';
import { sha256Hex } from '../utils/hash';
import type { SimulationEngine } from './SimulationEngine';

const DEFAULT_CHUNK_SIZE = 1400;
const DEFAULT_CHUNK_DELAY = 100;
const DEFAULT_SRC_PORT = 49152;
const DEFAULT_DST_PORT = 8080;
const PAYLOAD_PREVIEW_LIMIT = 80;
const PLACEHOLDER_SRC_MAC = '00:00:00:00:00:01';
const PLACEHOLDER_DST_MAC = '00:00:00:00:00:02';
const textEncoder = new TextEncoder();

interface ForwardingPipelineLike {
  findNode(nodeId: string): unknown;
  getEffectiveNodeIp(node: unknown): string | undefined;
}

type DataTransferListener = (state: DataTransferState) => void;

export interface DataTransferOptions {
  chunkSize?: number;
  chunkDelay?: number;
  srcPort?: number;
  dstPort?: number;
  failureState?: FailureState;
}

function createState(): DataTransferState {
  return {
    transfers: new Map(),
    chunks: new Map(),
    reassembly: new Map(),
    selectedTransferId: null,
  };
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function payloadPreview(payload: string): string {
  if (payload.length <= PAYLOAD_PREVIEW_LIMIT) {
    return payload;
  }

  return `${payload.slice(0, PAYLOAD_PREVIEW_LIMIT - 3)}...`;
}

function byteLength(value: string): number {
  return textEncoder.encode(value).length;
}

function splitPayloadByBytes(payload: string, maxBytes: number): Array<{ data: string; sizeBytes: number }> {
  if (payload.length === 0) {
    return [{ data: '', sizeBytes: 0 }];
  }

  const chunks: Array<{ data: string; sizeBytes: number }> = [];
  let currentChunk = '';
  let currentBytes = 0;

  for (const character of payload) {
    const characterBytes = byteLength(character);

    if (currentBytes > 0 && currentBytes + characterBytes > maxBytes) {
      chunks.push({ data: currentChunk, sizeBytes: currentBytes });
      currentChunk = '';
      currentBytes = 0;
    }

    currentChunk += character;
    currentBytes += characterBytes;

    if (currentBytes > maxBytes) {
      chunks.push({ data: currentChunk, sizeBytes: currentBytes });
      currentChunk = '';
      currentBytes = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({ data: currentChunk, sizeBytes: currentBytes });
  }

  return chunks;
}

function cloneTransferMessage(transfer: TransferMessage): TransferMessage {
  return { ...transfer };
}

function cloneTransferChunk(chunk: TransferChunk): TransferChunk {
  return { ...chunk };
}

function cloneReassemblyState(reassembly: ReassemblyState): ReassemblyState {
  return {
    ...reassembly,
    receivedChunks: new Map(
      Array.from(reassembly.receivedChunks.entries(), ([sequenceNumber, chunk]) => [
        sequenceNumber,
        cloneTransferChunk(chunk),
      ]),
    ),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class DataTransferController {
  private state: DataTransferState = createState();
  private readonly listeners = new Set<DataTransferListener>();

  constructor(private readonly engine: SimulationEngine) {}

  async startTransfer(
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options: DataTransferOptions = {},
  ): Promise<TransferMessage> {
    const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? DEFAULT_CHUNK_SIZE));
    const chunkDelay = Math.max(0, options.chunkDelay ?? DEFAULT_CHUNK_DELAY);
    const srcPort = options.srcPort ?? DEFAULT_SRC_PORT;
    const dstPort = options.dstPort ?? DEFAULT_DST_PORT;
    const failureState = options.failureState ?? EMPTY_FAILURE_STATE;
    const srcIp = this.resolveNodeIp(srcNodeId);
    const dstIp = this.resolveNodeIp(dstNodeId);
    const checksum = await sha256Hex(payload);
    const chunkPayloads = splitPayloadByBytes(payload, chunkSize);
    const messageId = makeId('transfer');
    const now = Date.now();

    const transfer: TransferMessage = {
      messageId,
      srcNodeId,
      dstNodeId,
      protocol: 'raw',
      payloadPreview: payloadPreview(payload),
      payloadData: payload,
      payloadSizeBytes: byteLength(payload),
      checksum,
      expectedChunks: chunkPayloads.length,
      status: 'pending',
      createdAt: now,
    };

    const chunks = chunkPayloads.map<TransferChunk>(({ data, sizeBytes }, sequenceNumber) => ({
      chunkId: `${messageId}-chunk-${sequenceNumber}`,
      messageId,
      sequenceNumber,
      totalChunks: chunkPayloads.length,
      data,
      sizeBytes,
      state: 'pending',
    }));

    const reassembly: ReassemblyState = {
      messageId,
      receivedChunks: new Map(),
      expectedTotal: chunkPayloads.length,
      isComplete: false,
    };

    this.state.transfers.set(messageId, transfer);
    this.state.chunks.set(messageId, chunks);
    this.state.reassembly.set(messageId, reassembly);

    if (!this.state.selectedTransferId) {
      this.state.selectedTransferId = messageId;
    }

    this.notify();

    transfer.status = 'in-progress';
    this.notify();

    for (const chunk of chunks) {
      chunk.state = 'in-flight';
      this.notify();

      const packet = this.buildChunkPacket({
        messageId,
        srcNodeId,
        dstNodeId,
        srcIp,
        dstIp,
        srcPort,
        dstPort,
        chunk,
        chunkSize,
      });

      await this.engine.send(packet, failureState);

      const trace = this.findTrace(packet.id);
      if (!trace) {
        throw new Error(`Trace ${packet.id} not found after sending transfer chunk`);
      }

      chunk.traceId = trace.packetId;

      if (trace.status === 'delivered') {
        chunk.state = 'delivered';
        reassembly.receivedChunks.set(chunk.sequenceNumber, cloneTransferChunk(chunk));
      } else if (trace.status === 'dropped') {
        chunk.state = 'dropped';
      }

      this.notify();

      if (chunkDelay > 0 && chunk.sequenceNumber < chunks.length - 1) {
        await delay(chunkDelay);
      }
    }

    const deliveredChunks = chunks.filter((chunk) => chunk.state === 'delivered');

    if (deliveredChunks.length === chunks.length) {
      const orderedChunks = [...chunks].sort((left, right) => left.sequenceNumber - right.sequenceNumber);
      const reassembledPayload = orderedChunks.map((chunk) => chunk.data).join('');
      const reassembledChecksum = await sha256Hex(reassembledPayload);
      reassembly.isComplete = true;
      reassembly.reassembledPayload = reassembledPayload;
      reassembly.reassembledChecksum = reassembledChecksum;
      reassembly.checksumVerified = reassembledChecksum === checksum;
      transfer.status = reassembly.checksumVerified ? 'delivered' : 'failed';
    } else if (deliveredChunks.length > 0) {
      transfer.status = 'partial';
    } else {
      transfer.status = 'failed';
    }

    transfer.completedAt = Date.now();
    this.notify();

    return cloneTransferMessage(transfer);
  }

  getState(): DataTransferState {
    return {
      transfers: new Map(
        Array.from(this.state.transfers.entries(), ([messageId, transfer]) => [
          messageId,
          cloneTransferMessage(transfer),
        ]),
      ),
      chunks: new Map(
        Array.from(this.state.chunks.entries(), ([messageId, chunks]) => [
          messageId,
          chunks.map((chunk) => cloneTransferChunk(chunk)),
        ]),
      ),
      reassembly: new Map(
        Array.from(this.state.reassembly.entries(), ([messageId, reassembly]) => [
          messageId,
          cloneReassemblyState(reassembly),
        ]),
      ),
      selectedTransferId: this.state.selectedTransferId,
    };
  }

  getTransfer(messageId: string): TransferMessage | undefined {
    const transfer = this.state.transfers.get(messageId);
    return transfer ? cloneTransferMessage(transfer) : undefined;
  }

  getChunks(messageId: string): TransferChunk[] {
    return [...(this.state.chunks.get(messageId) ?? [])]
      .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
      .map((chunk) => cloneTransferChunk(chunk));
  }

  getReassembly(messageId: string): ReassemblyState | undefined {
    const reassembly = this.state.reassembly.get(messageId);
    return reassembly ? cloneReassemblyState(reassembly) : undefined;
  }

  clear(): void {
    this.state = createState();
    this.notify();
  }

  subscribe(listener: DataTransferListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private buildChunkPacket(args: {
    messageId: string;
    srcNodeId: string;
    dstNodeId: string;
    srcIp: string;
    dstIp: string;
    srcPort: number;
    dstPort: number;
    chunk: TransferChunk;
    chunkSize: number;
  }): InFlightPacket {
    return {
      id: `${args.messageId}-packet-${args.chunk.sequenceNumber}`,
      srcNodeId: args.srcNodeId,
      dstNodeId: args.dstNodeId,
      frame: {
        layer: 'L2',
        srcMac: PLACEHOLDER_SRC_MAC,
        dstMac: PLACEHOLDER_DST_MAC,
        etherType: 0x0800,
        payload: {
          layer: 'L3',
          srcIp: args.srcIp,
          dstIp: args.dstIp,
          ttl: 64,
          protocol: 6,
          payload: {
            layer: 'L4',
            srcPort: args.srcPort,
            dstPort: args.dstPort,
            seq: args.chunk.sequenceNumber * args.chunkSize,
            ack: 0,
            flags: {
              syn: false,
              ack: true,
              fin: false,
              rst: false,
              psh: true,
              urg: false,
            },
            payload: {
              layer: 'raw',
              data: args.chunk.data,
            },
          },
        },
      },
      currentDeviceId: args.srcNodeId,
      ingressPortId: '',
      path: [],
      timestamp: Date.now(),
    };
  }

  private findTrace(packetId: string): PacketTrace | undefined {
    return this.engine.getState().traces.find((trace) => trace.packetId === packetId);
  }

  private resolveNodeIp(nodeId: string): string {
    const runtimeIp = this.engine.getRuntimeNodeIp(nodeId);
    if (runtimeIp) {
      return runtimeIp;
    }

    const pipeline = Reflect.get(this.engine as object, 'pipeline') as ForwardingPipelineLike | undefined;
    const node = pipeline?.findNode(nodeId);
    const effectiveIp = pipeline?.getEffectiveNodeIp(node);

    if (!effectiveIp) {
      throw new Error(`Node ${nodeId} has no effective IP`);
    }

    return effectiveIp;
  }
}
