import { beforeAll, describe, expect, it } from 'vitest';
import { SwitchForwarder } from '../l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../l3-network/RouterForwarder';
import { layerRegistry } from '../../registry/LayerRegistry';
import { makeEngine } from '../../simulation/__fixtures__/helpers';
import { natTopology } from '../../simulation/__fixtures__/topologies';
import { TcpOrchestrator, type TcpEventSink, type TcpPacketSender } from './TcpOrchestrator';

/**
 * TC-1541 — every segment the server sends over a connection opened through
 * NAT goes to the address and port the server saw, and the NAT router puts it
 * back for the client (RFC 3022 §2.2, REQ-381): data, its ACKs, and the close.
 */
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

function orchestrator() {
  const topology = natTopology();
  const engine = makeEngine(topology);
  const sender: TcpPacketSender = {
    precompute: async (packet, failureState) => ({
      trace: await engine.precompute(packet, failureState),
      nodeArpTables: {},
    }),
    findNode: (nodeId) => topology.nodes.find((node) => node.id === nodeId),
  };
  return new TcpOrchestrator(topology, sender);
}

const sink: TcpEventSink = { appendTrace: () => undefined, notify: () => undefined };

describe('a TCP connection through NAT (TC-1541)', () => {
  it('opens, carries data both ways and closes, every segment delivered', async () => {
    const tcp = orchestrator();
    const opened = await tcp.handshake('client-1', 'server-1', 49152, 80, sink);
    expect(opened.success).toBe(true);
    const connection = opened.connection!;
    expect(connection.srcIp).toBe('192.168.1.10');
    expect(connection.peerSeenByServer?.ip).toBe('203.0.113.1');

    const sent = await tcp.transfer(connection, { bytes: 3000 }, sink);
    expect(sent.success).toBe(true);
    expect(sent.traces.every((trace) => trace.status === 'delivered')).toBe(true);
    const toClient = sent.traces.filter((trace) => trace.srcNodeId === 'server-1');
    expect(toClient.length).toBeGreaterThan(0);
    for (const trace of toClient) {
      expect(trace.hops[trace.hops.length - 1]).toMatchObject({
        nodeId: 'client-1',
        event: 'deliver',
        dstIp: '192.168.1.10',
        dstPort: 49152,
      });
    }

    const closed = await tcp.teardown(sent.connection, sink);
    expect(closed.success).toBe(true);
    expect(closed.traces.every((trace) => trace.status === 'delivered')).toBe(true);
  });
});
