import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { ForwardDecision } from '../types/layers';
import type { PacketHop, PacketTrace } from '../types/simulation';
import type { NetlabEdge, NetlabNode, NetworkTopology, SwitchPort } from '../types/topology';
import { makePacket } from './__fixtures__/helpers';
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
  // A third-party switch that copies everything and knows no destination.
  layerRegistry.register({
    layerId: 'l1',
    nodeTypes: {},
    forwarder: () => ({
      receive: async (packet, _ingress, ctx): Promise<ForwardDecision> => ({
        action: 'flood',
        packet,
        copies: ctx.neighbors.map((neighbor) => ({
          nextNodeId: neighbor.nodeId,
          edgeId: neighbor.edgeId,
          egressPort: neighbor.edgeId,
          packet,
        })),
      }),
    }),
  });
});

const host = (id: string, ip: string, extra: Partial<NetlabNode['data']> = {}): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip, ...extra },
});
const port = (id: string, extra: Partial<SwitchPort> = {}): SwitchPort => ({
  id,
  name: id,
  macAddress: `00:00:00:aa:00:${id.replace(/\D/g, '').padStart(2, '0')}`,
  ...extra,
});
const switchNode = (id: string, ports: SwitchPort[], layerId = 'l2'): NetlabNode => ({
  id,
  type: 'switch',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'switch', layerId: layerId as 'l2', ports },
});
const link = (id: string, a: string, b: string, aPort?: string, bPort?: string): NetlabEdge => ({
  id,
  source: a,
  target: b,
  ...(aPort ? { sourceHandle: aPort } : {}),
  ...(bPort ? { targetHandle: bPort } : {}),
});
const topologyOf = (nodes: NetlabNode[], edges: NetlabEdge[]): NetworkTopology => ({
  nodes,
  edges,
  areas: [],
  routeTables: new Map(),
});

/** pc, srv and a bystander on one switch. */
function lan(): NetworkTopology {
  return topologyOf(
    [
      host('pc', '10.0.0.10'),
      switchNode('sw', [port('p1'), port('p2'), port('p3')]),
      host('srv', '10.0.0.20'),
      host('by', '10.0.0.30'),
    ],
    [
      link('e-pc', 'pc', 'sw', undefined, 'p1'),
      link('e-srv', 'sw', 'srv', 'p2'),
      link('e-by', 'sw', 'by', 'p3'),
    ],
  );
}

const engineOn = (topology: NetworkTopology, arpCache?: 'persist' | 'per-send') =>
  new SimulationEngine(topology, new HookEngine(), arpCache ? { arpCache } : {});
const switchHops = (trace: PacketTrace, id = 'sw') =>
  trace.hops.filter((hop) => hop.nodeId === id && hop.event === 'forward');
const copiesAt = (hop: PacketHop | undefined) =>
  (hop?.flood?.copies ?? []).map((copy) => [copy.toNodeId, copy.outcome, copy.reason ?? null]);
/** The devices a trace crosses, in order, each once per visit. */
const path = (trace: PacketTrace) =>
  trace.hops
    .filter((hop) => hop.event !== 'arp-request' && hop.event !== 'arp-reply')
    .map((hop) => hop.nodeId)
    .filter((nodeId, index, all) => nodeId !== all[index - 1]);

