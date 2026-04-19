import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { IpPacket } from '../types/packets';
import type { FailureState } from '../types/failure';
import type { NetworkTopology } from '../types/topology';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import { buildTransportBytes } from '../utils/packetLayout';
import { fragment } from './fragmentation';
import { ForwardingPipeline } from './ForwardingPipeline';
import { Reassembler } from './Reassembler';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';
import { makePacket } from './__fixtures__/helpers';
import { multiHopTopology } from './__fixtures__/topologies';

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

function makePipeline(topology: NetworkTopology): ForwardingPipeline {
  const hookEngine = new HookEngine();
  const traceRecorder = new TraceRecorder();
  const services = new ServiceOrchestrator(topology, hookEngine);
  const pipeline = new ForwardingPipeline(topology, hookEngine, traceRecorder, services);

  services.setPacketSender({
    precompute: (packet, failureState, options) =>
      pipeline.precompute(packet, failureState, options),
    findNode: (nodeId) => pipeline.findNode(nodeId) ?? undefined,
    getNeighbors: (
      nodeId,
      excludeNodeId: string | null = null,
      failureState: FailureState = EMPTY_FAILURE_STATE,
    ) => pipeline.getNeighbors(nodeId, excludeNodeId, failureState),
  });

  return pipeline;
}

function makeTcpPacket(totalLength = 1500, overrides: Partial<IpPacket> = {}): IpPacket {
  const packet = makePacket('reassembly', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
  const payloadBytes = Math.max(totalLength - 40, 0);
  const tcpPayload = {
    layer: 'L4' as const,
    srcPort: 12345,
    dstPort: 80,
    seq: 10,
    ack: 1,
    flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
    payload: { layer: 'raw' as const, data: 'x'.repeat(payloadBytes) },
  };

  return {
    layer: 'L3',
    srcIp: packet.frame.payload.srcIp,
    dstIp: packet.frame.payload.dstIp,
    ttl: packet.frame.payload.ttl,
    protocol: 6,
    flags: { df: false, mf: false },
    payload: tcpPayload,
    ...overrides,
  };
}

function makeLargePacket(totalLength = 1500): ReturnType<typeof makePacket> {
  const packet = makePacket('reassembly-flow', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
  const payloadBytes = Math.max(totalLength - 40, 0);
  const tcpPayload = {
    layer: 'L4' as const,
    srcPort: 12345,
    dstPort: 80,
    seq: 10,
    ack: 1,
    flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
    payload: { layer: 'raw' as const, data: 'x'.repeat(payloadBytes) },
  };

  return {
    ...packet,
    frame: {
      ...packet.frame,
      payload: {
        layer: 'L3' as const,
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        ttl: packet.frame.payload.ttl,
        protocol: 6,
        flags: { df: false, mf: false },
        payload: tcpPayload,
      },
    },
  };
}

function withEdgeMtu(topology: NetworkTopology, edgeId: string, mtuBytes: number): NetworkTopology {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, data: { ...(edge.data ?? {}), mtuBytes } } : edge,
    ),
  };
}

