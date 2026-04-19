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
  ) {}

  async handshake(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    sink: TcpEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId?: string,
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

    const synPacket = buildSynPacket({
      srcNodeId: clientNodeId,
      dstNodeId: serverNodeId,
      srcIp: clientIp,
      dstIp: serverIp,
      srcPort,
      dstPort,
      seq: clientIsn,
      ack: 0,
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
    const node =
      this.sender.findNode(nodeId) ??
      this.topology.nodes.find((candidate) => candidate.id === nodeId) ??
      null;
    if (!node) {
      return null;
    }

    if (typeof node.data.ip === 'string' && node.data.ip.length > 0) {
      return node.data.ip;
    }

    return node.data.interfaces?.[0]?.ipAddress ?? null;
  }
}
