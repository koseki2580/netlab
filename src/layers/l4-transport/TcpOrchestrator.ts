import { EMPTY_FAILURE_STATE, type FailureState } from '../../types/failure';
import type { InFlightPacket } from '../../types/packets';
import type { PacketTrace } from '../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import type { TcpConnection } from '../../types/tcp';
import {
  buildAckPacket,
  buildFinPacket,
  buildSynAckPacket,
  buildSynPacket,
  generateISN,
} from './tcpPacketBuilder';
import { TcpCongestionControl } from './TcpCongestionControl';
import {
  advertisedWindowField,
  negotiateTcpOptions,
  planTcpTransfer,
  synAckOptions,
  synOptions,
  type TcpEndpoints,
  type TcpTransferPlan,
} from './TcpFlowControl';
import { addressViewOf, primaryNodeIp, type AddressView } from '../../simulation/addressView';

const DEFAULT_TCP_MSS_BYTES = 1460;

export interface TcpPacketSender {
  precompute: (
    packet: InFlightPacket,
    failureState: FailureState,
  ) =>
    | Promise<{ trace: PacketTrace; nodeArpTables: Record<string, Record<string, string>> }>
    | { trace: PacketTrace; nodeArpTables: Record<string, Record<string, string>> };
  findNode: (nodeId: string) => NetlabNode | undefined;
}

export interface TcpEventSink {
  appendTrace: (trace: PacketTrace, nodeArpTables?: Record<string, Record<string, string>>) => void;
  notify: () => void;
}

export interface TcpHandshakeResult {
  success: boolean;
  connection: TcpConnection | null;
  traces: PacketTrace[];
  failureReason?: string;
}

export interface TcpTeardownResult {
  success: boolean;
  traces: PacketTrace[];
  failureReason?: string;
}

/** What to send over an open connection, from the client to the server. */
export interface TcpTransferRequest {
  readonly bytes: number;
  /** How many bytes the server's application takes in a round. Default all it has. */
  readonly readBytes?: (round: number) => number;
  readonly maxRounds?: number;
  /** The first cwnd, in segments. Default 1. */
  readonly initialCwndSegments?: number;
}

export interface TcpTransferResult {
  /** The whole transfer ran and every byte was acknowledged. */
  success: boolean;
  /** The connection as it stands after the transfer. */
  connection: TcpConnection;
  plan: TcpTransferPlan;
  /** One per step of the plan, in order, up to any failure. */
  traces: PacketTrace[];
  failureReason?: string;
}

const DEFAULT_RECEIVE_BUFFER_BYTES = 65535;

function createConnectionId(connection: {
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
}): string {
  return `${connection.srcIp}:${connection.srcPort}-${connection.dstIp}:${connection.dstPort}`;
}

export class TcpOrchestrator {
  constructor(
    private readonly topology: NetworkTopology,
    private readonly sender: TcpPacketSender,
    private readonly addresses: AddressView = addressViewOf(topology),
  ) {}

