import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_FAILURE_STATE } from '../../types/failure';
import type { FailureState } from '../../types/failure';
import type { InFlightPacket, TcpSegment } from '../../types/packets';
import type { PacketTrace } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import type { TcpConnection } from '../../types/tcp';
import { TcpOrchestrator, type TcpEventSink, type TcpPacketSender } from './TcpOrchestrator';
import { generateISN } from './tcpPacketBuilder';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 200, y: 0 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
      },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
  areas: [],
  routeTables: new Map(),
};

function makeTrace(packet: InFlightPacket, status: PacketTrace['status']): PacketTrace {
  return {
    packetId: packet.id,
    sessionId: packet.sessionId,
    label: 'TCP',
    srcNodeId: packet.srcNodeId,
    dstNodeId: packet.dstNodeId,
    status,
    hops: [
      {
        step: 0,
        nodeId: packet.srcNodeId,
        nodeLabel: packet.srcNodeId,
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        ttl: packet.frame.payload.ttl,
        protocol: 'TCP',
        event: status === 'delivered' ? 'deliver' : 'drop',
        timestamp: packet.timestamp,
      },
    ],
  };
}

function makeSender(
  statuses: PacketTrace['status'][] = ['delivered', 'delivered', 'delivered', 'delivered'],
): TcpPacketSender & { sentPackets: InFlightPacket[] } {
  const sentPackets: InFlightPacket[] = [];
  const remainingStatuses = [...statuses];

  return {
    sentPackets,
    precompute: vi.fn(async (packet: InFlightPacket, _failureState: FailureState = EMPTY_FAILURE_STATE) => {
      sentPackets.push(packet);
      const status = remainingStatuses.shift() ?? 'delivered';
      return {
        trace: makeTrace(packet, status),
        nodeArpTables: {},
      };
    }),
    findNode: (nodeId) => TOPOLOGY.nodes.find((node) => node.id === nodeId),
  };
}

function makeSink(): TcpEventSink & { traces: PacketTrace[] } {
  const traces: PacketTrace[] = [];

  return {
    traces,
    appendTrace: vi.fn((trace: PacketTrace) => {
      traces.push(trace);
    }),
    notify: vi.fn(),
  };
}

function makeConnection(): TcpConnection {
  return {
    id: '10.0.0.10:12345-203.0.113.10:80',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    srcIp: '10.0.0.10',
    srcPort: 12345,
    dstIp: '203.0.113.10',
    dstPort: 80,
    state: 'ESTABLISHED',
    localSeq: 4001,
    localAck: 9001,
    remoteSeq: 9001,
    createdAt: Date.now(),
  };
}

