import { describe, expect, it } from 'vitest';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology, SwitchPort } from '../../types/topology';
import { SwitchForwarder } from './SwitchForwarder';

/**
 * A triangle of switches with one host on each, which is the shape of the
 * spanning-tree lesson: `host-b` pings `host-c`, and the trace must arrive
 * there. At `sw-a` the destination is two hops away, so no rule about direct
 * neighbours applies and the switch fell back to whichever neighbour came
 * first — `host-a`, a leaf that discards it. The lesson's own brief says the
 * traffic "detours through Switch A" to reach C; it stopped one hop short.
 */
function ports(ids: string[]): SwitchPort[] {
  return ids.map((id) => ({ id, name: id, macAddress: '' }));
}

function triangle(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'sw-a',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'sw-a',
          layerId: 'l2',
          role: 'switch',
          ports: ports(['pa-host', 'pa-b', 'pa-c']),
        },
      },
      {
        id: 'sw-b',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'sw-b',
          layerId: 'l2',
          role: 'switch',
          ports: ports(['pb-host', 'pb-a', 'pb-c']),
        },
      },
      {
        id: 'sw-c',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'sw-c',
          layerId: 'l2',
          role: 'switch',
          ports: ports(['pc-host', 'pc-a', 'pc-b']),
        },
      },
      {
        id: 'host-a',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'A',
          layerId: 'l7',
          role: 'client',
          mac: 'aa:00:00:00:00:01',
          ip: '10.0.0.11',
        },
      },
      {
        id: 'host-b',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'B',
          layerId: 'l7',
          role: 'client',
          mac: 'aa:00:00:00:00:02',
          ip: '10.0.0.12',
        },
      },
      {
        id: 'host-c',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'C',
          layerId: 'l7',
          role: 'client',
          mac: 'aa:00:00:00:00:03',
          ip: '10.0.0.13',
        },
      },
    ],
    edges: [
      { id: 'e-a-host', source: 'host-a', target: 'sw-a', targetHandle: 'pa-host' },
      { id: 'e-b-host', source: 'host-b', target: 'sw-b', targetHandle: 'pb-host' },
      { id: 'e-c-host', source: 'host-c', target: 'sw-c', targetHandle: 'pc-host' },
      { id: 'e-ab', source: 'sw-a', target: 'sw-b', sourceHandle: 'pa-b', targetHandle: 'pb-a' },
      { id: 'e-ac', source: 'sw-a', target: 'sw-c', sourceHandle: 'pa-c', targetHandle: 'pc-a' },
    ],
    routeTables: new Map(),
    areas: [],
  };
}

function pingToC(): InFlightPacket {
  return {
    id: 'p1',
    srcNodeId: 'host-b',
    dstNodeId: 'host-c',
    currentDeviceId: 'sw-a',
    ingressPortId: 'pa-b',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: 'aa:00:00:00:00:02',
      // The lesson sends before anyone has learned the destination, which is
      // the case that matters: with a known MAC the table decides.
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.12',
        dstIp: '10.0.0.13',
        ttl: 64,
        protocol: 1,
        payload: {
          layer: 'L4',
          type: 8,
          code: 0,
          checksum: 0,
          identifier: 1,
          sequenceNumber: 1,
          data: 'x',
        },
      },
    },
  };
}

describe('a switch choosing where to send an unlearned frame', () => {
  /** TC-111 */
  it('sends it on towards a destination two hops away, not to a leaf host', async () => {
    const forwarder = new SwitchForwarder('sw-a', triangle());

    const decision = await forwarder.receive(pingToC(), 'pa-b', {
      neighbors: [
        { nodeId: 'host-a', edgeId: 'e-a-host' },
        { nodeId: 'sw-c', edgeId: 'e-ac' },
      ],
    });

    expect(decision.action).toBe('forward');
    expect(decision.action === 'forward' ? decision.nextNodeId : null).toBe('sw-c');
  });

  /** TC-112 — and it still forwards when no neighbour leads anywhere. */
  it('still forwards when the destination is behind none of the neighbours', async () => {
    const forwarder = new SwitchForwarder('sw-a', triangle());
    const packet = { ...pingToC(), dstNodeId: 'nobody' };

    const decision = await forwarder.receive(packet, 'pa-b', {
      neighbors: [{ nodeId: 'host-a', edgeId: 'e-a-host' }],
    });

    expect(decision.action).toBe('forward');
    expect(decision.action === 'forward' ? decision.nextNodeId : null).toBe('host-a');
  });
});
