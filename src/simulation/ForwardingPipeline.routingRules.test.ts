import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { AclRule } from '../types/acl';
import type { RouteEntry, RouterInterface } from '../types/routing';
import type { PacketTrace } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
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

const hostNode = (id: string, ip: string): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip },
});

const iface = (id: string, cidr: string, mac: string, extra: Partial<RouterInterface> = {}) => {
  const [ipAddress = '', length = '24'] = cidr.split('/');
  return { id, name: id, ipAddress, prefixLength: Number(length), macAddress: mac, ...extra };
};

const routerNode = (id: string, interfaces: RouterInterface[]): NetlabNode => ({
  id,
  type: 'router',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'router', layerId: 'l3', interfaces },
});

const route = (nodeId: string, destination: string, nextHop: string): RouteEntry => ({
  destination,
  nextHop,
  metric: 0,
  protocol: nextHop === 'direct' ? 'static' : 'static',
  adminDistance: nextHop === 'direct' ? 0 : 1,
  nodeId,
});

interface ChainOptions {
  /** r1's route to the server's LAN. */
  readonly r1ToServer?: RouteEntry;
  readonly pcIp?: string;
  readonly srvIp?: string;
  readonly r1Lan?: Partial<RouterInterface>;
}

/** pc — r1 — r2 — srv, every host on its own router's LAN. */
function chain(options: ChainOptions = {}): NetworkTopology {
  return {
    nodes: [
      hostNode('pc', options.pcIp ?? '10.0.1.10'),
      routerNode('r1', [
        iface('r1-lan', '10.0.1.1/24', '00:00:00:01:00:01', options.r1Lan),
        iface('r1-12', '10.0.12.1/30', '00:00:00:01:00:02'),
      ]),
      routerNode('r2', [
        iface('r2-12', '10.0.12.2/30', '00:00:00:02:00:01'),
        iface('r2-lan', '10.0.2.1/24', '00:00:00:02:00:02'),
      ]),
      hostNode('srv', options.srvIp ?? '10.0.2.10'),
    ],
    edges: [
      { id: 'e-pc', source: 'pc', target: 'r1', targetHandle: 'r1-lan' },
      { id: 'e-12', source: 'r1', target: 'r2', sourceHandle: 'r1-12', targetHandle: 'r2-12' },
      { id: 'e-srv', source: 'r2', target: 'srv', sourceHandle: 'r2-lan' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          route('r1', '10.0.1.0/24', 'direct'),
          route('r1', '10.0.12.0/30', 'direct'),
          options.r1ToServer ?? route('r1', '10.0.2.0/24', '10.0.12.2'),
        ],
      ],
      [
        'r2',
        [
          route('r2', '10.0.2.0/24', 'direct'),
          route('r2', '10.0.12.0/30', 'direct'),
          route('r2', '10.0.1.0/24', '10.0.12.1'),
        ],
      ],
    ]),
  };
}

const engineOn = (topology: NetworkTopology) => new SimulationEngine(topology, new HookEngine());
const lastHop = (trace: PacketTrace) => trace.hops[trace.hops.length - 1];
const drop = (trace: PacketTrace) => {
  const hop = trace.hops.find((candidate) => candidate.event === 'drop');
  return hop ? { nodeId: hop.nodeId, reason: hop.reason } : null;
};