describe('Reassembler', () => {
  it('returns null on the first fragment of a multi-fragment packet', () => {
    const reassembler = new Reassembler();
    const fragments = fragment(makeTcpPacket(4000), 1500, 1234);

    expect(reassembler.accept(fragments[0])).toBeNull();
  });

  it('returns the reconstituted packet after the last fragment', () => {
    const reassembler = new Reassembler();
    const original = makeTcpPacket(4000);
    const fragments = fragment(original, 1500, 1234);

    reassembler.accept(fragments[0]);
    reassembler.accept(fragments[1]);

    expect(reassembler.accept(fragments[2])).toEqual({
      ...original,
      identification: 1234,
      flags: { df: false, mf: false },
      fragmentOffset: 0,
      totalLength: 4000,
    });
  });

  it('handles fragments arriving out of order', () => {
    const reassembler = new Reassembler();
    const original = makeTcpPacket(4000);
    const fragments = fragment(original, 1500, 1234);

    expect(reassembler.accept(fragments[2])).toBeNull();
    expect(reassembler.accept(fragments[0])).toBeNull();
    expect(reassembler.accept(fragments[1])).toEqual({
      ...original,
      identification: 1234,
      flags: { df: false, mf: false },
      fragmentOffset: 0,
      totalLength: 4000,
    });
  });

  it('handles two independent fragment sets in parallel', () => {
    const reassembler = new Reassembler();
    const first = fragment(makeTcpPacket(1500), 1000, 1111);
    const second = fragment(
      makeTcpPacket(1500, { srcIp: '10.0.0.20', dstIp: '203.0.113.20' }),
      1000,
      2222,
    );

    expect(reassembler.accept(first[0])).toBeNull();
    expect(reassembler.accept(second[0])).toBeNull();
    expect(reassembler.accept(first[1])?.identification).toBe(1111);
    expect(reassembler.accept(second[1])?.identification).toBe(2222);
  });

  it('passes through a non-fragmented packet unchanged', () => {
    const reassembler = new Reassembler();
    const packet = makeTcpPacket(500);

    expect(reassembler.accept(packet)).toEqual(packet);
  });

  it('clear(key) evicts pending entries', () => {
    const reassembler = new Reassembler();
    const fragments = fragment(makeTcpPacket(4000), 1500, 1234);
    const key = `${fragments[0].srcIp}|${fragments[0].dstIp}|1234|${fragments[0].protocol}`;

    reassembler.accept(fragments[0]);
    expect(reassembler.size()).toBe(1);
    reassembler.clear(key);
    expect(reassembler.size()).toBe(0);
  });
});

describe('ForwardingPipeline — reassembly integration', () => {
  it('a DF=0 packet fragmented at mtu=1000 arrives reassembled at the destination host', async () => {
    const pipeline = makePipeline(withEdgeMtu(multiHopTopology(), 'e2', 1000));
    const result = await pipeline.precompute(makeLargePacket(1500));
    const finalDeliver = result.trace.hops.find((hop) => hop.action === 'reassembly-complete')!;
    const finalSnapshot = result.snapshots[finalDeliver.step];

    expect(finalSnapshot.frame.payload.payload.layer).toBe('L4');
  });

  it('the reconstituted packet has flags.mf=false, fragmentOffset=0, totalLength restored', async () => {
    const pipeline = makePipeline(withEdgeMtu(multiHopTopology(), 'e2', 1000));
    const result = await pipeline.precompute(makeLargePacket(1500));
    const finalDeliver = result.trace.hops[result.trace.hops.length - 1];
    const finalSnapshot = result.snapshots[finalDeliver.step];

    expect(finalSnapshot.frame.payload.flags).toEqual({ df: false, mf: false });
    expect(finalSnapshot.frame.payload.fragmentOffset).toBe(0);
    expect(finalSnapshot.frame.payload.totalLength).toBe(1500);
  });

  it('delivers one reassembled TCP segment, not two TCP fragments, to the destination host', async () => {
    const pipeline = makePipeline(withEdgeMtu(multiHopTopology(), 'e2', 1000));
    const result = await pipeline.precompute(makeLargePacket(1500));
    const serverCompletedHops = result.trace.hops.filter(
      (hop) => hop.nodeId === 'server-1' && hop.action === 'reassembly-complete',
    );

    expect(serverCompletedHops).toHaveLength(1);
  });

  it('each fragment produces a hop and the final hop carries action=reassembly-complete', async () => {
    const pipeline = makePipeline(withEdgeMtu(multiHopTopology(), 'e2', 1000));
    const result = await pipeline.precompute(makeLargePacket(1500));

    expect(result.trace.hops.filter((hop) => hop.action === 'fragment')).toHaveLength(2);
    expect(result.trace.hops[result.trace.hops.length - 1]).toEqual(
      expect.objectContaining({
        action: 'reassembly-complete',
        fragmentCount: 2,
      }),
    );
  });

  it('restores the original transport bytes before delivery', async () => {
    const pipeline = makePipeline(withEdgeMtu(multiHopTopology(), 'e2', 1000));
    const original = makeLargePacket(1500);
    const result = await pipeline.precompute(original);
    const finalDeliver = result.trace.hops[result.trace.hops.length - 1];
    const finalSnapshot = result.snapshots[finalDeliver.step];

    expect(buildTransportBytes(finalSnapshot.frame.payload.payload)).toEqual(
      buildTransportBytes(original.frame.payload.payload),
    );
  });
});
