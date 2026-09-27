import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import { bubbleForHop, canvasPacketFrom, packetStoryFrom } from './packetStory';

function hop(step: number, nodeId: string, extra: Partial<PacketHop> = {}): PacketHop {
  return {
    step,
    nodeId,
    nodeLabel: nodeId,
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'ICMP',
    event: 'forward',
    timestamp: step,
    ...extra,
  };
}

const HOPS: PacketHop[] = [
  hop(0, 'client', { event: 'create', toNodeId: 'sw' }),
  hop(1, 'sw', { fromNodeId: 'client', toNodeId: 'router' }),
  hop(2, 'router', {
    event: 'arp-request',
    arpFrame: {
      layer: 'L2',
      srcMac: '00:00:00:02:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'request',
        senderMac: '00:00:00:02:00:01',
        senderIp: '203.0.113.1',
        targetMac: '00:00:00:00:00:00',
        targetIp: '203.0.113.10',
      },
    },
  }),
  hop(3, 'server', {
    event: 'arp-reply',
    arpFrame: {
      layer: 'L2',
      srcMac: '02:e1:2e:d8:d4:08',
      dstMac: '00:00:00:02:00:01',
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'reply',
        senderMac: '02:e1:2e:d8:d4:08',
        senderIp: '203.0.113.10',
        targetMac: '00:00:00:02:00:01',
        targetIp: '203.0.113.1',
      },
    },
  }),
  hop(4, 'router', { fromNodeId: 'sw', toNodeId: 'server' }),
  hop(5, 'server', { event: 'deliver', fromNodeId: 'router' }),
];

const TRACE: PacketTrace = {
  packetId: 'p1',
  srcNodeId: 'client',
  dstNodeId: 'server',
  hops: HOPS,
  status: 'delivered',
};

function state(overrides: Partial<Parameters<typeof packetStoryFrom>[0]> = {}) {
  return {
    traces: [TRACE],
    currentTraceId: 'p1',
    currentStep: -1,
    selectedHop: null,
    ...overrides,
  };
}

describe('packetStoryFrom', () => {
  it('draws nothing before a packet is sent', () => {
    expect(packetStoryFrom(state({ traces: [], currentTraceId: null }))).toBeNull();
  });

  it('rests the packet on the device of the hop being shown, arriving from where it came', () => {
    const story = packetStoryFrom(state({ currentStep: 1 }));
    expect(story).toMatchObject({ at: 'sw', route: ['client', 'sw'] });
  });

  it('shows the packet appearing at its source on the first hop', () => {
    expect(packetStoryFrom(state({ currentStep: 0 }))).toMatchObject({
      at: 'client',
      route: ['client'],
      bubble: null,
    });
  });

  it('follows a hop picked in the timeline over the step counter', () => {
    const story = packetStoryFrom(state({ currentStep: 1, selectedHop: HOPS[5]! }));
    expect(story?.at).toBe('server');
  });

  it('gives each hop its own identity so the motion replays per hop', () => {
    const first = packetStoryFrom(state({ currentStep: 1 }));
    const second = packetStoryFrom(state({ currentStep: 4 }));
    expect(first?.id).not.toBe(second?.id);
  });

  it('plays the whole journey when a packet was sent and not stepped, skipping the ARP side trip', () => {
    const story = packetStoryFrom(state());
    expect(story).toMatchObject({
      at: 'server',
      route: ['client', 'sw', 'router', 'server'],
      bubble: null,
    });
  });

  it('says where an unstepped packet was dropped', () => {
    const dropped: PacketTrace = {
      ...TRACE,
      hops: [HOPS[0]!, hop(1, 'router', { event: 'drop', reason: 'no-route' })],
      status: 'dropped',
    };
    const story = packetStoryFrom(state({ traces: [dropped] }));
    expect(story?.bubble).toMatchObject({
      kind: 'drop',
      nodeId: 'router',
      key: 'simulation.packetStory.dropNoRoute',
    });
  });

  it('points an unstepped journey at the address rewrite it went through', () => {
    const natted: PacketTrace = {
      ...TRACE,
      hops: [
        HOPS[0]!,
        hop(1, 'nat-router', {
          fromNodeId: 'client',
          natTranslation: {
            type: 'snat',
            preSrcIp: '192.168.1.10',
            preSrcPort: 54321,
            postSrcIp: '203.0.113.1',
            postSrcPort: 1024,
            preDstIp: '198.51.100.10',
            preDstPort: 80,
            postDstIp: '198.51.100.10',
            postDstPort: 80,
          },
        }),
        hop(2, 'server', { event: 'deliver', fromNodeId: 'nat-router' }),
      ],
    };
    const story = packetStoryFrom(state({ traces: [natted] }));
    expect(story?.at).toBe('server');
    expect(story?.bubble).toMatchObject({ kind: 'nat', nodeId: 'nat-router' });
  });
});

