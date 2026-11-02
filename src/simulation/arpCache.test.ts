import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { PacketTrace } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { makePacket } from './__fixtures__/helpers';
import { multiHopTopology } from './__fixtures__/topologies';
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

// Hosts with no MAC written down: they are only known once asked for by ARP.
const host = (id: string, ip: string, role: 'client' | 'server' = 'client'): NetlabNode => ({
  id,
  type: role,
  position: { x: 0, y: 0 },
  data: { label: id, role, layerId: 'l7', ip },
});

/** pc, srv and spare on one switch. */
function lan(): NetworkTopology {
  return {
    nodes: [
      host('pc', '10.0.0.10'),
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
            name: `fa0/${index}`,
            macAddress: `00:00:00:20:00:0${index}`,
          })),
        },
      },
      host('srv', '10.0.0.20', 'server'),
      host('spare', '10.0.0.30', 'server'),
    ],
    edges: [
      { id: 'e-pc', source: 'pc', target: 'sw', targetHandle: 'p0' },
      { id: 'e-srv', source: 'sw', target: 'srv', sourceHandle: 'p1' },
      { id: 'e-spare', source: 'sw', target: 'spare', sourceHandle: 'p2' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

const asksByArp = (trace: PacketTrace | undefined) =>
  trace?.hops.some((hop) => hop.event === 'arp-request') ?? false;

const engineOn = (topology: NetworkTopology, arpCache?: 'persist' | 'per-send') =>
  new SimulationEngine(topology, new HookEngine(), arpCache ? { arpCache } : {});

describe('what a device learns by ARP lasts for the engine (REQ-094)', () => {
  it('TC-850: a second ping to the same address asks nothing', async () => {
    const engine = engineOn(lan());
    const first = await engine.ping('pc', '10.0.0.20');
    const second = await engine.ping('pc', '10.0.0.20');
    expect(first.status).toBe('delivered');
    expect(asksByArp(first)).toBe(true);
    expect(second.status).toBe('delivered');
    expect(asksByArp(second)).toBe(false);
  });

  it("TC-851: with arpCache 'per-send' every ping asks again, as before", async () => {
    const engine = engineOn(lan(), 'per-send');
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
  });

  it('TC-852: a TCP handshake asks only before its first segment', async () => {
    const persisted = await engineOn(lan()).tcpConnect('pc', 'srv', 49152, 80);
    expect(persisted.success).toBe(true);
    expect(persisted.traces.map(asksByArp)).toEqual([true, false, false]);

    const perSend = await engineOn(lan(), 'per-send').tcpConnect('pc', 'srv', 49152, 80);
    expect(perSend.traces.map(asksByArp)).toEqual([true, true, true]);
  });
});

describe('when what was learned is kept and when it is emptied (REQ-095)', () => {
  it('TC-853: reset() keeps it; clearTraces() empties it', async () => {
    const engine = engineOn(lan());
    await engine.ping('pc', '10.0.0.20');
    engine.reset();
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(false);
    engine.clearTraces();
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
  });

  it('TC-854: two engines on one topology learn for themselves', async () => {
    const shared = lan();
    const first = engineOn(shared);
    const second = engineOn(shared);
    await first.ping('pc', '10.0.0.20');
    expect(asksByArp(await second.ping('pc', '10.0.0.20'))).toBe(true);
  });

  it('TC-855: an address given to another device is asked for again', async () => {
    const topology = lan();
    const engine = engineOn(topology);
    await engine.ping('pc', '10.0.0.20');
    const [, , srv, spare] = topology.nodes;
    srv!.data.ip = '10.0.0.99';
    spare!.data.ip = '10.0.0.20';
    const again = await engine.ping('pc', '10.0.0.20');
    expect(asksByArp(again)).toBe(true);
    expect(again.hops.some((hop) => hop.nodeId === 'spare' && hop.event === 'deliver')).toBe(true);
  });

  it('TC-856: a failed link leaves what was learned in place', async () => {
    const topology = lan();
    const engine = engineOn(topology);
    await engine.ping('pc', '10.0.0.20');
    topology.edges[2] = { ...topology.edges[2]!, data: { state: 'down' } };
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(false);
  });

  it('TC-857: a probe uses what was learned but leaves nothing learned behind', async () => {
    const engine = engineOn(lan());
    const probe = await engine.precompute(
      makePacket('probe', 'pc', 'srv', '10.0.0.10', '10.0.0.20'),
    );
    expect(asksByArp(probe)).toBe(true);
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
    expect(
      asksByArp(await engine.precompute(makePacket('p2', 'pc', 'srv', '10.0.0.10', '10.0.0.20'))),
    ).toBe(false);
  });
});

const written = (id: string, ip: string, mac: string): NetlabNode => {
  const node = host(id, ip);
  return { ...node, data: { ...node.data, mac } };
};

/** pc and srv on one switch, each with its MAC written in the topology. */
function writtenLan(): NetworkTopology {
  const topology = lan();
  topology.nodes[0] = written('pc', '10.0.0.10', 'aa:00:00:00:00:01');
  const srvAt = topology.nodes.findIndex((node) => node.id === 'srv');
  topology.nodes[srvAt] = written('srv', '10.0.0.20', 'aa:00:00:00:00:02');
  return topology;
}

describe('a MAC in the topology is the device’s own, not known to others (REQ-190)', () => {
  it('TC-1140: the first ping asks, the second does not', async () => {
    const engine = engineOn(writtenLan());
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(false);
  });

  it('TC-1141: the answer gives the written MAC, and the frame is addressed to it', async () => {
    const trace = await engineOn(writtenLan()).ping('pc', '10.0.0.20');
    const reply = trace.hops.find((hop) => hop.event === 'arp-reply');
    expect(reply).toMatchObject({ nodeId: 'srv', srcMac: 'aa:00:00:00:00:02' });
    const atSwitch = trace.hops.find((hop) => hop.nodeId === 'sw' && hop.event === 'forward');
    expect(atSwitch?.dstMac).toBe('aa:00:00:00:00:02');
  });

  it("TC-1142: with arpCache 'per-send' both pings ask", async () => {
    const engine = engineOn(writtenLan(), 'per-send');
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
    expect(asksByArp(await engine.ping('pc', '10.0.0.20'))).toBe(true);
  });

  it('TC-1144: what one device learned, another still has to ask for', async () => {
    const engine = engineOn(writtenLan());
    const askers = (trace: PacketTrace) =>
      trace.hops.filter((hop) => hop.event === 'arp-request').map((hop) => hop.nodeId);
    expect(askers(await engine.ping('pc', '10.0.0.20'))).toEqual(['pc']);
    expect(askers(await engine.ping('spare', '10.0.0.20'))).toEqual(['spare']);
  });

  it('TC-1143: a router asks for its next hop once', async () => {
    const engine = engineOn(multiHopTopology());
    const send = async (id: string) => {
      await engine.send(makePacket(id, 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
      return engine.getState().traces.find((trace) => trace.packetId === id);
    };
    const first = await send('first');
    expect(first?.status).toBe('delivered');
    expect(
      first?.hops.filter((hop) => hop.event === 'arp-request').map((hop) => hop.nodeId),
    ).toEqual(['client-1', 'router-1', 'router-2']);
    expect(asksByArp(await send('second'))).toBe(false);
  });
});
