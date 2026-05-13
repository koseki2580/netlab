import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import type { NetworkTopology } from '../types/topology';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';
import { makePacket } from './__fixtures__/helpers';
import { singleRouterTopology } from './__fixtures__/topologies';

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

function withQos(topology: NetworkTopology): NetworkTopology {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === 'e2'
        ? {
            ...edge,
            data: {
              ...(edge.data ?? {}),
              link: { bandwidthBps: 1_000_000, propagationDelayMs: 20 },
            },
          }
        : edge,
    ),
  };
}

function make1500BytePacket(id: string) {
  const packet = makePacket(id, 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
  return {
    ...packet,
    frame: {
      ...packet.frame,
      payload: {
        ...packet.frame.payload,
        totalLength: 1500,
      },
    },
  };
}

describe('ForwardingPipeline link QoS', () => {
  it('keeps legacy traces unchanged when no edge has link QoS', async () => {
    const pipeline = makePipeline(singleRouterTopology());
    const result = await pipeline.precompute(
      makePacket('fp-link-qos-legacy', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops.map((hop) => [hop.step, hop.event, hop.action])).toEqual([
      [0, 'create', undefined],
      [1, 'forward', undefined],
      [2, 'deliver', undefined],
    ]);
  });

  it('adds deterministic link annotations and step delay for a configured egress edge', async () => {
    const pipeline = makePipeline(withQos(singleRouterTopology()));
    const result = await pipeline.precompute(make1500BytePacket('fp-link-qos'));
    const actions = result.trace.hops.map((hop) => hop.action);

    expect(actions).toEqual([
      undefined,
      'link:enqueued',
      'link:dequeued',
      'link:arrived',
      undefined,
      undefined,
    ]);
    expect(result.trace.hops[1]).toMatchObject({
      event: 'forward',
      activeEdgeId: 'e2',
      linkQos: { edgeId: 'e2', segSeq: 1, queueDepth: 1 },
    });
    expect(result.trace.hops[3]).toMatchObject({
      step: 34,
      action: 'link:arrived',
      linkQos: { edgeId: 'e2', totalLatencySteps: 32 },
    });
    expect(result.trace.status).toBe('delivered');
  });

  it('drops with link:dropped when seeded loss selects the segment', async () => {
    const topology = withQos(singleRouterTopology());
    const lossyTopology: NetworkTopology = {
      ...topology,
      edges: topology.edges.map((edge) =>
        edge.id === 'e2'
          ? { ...edge, data: { ...(edge.data ?? {}), link: { lossPct: 100, lossSeed: 1 } } }
          : edge,
      ),
    };
    const pipeline = makePipeline(lossyTopology);
    const result = await pipeline.precompute(make1500BytePacket('fp-link-qos-loss'));

    expect(result.trace.status).toBe('dropped');
    expect(result.trace.hops[result.trace.hops.length - 1]).toMatchObject({
      event: 'drop',
      action: 'link:dropped',
      reason: 'loss',
      linkQos: { edgeId: 'e2', segSeq: 1, reason: 'loss' },
    });
  });

  it('adds shaper annotations when a configured edge classifies DSCP traffic', async () => {
    const topology = withQos(singleRouterTopology());
    const shapedTopology: NetworkTopology = {
      ...topology,
      edges: topology.edges.map((edge) =>
        edge.id === 'e2'
          ? {
              ...edge,
              data: {
                ...(edge.data ?? {}),
                link: {
                  bandwidthBps: 1_000_000,
                  propagationDelayMs: 20,
                  shaper: {
                    classes: [
                      { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
                      {
                        id: 'be',
                        dscp: [],
                        weightPct: 20,
                        queueDepthSegments: 8,
                        default: true,
                      },
                    ],
                  },
                },
              },
            }
          : edge,
      ),
    };
    const packet = make1500BytePacket('fp-link-shaper');
    const pipeline = makePipeline(shapedTopology);
    const result = await pipeline.precompute({
      ...packet,
      frame: {
        ...packet.frame,
        payload: { ...packet.frame.payload, dscp: 46 },
      },
    });

    expect(result.trace.hops.map((hop) => hop.action)).toContain('shaper:classified');
    expect(result.trace.hops.map((hop) => hop.action)).toContain('shaper:dequeued');
    expect(result.trace.hops.find((hop) => hop.action === 'shaper:classified')).toMatchObject({
      shaperTrace: { classId: 'ef', dscp: 46 },
    });
  });
});
