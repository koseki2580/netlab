/** A GRE tunnel through the engine (REQ-304, REQ-305). */
import { beforeAll, describe, expect, it } from 'vitest';
import { parseTraceFilter } from '../components/simulation/traceFilter/parser';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { EthernetFrame } from '../types/packets';
import type { RouteEntry, RouterInterface } from '../types/routing';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { protocolPacks } from '../protocols/packs';
import { serializePacket } from '../utils/packetSerializer';
import { SimulationEngine } from './SimulationEngine';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

const host = (id: string, ip: string): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip },
});

const iface = (id: string, cidr: string, mac: string, extra: Partial<RouterInterface> = {}) => {
  const [ipAddress = '', length = '24'] = cidr.split('/');
  return { id, name: id, ipAddress, prefixLength: Number(length), macAddress: mac, ...extra };
};

const router = (id: string, interfaces: RouterInterface[]): NetlabNode => ({
  id,
  type: 'router',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'router', layerId: 'l3', interfaces },
});

const route = (nodeId: string, destination: string, nextHop: string): RouteEntry => ({
  destination,
  nextHop,
  metric: 0,
  protocol: 'static',
  adminDistance: nextHop === 'direct' ? 0 : 1,
  nodeId,
});

/** a — r1 — net — r2 — b, with a tunnel r1–r2 over the underlay. */
function tunnelled(r2Key = 100): NetworkTopology {
  return {
    nodes: [
      host('a', '10.0.0.10'),
      router('r1', [
        iface('r1-lan', '10.0.0.1/24', '00:00:00:01:00:01'),
        iface('r1-up', '198.51.100.1/30', '00:00:00:01:00:02'),
        iface('tun0', '172.16.0.1/30', '00:00:00:01:00:03', {
          greTunnel: { sourceIp: '198.51.100.1', destinationIp: '198.51.100.6', key: 100 },
        }),
      ]),
      router('net', [
        iface('net-1', '198.51.100.2/30', '00:00:00:09:00:01'),
        iface('net-2', '198.51.100.5/30', '00:00:00:09:00:02'),
      ]),
      router('r2', [
        iface('r2-up', '198.51.100.6/30', '00:00:00:02:00:02'),
        iface('r2-lan', '10.0.1.1/24', '00:00:00:02:00:01'),
        iface('tun0', '172.16.0.2/30', '00:00:00:02:00:03', {
          greTunnel: { sourceIp: '198.51.100.6', destinationIp: '198.51.100.1', key: r2Key },
        }),
      ]),
      host('b', '10.0.1.10'),
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'r1', targetHandle: 'r1-lan' },
      { id: 'e2', source: 'r1', target: 'net', sourceHandle: 'r1-up', targetHandle: 'net-1' },
      { id: 'e3', source: 'net', target: 'r2', sourceHandle: 'net-2', targetHandle: 'r2-up' },
      { id: 'e4', source: 'r2', target: 'b', sourceHandle: 'r2-lan' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          route('r1', '10.0.0.0/24', 'direct'),
          route('r1', '198.51.100.0/30', 'direct'),
          route('r1', '172.16.0.0/30', 'direct'),
          route('r1', '198.51.100.4/30', '198.51.100.2'),
          route('r1', '10.0.1.0/24', '172.16.0.2'),
        ],
      ],
      [
        'net',
        [route('net', '198.51.100.0/30', 'direct'), route('net', '198.51.100.4/30', 'direct')],
      ],
      [
        'r2',
        [
          route('r2', '10.0.1.0/24', 'direct'),
          route('r2', '198.51.100.4/30', 'direct'),
          route('r2', '172.16.0.0/30', 'direct'),
          route('r2', '198.51.100.0/30', '198.51.100.5'),
          route('r2', '10.0.0.0/24', '172.16.0.1'),
        ],
      ],
    ]),
  } as NetworkTopology;
}

async function ping(topology: NetworkTopology) {
  const engine = new SimulationEngine(topology, new HookEngine());
  const trace = await engine.ping('a', '10.0.1.10');
  return { engine, trace };
}

