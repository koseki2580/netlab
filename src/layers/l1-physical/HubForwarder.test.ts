import { describe, expect, it } from 'vitest';
import { HubForwarder } from './HubForwarder';
import { makePacket } from '../../simulation/__fixtures__/helpers';
import { hubFanoutTopology } from '../../simulation/__fixtures__/topologies';
import type { NetworkTopology, SwitchPort } from '../../types/topology';

const ports: SwitchPort[] = [
  { id: 'p1', name: 'p1', macAddress: '00:00:00:00:00:01' },
  { id: 'p2', name: 'p2', macAddress: '00:00:00:00:00:02' },
  { id: 'p3', name: 'p3', macAddress: '00:00:00:00:00:03' },
];

function topology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'hub-1',
        type: 'hub',
        position: { x: 0, y: 0 },
        data: { label: 'Hub', layerId: 'l1', role: 'hub', ports },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

describe('HubForwarder', () => {
  it('floods every port except the ingress port without MAC learning', () => {
    const forwarder = new HubForwarder('hub-1', topology());

    expect(forwarder.forward('p1', ports)).toEqual(['p2', 'p3']);
    expect(forwarder.forward('p2', ports)).toEqual(['p1', 'p3']);
  });

  it('returns a non-ingress neighbor when receiving a frame', async () => {
    const forwarder = new HubForwarder('hub-1', hubFanoutTopology());
    const packet = makePacket('pkt-1', 'client-1', 'server-1', '10.0.0.10', '10.0.0.20');

    const decision = await forwarder.receive(packet, 'p1', {
      neighbors: [
        { nodeId: 'client-1', edgeId: 'e-client-hub' },
        { nodeId: 'server-1', edgeId: 'e-hub-server-1' },
        { nodeId: 'server-2', edgeId: 'e-hub-server-2' },
      ],
    });

    expect(decision.action).toBe('forward');
    if (decision.action !== 'forward') {
      throw new Error(`expected forward decision, got ${decision.action}`);
    }
    expect(decision.nextNodeId).toBe('server-1');
    expect(decision.edgeId).toBe('e-hub-server-1');
    expect(decision.egressPort).toBe('p2');
    expect(decision.packet.egressPortId).toBe('p2');
  });
});
