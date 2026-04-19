import { describe, expect, it } from 'vitest';
import { RouterForwarder } from './RouterForwarder';
import { tagFrame } from '../l2-datalink/vlan';
import type { InFlightPacket } from '../../types/packets';
import type { Neighbor } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import type { RouterInterface, RouteEntry } from '../../types/routing';

function makeRouteEntries(
  nodeId: string,
  routes: { destination: string; nextHop: string; metric?: number }[],
): RouteEntry[] {
  return routes.map((route) => ({
    destination: route.destination,
    nextHop: route.nextHop,
    metric: route.metric ?? 0,
    protocol: 'static',
    adminDistance: 1,
    nodeId,
  }));
}

function makeRouter(interfaces: RouterInterface[], arpTable?: Record<string, string>) {
  return {
    id: 'router-1',
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: 'R1',
      role: 'router',
      layerId: 'l3' as const,
      interfaces,
      ...(arpTable !== undefined ? { arpTable } : {}),
    },
  };
}

function makeSwitch() {
  return {
    id: 'switch-1',
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: 'SW1',
      role: 'switch',
      layerId: 'l2' as const,
      ports: [
        {
          id: 'p0',
          name: 'fa0/24',
          macAddress: '02:00:00:10:00:24',
          vlanMode: 'trunk' as const,
          trunkAllowedVlans: [10, 20],
        },
      ],
    },
  };
}

function makeTopology(overrides?: {
  interfaces?: RouterInterface[];
  routeTable?: { destination: string; nextHop: string; metric?: number }[];
  arpTable?: Record<string, string>;
}): NetworkTopology {
  return {
    nodes: [
      makeRouter(
        overrides?.interfaces ?? [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '192.0.2.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:00',
            subInterfaces: [
              {
                id: 'eth0.10',
                parentInterfaceId: 'eth0',
                vlanId: 10,
                ipAddress: '10.0.10.1',
                prefixLength: 24,
              },
              {
                id: 'eth0.20',
                parentInterfaceId: 'eth0',
                vlanId: 20,
                ipAddress: '10.0.20.1',
                prefixLength: 24,
              },
            ],
          },
        ],
        overrides?.arpTable,
      ),
      makeSwitch(),
    ],
    edges: [
      {
        id: 'e-switch',
        source: 'router-1',
        target: 'switch-1',
        sourceHandle: 'eth0',
        targetHandle: 'p0',
      },
    ],
    areas: [],
    routeTables: new Map([
      [
        'router-1',
        makeRouteEntries(
          'router-1',
          overrides?.routeTable ?? [
            { destination: '192.0.2.0/24', nextHop: 'direct' },
            { destination: '10.0.10.0/24', nextHop: 'direct' },
            { destination: '10.0.20.0/24', nextHop: 'direct' },
          ],
        ),
      ],
    ]),
  };
}

