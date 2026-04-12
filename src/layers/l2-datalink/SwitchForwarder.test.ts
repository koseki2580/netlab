import { describe, expect, it } from 'vitest';
import { SwitchForwarder } from './SwitchForwarder';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';

function makeTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 200, y: 0 },
        data: {
          label: 'Switch',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
            { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02' },
            { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: -100 },
        data: {
          label: 'Server 1',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: '02:00:00:00:00:20',
        },
      },
      {
        id: 'server-2',
        type: 'server',
        position: { x: 400, y: 100 },
        data: {
          label: 'Server 2',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.20',
          mac: '02:00:00:00:00:21',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1', targetHandle: 'p1' },
      { id: 'e2', source: 'switch-1', target: 'server-1', sourceHandle: 'p2' },
      { id: 'e3', source: 'switch-1', target: 'server-2', sourceHandle: 'p3' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

function makePacket(srcMac: string, dstMac: string): InFlightPacket {
  return {
    id: 'pkt-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    currentDeviceId: 'switch-1',
    ingressPortId: 'p1',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac,
      dstMac,
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.10',
        dstIp: '203.0.113.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  };
}

function expectForward(result: Awaited<ReturnType<SwitchForwarder['receive']>>) {
  expect(result.action).toBe('forward');
  if (result.action !== 'forward') {
    throw new Error(`expected forward decision, got ${result.action}`);
  }
  return result;
}

describe('SwitchForwarder', () => {
  it('floods unknown unicast to the first non-ingress port and returns the connected next hop', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(
        makePacket('02:00:00:00:00:10', '02:00:00:00:00:99'),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(result.egressPort).toBe('p2');
    expect(result.nextNodeId).toBe('server-1');
    expect(result.edgeId).toBe('e2');
    expect(result.packet.egressPortId).toBe('p2');
    expect(forwarder.getMacTable().get('02:00:00:00:00:10')).toBe('p1');
  });

  it('floods broadcast traffic to the first non-ingress port and returns the connected next hop', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(
        makePacket('02:00:00:00:00:10', 'ff:ff:ff:ff:ff:ff'),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(result.egressPort).toBe('p2');
    expect(result.nextNodeId).toBe('server-1');
    expect(result.edgeId).toBe('e2');
  });

  it('uses the learned MAC port for known unicast and returns that port target', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology());

    await forwarder.receive(
      makePacket('02:00:00:00:00:21', '02:00:00:00:00:10'),
      'p3',
      { neighbors: [] },
    );

    const result = expectForward(
      await forwarder.receive(
        makePacket('02:00:00:00:00:10', '02:00:00:00:00:21'),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(forwarder.getMacTable().get('02:00:00:00:00:21')).toBe('p3');
    expect(result.egressPort).toBe('p3');
    expect(result.nextNodeId).toBe('server-2');
    expect(result.edgeId).toBe('e3');
  });
});
