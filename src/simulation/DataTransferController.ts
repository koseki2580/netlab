import { NetlabError } from '../errors';
import type { FailureState } from '../types/failure';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import type { InFlightPacket } from '../types/packets';
import type { RouteEntry } from '../types/routing';
import type { TcpConnection } from '../types/tcp';
import type { Neighbor, PacketTrace } from '../types/simulation';
import type { NetlabNode } from '../types/topology';
import type {
  DataTransferState,
  ReassemblyState,
  TransferChunk,
  TransferMessage,
} from '../types/transfer';
import { isInSubnet, prefixLength } from '../utils/cidr';
import { sha256Hex } from '../utils/hash';
import { isPlaceholderMac, nodeOwnsIp } from './AddressPlane';
import { deriveDeterministicMac } from './ForwardingPipeline';
import type { SessionTracker } from './SessionTracker';

const DEFAULT_CHUNK_SIZE = 1400;
const DEFAULT_CHUNK_DELAY = 100;
const DEFAULT_SRC_PORT = 49152;
const DEFAULT_DST_PORT = 8080;
const PAYLOAD_PREVIEW_LIMIT = 80;
const IP_HEADER_BYTES = 20;
const TCP_HEADER_BYTES = 20;
const textEncoder = new TextEncoder();

export interface DataTransferPipeline {
  findNode(nodeId: string): NetlabNode | null;
  getEffectiveNodeIp(node: NetlabNode | null): string | undefined;
  getRouteTable(nodeId: string): readonly RouteEntry[];
  getNeighbors(
    nodeId: string,
    excludeNodeId?: string | null,
    failureState?: FailureState,
  ): Neighbor[];
  resolveEgressInterface?(
    nodeId: string,
    dstIp: string,
    overrideNextHop?: string,
  ): { id: string; name: string } | null;
}

export interface DataTransferEngine {
  getRuntimeNodeIp(nodeId: string): string | null;
  getState(): { readonly traces: readonly PacketTrace[] };
  send(packet: InFlightPacket, failureState?: FailureState): Promise<void>;
  /** The open connections; a transfer on one of them is numbered as its TCP stream (REQ-417). */
  getTcpConnections?(): readonly TcpConnection[];
}

export interface DataTransferControllerDeps {
  readonly engine: DataTransferEngine;
  readonly pipeline: DataTransferPipeline;
}

type DataTransferListener = (state: DataTransferState) => void;

export interface DataTransferOptions {
  chunkSize?: number;
  chunkDelay?: number;
  srcPort?: number;
  dstPort?: number;
  failureState?: FailureState;
  pmtuLookup?: (srcNodeId: string, dstIp: string) => number;
}

function createState(): DataTransferState {
  return {
    transfers: new Map(),
    chunks: new Map(),
    reassembly: new Map(),
    selectedTransferId: null,
  };
}

/** The engine itself needs `crypto.randomUUID` for every packet it sends (TraceCoordinator). */
function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
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

/**
 * Where the chunk that starts at character `from` ends: as many whole
 * characters as fit in `maxBytes` of UTF-8, and at least one. One pass.
 */
function chunkEnd(payload: string, from: number, maxBytes: number): number {
  let end = from;
  for (let bytes = 0; end < payload.length; ) {
    const code = payload.codePointAt(end) ?? 0;
    const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (bytes > 0 && bytes + size > maxBytes) break;
    bytes += size;
    end += code > 0xffff ? 2 : 1;
  }
  return end;
}

function effectiveChunkSize(configuredMax: number, pathMtu: number): number {
  if (!Number.isFinite(pathMtu)) {
    return configuredMax;
  }

  const mss = Math.max(1, Math.floor(pathMtu) - IP_HEADER_BYTES - TCP_HEADER_BYTES);
  return Math.min(configuredMax, mss);
}

function cloneTransferMessage(transfer: TransferMessage): TransferMessage {
  return {
    ...transfer,
    ...(transfer.sessionIds !== undefined ? { sessionIds: [...transfer.sessionIds] } : {}),
  };
}

/** Every chunk of a transfer has the same total, the chunks so far: filled in here, not per chunk. */
function cloneTransferChunk(chunk: TransferChunk, totalChunks: number): TransferChunk {
  return { ...chunk, totalChunks };
}

