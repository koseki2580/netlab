import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import type { NetworkTopology } from '../types/topology';
import { makePacket } from './__fixtures__/helpers';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';

const GROUP = '224.1.2.3';

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

function topology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'sender',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Sender',
          layerId: 'l7',
          role: 'client',
          mac: 'aa:00:00:00:00:01',
          ip: '10.0.10.1',
        },
      },
      {
        id: 'sw',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'SW',
          layerId: 'l2',
          role: 'switch',
          ports: [
            { id: 'p1', name: 'p1', macAddress: '' },
            { id: 'p2', name: 'p2', macAddress: '' },
          ],
        },
      },
      {
        id: 'receiver',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Receiver',
          layerId: 'l7',
          role: 'client',
          mac: 'aa:00:00:00:00:02',
          ip: '10.0.10.11',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'sender', target: 'sw' },
      { id: 'e2', source: 'sw', target: 'receiver' },
    ],
    routeTables: new Map(),
    areas: [],
  };
}

function makePipeline(net: NetworkTopology) {
  const hookEngine = new HookEngine();
  const services = new ServiceOrchestrator(net, hookEngine);
  const pipeline = new ForwardingPipeline(net, hookEngine, new TraceRecorder(), services);
  return { pipeline, services };
}

async function sendToGroup(pipeline: ForwardingPipeline) {
  const packet = makePacket('m1', 'sender', 'receiver', '10.0.10.1', GROUP);
  const { trace } = await pipeline.precompute(packet, EMPTY_FAILURE_STATE, {});
  return trace.hops[trace.hops.length - 1];
}

describe('multicast delivery to a group member', () => {
  /**
   * TC-107 — the lesson's whole subject. A receiver that has joined the group
   * gets the datagram. Before this, every group datagram was dropped as
   * "no route" whether or not anyone had joined, so the IGMP snooping lesson
   * demonstrated nothing: joining changed no outcome.
   */
  it('delivers a group datagram to a host that joined the group', async () => {
    const net = topology();
    const { pipeline, services } = makePipeline(net);
    services.addJoinedGroup('receiver', GROUP);

    const last = await sendToGroup(pipeline);

    expect(last?.event).toBe('deliver');
  });

  /**
   * TC-108 — and the other half of what the lesson teaches: a host that never
   * joined discards the traffic, and says so as itself rather than as a
   * routing failure. "No route" would tell the learner the network could not
   * find the receiver, which is the opposite of what happened.
   */
  it('refuses a group datagram at a host that has not joined', async () => {
    const { pipeline } = makePipeline(topology());

    const last = await sendToGroup(pipeline);

    expect(last?.event).toBe('drop');
    expect(last?.reason).toBe('not-group-member');
  });

  /**
   * TC-109 — leaving is not the same as never joining, and must undo the join.
   */
  it('refuses a group datagram again once the host leaves the group', async () => {
    const net = topology();
    const { pipeline, services } = makePipeline(net);
    services.addJoinedGroup('receiver', GROUP);
    services.removeJoinedGroup('receiver', GROUP);

    const last = await sendToGroup(pipeline);

    expect(last?.event).toBe('drop');
    expect(last?.reason).toBe('not-group-member');
  });
});
