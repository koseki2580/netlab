import { describe, expect, it } from 'vitest';
import type { RouteEntry } from '../types/routing';
import type { PacketHop, PacketTrace } from '../types/simulation';
import {
  buildStepSnapshots,
  diffArp,
  diffMac,
  diffRoutes,
  type ArpRow,
  type MacRow,
  type RouteRow,
} from './snapshots';

function hop(step: number, nodeId: string, overrides: Partial<PacketHop> = {}): PacketHop {
  return {
    step,
    nodeId,
    nodeLabel: nodeId.toUpperCase(),
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 'ICMP',
    event: 'forward',
    timestamp: step,
    ...overrides,
  };
}

function arpHop(step: number, nodeId: string, senderIp: string, senderMac: string): PacketHop {
  return hop(step, nodeId, {
    event: 'arp-reply',
    arpFrame: {
      layer: 'L2',
      srcMac: senderMac,
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'reply',
        senderMac,
        senderIp,
        targetMac: '00:00:00:00:00:00',
        targetIp: '10.0.0.1',
      },
    },
  });
}

function trace(hops: PacketHop[]): PacketTrace {
  return { packetId: 't1', hops, status: 'delivered' } as PacketTrace;
}

function routeTable(): Map<string, RouteEntry[]> {
  return new Map([
    [
      'r1',
      [
        {
          destination: '10.0.0.0/24',
          nextHop: 'direct',
          protocol: 'connected',
          metric: 0,
          adminDistance: 0,
          nodeId: 'r1',
        } as RouteEntry,
      ],
    ],
  ]);
}

describe('buildStepSnapshots', () => {
  it('grows the ARP table as bindings are learned, and keeps routes static', () => {
    const snaps = buildStepSnapshots(
      trace([hop(0, 'r1'), arpHop(1, 'r1', '10.0.0.2', 'aa:aa:aa:aa:aa:aa'), hop(2, 'r1')]),
      routeTable(),
    );
    expect(snaps.size).toBe(3);
    expect(snaps.get(0)?.r1?.arp).toEqual([]);
    expect(snaps.get(1)?.r1?.arp).toEqual([{ ip: '10.0.0.2', mac: 'aa:aa:aa:aa:aa:aa' }]);
    expect(snaps.get(2)?.r1?.arp).toEqual([{ ip: '10.0.0.2', mac: 'aa:aa:aa:aa:aa:aa' }]);
    // Routes are topology-derived and identical across every step.
    expect(snaps.get(0)?.r1?.routes).toEqual(snaps.get(2)?.r1?.routes);
    expect(snaps.get(2)?.r1?.routes[0]?.dst).toBe('10.0.0.0/24');
  });

  it('includes nodes from the route table even if absent from the trace', () => {
    const snaps = buildStepSnapshots(trace([hop(0, 'client')]), routeTable());
    expect(snaps.get(0)?.r1).toBeDefined();
    expect(snaps.get(0)?.r1?.arp).toEqual([]);
  });

  it('learns MAC → ingress port from the source MAC on each hop', () => {
    const snaps = buildStepSnapshots(
      trace([hop(0, 'sw1'), hop(1, 'sw1', { srcMac: 'aa:bb', ingressInterfaceName: 'eth0' })]),
      new Map(),
    );
    expect(snaps.get(0)?.sw1?.mac).toEqual([]);
    expect(snaps.get(1)?.sw1?.mac).toEqual([{ mac: 'aa:bb', port: 'eth0' }]);
  });
});

describe('diffRoutes', () => {
  const a: RouteRow = { dst: '10.0.0.0/24', via: 'direct', proto: 'connected', metric: 0, ad: 0 };
  const b: RouteRow = { dst: '10.4.0.0/24', via: '10.0.12.2', proto: 'ospf', metric: 20, ad: 110 };

  it('reports added, removed, changed and unchanged rows', () => {
    const changedB: RouteRow = { ...b, metric: 30 };
    const rows = diffRoutes([a, b], [a, changedB]);
    expect(rows.find((r) => r.dst === a.dst)?.status).toBe('unchanged');
    const bRow = rows.find((r) => r.dst === b.dst);
    expect(bRow?.status).toBe('changed');
    expect(bRow?.from).toEqual({ metric: 20, via: '10.0.12.2' });

    expect(diffRoutes([], [a]).find((r) => r.dst === a.dst)?.status).toBe('added');
    expect(diffRoutes([a], []).find((r) => r.dst === a.dst)?.status).toBe('removed');
  });
});

describe('diffArp', () => {
  it('detects added and changed (re-bound MAC) entries by IP', () => {
    const prev: ArpRow[] = [{ ip: '10.0.0.2', mac: 'aa' }];
    const next: ArpRow[] = [
      { ip: '10.0.0.2', mac: 'bb' },
      { ip: '10.0.0.3', mac: 'cc' },
    ];
    const rows = diffArp(prev, next);
    const changed = rows.find((r) => r.ip === '10.0.0.2');
    expect(changed?.status).toBe('changed');
    expect(changed?.from).toEqual({ mac: 'aa' });
    expect(rows.find((r) => r.ip === '10.0.0.3')?.status).toBe('added');
  });
});

describe('diffMac', () => {
  it('detects added and changed (moved port) entries by MAC', () => {
    const prev: MacRow[] = [{ mac: 'aa', port: 'p1' }];
    const next: MacRow[] = [
      { mac: 'aa', port: 'p2' },
      { mac: 'bb', port: 'p3' },
    ];
    const rows = diffMac(prev, next);
    const moved = rows.find((r) => r.mac === 'aa');
    expect(moved?.status).toBe('changed');
    expect(moved?.from).toEqual({ port: 'p1' });
    expect(rows.find((r) => r.mac === 'bb')?.status).toBe('added');
  });
});