function cloneReassemblyState(reassembly: ReassemblyState): ReassemblyState {
  return {
    ...reassembly,
    receivedChunks: new Map(
      [...reassembly.receivedChunks].map(([sequenceNumber, chunk]) => [
        sequenceNumber,
        cloneTransferChunk(chunk, reassembly.expectedTotal),
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

  constructor(
    private readonly deps: DataTransferControllerDeps,
    private readonly sessionTracker?: SessionTracker,
  ) {}

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
    const pmtuLookup = options.pmtuLookup;
    const srcIp = this.resolveNodeIp(srcNodeId);
    const dstIp = this.resolveNodeIp(dstNodeId);
    const checksum = await sha256Hex(payload);
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
      expectedChunks: 0,
      status: 'pending',
      createdAt: now,
    };
    const chunks: TransferChunk[] = [];

    const reassembly: ReassemblyState = {
      messageId,
      receivedChunks: new Map(),
      expectedTotal: 0,
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

    const engine = this.deps.engine;
    const tcp = engine.getTcpConnections?.().length
      ? (await import('./tcpSegmentation')).openTcpStream(
          engine,
          srcNodeId,
          dstNodeId,
          options,
          payload,
          chunkEnd,
          failureState,
        )
      : null;
    let offset = 0;
    let payloadOffsetBytes = 0;
    let needsEmptyChunk = payload.length === 0;

    while (needsEmptyChunk || offset < payload.length) {
      needsEmptyChunk = false;
      const currentChunkSize = effectiveChunkSize(
        chunkSize,
        pmtuLookup?.(srcNodeId, dstIp) ?? Number.POSITIVE_INFINITY,
      );
      const end = chunkEnd(payload, offset, currentChunkSize);
      const data = payload.slice(offset, end);
      const chunk: TransferChunk = {
        chunkId: `${messageId}-chunk-${chunks.length}`,
        messageId,
        sequenceNumber: chunks.length,
        totalChunks: 0,
        data,
        sizeBytes: byteLength(data),
        state: 'in-flight',
      };

      const sessionId = this.sessionTracker
        ? `${messageId}-session-${chunk.sequenceNumber}`
        : undefined;

      const packet = this.buildChunkPacket({
        messageId,
        srcNodeId,
        dstNodeId,
        srcIp,
        dstIp,
        srcPort,
        dstPort,
        chunk,
        payloadOffsetBytes,
        ...(sessionId !== undefined ? { sessionId } : {}),
      });

      await this.deps.engine.send(
        tcp ? tcp.stamp(packet, end, currentChunkSize, chunks.length) : packet,
        failureState,
      );

      const trace = this.findTrace(packet.id);
      if (!trace) {
        throw new NetlabError({
          code: 'invariant/not-found',
          message: `Trace ${packet.id} not found after sending transfer chunk`,
          context: { packetId: packet.id },
        });
      }

      chunk.traceId = trace.packetId;

      const retryChunkSize = effectiveChunkSize(
        chunkSize,
        pmtuLookup?.(srcNodeId, dstIp) ?? Number.POSITIVE_INFINITY,
      );
      const shouldRetryWithSmallerChunk =
        trace.status === 'dropped' && retryChunkSize < chunk.sizeBytes;

      if (shouldRetryWithSmallerChunk) {
        continue;
      }

      if (this.sessionTracker && sessionId) {
        this.sessionTracker.startSession(sessionId, {
          srcNodeId,
          dstNodeId,
          protocol: 'raw',
          requestType: 'data-transfer',
          transferId: messageId,
        });
        this.sessionTracker.attachTrace(sessionId, trace, 'request');
        transfer.sessionIds = [...(transfer.sessionIds ?? []), sessionId];
      }

      chunk.state = trace.status === 'delivered' ? 'delivered' : 'dropped';
      chunks.push(chunk);
      transfer.expectedChunks = reassembly.expectedTotal = chunks.length;
      if (chunk.state === 'delivered') {
        reassembly.receivedChunks.set(chunk.sequenceNumber, chunk);
      }

      this.notify();
      await tcp?.ack(chunk.state === 'delivered');

      offset = end;
      payloadOffsetBytes += chunk.sizeBytes;

      if (chunkDelay > 0 && offset < payload.length) {
        await delay(chunkDelay);
      }
    }

    const deliveredChunks = chunks.filter((chunk) => chunk.state === 'delivered');

    if (deliveredChunks.length === chunks.length) {
      const orderedChunks = [...chunks].sort(
        (left, right) => left.sequenceNumber - right.sequenceNumber,
      );
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
        [...this.state.transfers].map(([messageId, transfer]) => [
          messageId,
          cloneTransferMessage(transfer),
        ]),
      ),
      chunks: new Map(
        [...this.state.chunks].map(([messageId, chunks]) => [
          messageId,
          chunks.map((chunk) => cloneTransferChunk(chunk, chunks.length)),
        ]),
      ),
      reassembly: new Map(
        [...this.state.reassembly].map(([messageId, reassembly]) => [
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
    const chunks = this.state.chunks.get(messageId) ?? [];
    return [...chunks]
      .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
      .map((chunk) => cloneTransferChunk(chunk, chunks.length));
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
    if (this.listeners.size === 0) return;
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
    payloadOffsetBytes: number;
    sessionId?: string;
  }): InFlightPacket {
    const srcMac = this.resolveSourceMac(args.srcNodeId, args.dstIp);
    const dstMac = this.resolveFirstHopMac(args.srcNodeId, args.dstIp);

    return {
      id: `${args.messageId}-packet-${args.chunk.sequenceNumber}`,
      srcNodeId: args.srcNodeId,
      dstNodeId: args.dstNodeId,
      frame: {
        layer: 'L2',
        srcMac,
        dstMac,
        etherType: 0x0800,
        payload: {
          layer: 'L3',
          srcIp: args.srcIp,
          dstIp: args.dstIp,
          ttl: 64,
          protocol: 6,
          flags: { df: true, mf: false },
          payload: {
            layer: 'L4',
            srcPort: args.srcPort,
            dstPort: args.dstPort,
            seq: args.payloadOffsetBytes,
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
      ...(args.sessionId !== undefined ? { sessionId: args.sessionId } : {}),
    };
  }

  private findTrace(packetId: string): PacketTrace | undefined {
    const traces = this.deps.engine.getState().traces;
    for (let index = traces.length - 1; index >= 0; index--) {
      const trace = traces[index];
      if (trace?.packetId === packetId) {
        return trace;
      }
    }
    return undefined;
  }

  private resolveNodeIp(nodeId: string): string {
    const runtimeIp = this.deps.engine.getRuntimeNodeIp(nodeId);
    if (runtimeIp) {
      return runtimeIp;
    }

    const pipeline = this.deps.pipeline;
    const node = pipeline.findNode(nodeId) ?? null;
    const effectiveIp = pipeline.getEffectiveNodeIp(node);

    if (!effectiveIp) {
      throw new NetlabError({
        code: 'invariant/no-ip',
        message: `Node ${nodeId} has no effective IP`,
        context: { nodeId },
      });
    }

    return effectiveIp;
  }

  private resolveSourceMac(nodeId: string, dstIp: string): string {
    const pipeline = this.deps.pipeline;
    const node = pipeline.findNode(nodeId) ?? null;

    if (node?.data.role === 'router') {
      const egressInterfaceId = pipeline.resolveEgressInterface?.(nodeId, dstIp)?.id;
      if (egressInterfaceId) {
        const egressInterface = node.data.interfaces?.find(
          (iface) => iface.id === egressInterfaceId,
        );
        if (egressInterface?.macAddress && !isPlaceholderMac(egressInterface.macAddress)) {
          return egressInterface.macAddress;
        }
      }
    }

    return this.resolveNodeMac(nodeId);
  }

  private resolveFirstHopMac(srcNodeId: string, dstIp: string): string {
    const { nextHopIp, nextHopNodeId } = this.resolveFirstHop(srcNodeId, dstIp);
    if (nextHopNodeId) {
      return this.resolveNodeMac(nextHopNodeId, nextHopIp);
    }

    return deriveDeterministicMac(`${srcNodeId}:next-hop`);
  }

  private resolveFirstHop(
    srcNodeId: string,
    dstIp: string,
  ): { nextHopIp?: string; nextHopNodeId?: string } {
    const srcNode = this.deps.pipeline.findNode(srcNodeId);
    if (!srcNode) {
      return {};
    }

    const nextHopIp = this.resolveNextHopIp(srcNode, dstIp);
    const nextHopNode =
      this.findReachableNode(srcNodeId, nextHopIp) ??
      (nextHopIp !== dstIp ? this.findReachableNode(srcNodeId, dstIp) : null);

    return {
      nextHopIp,
      ...(nextHopNode?.id !== undefined ? { nextHopNodeId: nextHopNode.id } : {}),
    };
  }

  private resolveNextHopIp(srcNode: NetlabNode, dstIp: string): string {
    const route = this.selectBestRoute(
      dstIp,
      srcNode.data.role === 'router'
        ? this.deps.pipeline.getRouteTable(srcNode.id)
        : (srcNode.data.staticRoutes ?? []),
    );
    return route && route.nextHop !== 'direct' ? route.nextHop : dstIp;
  }

  private selectBestRoute<T extends { destination: string; nextHop: string }>(
    dstIp: string,
    routes: readonly T[],
  ): T | null {
    return (
      [...routes]
        .sort((left, right) => prefixLength(right.destination) - prefixLength(left.destination))
        .find((route) => isInSubnet(dstIp, route.destination)) ?? null
    );
  }

  private findReachableNode(srcNodeId: string, targetIp: string): NetlabNode | null {
    const pipeline = this.deps.pipeline;

    const queue = pipeline
      .getNeighbors(srcNodeId, null, EMPTY_FAILURE_STATE)
      .map((neighbor) => ({ nodeId: neighbor.nodeId, previousNodeId: srcNodeId }));
    const visited = new Set<string>();
    let fallback: NetlabNode | null = null;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.nodeId)) {
        continue;
      }
      visited.add(current.nodeId);

      const node = pipeline.findNode(current.nodeId);
      if (!node) {
        continue;
      }

      if (node.data.role !== 'switch') {
        // Nobody here has the address: the frame is for a router, not the first host found.
        if (fallback?.data.role !== 'router' && (!fallback || node.data.role === 'router')) {
          fallback = node;
        }
        if (nodeOwnsIp(node, targetIp, this.deps.pipeline.getEffectiveNodeIp(node))) {
          return node;
        }
        continue;
      }

      const neighbors = pipeline.getNeighbors(node.id, current.previousNodeId, EMPTY_FAILURE_STATE);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.nodeId)) {
          queue.push({ nodeId: neighbor.nodeId, previousNodeId: node.id });
        }
      }
    }

    return fallback;
  }

  private resolveNodeMac(nodeId: string, preferredIp?: string): string {
    const node = this.deps.pipeline.findNode(nodeId);
    const mac = node ? this.extractNodeMac(node, preferredIp) : null;

    if (mac && !isPlaceholderMac(mac)) {
      return mac;
    }

    return deriveDeterministicMac(nodeId);
  }

  private extractNodeMac(node: NetlabNode, preferredIp?: string): string | null {
    if (
      typeof node.data.mac === 'string' &&
      node.data.mac.length > 0 &&
      !isPlaceholderMac(node.data.mac)
    ) {
      return node.data.mac;
    }

    const interfaces = node.data.interfaces ?? [];
    if (preferredIp) {
      const exactMatch = interfaces.find((iface) => iface.ipAddress === preferredIp);
      if (exactMatch?.macAddress) {
        return exactMatch.macAddress;
      }

      const subnetMatch = interfaces.find((iface) =>
        isInSubnet(preferredIp, `${iface.ipAddress}/${iface.prefixLength}`),
      );
      if (subnetMatch?.macAddress) {
        return subnetMatch.macAddress;
      }
    }

    const effectiveIp = this.deps.pipeline.getEffectiveNodeIp(node) ?? node.data.ip;
    if (effectiveIp) {
      const effectiveMatch = interfaces.find((iface) => iface.ipAddress === effectiveIp);
      if (effectiveMatch?.macAddress) {
        return effectiveMatch.macAddress;
      }
    }

    if (interfaces[0]?.macAddress) {
      return interfaces[0].macAddress;
    }

    if (node.data.ports?.[0]?.macAddress) {
      return node.data.ports[0].macAddress;
    }

    return null;
  }
}
