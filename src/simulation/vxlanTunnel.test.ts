/** VXLAN through the engine (REQ-331, REQ-332). */
import { beforeAll, describe, expect, it } from 'vitest';
import { parseTraceFilter } from '../components/simulation/traceFilter/parser';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { protocolPacks } from '../protocols/packs';
import { layerRegistry } from '../registry/LayerRegistry';
import type { EthernetFrame } from '../types/packets';
import type { RouteEntry, RouterInterface } from '../types/routing';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { serializePacket } from '../utils/packetSerializer';
import { SimulationEngine } from './SimulationEngine';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (id, t) => new RouterForwarder(id, t),
  });
});

const host = (id: string, ip: string): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip },
});
const iface = (id: string, cidr: string, mac: string): RouterInterface => {
  const [ipAddress = '', length = '24'] = cidr.split('/');
  return { id, name: id, ipAddress, prefixLength: Number(length), macAddress: mac };
};
const route = (nodeId: string, destination: string, nextHop: string): RouteEntry => ({
  destination,
  nextHop,
  metric: 0,
  protocol: 'static',
  adminDistance: nextHop === 'direct' ? 0 : 1,
  nodeId,
});

/** a — leaf1 (VTEP 192.0.2.1) — spine — leaf2 (VTEP 192.0.2.5) — b. */
function fabric(leaf2Vni = 10000): NetworkTopology {
  const leaf = (
    id: string,
    lan: string,
    up: string,
    mac: string,
    vni: number,
    self: string,
    peer: string,
  ): NetlabNode => ({
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3',
      interfaces: [iface(`${id}-lan`, lan, `${mac}:01`), iface(`${id}-up`, up, `${mac}:02`)],
      vtep: { vni, sourceVtepIp: self, peerVtepIps: [peer] },
    },
  });
  return {
    nodes: [
      host('a', '10.10.0.10'),
      leaf(
        'leaf1',
        '10.10.0.1/24',
        '192.0.2.1/30',
        '02:00:00:00:01',
        10000,
        '192.0.2.1',
        '192.0.2.5',
      ),
      {
        id: 'spine',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'spine',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('s1', '192.0.2.2/30', '02:00:00:00:09:01'),
            iface('s2', '192.0.2.6/30', '02:00:00:00:09:02'),
          ],
        },
      },
      leaf(
        'leaf2',
        '10.20.0.1/24',
        '192.0.2.5/30',
        '02:00:00:00:02',
        leaf2Vni,
        '192.0.2.5',
        '192.0.2.1',
      ),
      host('b', '10.20.0.10'),
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'leaf1', targetHandle: 'leaf1-lan' },
      { id: 'e2', source: 'leaf1', target: 'spine', sourceHandle: 'leaf1-up', targetHandle: 's1' },
      { id: 'e3', source: 'spine', target: 'leaf2', sourceHandle: 's2', targetHandle: 'leaf2-up' },
      { id: 'e4', source: 'leaf2', target: 'b', sourceHandle: 'leaf2-lan' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'leaf1',
        [
          route('leaf1', '10.10.0.0/24', 'direct'),
          route('leaf1', '192.0.2.0/30', 'direct'),
          route('leaf1', '192.0.2.4/30', '192.0.2.2'),
          route('leaf1', '10.20.0.0/24', '192.0.2.5'),
        ],
      ],
      [
        'spine',
        [route('spine', '192.0.2.0/30', 'direct'), route('spine', '192.0.2.4/30', 'direct')],
      ],
      [
        'leaf2',
        [
          route('leaf2', '10.20.0.0/24', 'direct'),
          route('leaf2', '192.0.2.4/30', 'direct'),
          route('leaf2', '192.0.2.0/30', '192.0.2.6'),
          route('leaf2', '10.10.0.0/24', '192.0.2.1'),
        ],
      ],
    ]),
  } as NetworkTopology;
}

const ping = async (topology: NetworkTopology) => {
  const engine = new SimulationEngine(topology, new HookEngine());
  return { engine, trace: await engine.ping('a', '10.20.0.10') };
};

describe('a ping across a VXLAN fabric', () => {
  it('TC-1292: wraps at leaf1, crosses the spine as UDP 4789, unwraps at leaf2', async () => {
    const { trace } = await ping(fabric());
    expect(trace.status).toBe('delivered');
    const wrap = trace.hops.find((hop) => hop.tunnel?.stage === 'encap')!;
    const unwrap = trace.hops.find((hop) => hop.tunnel?.stage === 'decap')!;
    expect([wrap.nodeId, unwrap.nodeId]).toEqual(['leaf1', 'leaf2']);
    for (const hop of [wrap, unwrap]) {
      expect(hop.tunnel).toMatchObject({
        protocol: 'vxlan',
        outerSrc: '192.0.2.1',
        outerDst: '192.0.2.5',
        innerSrc: '10.10.0.10',
        innerDst: '10.20.0.10',
        key: 10000,
      });
    }
    const spine = trace.hops.find((hop) => hop.nodeId === 'spine' && hop.event === 'forward');
    expect(spine).toMatchObject({ protocol: 'UDP', dstPort: 4789 });
    const filter = parseTraceFilter('protocol == vxlan');
    if (!filter.ok) throw filter.error;
    expect(filter.predicate(spine!)).toBe(true);
    expect(trace.hops).toContainEqual(expect.objectContaining({ nodeId: 'b', event: 'deliver' }));
  });

  it('TC-1293: drops at leaf2 when the VNIs differ', async () => {
    const { trace } = await ping(fabric(20000));
    expect(trace.status).toBe('dropped');
    expect(trace.hops[trace.hops.length - 1]).toMatchObject({
      nodeId: 'leaf2',
      reason: 'vxlan-vni-mismatch',
    });
  });

  it('TC-1294: shows the VXLAN header and the inner frame in the hex view', async () => {
    const { engine, trace } = await ping(fabric());
    await protocolPacks.loadWire('vxlan');
    const frame = engine
      .exportPcapRecords(trace.packetId)
      .find((r) => r.hop.nodeId === 'spine' && r.hop.event === 'forward')!.frame as EthernetFrame;
    const { bytes, fields } = serializePacket(frame);
    expect(Array.from(bytes.slice(50, 58))).toEqual([8, 0, 0, 0, 0, 0x27, 0x10, 0]);
    expect(Array.from(bytes.slice(58, 64))).toEqual([2, 0, 0, 0, 2, 1]);
    const value = (name: string) => fields.find((f) => f.name === name)?.displayValue;
    expect(value('VNI')).toBe('10000');
    expect(value('Inner Dst MAC')).toBe('02:00:00:00:02:01');
    expect(value('Inner Src IP')).toBe('10.10.0.10');
    expect(fields.some((f) => f.displayValue.includes('{'))).toBe(false);
  });
});
