import { describe, expect, it } from 'vitest';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import { makeEngine } from './__fixtures__/helpers';
import { directTopology } from './__fixtures__/topologies';

describe('SimulationEngine TCP services', () => {
  it('returns TcpHandshakeResult with success=true on connected topology', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpConnect('client-1', 'server-1', 12345, 80);

    expect(result.success).toBe(true);
    expect(result.connection?.state).toBe('ESTABLISHED');
  });

  it('returns success=false when path is broken (link down)', async () => {
    const engine = makeEngine(directTopology());

    const result = await engine.tcpConnect(
      'client-1',
      'server-1',
      12345,
      80,
      {
        ...EMPTY_FAILURE_STATE,
        downEdgeIds: new Set(['e1']),
      },
    );

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
