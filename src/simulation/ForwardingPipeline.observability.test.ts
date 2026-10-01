import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { NetworkTopology } from '../types/topology';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';
import { makeEngine, makePacket } from './__fixtures__/helpers';
import {
  singleRouterTopology,
  switchPassthroughTopologyWithHandles,
} from './__fixtures__/topologies';

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
    getNeighbors: (nodeId, excludeNodeId, failureState) =>
      pipeline.getNeighbors(nodeId, excludeNodeId, failureState),
  });

  return pipeline;
}

function netflowTopology(): NetworkTopology {
  const topology = singleRouterTopology();
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === 'router-1'
        ? { ...node, data: { ...node.data, netflow: { enabled: true } } }
        : node,
    ),
  };
}

describe('ForwardingPipeline observability annotations', () => {
  it('adds NetFlow update annotations on enabled routers', async () => {
    const topology = singleRouterTopology();
    const enabled: NetworkTopology = {
      ...topology,
      nodes: topology.nodes.map((node) =>
        node.id === 'router-1'
          ? { ...node, data: { ...node.data, netflow: { enabled: true } } }
          : node,
      ),
    };
    const pipeline = makePipeline(enabled);
    const result = await pipeline.precompute(
      makePacket('netflow-packet', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops.map((hop) => hop.action)).toContain('netflow:flow-update');
    expect(result.trace.hops.find((hop) => hop.action === 'netflow:flow-update')).toMatchObject({
      observabilityTrace: { kind: 'netflow:flow-update', routerId: 'router-1' },
    });
  });

  it('adds sFlow sampled annotations on enabled switches', async () => {
    const topology = switchPassthroughTopologyWithHandles();
    const enabled: NetworkTopology = {
      ...topology,
      nodes: topology.nodes.map((node) =>
        node.id === 'switch-1'
          ? { ...node, data: { ...node.data, sflow: { enabled: true, rate: 1 } } }
          : node,
      ),
    };
    const pipeline = makePipeline(enabled);
    const result = await pipeline.precompute(
      makePacket('sflow-packet', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops.map((hop) => hop.action)).toContain('sflow:sampled');
    expect(result.trace.hops.find((hop) => hop.action === 'sflow:sampled')).toMatchObject({
      observabilityTrace: { kind: 'sflow:sampled', switchId: 'switch-1' },
    });
  });

  // TC-242: a router keeps one flow-cache entry per flow and adds every
  // packet of that flow to it, send after send, until the traces are cleared.
  describe('TC-242 NetFlow cache accumulates across sends', () => {
    const packet = (id: string) =>
      makePacket(id, 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const flowUpdates = (engine: ReturnType<typeof makeEngine>) =>
      engine
        .getState()
        .traces.flatMap((trace) => trace.hops)
        .flatMap((hop) =>
          hop.observabilityTrace?.kind === 'netflow:flow-update'
            ? [{ packets: hop.observabilityTrace.packets, bytes: hop.observabilityTrace.bytes }]
            : [],
        );

    it('counts the second and third packets of a flow into the same record', async () => {
      const engine = makeEngine(netflowTopology());
      await engine.send(packet('flow-1'));
      await engine.send(packet('flow-2'));
      await engine.send(packet('flow-3'));

      const updates = flowUpdates(engine);
      const first = updates[0];
      expect(first?.packets).toBe(1);
      expect(updates).toEqual([
        { packets: 1, bytes: first?.bytes },
        { packets: 2, bytes: (first?.bytes ?? 0) * 2 },
        { packets: 3, bytes: (first?.bytes ?? 0) * 3 },
      ]);
    });

    it('does not count a probe that commits no trace', async () => {
      const engine = makeEngine(netflowTopology());
      await engine.send(packet('flow-1'));
      await engine.precompute(packet('probe'));
      await engine.send(packet('flow-2'));

      expect(flowUpdates(engine).map((update) => update.packets)).toEqual([1, 2]);
    });

    it('starts the flow again once the traces are cleared', async () => {
      const engine = makeEngine(netflowTopology());
      await engine.send(packet('flow-1'));
      engine.clear();
      await engine.send(packet('flow-2'));
      expect(flowUpdates(engine).map((update) => update.packets)).toEqual([1]);

      engine.clearTraces();
      await engine.send(packet('flow-3'));
      expect(flowUpdates(engine).map((update) => update.packets)).toEqual([1]);
    });
  });
});
