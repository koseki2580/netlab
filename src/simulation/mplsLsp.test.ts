/** MPLS through the engine (REQ-334, REQ-335). */
import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { protocolPacks } from '../protocols/packs';
import { layerRegistry } from '../registry/LayerRegistry';
import type { EthernetFrame } from '../types/packets';
import type { RouteEntry, RouterInterface } from '../types/routing';
import type { MplsTables } from '../types/tunneling';
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
const router = (id: string, ifaces: RouterInterface[], mpls: MplsTables): NetlabNode => ({
  id,
  type: 'router',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'router', layerId: 'l3', interfaces: ifaces, mpls },
});
const route = (nodeId: string, destination: string, nextHop: string): RouteEntry => ({
  destination,
  nextHop,
  metric: 0,
  protocol: 'static',
  adminDistance: nextHop === 'direct' ? 0 : 1,
  nodeId,
});

/** ce1 — pe1 — p — pe2 — ce2. P knows only the core: it forwards by label. */
function provider(p: MplsTables['lfib']): NetworkTopology {
  return {
    nodes: [
      host('ce1', '10.1.0.10'),
      router(
        'pe1',
        [
          iface('pe1-c', '10.1.0.1/24', '02:00:00:00:01:01'),
          iface('pe1-p', '10.0.12.1/30', '02:00:00:00:01:02'),
        ],
        {
          ftn: [{ prefix: '10.2.0.0/24', push: [100, 200], nextHop: '10.0.12.2' }],
          lfib: [
            { inLabel: 111, action: 'pop' },
            { inLabel: 210, action: 'pop' },
          ],
        },
      ),
      router(
        'p',
        [
          iface('p-1', '10.0.12.2/30', '02:00:00:00:09:01'),
          iface('p-2', '10.0.23.1/30', '02:00:00:00:09:02'),
        ],
        {
          lfib: [
            ...(p ?? []),
            { inLabel: 110, action: 'swap', outLabel: 111, nextHop: '10.0.12.1' },
          ],
        },
      ),
      router(
        'pe2',
        [
          iface('pe2-p', '10.0.23.2/30', '02:00:00:00:02:02'),
          iface('pe2-c', '10.2.0.1/24', '02:00:00:00:02:01'),
        ],
        {
          ftn: [{ prefix: '10.1.0.0/24', push: [110, 210], nextHop: '10.0.23.1' }],
          lfib: [
            { inLabel: 101, action: 'pop' },
            { inLabel: 200, action: 'pop' },
          ],
        },
      ),
      host('ce2', '10.2.0.10'),
    ],
    edges: [
      { id: 'e1', source: 'ce1', target: 'pe1', targetHandle: 'pe1-c' },
      { id: 'e2', source: 'pe1', target: 'p', sourceHandle: 'pe1-p', targetHandle: 'p-1' },
      { id: 'e3', source: 'p', target: 'pe2', sourceHandle: 'p-2', targetHandle: 'pe2-p' },
      { id: 'e4', source: 'pe2', target: 'ce2', sourceHandle: 'pe2-c' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'pe1',
        [
          route('pe1', '10.1.0.0/24', 'direct'),
          route('pe1', '10.0.12.0/30', 'direct'),
          route('pe1', '10.0.23.0/30', '10.0.12.2'),
        ],
      ],
      ['p', [route('p', '10.0.12.0/30', 'direct'), route('p', '10.0.23.0/30', 'direct')]],
      [
        'pe2',
        [
          route('pe2', '10.2.0.0/24', 'direct'),
          route('pe2', '10.0.23.0/30', 'direct'),
          route('pe2', '10.0.12.0/30', '10.0.23.1'),
        ],
      ],
    ]),
  } as NetworkTopology;
}

const SWAP = [{ inLabel: 100, action: 'swap' as const, outLabel: 101, nextHop: '10.0.23.2' }];
const PHP = [{ inLabel: 100, action: 'pop' as const, nextHop: '10.0.23.2' }];

const ping = async (topology: NetworkTopology) => {
  const engine = new SimulationEngine(topology, new HookEngine());
  return { engine, trace: await engine.ping('ce1', '10.2.0.10') };
};
const actions = (trace: {
  hops: readonly { nodeId: string; mpls?: { action: string; after: number[] } }[];
}) =>
  trace.hops
    .filter((hop) => hop.mpls)
    .map((hop) => [hop.nodeId, hop.mpls!.action, hop.mpls!.after.join('/')]);

describe('a ping across an MPLS provider', () => {
  it('TC-1298: pushes at PE1, swaps at P, pops at PE2, and is delivered', async () => {
    const { trace } = await ping(provider(SWAP));
    expect(trace.status).toBe('delivered');
    expect(actions(trace).slice(0, 4)).toEqual([
      ['pe1', 'push', '100/200'],
      ['p', 'swap', '101/200'],
      ['pe2', 'pop', '200'],
      ['pe2', 'pop', ''],
    ]);
    expect(trace.hops).toContainEqual(expect.objectContaining({ nodeId: 'ce2', event: 'deliver' }));
  });

  it('TC-1299: with PHP, P pops the transport label and PE2 the VPN label', async () => {
    const { trace } = await ping(provider(PHP));
    expect(trace.status).toBe('delivered');
    expect(actions(trace).slice(0, 3)).toEqual([
      ['pe1', 'push', '100/200'],
      ['p', 'pop', '200'],
      ['pe2', 'pop', ''],
    ]);
  });

  it('TC-1300: drops at P when it has no entry for the label', async () => {
    const { trace } = await ping(provider([]));
    expect(trace.status).toBe('dropped');
    expect(trace.hops[trace.hops.length - 1]).toMatchObject({
      nodeId: 'p',
      reason: 'mpls-no-label',
    });
  });

  it('TC-1301: shows EtherType 0x8847 and the label stack in the hex view', async () => {
    const { engine, trace } = await ping(provider(SWAP));
    await protocolPacks.loadWire('mpls');
    const frame = engine
      .exportPcapRecords(trace.packetId)
      .find((r) => r.hop.nodeId === 'pe1' && r.hop.event === 'forward' && !r.hop.mpls)!
      .frame as EthernetFrame;
    const { bytes, fields } = serializePacket(frame);
    expect(Array.from(bytes.slice(20, 30))).toEqual([
      0x88, 0x47, 0, 0x06, 0x40, 0x3f, 0, 0x0c, 0x81, 0x3f,
    ]);
    expect(bytes[30]).toBe(0x45);
    expect(fields.find((f) => f.name === 'EtherType')?.displayValue).toBe('0x8847 (MPLS)');
    expect(fields.filter((f) => f.name === 'Label').map((f) => f.displayValue)).toEqual([
      '100',
      '200',
    ]);
    expect(
      fields.filter((f) => f.name === 'S (bottom of stack)').map((f) => f.displayValue),
    ).toEqual(['0', '1']);
  });
});
