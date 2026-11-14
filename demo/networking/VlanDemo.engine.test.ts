/**
 * TC-1460: with the trunk cut, a host in VLAN 10 gets no ARP answer from a host in
 * VLAN 20 (802.1Q: a broadcast stays in its VLAN; ARP never asks for an address off
 * the sender's own subnet).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../../src/hooks/HookEngine';
import { SwitchForwarder } from '../../src/layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../src/layers/l3-network/RouterForwarder';
import { layerRegistry } from '../../src/registry/LayerRegistry';
import { SimulationEngine } from '../../src/simulation/SimulationEngine';
import { EMPTY_FAILURE_STATE } from '../../src/types/failure';
import type { InFlightPacket } from '../../src/types/packets';
import { VLAN_DEMO_TOPOLOGY } from './VlanDemo';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (id, t) => new RouterForwarder(id, t),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (id, t) => new SwitchForwarder(id, t),
  });
});

const ping = (src: string, dst: string): InFlightPacket => {
  const ip = (id: string) =>
    VLAN_DEMO_TOPOLOGY.nodes.find((node) => node.id === id)!.data.ip as string;
  return {
    id: 'p',
    srcNodeId: src,
    dstNodeId: dst,
    currentDeviceId: src,
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: ip(src),
        dstIp: ip(dst),
        ttl: 64,
        protocol: 1,
        payload: { layer: 'L4', type: 8, code: 0, checksum: 0, identifier: 1, sequenceNumber: 1 },
      },
    },
  };
};

const trunkCut = { ...EMPTY_FAILURE_STATE, downEdgeIds: new Set(['e-trunk']) };

describe('ARP stays in its VLAN with the trunk cut (TC-1460)', () => {
  it('never asks a host of another VLAN, and nobody of another VLAN answers', async () => {
    const engine = new SimulationEngine(VLAN_DEMO_TOPOLOGY, new HookEngine(), {
      useMainThread: true,
    });
    const nodes = VLAN_DEMO_TOPOLOGY.nodes.map((node) => node.id);
    const a1 = nodes.find((id) => /a1/i.test(id))!;
    const b1 = nodes.find((id) => /b1/i.test(id))!;
    const trace = await engine.precompute(ping(a1, b1), trunkCut);
    const asked = trace.hops.filter((hop) => hop.event === 'arp-request');
    expect(asked.map((hop) => hop.arpFrame?.payload.targetIp)).not.toContain('10.0.20.21');
    expect(trace.hops.filter((hop) => hop.event === 'arp-reply' && hop.nodeId === b1)).toEqual([]);
    expect(trace.hops.some((hop) => hop.nodeId === b1)).toBe(false);
    expect(asked[0]?.flood?.copies.map((copy) => [copy.toNodeId, copy.outcome])).toEqual([
      ['host-a2', 'discarded'],
    ]);
    expect(trace.hops[trace.hops.length - 1]).toMatchObject({
      nodeId: a1,
      event: 'drop',
      reason: 'arp-no-reply',
    });
    expect(trace.status).toBe('dropped');
  });
});