describe('bubbleForHop', () => {
  it('asks who owns the address on an ARP request', () => {
    expect(bubbleForHop(HOPS[2]!)).toEqual({
      kind: 'arpRequest',
      nodeId: 'router',
      key: 'simulation.packetStory.arpRequest',
      params: { ip: '203.0.113.10' },
    });
  });

  it('answers with the MAC address on an ARP reply', () => {
    expect(bubbleForHop(HOPS[3]!)).toEqual({
      kind: 'arpReply',
      nodeId: 'server',
      key: 'simulation.packetStory.arpReply',
      params: { mac: '02:e1:2e:d8:d4:08' },
    });
  });

  it('names the source rewrite of source NAT', () => {
    const bubble = bubbleForHop(
      hop(1, 'nat', {
        natTranslation: {
          type: 'snat',
          preSrcIp: '192.168.1.10',
          preSrcPort: 1,
          postSrcIp: '203.0.113.1',
          postSrcPort: 2,
          preDstIp: '198.51.100.10',
          preDstPort: 80,
          postDstIp: '198.51.100.10',
          postDstPort: 80,
        },
      }),
    );
    expect(bubble).toMatchObject({
      key: 'simulation.packetStory.natSource',
      params: { from: '192.168.1.10', to: '203.0.113.1' },
    });
  });

  it('names the destination rewrite of destination NAT', () => {
    const bubble = bubbleForHop(
      hop(1, 'nat', {
        natTranslation: {
          type: 'dnat',
          preSrcIp: '198.51.100.10',
          preSrcPort: 55000,
          postSrcIp: '198.51.100.10',
          postSrcPort: 55000,
          preDstIp: '203.0.113.1',
          preDstPort: 8080,
          postDstIp: '192.168.1.10',
          postDstPort: 80,
        },
      }),
    );
    expect(bubble).toMatchObject({
      key: 'simulation.packetStory.natDestination',
      params: { from: '203.0.113.1', to: '192.168.1.10' },
    });
  });

  it('says a drop in words, falling back to a plain sentence for a reason it has no words for', () => {
    expect(bubbleForHop(hop(1, 'r', { event: 'drop', reason: 'ttl-exceeded' }))?.key).toBe(
      'simulation.packetStory.dropTtl',
    );
    expect(bubbleForHop(hop(1, 'r', { event: 'drop', reason: 'something-new' }))?.key).toBe(
      'simulation.packetStory.dropOther',
    );
  });

  it('says nothing on a plain forward', () => {
    expect(bubbleForHop(HOPS[1]!)).toBeNull();
  });
});

describe('canvasPacketFrom', () => {
  const source = {
    state: state({ currentStep: 1 }),
    areas: [
      {
        id: 'lan',
        name: 'LAN',
        type: 'private' as const,
        subnet: '10.0.0.0/24',
        devices: ['client', 'sw'],
      },
    ],
    color: 'red',
    animate: true,
  };

  it('keeps the simulation name of the device while drawing on the devices on screen', () => {
    const packet = canvasPacketFrom(source, new Set(['client', 'sw', 'router', 'server']));
    expect(packet).toMatchObject({ at: 'sw', route: ['client', 'sw'], animate: true });
  });

  it('draws a device folded into a collapsed area as that area', () => {
    const packet = canvasPacketFrom(source, new Set(['__cluster__lan', 'router', 'server']));
    expect(packet).toMatchObject({ at: 'sw', route: ['__cluster__lan'] });
  });

  it('draws nothing when none of the devices is on screen', () => {
    expect(canvasPacketFrom(source, new Set(['router']))).toBeNull();
  });
});