  async handshake(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    sink: TcpEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId?: string,
    endpoints: TcpEndpoints = {},
  ): Promise<TcpHandshakeResult> {
    const clientIp = this.resolveNodeIp(clientNodeId);
    const serverIp = this.resolveNodeIp(serverNodeId);

    if (!clientIp || !serverIp) {
      return {
        success: false,
        connection: null,
        traces: [],
        failureReason: 'TCP handshake failed: missing node IP',
      };
    }

    const clientIsn = generateISN(clientNodeId, srcPort);
    const serverIsn = generateISN(serverNodeId, dstPort);
    const traces: PacketTrace[] = [];
    const clientEndpoint = endpoints.client ?? {};
    const serverEndpoint = endpoints.server ?? {};
    const synTcpOptions = synOptions(clientEndpoint);
    const synAckTcpOptions = synAckOptions(serverEndpoint, synTcpOptions);
    const negotiated = negotiateTcpOptions(synTcpOptions, synAckTcpOptions);
    const clientBuffer = clientEndpoint.receiveBuffer ?? DEFAULT_RECEIVE_BUFFER_BYTES;
    const serverBuffer = serverEndpoint.receiveBuffer ?? DEFAULT_RECEIVE_BUFFER_BYTES;

    const synPacket = buildSynPacket({
      srcNodeId: clientNodeId,
      dstNodeId: serverNodeId,
      srcIp: clientIp,
      dstIp: serverIp,
      srcPort,
      dstPort,
      seq: clientIsn,
      ack: 0,
      // RFC 7323 §2.2: the window of a SYN or SYN-ACK is never scaled.
      windowSize: advertisedWindowField(clientBuffer, 0),
      tcpOptions: synTcpOptions,
      ...(sessionId !== undefined ? { sessionId } : {}),
    });
    const synTrace = await this.sendPacket(synPacket, sink, traces, failureState);
    if (synTrace.status !== 'delivered') {
      return {
        success: false,
        connection: null,
        traces,
        failureReason: 'TCP handshake failed at SYN',
      };
    }

    const synAckPacket = buildSynAckPacket({
      srcNodeId: serverNodeId,
      dstNodeId: clientNodeId,
      srcIp: serverIp,
      dstIp: clientIp,
      srcPort: dstPort,
      dstPort: srcPort,
      seq: serverIsn,
      ack: clientIsn + 1,
      windowSize: advertisedWindowField(serverBuffer, 0),
      tcpOptions: synAckTcpOptions,
      ...(sessionId !== undefined ? { sessionId } : {}),
    });
    const synAckTrace = await this.sendPacket(synAckPacket, sink, traces, failureState);
    if (synAckTrace.status !== 'delivered') {
      return {
        success: false,
        connection: null,
        traces,
        failureReason: 'TCP handshake failed at SYN-ACK',
      };
    }

    const ackPacket = buildAckPacket({
      srcNodeId: clientNodeId,
      dstNodeId: serverNodeId,
      srcIp: clientIp,
      dstIp: serverIp,
      srcPort,
      dstPort,
      seq: clientIsn + 1,
      ack: serverIsn + 1,
      windowSize: advertisedWindowField(clientBuffer, negotiated.clientWindowShift),
      ...(sessionId !== undefined ? { sessionId } : {}),
    });
    const ackTrace = await this.sendPacket(ackPacket, sink, traces, failureState);
    if (ackTrace.status !== 'delivered') {
      return {
        success: false,
        connection: null,
        traces,
        failureReason: 'TCP handshake failed at final ACK',
      };
    }

    const connection: TcpConnection = {
      id: createConnectionId({
        srcIp: clientIp,
        srcPort,
        dstIp: serverIp,
        dstPort,
      }),
      srcNodeId: clientNodeId,
      dstNodeId: serverNodeId,
      srcIp: clientIp,
      srcPort,
      dstIp: serverIp,
      dstPort,
      state: 'ESTABLISHED',
      localSeq: clientIsn + 1,
      localAck: serverIsn + 1,
      remoteSeq: serverIsn + 1,
      createdAt: Date.now(),
      congestion: new TcpCongestionControl({ mss: DEFAULT_TCP_MSS_BYTES }).state,
      negotiated,
      clientReceiveBuffer: clientBuffer,
      serverReceiveBuffer: serverBuffer,
    };

    return {
      success: true,
      connection,
      traces,
    };
  }

