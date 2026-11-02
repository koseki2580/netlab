import { beforeAll, describe, expect, it } from 'vitest';
import { RouterForwarder } from '../l3-network/RouterForwarder';
import { SwitchForwarder } from '../l2-datalink/SwitchForwarder';
import { layerRegistry } from '../../registry/LayerRegistry';
import { makeEngine } from '../../simulation/__fixtures__/helpers';
import { singleRouterTopology } from '../../simulation/__fixtures__/topologies';
import { EMPTY_FAILURE_STATE, type FailureState } from '../../types/failure';
import type { InFlightPacket, TcpSegment } from '../../types/packets';
import type { TcpConnection } from '../../types/tcp';
import { serializePacket } from '../../utils/packetSerializer';
import { TcpOrchestrator, type TcpEventSink, type TcpPacketSender } from './TcpOrchestrator';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

const SINK: TcpEventSink = { appendTrace: () => undefined, notify: () => undefined };

/** The simulator as a lesson drives it, keeping what was sent and what came of it. */
function onEngine(failed: { after: number; state: FailureState } | null = null) {
  const topology = singleRouterTopology();
  const engine = makeEngine(topology);
  const sent: InFlightPacket[] = [];
  const sender: TcpPacketSender = {
    precompute: async (packet) => {
      sent.push(packet);
      const failing = failed !== null && sent.length > failed.after;
      await engine.send(packet, failing ? failed.state : EMPTY_FAILURE_STATE);
      return { trace: engine.getState().traces.slice(-1)[0]!, nodeArpTables: {} };
    },
    findNode: (id) => topology.nodes.find((node) => node.id === id),
  };
  return { engine, sent, orchestrator: new TcpOrchestrator(topology, sender) };
}

const segment = (packet: InFlightPacket) => packet.frame.payload.payload as TcpSegment;

async function connected(run: ReturnType<typeof onEngine>): Promise<TcpConnection> {
  const result = await run.orchestrator.handshake('client-1', 'server-1', 12345, 80, SINK);
  return result.connection!;
}

describe('the handshake on the simulator', () => {
  it('TC-1064: carries the options and records what they settled', async () => {
    const run = onEngine();
    const result = await run.orchestrator.handshake(
      'client-1',
      'server-1',
      12345,
      80,
      SINK,
      EMPTY_FAILURE_STATE,
      undefined,
      {
        client: { windowScale: 7, receiveBuffer: 262144 },
        server: { mss: 1000, windowScale: 2, receiveBuffer: 16000 },
      },
    );
    const [syn, synAck, ack] = run.sent.map(segment);
    expect(syn?.options).toEqual({ mss: 1460, windowScale: 7, sackPermitted: true });
    expect(synAck?.options).toEqual({ mss: 1000, windowScale: 2, sackPermitted: true });
    expect(ack?.options).toBeUndefined();
    // Neither SYN's field is scaled; the first ACK's is.
    expect(syn?.windowSize).toBe(65535);
    expect(synAck?.windowSize).toBe(16000);
    expect(ack?.windowSize).toBe(2048);
    expect(result.connection?.negotiated).toEqual({
      clientSendMss: 1000,
      serverSendMss: 1000,
      windowScaling: true,
      clientWindowShift: 7,
      serverWindowShift: 2,
      sackPermitted: true,
    });
  });

  it('TC-1065: by default its hops and bytes are those it had before', async () => {
    const run = onEngine();
    await connected(run);
    const before = onEngine();
    await connected(before);
    for (const [index, packet] of run.sent.entries()) {
      const bare = structuredClone(packet);
      const tcp = segment(bare);
      expect(tcp.windowSize).toBe(65535);
      delete tcp.windowSize;
      delete tcp.options;
      expect(serializePacket(bare.frame).bytes).toEqual(serializePacket(packet.frame).bytes);
      expect(run.engine.getState().traces[index]?.hops).toHaveLength(
        before.engine.getState().traces[index]!.hops.length,
      );
    }
    expect(run.engine.getState().traces.map((trace) => trace.status)).toEqual([
      'delivered',
      'delivered',
      'delivered',
    ]);
  });
});

describe('a transfer on the simulator', () => {
  it('TC-1066: each segment is delivered with its window, and the numbers run on', async () => {
    const run = onEngine();
    const connection = await connected(run);
    run.sent.length = 0;
    const result = await run.orchestrator.transfer(connection, { bytes: 3000 }, SINK);

    expect(result.success).toBe(true);
    expect(result.traces.every((trace) => trace.status === 'delivered')).toBe(true);
    expect(result.traces).toHaveLength(result.plan.steps.length);
    const first = segment(run.sent[0]!);
    expect(first.seq).toBe(connection.localSeq);
    const raw = first.payload as { data: string };
    expect(raw.data).toHaveLength(1460);
    const ack = segment(run.sent[1]!);
    expect(ack.ack).toBe(connection.localSeq + 1460);
    expect(ack.windowSize).toBe(65535);
    expect(result.connection.localSeq).toBe(connection.localSeq + 3000);
  });

  it('TC-1068: stops at a segment that does not arrive, and says which', async () => {
    const run = onEngine({
      after: 4,
      state: { ...EMPTY_FAILURE_STATE, downEdgeIds: new Set(['e1', 'e2']) },
    });
    const connection = await connected(run);
    const result = await run.orchestrator.transfer(connection, { bytes: 3000 }, SINK);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('TCP transfer failed at ack 2');
    expect(result.connection).toEqual(connection);
  });

  it('TC-1069: two probes alike have different packet ids', async () => {
    const run = onEngine();
    const opened = await run.orchestrator.handshake(
      'client-1',
      'server-1',
      12345,
      80,
      SINK,
      EMPTY_FAILURE_STATE,
      undefined,
      { server: { mss: 1000, receiveBuffer: 2000 } },
    );
    const result = await run.orchestrator.transfer(
      opened.connection!,
      { bytes: 4000, readBytes: () => 0, maxRounds: 12 },
      SINK,
    );
    const probes = result.plan.steps.flatMap((step, index) =>
      step.kind === 'probe' ? [result.traces[index]!.packetId] : [],
    );
    expect(probes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(probes).size).toBe(probes.length);
  });
});