describe('a switch copies a frame it cannot place (REQ-096, REQ-097, REQ-098)', () => {
  it('TC-859: the first request is copied to the bystander; the reply is not', async () => {
    const trace = await engineOn(lan()).ping('pc', '10.0.0.20');
    expect(trace.status).toBe('delivered');
    const [request, reply] = switchHops(trace);
    expect(copiesAt(request)).toEqual([['by', 'discarded', 'not-for-me']]);
    expect(request?.toNodeId).toBe('srv');
    expect(reply?.flood).toBeUndefined();
    expect(trace.hops.some((hop) => hop.nodeId === 'by')).toBe(false);
  });

  it('TC-860: once the switch has learned both, nothing is copied and the path is the same', async () => {
    const engine = engineOn(lan());
    const first = await engine.ping('pc', '10.0.0.20');
    const second = await engine.ping('pc', '10.0.0.20');
    expect(second.hops.some((hop) => hop.flood !== undefined)).toBe(false);
    expect(path(second)).toEqual(path(first));
  });

  it('TC-861: a DHCP DISCOVER reaches every host on the VLAN; only the server takes it', async () => {
    const topology = topologyOf(
      [
        host('client', '', { dhcpClient: { enabled: true } }),
        switchNode('sw', [port('p1'), port('p2'), port('p3')]),
        host('dhcp', '10.0.0.2', {
          role: 'server',
          dhcpServer: {
            leasePool: '10.0.0.100/30',
            subnetMask: '255.255.255.0',
            defaultGateway: '10.0.0.1',
            leaseTime: 86400,
          },
        }),
        host('by', '10.0.0.30'),
      ],
      [
        link('e-c', 'client', 'sw', undefined, 'p1'),
        link('e-d', 'sw', 'dhcp', 'p2'),
        link('e-b', 'sw', 'by', 'p3'),
      ],
    );
    delete topology.nodes[0]!.data.ip;
    const engine = engineOn(topology);
    await expect(engine.simulateDhcp('client')).resolves.toBe(true);
    const discover = engine.getState().traces[0]!;
    expect(copiesAt(switchHops(discover)[0])).toEqual([['by', 'discarded', 'not-for-me']]);
  });

  it('TC-862: no copy leaves by another VLAN or a blocked port', async () => {
    const topology = topologyOf(
      [
        host('pc', '10.0.0.10'),
        switchNode('sw', [
          port('p1'),
          port('p2'),
          port('p3'),
          port('p4', { vlanMode: 'access', accessVlan: 20 }),
          port('p5'),
        ]),
        host('srv', '10.0.0.20'),
        host('by', '10.0.0.30'),
        host('vlan20', '10.0.0.40'),
        host('blk', '10.0.0.50'),
      ],
      [
        link('e-pc', 'pc', 'sw', undefined, 'p1'),
        link('e-srv', 'sw', 'srv', 'p2'),
        link('e-by', 'sw', 'by', 'p3'),
        link('e-v', 'sw', 'vlan20', 'p4'),
        link('e-blk', 'sw', 'blk', 'p5'),
      ],
    );
    topology.stpStates = new Map([
      [
        'sw:p5',
        {
          switchNodeId: 'sw',
          portId: 'p5',
          role: 'ALTERNATE',
          state: 'BLOCKING',
          designatedBridge: { priority: 32768, mac: '00:00:00:aa:00:00' },
          rootPathCost: 0,
        },
      ],
    ]) as unknown as NonNullable<NetworkTopology['stpStates']>;
    const trace = await engineOn(topology).ping('pc', '10.0.0.20');
    expect(copiesAt(switchHops(trace)[0]).map(([to]) => to)).toEqual(['by']);
  });

  it('TC-863: a second switch copies a copy on, and learns where the sender is', async () => {
    const topology = topologyOf(
      [
        host('pc', '10.0.0.10'),
        switchNode('sw1', [port('p1'), port('p2'), port('p3')]),
        host('srv', '10.0.0.20'),
        switchNode('sw2', [port('p1'), port('p2')]),
        host('by', '10.0.0.30'),
      ],
      [
        link('e-pc', 'pc', 'sw1', undefined, 'p1'),
        link('e-srv', 'sw1', 'srv', 'p2'),
        link('e-12', 'sw1', 'sw2', 'p3', 'p1'),
        link('e-by', 'sw2', 'by', 'p2'),
      ],
    );
    const engine = engineOn(topology);
    const first = await engine.ping('pc', '10.0.0.20');
    expect(copiesAt(switchHops(first, 'sw1')[0])).toEqual([
      ['sw2', 'flooded', null],
      ['by', 'discarded', 'not-for-me'],
    ]);
    const fromBystander = await engine.ping('by', '10.0.0.10');
    expect(fromBystander.status).toBe('delivered');
    expect(fromBystander.hops.some((hop) => hop.nodeId === 'sw2' && hop.flood)).toBe(false);
  });

  it('TC-864: a frame no port leads to ends at the switch as no-receiver', async () => {
    const engine = engineOn(lan());
    const packet = makePacket('lost', 'pc', 'nobody', '10.0.0.10', '10.0.0.99');
    const trace = await engine.precompute({
      ...packet,
      frame: { ...packet.frame, dstMac: '02:de:ad:00:00:01' },
    });
    const last = trace.hops[trace.hops.length - 1];
    expect(last).toMatchObject({ nodeId: 'sw', event: 'drop', reason: 'no-receiver' });
    expect(copiesAt(last)).toEqual([
      ['srv', 'discarded', 'not-for-me'],
      ['by', 'discarded', 'not-for-me'],
    ]);
    expect(trace.hops.some((hop) => hop.reason === 'no-route')).toBe(false);
  });

  it('TC-870: a switch with no other cable copies nothing and ends the trace as before', async () => {
    const topology = topologyOf(
      [host('pc', '10.0.0.10'), switchNode('sw', [port('p1'), port('p2')])],
      [link('e-pc', 'pc', 'sw', undefined, 'p1')],
    );
    const packet = makePacket('alone', 'pc', 'nobody', '10.0.0.10', '10.0.0.99');
    const trace = await engineOn(topology).precompute({
      ...packet,
      frame: { ...packet.frame, dstMac: '02:de:ad:00:00:01' },
    });
    const last = trace.hops[trace.hops.length - 1];
    expect(last).toMatchObject({ nodeId: 'sw', event: 'drop' });
    expect(last?.reason).not.toBe('no-receiver');
    expect(trace.hops.some((hop) => hop.flood !== undefined)).toBe(false);
  });

  it('TC-865: reset() keeps what the switch learned, clearTraces() empties it, a failed link is not used', async () => {
    const topology = lan();
    const engine = engineOn(topology);
    await engine.ping('pc', '10.0.0.20');
    engine.reset();
    expect((await engine.ping('pc', '10.0.0.20')).hops.some((hop) => hop.flood)).toBe(false);
    engine.clearTraces();
    expect(copiesAt(switchHops(await engine.ping('pc', '10.0.0.20'))[0])).toEqual([
      ['by', 'discarded', 'not-for-me'],
    ]);
    topology.edges[1] = { ...topology.edges[1]!, data: { state: 'down' } };
    const cut = await engine.ping('pc', '10.0.0.20');
    expect(cut.hops.some((hop) => hop.activeEdgeId === 'e-srv')).toBe(false);
  });

  it("TC-866: with arpCache 'per-send' every send starts with the switch knowing nothing", async () => {
    const engine = engineOn(lan(), 'per-send');
    for (let send = 0; send < 2; send += 1) {
      const trace = await engine.ping('pc', '10.0.0.20');
      expect(copiesAt(switchHops(trace)[0])).toEqual([['by', 'discarded', 'not-for-me']]);
    }
  });
});

describe('a layer plugin may copy frames (REQ-099)', () => {
  it('TC-867: a flood with no way on ends there as no-receiver, with the copies listed', async () => {
    const topology = lan();
    topology.nodes[1] = switchNode('sw', [port('p1'), port('p2'), port('p3')], 'l1');
    const trace = await engineOn(topology).ping('pc', '10.0.0.20');
    const last = trace.hops[trace.hops.length - 1];
    expect(last).toMatchObject({ nodeId: 'sw', event: 'drop', reason: 'no-receiver' });
    expect(
      copiesAt(last)
        .map(([to]) => to)
        .sort(),
    ).toEqual(['by', 'srv']);
  });
});
