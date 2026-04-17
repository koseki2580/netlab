import { describe, expect, it } from 'vitest';
import { SwitchForwarder } from './SwitchForwarder';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology, StpPortRuntime, SwitchPort } from '../../types/topology';

function makePorts(): SwitchPort[] {
  return [
    { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
    { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02' },
    { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03' },
  ];
}

function makeTopology(stpStates?: Map<string, StpPortRuntime>): NetworkTopology {
  return {
    nodes: [
      {
        id: 'host-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Host',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch 1',
          role: 'switch',
          layerId: 'l2',
          ports: makePorts(),
        },
      },
      {
        id: 'switch-2',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch 2',
          role: 'switch',
          layerId: 'l2',
          ports: [{ id: 'q1', name: 'fa0/1', macAddress: '02:00:00:20:00:01' }],
        },
      },
      {
        id: 'switch-3',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch 3',
          role: 'switch',
          layerId: 'l2',
          ports: [{ id: 'r1', name: 'fa0/1', macAddress: '02:00:00:30:00:01' }],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'host-1', target: 'switch-1', targetHandle: 'p1' },
      { id: 'e2', source: 'switch-1', target: 'switch-2', sourceHandle: 'p2', targetHandle: 'q1' },
      { id: 'e3', source: 'switch-1', target: 'switch-3', sourceHandle: 'p3', targetHandle: 'r1' },
    ],
    areas: [],
    routeTables: new Map(),
    stpStates,
  };
}

function makePacket(options?: Partial<Pick<InFlightPacket, 'dstNodeId' | 'ingressPortId'>>) {
  return {
    id: 'pkt-1',
    srcNodeId: 'host-1',
    dstNodeId: options?.dstNodeId ?? 'switch-2',
    currentDeviceId: 'switch-1',
    ingressPortId: options?.ingressPortId ?? 'p1',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2' as const,
      srcMac: '02:00:00:00:00:10',
      dstMac: '02:00:00:00:00:99',
      etherType: 0x0800,
      payload: {
        layer: 'L3' as const,
        srcIp: '10.0.0.10',
        dstIp: '10.0.0.99',
        ttl: 64,
        protocol: 1,
        payload: {
          layer: 'L4' as const,
          type: 8,
          code: 0,
          checksum: 0,
        },
      },
    },
  } satisfies InFlightPacket;
}

function makeStpRuntime(
  portId: string,
  role: StpPortRuntime['role'],
  state: StpPortRuntime['state'],
): StpPortRuntime {
  return {
    switchNodeId: 'switch-1',
    portId,
    role,
    state,
    designatedBridge: { priority: 32768, mac: '02:00:00:10:00:01' },
    rootPathCost: 0,
  };
}

function expectForward(result: Awaited<ReturnType<SwitchForwarder['receive']>>) {
  expect(result.action).toBe('forward');
  if (result.action !== 'forward') {
    throw new Error(`expected forward decision, got ${result.action}`);
  }

  return result;
}

function expectDrop(result: Awaited<ReturnType<SwitchForwarder['receive']>>) {
  expect(result.action).toBe('drop');
  if (result.action !== 'drop') {
    throw new Error(`expected drop decision, got ${result.action}`);
  }

  return result;
}

describe('SwitchForwarder — STP', () => {
  it('frame arriving on a BLOCKING port is dropped with reason stp-port-blocked', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology(new Map([
      ['switch-1:p1', makeStpRuntime('p1', 'BLOCKED', 'BLOCKING')],
    ])));

    const result = expectDrop(await forwarder.receive(makePacket(), 'p1', { neighbors: [] }));

    expect(result.reason).toBe('stp-port-blocked');
  });

  it('flood excludes BLOCKING ports', () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology(new Map([
      ['switch-1:p2', makeStpRuntime('p2', 'BLOCKED', 'BLOCKING')],
    ])));

    expect(forwarder.forward('ff:ff:ff:ff:ff:ff', 'p1', makePorts(), 1)).toEqual(['p3']);
  });

  it('unknown-unicast flood excludes BLOCKING ports', () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology(new Map([
      ['switch-1:p2', makeStpRuntime('p2', 'BLOCKED', 'BLOCKING')],
    ])));

    expect(forwarder.forward('02:00:00:00:00:99', 'p1', makePorts(), 1)).toEqual(['p3']);
  });

  it('learned MAC pointing at a blocked port causes re-selection of an alternate egress', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology(new Map([
      ['switch-1:p2', makeStpRuntime('p2', 'BLOCKED', 'BLOCKING')],
    ])));
    forwarder.learn('02:00:00:00:00:22', 'p2', 1);

    const packet = makePacket();
    packet.frame.dstMac = '02:00:00:00:00:22';
    const result = expectForward(await forwarder.receive(packet, 'p1', {
      neighbors: [
        { nodeId: 'switch-2', edgeId: 'e2' },
        { nodeId: 'switch-3', edgeId: 'e3' },
      ],
    }));

    expect(result.egressPort).toBe('p3');
    expect(result.edgeId).toBe('e3');
    expect(result.nextNodeId).toBe('switch-3');
  });

  it('port missing from stpStates map falls through to existing behavior (no-op default)', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology(new Map([
      ['switch-1:p2', makeStpRuntime('p2', 'BLOCKED', 'BLOCKING')],
    ])));

    const result = expectForward(await forwarder.receive(makePacket(), 'p1', { neighbors: [] }));

    expect(result.egressPort).toBe('p3');
  });

  it('DISABLED port is treated the same as BLOCKING for ingress drop and egress exclusion', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology(new Map([
      ['switch-1:p2', makeStpRuntime('p2', 'DISABLED', 'DISABLED')],
    ])));

    expect(forwarder.forward('ff:ff:ff:ff:ff:ff', 'p1', makePorts(), 1)).toEqual(['p3']);

    const result = expectDrop(await forwarder.receive(makePacket({ ingressPortId: 'p2' }), 'p2', { neighbors: [] }));

    expect(result.reason).toBe('stp-port-blocked');
  });
});