function tcpPayload(packet: InFlightPacket): TcpSegment {
  const payload = packet.frame.payload.payload;
  if (!('seq' in payload)) {
    throw new Error('Expected TCP payload');
  }
  return payload;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TcpOrchestrator', () => {
  describe('handshake', () => {
    it('completes 3-way handshake and returns ESTABLISHED connection', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.handshake(
        'client-1',
        'server-1',
        12345,
        80,
        sink,
      );

      expect(result.success).toBe(true);
      expect(result.connection).toEqual(
        expect.objectContaining({
          id: '10.0.0.10:12345-203.0.113.10:80',
          state: 'ESTABLISHED',
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
          srcIp: '10.0.0.10',
          dstIp: '203.0.113.10',
          srcPort: 12345,
          dstPort: 80,
        }),
      );
    });

    it('generates 3 traces (SYN, SYN-ACK, ACK)', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.handshake('client-1', 'server-1', 12345, 80, sink);

      expect(result.traces).toHaveLength(3);
      expect(sink.traces).toHaveLength(3);
    });

    it('SYN has correct flags (syn=true only)', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      await orchestrator.handshake('client-1', 'server-1', 12345, 80, makeSink());

      expect(tcpPayload(sender.sentPackets[0]).flags).toEqual({
        syn: true,
        ack: false,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      });
    });

    it('SYN-ACK has correct seq=ISN_s and ack=ISN_c+1', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);
      const clientIsn = generateISN('client-1', 12345);
      const serverIsn = generateISN('server-1', 80);

      await orchestrator.handshake('client-1', 'server-1', 12345, 80, makeSink());

      expect(tcpPayload(sender.sentPackets[1]).seq).toBe(serverIsn);
      expect(tcpPayload(sender.sentPackets[1]).ack).toBe(clientIsn + 1);
    });

    it('ACK has correct seq=ISN_c+1 and ack=ISN_s+1', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);
      const clientIsn = generateISN('client-1', 12345);
      const serverIsn = generateISN('server-1', 80);

      await orchestrator.handshake('client-1', 'server-1', 12345, 80, makeSink());

      expect(tcpPayload(sender.sentPackets[2]).seq).toBe(clientIsn + 1);
      expect(tcpPayload(sender.sentPackets[2]).ack).toBe(serverIsn + 1);
    });

    it('calls sink.appendTrace for each packet', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      await orchestrator.handshake('client-1', 'server-1', 12345, 80, sink);

      expect(sink.appendTrace).toHaveBeenCalledTimes(3);
    });

    it('returns failure when SYN is dropped', async () => {
      const sender = makeSender(['dropped']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.handshake('client-1', 'server-1', 12345, 80, sink);

      expect(result).toEqual({
        success: false,
        connection: null,
        traces: sink.traces,
        failureReason: 'TCP handshake failed at SYN',
      });
      expect(result.traces).toHaveLength(1);
    });

    it('returns failure when SYN-ACK is dropped', async () => {
      const sender = makeSender(['delivered', 'dropped']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.handshake('client-1', 'server-1', 12345, 80, sink);

      expect(result.success).toBe(false);
      expect(result.connection).toBeNull();
      expect(result.failureReason).toBe('TCP handshake failed at SYN-ACK');
      expect(result.traces).toHaveLength(2);
    });

    it('returns failure when final ACK is dropped', async () => {
      const sender = makeSender(['delivered', 'delivered', 'dropped']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.handshake('client-1', 'server-1', 12345, 80, sink);

      expect(result.success).toBe(false);
      expect(result.connection).toBeNull();
      expect(result.failureReason).toBe('TCP handshake failed at final ACK');
      expect(result.traces).toHaveLength(3);
    });

    it('uses provided sessionId for all packets', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered']);
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      await orchestrator.handshake(
        'client-1',
        'server-1',
        12345,
        80,
        makeSink(),
        EMPTY_FAILURE_STATE,
        'session-tcp-1',
      );

      expect(sender.sentPackets.map((packet) => packet.sessionId)).toEqual([
        'session-tcp-1',
        'session-tcp-1',
        'session-tcp-1',
      ]);
    });
  });

  describe('teardown', () => {
    it('completes 4-step teardown successfully', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered', 'delivered']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.teardown(makeConnection(), sink);

      expect(result.success).toBe(true);
      expect(result.traces).toHaveLength(4);
    });

    it('generates 4 traces (FIN, ACK, FIN, ACK)', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered', 'delivered']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.teardown(makeConnection(), sink);

      expect(result.traces).toHaveLength(4);
      expect(sink.traces).toHaveLength(4);
    });

    it('FIN has fin=true and ack=true flags', async () => {
      const sender = makeSender(['delivered', 'delivered', 'delivered', 'delivered']);
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      await orchestrator.teardown(makeConnection(), makeSink());

      expect(tcpPayload(sender.sentPackets[0]).flags).toEqual({
        syn: false,
        ack: true,
        fin: true,
        rst: false,
        psh: false,
        urg: false,
      });
    });

    it('returns failure when any step is dropped', async () => {
      const sender = makeSender(['delivered', 'delivered', 'dropped']);
      const sink = makeSink();
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      const result = await orchestrator.teardown(makeConnection(), sink);

      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('TCP teardown failed at responder FIN');
      expect(result.traces).toHaveLength(3);
    });

    it('uses correct sequence numbers from connection state', async () => {
      const connection = makeConnection();
      const sender = makeSender(['delivered', 'delivered', 'delivered', 'delivered']);
      const orchestrator = new TcpOrchestrator(TOPOLOGY, sender);

      await orchestrator.teardown(connection, makeSink());

      expect(tcpPayload(sender.sentPackets[0]).seq).toBe(connection.localSeq);
      expect(tcpPayload(sender.sentPackets[1]).ack).toBe(connection.localSeq + 1);
      expect(tcpPayload(sender.sentPackets[2]).seq).toBe(connection.remoteSeq);
      expect(tcpPayload(sender.sentPackets[3]).seq).toBe(connection.localSeq + 1);
      expect(tcpPayload(sender.sentPackets[3]).ack).toBe(connection.remoteSeq + 1);
    });
  });
});
