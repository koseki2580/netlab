import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { PacketTrace } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
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
