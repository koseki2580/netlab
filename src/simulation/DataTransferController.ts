import type { FailureState } from '../types/failure';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import type { InFlightPacket } from '../types/packets';
import type { Neighbor, PacketTrace } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import type {
  DataTransferState,
  ReassemblyState,
  TransferChunk,
  TransferMessage,
} from '../types/transfer';
import { isInSubnet, prefixLength } from '../utils/cidr';
import { sha256Hex } from '../utils/hash';
import { deriveDeterministicMac } from './ForwardingPipeline';
import type { SessionTracker } from './SessionTracker';
import type { SimulationEngine } from './SimulationEngine';

const DEFAULT_CHUNK_SIZE = 1400;
const DEFAULT_CHUNK_DELAY = 100;
const DEFAULT_SRC_PORT = 49152;
const DEFAULT_DST_PORT = 8080;
const PAYLOAD_PREVIEW_LIMIT = 80;
const textEncoder = new TextEncoder();

interface ForwardingPipelineLike {
  findNode(nodeId: string): NetlabNode | null;
  getEffectiveNodeIp(node: NetlabNode | null): string | undefined;
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
  return {
    ...transfer,
    sessionIds: transfer.sessionIds ? [...transfer.sessionIds] : undefined,
  };
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

  constructor(
    private readonly engine: SimulationEngine,
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
        chunkSize,
        sessionId,
      });

      await this.engine.send(packet, failureState);

      const trace = this.findTrace(packet.id);
      if (!trace) {
        throw new Error(`Trace ${packet.id} not found after sending transfer chunk`);
      }

      chunk.traceId = trace.packetId;

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
    sessionId?: string;
  }): InFlightPacket {
    const srcMac = this.resolveSourceMac(args.srcNodeId, args.dstIp);
    const dstMac = this.resolveFirstHopMac(args.srcNodeId, args.dstIp);

    return {
      id: `${args.messageId}-packet-${args.chunk.sequenceNumber}`,
      sessionId: args.sessionId,
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

  private getPipeline(): ForwardingPipelineLike | undefined {
    return Reflect.get(this.engine as object, 'pipeline') as ForwardingPipelineLike | undefined;
  }

  private getTopology(): NetworkTopology | undefined {
    const pipeline = this.getPipeline();
    if (!pipeline) {
      return undefined;
    }

    return Reflect.get(pipeline as object, 'topology') as NetworkTopology | undefined;
  }

  private resolveNodeIp(nodeId: string): string {
    const runtimeIp = this.engine.getRuntimeNodeIp(nodeId);
    if (runtimeIp) {
      return runtimeIp;
    }

    const pipeline = this.getPipeline();
    const node = pipeline?.findNode(nodeId) ?? null;
    const effectiveIp = pipeline?.getEffectiveNodeIp(node);

    if (!effectiveIp) {
      throw new Error(`Node ${nodeId} has no effective IP`);
    }

    return effectiveIp;
  }

  private resolveSourceMac(nodeId: string, dstIp: string): string {
    const pipeline = this.getPipeline();
    const node = pipeline?.findNode(nodeId) ?? null;

    if (node?.data.role === 'router') {
      const egressInterfaceId = pipeline?.resolveEgressInterface?.(nodeId, dstIp)?.id;
      if (egressInterfaceId) {
        const egressInterface = node.data.interfaces?.find((iface) => iface.id === egressInterfaceId);
        if (egressInterface?.macAddress && !this.isPlaceholderMac(egressInterface.macAddress)) {
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
    const srcNode = this.getPipeline()?.findNode(srcNodeId) ?? null;
    if (!srcNode) {
      return {};
    }

    const nextHopIp = this.resolveNextHopIp(srcNode, dstIp);
    const nextHopNode = this.findReachableNode(srcNodeId, nextHopIp)
      ?? (nextHopIp !== dstIp ? this.findReachableNode(srcNodeId, dstIp) : null);

    return {
      nextHopIp,
      nextHopNodeId: nextHopNode?.id,
    };
  }

  private resolveNextHopIp(srcNode: NetlabNode, dstIp: string): string {
    const topology = this.getTopology();

    if (srcNode.data.role === 'router') {
      const route = this.selectBestRoute(dstIp, topology?.routeTables.get(srcNode.id) ?? []);
      if (route) {
        return route.nextHop === 'direct' ? dstIp : route.nextHop;
      }
      return dstIp;
    }

    const route = this.selectBestRoute(dstIp, srcNode.data.staticRoutes ?? []);
    if (route) {
      return route.nextHop === 'direct' ? dstIp : route.nextHop;
    }

    return dstIp;
  }

  private selectBestRoute<T extends { destination: string; nextHop: string }>(
    dstIp: string,
    routes: T[],
  ): T | null {
    return [...routes]
      .sort((left, right) => prefixLength(right.destination) - prefixLength(left.destination))
      .find((route) => isInSubnet(dstIp, route.destination)) ?? null;
  }

  private findReachableNode(srcNodeId: string, targetIp: string): NetlabNode | null {
    const pipeline = this.getPipeline();
    if (!pipeline) {
      return null;
    }

    const queue = pipeline.getNeighbors(srcNodeId, null, EMPTY_FAILURE_STATE)
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
        fallback ??= node;
        if (this.nodeOwnsIp(node, targetIp)) {
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

  private nodeOwnsIp(node: NetlabNode, ip: string): boolean {
    const pipeline = this.getPipeline();
    const effectiveIp = pipeline?.getEffectiveNodeIp(node) ?? node.data.ip;
    if (effectiveIp === ip) {
      return true;
    }

    return (node.data.interfaces ?? []).some((iface) => iface.ipAddress === ip);
  }

  private resolveNodeMac(nodeId: string, preferredIp?: string): string {
    const node = this.getPipeline()?.findNode(nodeId) ?? null;
    const mac = node ? this.extractNodeMac(node, preferredIp) : null;

    if (mac && !this.isPlaceholderMac(mac)) {
      return mac;
    }

    return deriveDeterministicMac(nodeId);
  }

  private extractNodeMac(node: NetlabNode, preferredIp?: string): string | null {
    if (typeof node.data.mac === 'string' && node.data.mac.length > 0 && !this.isPlaceholderMac(node.data.mac)) {
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

    const effectiveIp = this.getPipeline()?.getEffectiveNodeIp(node) ?? node.data.ip;
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

  private isPlaceholderMac(mac: string): boolean {
    const normalized = mac.trim().toLowerCase();
    return normalized === '00:00:00:00:00:01' || normalized === '00:00:00:00:00:02';
  }
}