describe('a next hop must be on a network the router is connected to', () => {
  it('the chain works with a next hop on the shared link', async () => {
    const trace = await engineOn(chain()).ping('pc', '10.0.2.10');
    expect(trace.status).toBe('delivered');
  });

  // TC-824
  it('TC-824: the neighbour router named by its far-side address is refused at the router', async () => {
    const trace = await engineOn(
      chain({ r1ToServer: route('r1', '10.0.2.0/24', '10.0.2.1') }),
    ).ping('pc', '10.0.2.10');
    expect(trace.status).toBe('dropped');
    expect(drop(trace)).toEqual({ nodeId: 'r1', reason: 'next-hop-off-link' });
    expect(trace.hops.some((hop) => hop.nodeId === 'r2')).toBe(false);
  });

  // TC-825
  it('TC-825: a next hop on no connected network drops as next-hop-off-link, not no-route', async () => {
    const trace = await engineOn(
      chain({ r1ToServer: route('r1', '10.0.2.0/24', '10.9.9.9') }),
    ).ping('pc', '10.0.2.10');
    expect(drop(trace)).toEqual({ nodeId: 'r1', reason: 'next-hop-off-link' });
  });

  // TC-826
  it('TC-826: of two equal-cost next hops, an off-link one is never chosen', async () => {
    const ecmp: RouteEntry = {
      ...route('r1', '10.0.2.0/24', '10.0.2.1'),
      equalCostNextHops: [{ nextHop: '10.0.2.1' }, { nextHop: '10.0.12.2' }],
    };
    const trace = await engineOn(chain({ r1ToServer: ecmp })).ping('pc', '10.0.2.10');
    expect(trace.status).toBe('delivered');
    const atR1 = trace.hops.find((hop) => hop.nodeId === 'r1' && hop.event === 'forward');
    expect(atR1?.ecmpTrace).toBeUndefined();
  });
});

describe('an empty access list is no access list', () => {
  const permitNothing: AclRule[] = [];

  // TC-828
  it('TC-828: an empty inbound list lets traffic through, as an absent one does', async () => {
    const trace = await engineOn(chain({ r1Lan: { inboundAcl: permitNothing } })).ping(
      'pc',
      '10.0.2.10',
    );
    expect(trace.status).toBe('delivered');
    expect(trace.hops.some((hop) => hop.aclMatch)).toBe(false);
  });

  // TC-829
  it('TC-829: an empty outbound list lets traffic through, as an absent one does', async () => {
    const trace = await engineOn(chain({ r1Lan: { outboundAcl: permitNothing } })).ping(
      'pc',
      '10.0.2.10',
    );
    expect(trace.status).toBe('delivered');
  });

  it('a list with a rule still filters', async () => {
    const trace = await engineOn(
      chain({
        r1Lan: {
          inboundAcl: [{ id: 'web', priority: 10, action: 'permit', protocol: 'tcp', dstPort: 80 }],
        },
      }),
    ).ping('pc', '10.0.2.10');
    expect(drop(trace)).toEqual({ nodeId: 'r1', reason: 'acl-deny' });
  });
});

describe('the network and broadcast address of a prefix are not device addresses', () => {
  // TC-831
  it('TC-831: a host given its LAN broadcast address sends nothing: the drop is at the host', async () => {
    const trace = await engineOn(chain({ pcIp: '10.0.1.255' })).ping('pc', '10.0.2.10');
    expect(trace.hops).toHaveLength(1);
    expect(drop(trace)).toEqual({ nodeId: 'pc', reason: 'reserved-address' });
  });

  // TC-832
  it('TC-832: a host given its LAN network address receives nothing', async () => {
    const trace = await engineOn(chain({ srvIp: '10.0.2.0' })).ping('pc', '10.0.2.0');
    expect(trace.status).toBe('dropped');
    expect(trace.hops.some((hop) => hop.nodeId === 'srv' && hop.event === 'deliver')).toBe(false);
    expect(drop(trace)?.reason).toBe('reserved-address');
  });

  // TC-833
  it('TC-833: a router side given its network address carries nothing', async () => {
    const trace = await engineOn(
      chain({ r1Lan: { ipAddress: '10.0.1.0' }, pcIp: '10.0.1.10' }),
    ).ping('srv', '10.0.1.10');
    expect(drop(trace)).toEqual({ nodeId: 'r1', reason: 'reserved-address' });
    expect(lastHop(trace)?.nodeId).toBe('r1');
  });

  // TC-834
  it('TC-834: an address that ends in .0 or .255 inside a wider prefix is an ordinary address', async () => {
    const trace = await engineOn(
      chain({
        r1Lan: { ipAddress: '10.0.0.1', prefixLength: 23 },
        pcIp: '10.0.1.0',
      }),
    ).ping('pc', '10.0.2.10');
    expect(trace.status).toBe('delivered');
  });
});
