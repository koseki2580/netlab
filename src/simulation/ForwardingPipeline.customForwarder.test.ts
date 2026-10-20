import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { ForwardDecision, Forwarder } from '../types/layers';
import type { RouteEntry, RouterInterface } from '../types/routing';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { SimulationEngine } from './SimulationEngine';

/**
 * A third-party router plugin: it forwards as the built-in router does, but
 * says nothing about the next hop or the route it used.
 */
class SilentRouter implements Forwarder {
  private readonly inner: RouterForwarder;
  constructor(nodeId: string, topology: NetworkTopology) {
    this.inner = new RouterForwarder(nodeId, topology);
  }
  async receive(...args: Parameters<Forwarder['receive']>): Promise<ForwardDecision> {
    const decision = await this.inner.receive(...args);
    if (decision.action !== 'forward') return decision;
    const {
      nextHopIp: _nextHopIp,
      selectedRoute: _selectedRoute,
      egressInterfaceId: _egressInterfaceId,
      ...rest
    } = decision;
    return rest;
  }
}

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SilentRouter(nodeId, topology),
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

const engineOn = (topology: NetworkTopology) => new SimulationEngine(topology, new HookEngine());

/** pc — r1 — sw — {r3, r2} — srv: r3 is cabled to the switch first, and is no way to srv. */
function sharedSegment(): NetworkTopology {
  const ports = [0, 1, 2].map((index) => ({
    id: `sw-p${index}`,
    name: `fa0/${index}`,
    macAddress: `00:00:00:20:00:0${index}`,
  }));
  return {
    nodes: [
      hostNode('pc', '10.0.1.10'),
      routerNode('r1', [
        iface('r1-lan', '10.0.1.1/24', '00:00:00:01:00:01'),
        iface('r1-seg', '10.0.12.1/24', '00:00:00:01:00:02'),
      ]),
      {
        id: 'sw',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: { label: 'sw', role: 'switch', layerId: 'l2', ports },
      },
      routerNode('r3', [iface('r3-seg', '10.0.12.3/24', '00:00:00:03:00:01')]),
      routerNode('r2', [
        iface('r2-seg', '10.0.12.2/24', '00:00:00:02:00:01'),
        iface('r2-lan', '10.0.2.1/24', '00:00:00:02:00:02'),
      ]),
      hostNode('srv', '10.0.2.10'),
    ],
    edges: [
      { id: 'e-pc', source: 'pc', target: 'r1', targetHandle: 'r1-lan' },
      { id: 'e-1', source: 'r1', target: 'sw', sourceHandle: 'r1-seg', targetHandle: 'sw-p0' },
      { id: 'e-3', source: 'sw', target: 'r3', sourceHandle: 'sw-p1', targetHandle: 'r3-seg' },
      { id: 'e-2', source: 'sw', target: 'r2', sourceHandle: 'sw-p2', targetHandle: 'r2-seg' },
      { id: 'e-srv', source: 'r2', target: 'srv', sourceHandle: 'r2-lan' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          route('r1', '10.0.1.0/24', 'direct'),
          route('r1', '10.0.12.0/24', 'direct'),
          route('r1', '10.0.2.0/24', '10.0.12.2'),
        ],
      ],
      [
        'r2',
        [
          route('r2', '10.0.2.0/24', 'direct'),
          route('r2', '10.0.12.0/24', 'direct'),
          route('r2', '10.0.1.0/24', '10.0.12.1'),
        ],
      ],
      ['r3', [route('r3', '10.0.12.0/24', 'direct')]],
    ]),
  };
}

describe('a router plugin that names no next hop', () => {
  // TC-836: the engine looks the route up itself, as it always has, so the
  // frame goes to the next router the route names, not to whichever router
  // the switch lists first.
  it('TC-836: still reaches the remote next hop found by the route lookup', async () => {
    const trace = await engineOn(sharedSegment()).ping('pc', '10.0.2.10');

    expect(trace.status).toBe('delivered');
    expect(trace.hops.some((hop) => hop.nodeId === 'r3')).toBe(false);
  });
});
