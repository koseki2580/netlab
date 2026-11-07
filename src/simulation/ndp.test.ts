import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { PacketHop, PacketTrace } from '../types/simulation';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../types/topology';
import { makeRouteEntry } from './__fixtures__/helpers';
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

const host = (id: string, ip: string, ipv6: string, mac: string): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip, ipv6, mac },
});
const link = (id: string, source: string, target: string, sourceHandle?: string): NetlabEdge => ({
  id,
  source,
  target,
  ...(sourceHandle ? { sourceHandle } : {}),
});
const topologyOf = (
  nodes: NetlabNode[],
  edges: NetlabEdge[],
  routeTables: NetworkTopology['routeTables'] = new Map(),
): NetworkTopology => ({ nodes, edges, areas: [], routeTables });

const A = host('a', '10.0.0.10', '2001:db8::10', '02:00:00:00:00:0a');
const B = host('b', '10.0.0.20', '2001:db8::20', '02:00:00:00:00:0b');
const C = host('c', '10.0.0.30', '2001:db8::30', '02:00:00:00:00:0c');

const cable = () => topologyOf([A, B], [link('e', 'a', 'b')]);
const onSwitch = () =>
  topologyOf(
    [
      A,
      {
        id: 'sw',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'sw',
          role: 'switch',
          layerId: 'l2',
          ports: [0, 1, 2].map((index) => ({
            id: `p${index}`,
            name: `p${index}`,
            macAddress: `00:00:00:20:00:0${index}`,
          })),
        },
      },
      B,
      C,
    ],
    [
      { id: 'e-a', source: 'a', target: 'sw', targetHandle: 'p0' },
      link('e-b', 'sw', 'b', 'p1'),
      link('e-c', 'sw', 'c', 'p2'),
    ],
  );
const routed = () =>
  topologyOf(
    [
      host('pc', '10.0.1.10', '2001:db8:1::10', '02:00:00:00:00:10'),
      {
        id: 'r1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'r1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:1::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:2::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:01',
            },
          ],
        },
      },
      host('srv', '10.0.2.20', '2001:db8:2::20', '02:00:00:00:00:20'),
    ],
    [link('e1', 'pc', 'r1'), link('e2', 'r1', 'srv')],
    new Map([
      [
        'r1',
        [
          makeRouteEntry('r1', '2001:db8:1::/64', 'direct'),
          makeRouteEntry('r1', '2001:db8:2::/64', 'direct'),
          makeRouteEntry('r1', '10.0.1.0/24', 'direct'),
          makeRouteEntry('r1', '10.0.2.0/24', 'direct'),
        ],
      ],
    ]),
  );

const engineOn = (topology: NetworkTopology, arpCache?: 'persist' | 'per-send') =>
  new SimulationEngine(topology, new HookEngine(), arpCache ? { arpCache } : {});
const ndpHops = (trace: PacketTrace): PacketHop[] =>
  trace.hops.filter((hop) => hop.event === 'ndp-solicit' || hop.event === 'ndp-advert');

describe('IPv6 neighbours are found by Neighbor Discovery on the wire (REQ-191)', () => {
  it('TC-1190: the first ping solicits the target and gets an advertisement; the second does not', async () => {
    const engine = engineOn(cable());
    const first = await engine.ping('a', '2001:db8::20');
    expect(first.status).toBe('delivered');
    const [ns, na] = ndpHops(first);
    expect(ns).toMatchObject({
      nodeId: 'a',
      event: 'ndp-solicit',
      srcIp: '2001:db8::10',
      dstIp: 'ff02::1:ff00:20',
      srcMac: '02:00:00:00:00:0a',
      dstMac: '33:33:ff:00:00:20',
      ndpState: 'INCOMPLETE',
    });
    expect(ns?.ndpFrame?.payload.payload).toMatchObject({
      type: 135,
      code: 0,
      targetAddress: '2001:db8::20',
      options: [{ type: 1, linkLayerAddress: '02:00:00:00:00:0a' }],
    });
    expect(na).toMatchObject({
      nodeId: 'b',
      event: 'ndp-advert',
      srcIp: '2001:db8::20',
      dstIp: '2001:db8::10',
      srcMac: '02:00:00:00:00:0b',
      dstMac: '02:00:00:00:00:0a',
      ndpState: 'REACHABLE',
    });
    expect(na?.ndpFrame?.payload.payload).toMatchObject({
      type: 136,
      targetAddress: '2001:db8::20',
      flags: { router: false, solicited: true, override: true },
      options: [{ type: 2, linkLayerAddress: '02:00:00:00:00:0b' }],
    });
    expect(ndpHops(await engine.ping('a', '2001:db8::20'))).toEqual([]);
  });

  it("TC-1191: with arpCache 'per-send' every ping solicits", async () => {
    const engine = engineOn(cable(), 'per-send');
    expect(ndpHops(await engine.ping('a', '2001:db8::20')).length).toBeGreaterThan(0);
    expect(ndpHops(await engine.ping('a', '2001:db8::20')).length).toBeGreaterThan(0);
  });

  it('TC-1192: the sender solicits the router, and the router the destination', async () => {
    const trace = await engineOn(routed()).ping('pc', '2001:db8:2::20');
    expect(trace.status).toBe('delivered');
    const solicits = ndpHops(trace)
      .filter((hop) => hop.event === 'ndp-solicit')
      .map((hop) => [hop.nodeId, hop.ndpFrame?.payload.payload.targetAddress]);
    expect(solicits.slice(0, 2)).toEqual([
      ['pc', '2001:db8:1::1'],
      ['r1', '2001:db8:2::20'],
    ]);
  });

  it('TC-1193: a switch copies the solicitation to the third host, and no data frame', async () => {
    const trace = await engineOn(onSwitch()).ping('a', '2001:db8::20');
    expect(trace.status).toBe('delivered');
    const copied = trace.hops.flatMap((hop) =>
      (hop.flood?.copies ?? []).map((copy) => [hop.event, copy.toNodeId, copy.outcome]),
    );
    expect(copied).toEqual([['ndp-solicit', 'c', 'discarded']]);
  });

  it('TC-1194: an IPv4 ping has no NDP hop', async () => {
    const trace = await engineOn(onSwitch()).ping('a', '10.0.0.20');
    expect(trace.status).toBe('delivered');
    expect(ndpHops(trace)).toEqual([]);
  });
});
