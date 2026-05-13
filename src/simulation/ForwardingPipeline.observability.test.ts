import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { NetworkTopology } from '../types/topology';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';
import { makePacket } from './__fixtures__/helpers';
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
});