  async teardown(
    connection: TcpConnection,
    sink: TcpEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<TcpTeardownResult> {
    const traces: PacketTrace[] = [];
    const sessionId = connection.id;

    const finPacket = buildFinPacket({
      srcNodeId: connection.srcNodeId,
      dstNodeId: connection.dstNodeId,
      srcIp: connection.srcIp,
      dstIp: connection.dstIp,
      srcPort: connection.srcPort,
      dstPort: connection.dstPort,
      seq: connection.localSeq,
      ack: connection.localAck,
      sessionId,
    });
    const finTrace = await this.sendPacket(finPacket, sink, traces, failureState);
    if (finTrace.status !== 'delivered') {
      return {
        success: false,
        traces,
        failureReason: 'TCP teardown failed at initiator FIN',
      };
    }

    const ackPacket = buildAckPacket({
      srcNodeId: connection.dstNodeId,
      dstNodeId: connection.srcNodeId,
      srcIp: connection.dstIp,
      dstIp: connection.srcIp,
      srcPort: connection.dstPort,
      dstPort: connection.srcPort,
      seq: connection.remoteSeq,
      ack: connection.localSeq + 1,
      sessionId,
    });
    const ackTrace = await this.sendPacket(ackPacket, sink, traces, failureState);
    if (ackTrace.status !== 'delivered') {
      return {
        success: false,
        traces,
        failureReason: 'TCP teardown failed at responder ACK',
      };
    }

    const responderFinPacket = buildFinPacket({
      srcNodeId: connection.dstNodeId,
      dstNodeId: connection.srcNodeId,
      srcIp: connection.dstIp,
      dstIp: connection.srcIp,
      srcPort: connection.dstPort,
      dstPort: connection.srcPort,
      seq: connection.remoteSeq,
      ack: connection.localSeq + 1,
      sessionId,
    });
    const responderFinTrace = await this.sendPacket(responderFinPacket, sink, traces, failureState);
    if (responderFinTrace.status !== 'delivered') {
      return {
        success: false,
        traces,
        failureReason: 'TCP teardown failed at responder FIN',
      };
    }

    const finalAckPacket = buildAckPacket({
      srcNodeId: connection.srcNodeId,
      dstNodeId: connection.dstNodeId,
      srcIp: connection.srcIp,
      dstIp: connection.dstIp,
      srcPort: connection.srcPort,
      dstPort: connection.dstPort,
      seq: connection.localSeq + 1,
      ack: connection.remoteSeq + 1,
      sessionId,
    });
    const finalAckTrace = await this.sendPacket(finalAckPacket, sink, traces, failureState);
    if (finalAckTrace.status !== 'delivered') {
      return {
        success: false,
        traces,
        failureReason: 'TCP teardown failed at final ACK',
      };
    }

    return {
      success: true,
      traces,
    };
  }

  /**
   * Sends `request.bytes` from the client to the server over the simulator:
   * one trace per segment of the plan, window fields and all. Nothing is
   * retransmitted: a segment that does not arrive ends the transfer.
   */
  async transfer(
    connection: TcpConnection,
    request: TcpTransferRequest,
    sink: TcpEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<TcpTransferResult> {
    const negotiated = connection.negotiated ?? negotiateTcpOptions(synOptions({}), synOptions({}));
    const clientBuffer = connection.clientReceiveBuffer ?? DEFAULT_RECEIVE_BUFFER_BYTES;
    const plan = planTcpTransfer({
      bytes: request.bytes,
      mss: negotiated.clientSendMss,
      receiveBuffer: connection.serverReceiveBuffer ?? DEFAULT_RECEIVE_BUFFER_BYTES,
      windowShift: negotiated.serverWindowShift,
      senderWindow: clientBuffer,
      senderWindowField: advertisedWindowField(clientBuffer, negotiated.clientWindowShift),
      readBytes: request.readBytes ?? (() => Number.POSITIVE_INFINITY),
      ...(request.maxRounds !== undefined ? { maxRounds: request.maxRounds } : {}),
      ...(request.initialCwndSegments !== undefined
        ? { initialCwndSegments: request.initialCwndSegments }
        : {}),
    });

    const client = {
      srcNodeId: connection.srcNodeId,
      dstNodeId: connection.dstNodeId,
      srcIp: connection.srcIp,
      dstIp: connection.dstIp,
      srcPort: connection.srcPort,
      dstPort: connection.dstPort,
    };
    const server = {
      srcNodeId: connection.dstNodeId,
      dstNodeId: connection.srcNodeId,
      srcIp: connection.dstIp,
      dstIp: connection.srcIp,
      srcPort: connection.dstPort,
      dstPort: connection.srcPort,
    };

    const traces: PacketTrace[] = [];
    for (const [index, step] of plan.steps.entries()) {
      const fromClient = step.kind === 'data' || step.kind === 'probe';
      const packet = buildAckPacket({
        ...(fromClient ? client : server),
        seq: fromClient ? connection.localSeq + step.seq : connection.remoteSeq,
        ack: fromClient ? connection.localAck : connection.localSeq + step.ack,
        windowSize: step.windowField,
        dataBytes: step.length,
        sessionId: connection.id,
        idSalt: `${step.kind}-${index}`,
      });
      const trace = await this.sendPacket(packet, sink, traces, failureState);
      if (trace.status !== 'delivered') {
        return {
          success: false,
          connection,
          plan,
          traces,
          failureReason: `TCP transfer failed at ${step.kind} ${index + 1}`,
        };
      }
    }

    return {
      success: plan.completed,
      connection: {
        ...connection,
        localSeq: connection.localSeq + plan.delivered,
        congestion: plan.congestion,
      },
      plan,
      traces,
    };
  }

  private async sendPacket(
    packet: InFlightPacket,
    sink: TcpEventSink,
    traces: PacketTrace[],
    failureState: FailureState,
  ): Promise<PacketTrace> {
    const result = await this.sender.precompute(packet, failureState);
    traces.push(result.trace);
    sink.appendTrace(result.trace, result.nodeArpTables);
    return result.trace;
  }

  private resolveNodeIp(nodeId: string): string | null {
    return primaryNodeIp(
      this.addresses,
      this.sender.findNode(nodeId) ??
        this.topology.nodes.find((candidate) => candidate.id === nodeId) ??
        null,
    );
  }
}