describe('a ping across a GRE tunnel', () => {
  it('TC-1163: loads the GRE wire tier only where a router has a tunnel', async () => {
    // Runs in a fresh module graph per file, so nothing has loaded GRE before.
    const plain = tunnelled();
    plain.nodes = plain.nodes.map(
      (node): NetlabNode =>
        node.data.role === 'router'
          ? {
              ...node,
              data: {
                ...node.data,
                interfaces: (node.data.interfaces ?? []).filter((iface) => !iface.greTunnel),
              },
            }
          : node,
    );
    await new SimulationEngine(plain, new HookEngine()).ping('a', '10.0.0.1');
    expect(protocolPacks.wire('gre')).toBeUndefined();
    const { trace } = await ping(tunnelled());
    expect(trace.status).toBe('delivered');
    expect(protocolPacks.wire('gre')?.id).toBe('gre');
  });

  it('TC-1127: wraps at one end, unwraps at the other, and says so', async () => {
    const { trace } = await ping(tunnelled());
    expect(trace.status).toBe('delivered');
    const wrap = trace.hops.find((hop) => hop.tunnel?.stage === 'encap')!;
    const unwrap = trace.hops.find((hop) => hop.tunnel?.stage === 'decap')!;
    expect(wrap.nodeId).toBe('r1');
    expect(unwrap.nodeId).toBe('r2');
    for (const hop of [wrap, unwrap]) {
      expect(hop.tunnel).toMatchObject({
        protocol: 'gre',
        outerSrc: '198.51.100.1',
        outerDst: '198.51.100.6',
        innerSrc: '10.0.0.10',
        innerDst: '10.0.1.10',
        key: 100,
      });
    }
    const underlay = trace.hops.find((hop) => hop.nodeId === 'net' && hop.event === 'forward');
    expect(underlay).toMatchObject({
      protocol: 'GRE',
      srcIp: '198.51.100.1',
      dstIp: '198.51.100.6',
    });
    expect(trace.hops).toContainEqual(
      expect.objectContaining({ nodeId: 'b', event: 'deliver', srcIp: '10.0.0.10' }),
    );
  });

  it('TC-1128: shows the real GRE header and the inner packet in the hex view', async () => {
    const { engine, trace } = await ping(tunnelled());
    const frame = engine
      .exportPcapRecords(trace.packetId)
      .find((r) => r.hop.nodeId === 'net' && r.hop.event === 'forward')!.frame as EthernetFrame;
    const { bytes, fields } = serializePacket(frame);
    expect(Array.from(bytes.slice(42, 50))).toEqual([0x20, 0, 0x08, 0, 0, 0, 0, 100]);
    expect(bytes[50]).toBe(0x45);
    expect(fields.find((f) => f.name === 'Key')).toMatchObject({
      displayValue: '100',
      byteOffset: 46,
    });
    expect(fields.find((f) => f.name === 'Protocol')?.displayValue).toBe('47 (GRE)');
    expect(fields.find((f) => f.name === 'Inner Src IP')?.displayValue).toBe('10.0.0.10');
    expect(fields.find((f) => f.name === 'Inner Dst IP')?.displayValue).toBe('10.0.1.10');
    expect(fields.some((f) => f.displayValue.includes('{'))).toBe(false);
  });

  it('TC-1129: drops at the far end when the keys differ', async () => {
    const { trace } = await ping(tunnelled(200));
    expect(trace.status).toBe('dropped');
    const last = trace.hops[trace.hops.length - 1]!;
    expect(last).toMatchObject({ nodeId: 'r2', event: 'drop', reason: 'gre-key-mismatch' });
  });

  it('TC-1131: filters by protocol == gre', async () => {
    const { trace } = await ping(tunnelled());
    const gre = parseTraceFilter('protocol == gre');
    const udp = parseTraceFilter('protocol == udp');
    if (!gre.ok || !udp.ok) throw new Error('filter refused');
    const kept = trace.hops.filter((hop) => gre.predicate(hop)).map((hop) => hop.nodeId);
    expect(kept).toContain('net');
    expect(kept).not.toContain('a');
    expect(trace.hops.filter((hop) => udp.predicate(hop))).toEqual([]);
  });
});
