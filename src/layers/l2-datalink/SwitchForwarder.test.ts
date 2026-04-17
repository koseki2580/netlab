import { describe, expect, it } from 'vitest';
import { SwitchForwarder } from './SwitchForwarder';
import { tagFrame } from './vlan';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology, SwitchPort } from '../../types/topology';

function makePorts(overrides: Partial<SwitchPort>[] = []): SwitchPort[] {
  const defaults: SwitchPort[] = [
    { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
    { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02' },
    { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03' },
  ];

  return defaults.map((port, index) => ({ ...port, ...overrides[index] }));
}

function makeTopology(portOverrides: Partial<SwitchPort>[] = []): NetworkTopology {
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
          ports: makePorts(portOverrides),
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

function makePacket(options: {
  srcMac: string;
  dstMac: string;
  srcNodeId?: string;
  dstNodeId?: string;
  ingressPortId?: string;
  srcIp?: string;
  dstIp?: string;
  vlanId?: number;
}): InFlightPacket {
  const frame = {
    layer: 'L2' as const,
    srcMac: options.srcMac,
    dstMac: options.dstMac,
    etherType: 0x0800,
    payload: {
      layer: 'L3' as const,
      srcIp: options.srcIp ?? '10.0.0.10',
      dstIp: options.dstIp ?? '203.0.113.10',
      ttl: 64,
      protocol: 6,
      payload: {
        layer: 'L4' as const,
        srcPort: 12345,
        dstPort: 80,
        seq: 0,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw' as const, data: '' },
      },
    },
  };

  return {
    id: 'pkt-1',
    srcNodeId: options.srcNodeId ?? 'client-1',
    dstNodeId: options.dstNodeId ?? 'server-1',
    currentDeviceId: 'switch-1',
    ingressPortId: options.ingressPortId ?? 'p1',
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

describe('SwitchForwarder', () => {
  it('floods unknown unicast to the first non-ingress port and returns the connected next hop', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(
        makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99' }),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(result.egressPort).toBe('p2');
    expect(result.nextNodeId).toBe('server-1');
    expect(result.edgeId).toBe('e2');
    expect(result.packet.egressPortId).toBe('p2');
    expect(forwarder.getMacTable().get('1:02:00:00:00:00:10')).toBe('p1');
  });

  it('floods broadcast traffic to the first non-ingress port and returns the connected next hop', async () => {
    const forwarder = new SwitchForwarder('switch-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(
        makePacket({ srcMac: '02:00:00:00:00:10', dstMac: 'ff:ff:ff:ff:ff:ff' }),
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
      makePacket({
        srcMac: '02:00:00:00:00:21',
        dstMac: '02:00:00:00:00:10',
        srcNodeId: 'server-2',
        dstNodeId: 'client-1',
        ingressPortId: 'p3',
        srcIp: '203.0.113.20',
        dstIp: '10.0.0.10',
      }),
      'p3',
      { neighbors: [] },
    );

    const result = expectForward(
      await forwarder.receive(
        makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:21' }),
        'p1',
        { neighbors: [] },
      ),
    );

    expect(forwarder.getMacTable().get('1:02:00:00:00:00:21')).toBe('p3');
    expect(result.egressPort).toBe('p3');
    expect(result.nextNodeId).toBe('server-2');
    expect(result.edgeId).toBe('e3');
  });

  describe('VLAN ingress', () => {
    it('access port untagged frame → learns under accessVlan', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'access', accessVlan: 10 },
          { vlanMode: 'access', accessVlan: 10 },
        ]),
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99' }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.packet.vlanId).toBe(10);
      expect(forwarder.getMacTable().get('10:02:00:00:00:00:10')).toBe('p1');
    });

    it('trunk port tagged frame with allowed VID → learns under that VID', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
          { vlanMode: 'access', accessVlan: 20 },
        ]),
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99', vlanId: 20 }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.packet.vlanId).toBe(20);
      expect(forwarder.getMacTable().get('20:02:00:00:00:00:10')).toBe('p1');
    });

    it('trunk port untagged frame → learns under nativeVlan', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 99 },
          { vlanMode: 'access', accessVlan: 99 },
        ]),
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99' }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.packet.vlanId).toBe(99);
      expect(forwarder.getMacTable().get('99:02:00:00:00:00:10')).toBe('p1');
    });

    it('access port receiving tagged frame → drop with reason vlan-ingress-violation', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([{ vlanMode: 'access', accessVlan: 10 }]),
      );

      const result = expectDrop(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99', vlanId: 10 }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.reason).toBe('vlan-ingress-violation');
    });

    it('trunk port receiving tagged frame with disallowed VID → drop', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([{ vlanMode: 'trunk', trunkAllowedVlans: [10] }]),
      );

      const result = expectDrop(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99', vlanId: 20 }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.reason).toBe('vlan-ingress-violation');
    });

    it('same MAC in two different VLANs maps to two distinct MAC-table entries', async () => {
      const topology = makeTopology([
        { vlanMode: 'access', accessVlan: 10 },
        { vlanMode: 'access', accessVlan: 20 },
        { vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
      ]);
      const forwarder = new SwitchForwarder('switch-1', topology);

      await forwarder.receive(
        makePacket({ srcMac: '02:00:00:00:00:aa', dstMac: '02:00:00:00:00:99' }),
        'p1',
        { neighbors: [] },
      );
      await forwarder.receive(
        makePacket({
          srcMac: '02:00:00:00:00:aa',
          dstMac: '02:00:00:00:00:99',
          srcNodeId: 'server-1',
          dstNodeId: 'client-1',
          ingressPortId: 'p2',
          srcIp: '203.0.113.10',
          dstIp: '10.0.0.10',
        }),
        'p2',
        { neighbors: [] },
      );

      expect(forwarder.getMacTable().get('10:02:00:00:00:00:aa')).toBe('p1');
      expect(forwarder.getMacTable().get('20:02:00:00:00:00:aa')).toBe('p2');
    });
  });

  describe('VLAN egress', () => {
    it('broadcast is flooded only to ports in the same VLAN', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'access', accessVlan: 10 },
          { vlanMode: 'access', accessVlan: 10 },
          { vlanMode: 'access', accessVlan: 20 },
        ]),
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: 'ff:ff:ff:ff:ff:ff' }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.egressPort).toBe('p2');
      expect(result.nextNodeId).toBe('server-1');
    });

    it('unknown-unicast flood is restricted to ports carrying the ingress VLAN', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'access', accessVlan: 10 },
          { vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 1 },
          { vlanMode: 'access', accessVlan: 20 },
        ]),
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99' }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.egressPort).toBe('p2');
    });

    it('known unicast egress on access port strips tag', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'trunk', trunkAllowedVlans: [10, 20] },
          { vlanMode: 'access', accessVlan: 10 },
        ]),
      );

      await forwarder.receive(
        makePacket({
          srcMac: '02:00:00:00:00:20',
          dstMac: '02:00:00:00:00:10',
          srcNodeId: 'server-1',
          dstNodeId: 'client-1',
          ingressPortId: 'p2',
          srcIp: '203.0.113.10',
          dstIp: '10.0.0.10',
        }),
        'p2',
        { neighbors: [] },
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({
            srcMac: '02:00:00:00:00:10',
            dstMac: '02:00:00:00:00:20',
            vlanId: 10,
          }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.egressPort).toBe('p2');
      expect(result.packet.frame.vlanTag).toBeUndefined();
    });

    it('known unicast egress on trunk port for non-native VID carries tag', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'access', accessVlan: 20 },
          { vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 1 },
        ]),
      );

      await forwarder.receive(
        makePacket({
          srcMac: '02:00:00:00:00:20',
          dstMac: '02:00:00:00:00:10',
          srcNodeId: 'server-1',
          dstNodeId: 'client-1',
          ingressPortId: 'p2',
          srcIp: '203.0.113.10',
          dstIp: '10.0.0.10',
          vlanId: 20,
        }),
        'p2',
        { neighbors: [] },
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({
            srcMac: '02:00:00:00:00:10',
            dstMac: '02:00:00:00:00:20',
            srcNodeId: 'client-1',
            dstNodeId: 'server-1',
            dstIp: '203.0.113.10',
          }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.egressPort).toBe('p2');
      expect(result.packet.frame.vlanTag?.vid).toBe(20);
    });

    it('known unicast egress on trunk port for nativeVlan is untagged', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'access', accessVlan: 1 },
          { vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 1 },
        ]),
      );

      await forwarder.receive(
        makePacket({
          srcMac: '02:00:00:00:00:20',
          dstMac: '02:00:00:00:00:10',
          srcNodeId: 'server-1',
          dstNodeId: 'client-1',
          ingressPortId: 'p2',
          srcIp: '203.0.113.10',
          dstIp: '10.0.0.10',
        }),
        'p2',
        { neighbors: [] },
      );

      const result = expectForward(
        await forwarder.receive(
          makePacket({
            srcMac: '02:00:00:00:00:10',
            dstMac: '02:00:00:00:00:20',
            srcNodeId: 'client-1',
            dstNodeId: 'server-1',
            dstIp: '203.0.113.10',
          }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.egressPort).toBe('p2');
      expect(result.packet.frame.vlanTag).toBeUndefined();
    });

    it('drops when no port in the VLAN is available as egress', async () => {
      const forwarder = new SwitchForwarder(
        'switch-1',
        makeTopology([
          { vlanMode: 'access', accessVlan: 10 },
          { vlanMode: 'access', accessVlan: 20 },
          { vlanMode: 'access', accessVlan: 20 },
        ]),
      );

      const result = expectDrop(
        await forwarder.receive(
          makePacket({ srcMac: '02:00:00:00:00:10', dstMac: '02:00:00:00:00:99' }),
          'p1',
          { neighbors: [] },
        ),
      );

      expect(result.reason).toBe('no-egress-in-vlan');
    });
  });
});
