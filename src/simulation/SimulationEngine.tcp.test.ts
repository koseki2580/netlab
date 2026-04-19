import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import { makeEngine } from './__fixtures__/helpers';
import {
  dataTransferDemoTopology,
  directTopology,
  singleRouterTopology,
} from './__fixtures__/topologies';
import type { InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';

function withEdgeMtu(topology: NetworkTopology, edgeId: string, mtuBytes: number): NetworkTopology {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, data: { ...(edge.data ?? {}), mtuBytes } } : edge,
    ),
  };
}

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

describe('SimulationEngine TCP services', () => {
  it('returns TcpHandshakeResult with success=true on connected topology', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpConnect('client-1', 'server-1', 12345, 80);

    expect(result.success).toBe(true);
    expect(result.connection?.state).toBe('ESTABLISHED');
  });

  it('returns success=false when path is broken (link down)', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpConnect('client-1', 'server-1', 12345, 80, {
      ...EMPTY_FAILURE_STATE,
      downEdgeIds: new Set(['e1']),
    });

    expect(result.success).toBe(false);
    expect(result.connection).toBeNull();
  });

  it('commits 3 traces to simulation state', async () => {
    const engine = makeEngine(directTopology());

    await engine.tcpConnect('client-1', 'server-1', 12345, 80);

    expect(engine.getState().traces).toHaveLength(3);
    expect(engine.getState().traces.map((trace) => trace.label)).toEqual([
      'TCP SYN',
      'TCP SYN-ACK',
      'TCP ACK',
    ]);
  });

  it('connection appears in getTcpConnections()', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpConnect('client-1', 'server-1', 12345, 80);

    expect(result.success).toBe(true);
    expect(engine.getTcpConnections()).toEqual([result.connection]);
  });

  it('connection appears in getTcpConnectionsForNode(clientNodeId)', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpConnect('client-1', 'server-1', 12345, 80);

    expect(result.success).toBe(true);
    expect(engine.getTcpConnectionsForNode('client-1')).toEqual([result.connection]);
  });

  it('performs teardown and removes connection', async () => {
    const engine = makeEngine(directTopology());

    const connectResult = await engine.tcpConnect('client-1', 'server-1', 12345, 80);
    expect(connectResult.success).toBe(true);

    const disconnectResult = await engine.tcpDisconnect(connectResult.connection!.id);

    expect(disconnectResult.success).toBe(true);
    expect(engine.getTcpConnections()).toEqual([]);
  });

  it('commits 4 traces to simulation state', async () => {
    const engine = makeEngine(directTopology());

    const connectResult = await engine.tcpConnect('client-1', 'server-1', 12345, 80);
    expect(connectResult.success).toBe(true);

    engine.clearTraces();
    const disconnectResult = await engine.tcpDisconnect(connectResult.connection!.id);

    expect(disconnectResult.success).toBe(true);
    expect(engine.getState().traces).toHaveLength(4);
    expect(engine.getState().traces.map((trace) => trace.label)).toEqual([
      'TCP FIN',
      'TCP ACK',
      'TCP FIN',
      'TCP ACK',
    ]);
  });

  it('returns failure when connection not found', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpDisconnect('missing-connection');

    expect(result).toEqual({
      success: false,
      traces: [],
      failureReason: 'TCP disconnect failed: connection not found',
    });
  });
});

describe('SimulationEngine — PMTUD', () => {
  it('updates the source node PathMtuCache on ICMP Frag-Needed delivery', async () => {
    const engine = makeEngine(withEdgeMtu(dataTransferDemoTopology(), 'e2', 600));
    const sentPackets: InFlightPacket[] = [];
    const originalSend = engine.send.bind(engine);

    vi.spyOn(engine, 'send').mockImplementation(async (packet, failureState) => {
      sentPackets.push(structuredClone(packet));
      await originalSend(packet, failureState);
    });

    await engine.sendTransfer('server-a', 'server-b', 'x'.repeat(1400), { chunkDelay: 0 });

    expect(engine.getPathMtuCache('server-a').snapshot()).toEqual({
      '10.0.3.10': 600,
    });
  });

  it('the cache update is visible to subsequent DataTransferController chunking', async () => {
    const engine = makeEngine(singleRouterTopology());
    engine.getPathMtuCache('client-1').update('203.0.113.10', 600);

    const transfer = await engine.sendTransfer('client-1', 'server-1', 'x'.repeat(1400), {
      chunkDelay: 0,
    });

    expect(
      engine
        .getTransferController()
        ?.getChunks(transfer.messageId)
        .map((chunk) => chunk.sizeBytes),
    ).toEqual([560, 560, 280]);
  });

  it('cache is empty on startup and after clearPathMtuCaches', () => {
    const engine = makeEngine(singleRouterTopology());

    expect(engine.getPathMtuCache('client-1').size()).toBe(0);

    engine.getPathMtuCache('client-1').update('203.0.113.10', 600);
    engine.clearPathMtuCaches();

    expect(engine.getPathMtuCache('client-1').size()).toBe(0);
  });

  it('a TCP data transfer on a low-MTU link converges with one initial drop and smaller later chunks', async () => {
    const engine = makeEngine(withEdgeMtu(dataTransferDemoTopology(), 'e2', 600));

    const transfer = await engine.sendTransfer('server-a', 'server-b', 'x'.repeat(3000), {
      chunkDelay: 0,
    });
    const controller = engine.getTransferController();
    const traces = engine.getState().traces;

    expect(transfer.status).toBe('delivered');
    expect(traces[0]?.status).toBe('dropped');
    expect(traces[0]?.hops.some((hop) => hop.reason === 'fragmentation-needed')).toBe(true);
    expect(traces[1]?.status).toBe('delivered');
    expect(controller?.getChunks(transfer.messageId)[0]?.sizeBytes).toBe(560);
    expect(controller?.getChunks(transfer.messageId).every((chunk) => chunk.sizeBytes <= 560)).toBe(
      true,
    );
  });
});
