import { describe, expect, it } from 'vitest';
import { SwitchForwarder } from './SwitchForwarder';
import { tagFrame } from './vlan';
import type { InFlightPacket } from '../../types/packets';
import type { NetlabNode, NetlabEdge, NetworkTopology, SwitchPort } from '../../types/topology';

function makeHost(id: string, ip: string, mac: string): NetlabNode {
  return {
    id,
    type: 'client',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'client',
      layerId: 'l7',
      ip,
      mac,
    },
  };
}

function makeSwitch(id: string, ports: SwitchPort[]): NetlabNode {
  return {
    id,
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'switch',
      layerId: 'l2',
      ports,
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): NetlabEdge {
  return { id, source, target, sourceHandle, targetHandle };
}

function makeTopology(nodes: NetlabNode[], edges: NetlabEdge[]): NetworkTopology {
  return {
    nodes,
    edges,
    areas: [],
    routeTables: new Map(),
  };
}

function makePacket(options: {
  id?: string;
  srcNodeId: string;
  dstNodeId: string;
  srcMac: string;
  dstMac: string;
  srcIp: string;
  dstIp: string;
  currentDeviceId: string;
  ingressPortId: string;
  vlanId?: number;
}): InFlightPacket {
  const frame = {
    layer: 'L2' as const,
    srcMac: options.srcMac,
    dstMac: options.dstMac,
    etherType: 0x0800,
    payload: {
      layer: 'L3' as const,
      srcIp: options.srcIp,
      dstIp: options.dstIp,
      ttl: 64,
      protocol: 1,
      payload: {
        layer: 'L4' as const,
        type: 8,
        code: 0,
        checksum: 0,
      },
    },
  };

  return {
    id: options.id ?? 'pkt-1',
    srcNodeId: options.srcNodeId,
    dstNodeId: options.dstNodeId,
    currentDeviceId: options.currentDeviceId,
    ingressPortId: options.ingressPortId,
    path: [],
    timestamp: 0,
    frame: options.vlanId ? tagFrame(frame, options.vlanId) : frame,
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

describe('SwitchForwarder — VLAN scenarios', () => {
  it('access-only switch: two hosts in VLAN 10 reach each other', async () => {
    const topology = makeTopology(
      [
        makeHost('host-a1', '10.0.10.11', '02:00:00:00:10:11'),
        makeHost('host-a2', '10.0.10.12', '02:00:00:00:10:12'),
        makeSwitch('switch-1', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 10 },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02', vlanMode: 'access', accessVlan: 10 },
        ]),
      ],
      [
        makeEdge('e1', 'host-a1', 'switch-1', undefined, 'p1'),
        makeEdge('e2', 'switch-1', 'host-a2', 'p2'),
      ],
    );
    const forwarder = new SwitchForwarder('switch-1', topology);

    const toA2 = expectForward(
      await forwarder.receive(
        makePacket({
          srcNodeId: 'host-a1',
          dstNodeId: 'host-a2',
          srcMac: '02:00:00:00:10:11',
          dstMac: '02:00:00:00:10:12',
          srcIp: '10.0.10.11',
          dstIp: '10.0.10.12',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p1',
        }),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(toA2.egressPort).toBe('p2');
    expect(toA2.packet.vlanId).toBe(10);
    expect(toA2.packet.frame.vlanTag).toBeUndefined();
  });

  it('access-only switch: hosts in VLAN 10 and VLAN 20 cannot reach each other (broadcast isolation)', async () => {
    const topology = makeTopology(
      [
        makeHost('host-a1', '10.0.10.11', '02:00:00:00:10:11'),
        makeHost('host-b1', '10.0.20.21', '02:00:00:00:20:21'),
        makeSwitch('switch-1', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 10 },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02', vlanMode: 'access', accessVlan: 20 },
        ]),
      ],
      [
        makeEdge('e1', 'host-a1', 'switch-1', undefined, 'p1'),
        makeEdge('e2', 'switch-1', 'host-b1', 'p2'),
      ],
    );
    const forwarder = new SwitchForwarder('switch-1', topology);

    const result = expectDrop(
      await forwarder.receive(
        makePacket({
          srcNodeId: 'host-a1',
          dstNodeId: 'host-b1',
          srcMac: '02:00:00:00:10:11',
          dstMac: '02:00:00:00:20:21',
          srcIp: '10.0.10.11',
          dstIp: '10.0.20.21',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p1',
        }),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(result.reason).toBe('no-egress-in-vlan');
  });

  it('trunk between two switches carries tagged traffic for both VLANs', async () => {
    const topology = makeTopology(
      [
        makeHost('host-a1', '10.0.10.11', '02:00:00:00:10:11'),
        makeHost('host-b1', '10.0.20.21', '02:00:00:00:20:21'),
        makeHost('host-a2', '10.0.10.12', '02:00:00:00:10:12'),
        makeHost('host-b2', '10.0.20.22', '02:00:00:00:20:22'),
        makeSwitch('switch-1', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 10 },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02', vlanMode: 'access', accessVlan: 20 },
          { id: 'p3', name: 'fa0/24', macAddress: '02:00:00:10:00:24', vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
        ]),
        makeSwitch('switch-2', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:20:00:01', vlanMode: 'access', accessVlan: 10 },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:20:00:02', vlanMode: 'access', accessVlan: 20 },
          { id: 'p3', name: 'fa0/24', macAddress: '02:00:00:20:00:24', vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
        ]),
      ],
      [
        makeEdge('e-a1', 'host-a1', 'switch-1', undefined, 'p1'),
        makeEdge('e-b1', 'host-b1', 'switch-1', undefined, 'p2'),
        makeEdge('e-trunk', 'switch-1', 'switch-2', 'p3', 'p3'),
        makeEdge('e-a2', 'switch-2', 'host-a2', 'p1'),
        makeEdge('e-b2', 'switch-2', 'host-b2', 'p2'),
      ],
    );
    const switch1 = new SwitchForwarder('switch-1', topology);
    const switch2 = new SwitchForwarder('switch-2', topology);

    const vlan10OnTrunk = expectForward(
      await switch1.receive(
        makePacket({
          srcNodeId: 'host-a1',
          dstNodeId: 'host-a2',
          srcMac: '02:00:00:00:10:11',
          dstMac: '02:00:00:00:10:12',
          srcIp: '10.0.10.11',
          dstIp: '10.0.10.12',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p1',
        }),
        'p1',
        { neighbors: [] },
      ),
    );
    const vlan10ToAccess = expectForward(
      await switch2.receive(vlan10OnTrunk.packet, 'p3', { neighbors: [] }),
    );

    expect(vlan10OnTrunk.egressPort).toBe('p3');
    expect(vlan10OnTrunk.packet.frame.vlanTag?.vid).toBe(10);
    expect(vlan10ToAccess.egressPort).toBe('p1');
    expect(vlan10ToAccess.packet.frame.vlanTag).toBeUndefined();

    const vlan20OnTrunk = expectForward(
      await switch1.receive(
        makePacket({
          id: 'pkt-20',
          srcNodeId: 'host-b1',
          dstNodeId: 'host-b2',
          srcMac: '02:00:00:00:20:21',
          dstMac: '02:00:00:00:20:22',
          srcIp: '10.0.20.21',
          dstIp: '10.0.20.22',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p2',
        }),
        'p2',
        { neighbors: [] },
      ),
    );
    const vlan20ToAccess = expectForward(
      await switch2.receive(vlan20OnTrunk.packet, 'p3', { neighbors: [] }),
    );

    expect(vlan20OnTrunk.egressPort).toBe('p3');
    expect(vlan20OnTrunk.packet.frame.vlanTag?.vid).toBe(20);
    expect(vlan20ToAccess.egressPort).toBe('p2');
    expect(vlan20ToAccess.packet.frame.vlanTag).toBeUndefined();
  });

  it('trunk strips tag for the native VLAN (default 1)', async () => {
    const topology = makeTopology(
      [
        makeHost('host-n1', '10.0.1.11', '02:00:00:00:01:11'),
        makeHost('host-n2', '10.0.1.12', '02:00:00:00:01:12'),
        makeSwitch('switch-1', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 1 },
          { id: 'p3', name: 'fa0/24', macAddress: '02:00:00:10:00:24', vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
        ]),
        makeSwitch('switch-2', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:20:00:01', vlanMode: 'access', accessVlan: 1 },
          { id: 'p3', name: 'fa0/24', macAddress: '02:00:00:20:00:24', vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
        ]),
      ],
      [
        makeEdge('e-n1', 'host-n1', 'switch-1', undefined, 'p1'),
        makeEdge('e-trunk', 'switch-1', 'switch-2', 'p3', 'p3'),
        makeEdge('e-n2', 'switch-2', 'host-n2', 'p1'),
      ],
    );
    const switch1 = new SwitchForwarder('switch-1', topology);
    const switch2 = new SwitchForwarder('switch-2', topology);

    const onTrunk = expectForward(
      await switch1.receive(
        makePacket({
          srcNodeId: 'host-n1',
          dstNodeId: 'host-n2',
          srcMac: '02:00:00:00:01:11',
          dstMac: '02:00:00:00:01:12',
          srcIp: '10.0.1.11',
          dstIp: '10.0.1.12',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p1',
        }),
        'p1',
        { neighbors: [] },
      ),
    );
    const toAccess = expectForward(
      await switch2.receive(onTrunk.packet, 'p3', { neighbors: [] }),
    );

    expect(onTrunk.packet.vlanId).toBe(1);
    expect(onTrunk.packet.frame.vlanTag).toBeUndefined();
    expect(toAccess.packet.frame.vlanTag).toBeUndefined();
  });

  it('tagged frame arriving on access port is dropped', async () => {
    const topology = makeTopology(
      [
        makeHost('host-a1', '10.0.10.11', '02:00:00:00:10:11'),
        makeSwitch('switch-1', [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 10 },
        ]),
      ],
      [makeEdge('e1', 'host-a1', 'switch-1', undefined, 'p1')],
    );
    const forwarder = new SwitchForwarder('switch-1', topology);

    const result = expectDrop(
      await forwarder.receive(
        makePacket({
          srcNodeId: 'host-a1',
          dstNodeId: 'host-a1',
          srcMac: '02:00:00:00:10:11',
          dstMac: 'ff:ff:ff:ff:ff:ff',
          srcIp: '10.0.10.11',
          dstIp: '255.255.255.255',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p1',
          vlanId: 10,
        }),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(result.reason).toBe('vlan-ingress-violation');
  });

  it('trunk with restrictive trunkAllowedVlans drops disallowed VIDs', async () => {
    const topology = makeTopology(
      [
        makeSwitch('switch-1', [
          { id: 'p1', name: 'fa0/24', macAddress: '02:00:00:10:00:24', vlanMode: 'trunk', trunkAllowedVlans: [10] },
          { id: 'p2', name: 'fa0/1', macAddress: '02:00:00:10:00:01', vlanMode: 'access', accessVlan: 20 },
        ]),
      ],
      [],
    );
    const forwarder = new SwitchForwarder('switch-1', topology);

    const result = expectDrop(
      await forwarder.receive(
        makePacket({
          srcNodeId: 'host-b1',
          dstNodeId: 'host-b2',
          srcMac: '02:00:00:00:20:21',
          dstMac: '02:00:00:00:20:22',
          srcIp: '10.0.20.21',
          dstIp: '10.0.20.22',
          currentDeviceId: 'switch-1',
          ingressPortId: 'p1',
          vlanId: 20,
        }),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(result.reason).toBe('vlan-ingress-violation');
  });
});