function makePacket(options: {
  dstIp: string;
  srcIp?: string;
  ingressPortId?: string;
  vlanId?: number;
  ttl?: number;
}): InFlightPacket {
  const frame = {
    layer: 'L2' as const,
    srcMac: '02:00:00:00:00:10',
    dstMac: '02:00:00:00:00:20',
    etherType: 0x0800,
    payload: {
      layer: 'L3' as const,
      srcIp: options.srcIp ?? '10.0.10.10',
      dstIp: options.dstIp,
      ttl: options.ttl ?? 64,
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
    srcNodeId: 'host-a',
    dstNodeId: 'host-b',
    currentDeviceId: 'router-1',
    ingressPortId: options.ingressPortId ?? 'eth0',
    path: [],
    timestamp: 0,
    frame: options.vlanId ? tagFrame(frame, options.vlanId) : frame,
  };
}

function expectForward(result: Awaited<ReturnType<RouterForwarder['receive']>>) {
  expect(result.action).toBe('forward');
  if (result.action !== 'forward') {
    throw new Error(`expected forward decision, got ${result.action}`);
  }
  return result;
}

function expectDrop(result: Awaited<ReturnType<RouterForwarder['receive']>>) {
  expect(result.action).toBe('drop');
  if (result.action !== 'drop') {
    throw new Error(`expected drop decision, got ${result.action}`);
  }
  return result;
}

describe('RouterForwarder — VLAN sub-interfaces', () => {
  const neighbors: Neighbor[] = [{ nodeId: 'switch-1', edgeId: 'e-switch' }];

  it('routes a tagged frame from VLAN 10 to VLAN 20 via router-on-a-stick (egress retagged)', async () => {
    const forwarder = new RouterForwarder('router-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(makePacket({ dstIp: '10.0.20.20', vlanId: 10 }), 'eth0', {
        neighbors,
      }),
    );

    expect(result.nextNodeId).toBe('switch-1');
    expect(result.edgeId).toBe('e-switch');
    expect(result.ingressInterfaceId).toBe('eth0.10');
    expect(result.egressInterfaceId).toBe('eth0.20');
    expect(result.packet.frame.payload.ttl).toBe(63);
    expect(result.packet.frame.vlanTag?.vid).toBe(20);
    expect(result.selectedRoute?.destination).toBe('10.0.20.0/24');
  });

  it('drops a tagged frame whose VID has no matching sub-interface', async () => {
    const forwarder = new RouterForwarder('router-1', makeTopology());

    const result = expectDrop(
      await forwarder.receive(makePacket({ dstIp: '10.0.20.20', vlanId: 30 }), 'eth0', {
        neighbors,
      }),
    );

    expect(result.reason).toBe('no-sub-interface-for-vlan');
  });

  it('untagged frame on a parent interface with sub-interfaces still works when the parent has its own IP', async () => {
    const forwarder = new RouterForwarder('router-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(
        makePacket({
          srcIp: '192.0.2.10',
          dstIp: '192.0.2.50',
        }),
        'eth0',
        { neighbors },
      ),
    );

    expect(result.ingressInterfaceId).toBe('eth0');
    expect(result.egressInterfaceId).toBe('eth0');
    expect(result.packet.frame.vlanTag).toBeUndefined();
    expect(result.selectedRoute?.destination).toBe('192.0.2.0/24');
  });

  it('ARP resolution is per-VLAN: same dst IP in VLAN 10 vs VLAN 20 resolves to different MACs', () => {
    const forwarder = new RouterForwarder(
      'router-1',
      makeTopology({
        arpTable: {
          '10:10.0.50.10': '02:00:00:00:50:10',
          '20:10.0.50.10': '02:00:00:00:50:20',
        },
      }),
    );

    expect(forwarder.resolveArpMac('10.0.50.10', 10)).toBe('02:00:00:00:50:10');
    expect(forwarder.resolveArpMac('10.0.50.10', 20)).toBe('02:00:00:00:50:20');
  });

  it('hop annotation reports the sub-interface id (eth0.10 / eth0.20)', async () => {
    const forwarder = new RouterForwarder('router-1', makeTopology());

    const result = expectForward(
      await forwarder.receive(makePacket({ dstIp: '10.0.20.20', vlanId: 10 }), 'eth0', {
        neighbors,
      }),
    );

    expect(result.ingressInterfaceId).toBe('eth0.10');
    expect(result.egressInterfaceId).toBe('eth0.20');
  });

  it('route-table lookup matches the sub-interface prefix, not only parent prefix', async () => {
    const forwarder = new RouterForwarder(
      'router-1',
      makeTopology({
        routeTable: [
          { destination: '192.0.2.0/24', nextHop: 'direct' },
          { destination: '10.0.20.0/24', nextHop: 'direct' },
        ],
      }),
    );

    const result = expectForward(
      await forwarder.receive(makePacket({ dstIp: '10.0.20.99', vlanId: 10 }), 'eth0', {
        neighbors,
      }),
    );

    expect(result.selectedRoute?.destination).toBe('10.0.20.0/24');
    expect(result.egressInterfaceId).toBe('eth0.20');
    expect(result.packet.frame.vlanTag?.vid).toBe(20);
  });
});
