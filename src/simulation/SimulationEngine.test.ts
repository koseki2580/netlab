import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SimulationEngine } from './SimulationEngine';
import { HookEngine } from '../hooks/HookEngine';
import { layerRegistry } from '../registry/LayerRegistry';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import type { NetworkTopology } from '../types/topology';
import type { InFlightPacket, EthernetFrame } from '../types/packets';
import type { RouteEntry } from '../types/routing';

// Register forwarders once without importing React components
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIpFrame(srcIp: string, dstIp: string, ttl = 64): EthernetFrame {
  return {
    layer: 'L2',
    srcMac: '00:00:00:00:00:01',
    dstMac: '00:00:00:00:00:02',
    etherType: 0x0800,
    payload: {
      layer: 'L3',
      srcIp,
      dstIp,
      ttl,
      protocol: 6,
      payload: {
        layer: 'L4',
        srcPort: 12345,
        dstPort: 80,
        seq: 0,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw', data: '' },
      },
    },
  };
}

function makePacket(
  id: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  ttl = 64,
): InFlightPacket {
  return {
    id,
    srcNodeId,
    dstNodeId,
    frame: makeIpFrame(srcIp, dstIp, ttl),
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

function makeRouteEntry(
  nodeId: string,
  destination: string,
  nextHop: string,
): RouteEntry {
  return {
    destination,
    nextHop,
    metric: 0,
    protocol: 'static',
    adminDistance: 1,
    nodeId,
  };
}

/** Simple two-node topology: client-1 -- e1 -- server-1 */
function directTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 200, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
      },
    ],
    edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
    areas: [],
    routeTables: new Map(),
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- server-1 */
function singleRouterTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- switch-1 -- e2 -- server-1 */
function switchPassthroughTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 200, y: 0 },
        data: {
          label: 'SW-1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1' },
      { id: 'e2', source: 'switch-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- router-2 -- e3 -- server-1 */
function multiHopTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: 0 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
            { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-2', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

function makeEngine(topology: NetworkTopology) {
  return new SimulationEngine(topology, new HookEngine());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SimulationEngine.precompute', () => {
  it('delivers directly to adjacent server', async () => {
    const engine = makeEngine(directTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(2);
    expect(trace.hops[0].event).toBe('create');
    expect(trace.hops[0].nodeId).toBe('client-1');
    expect(trace.hops[0].toNodeId).toBe('server-1');
    expect(trace.hops[1].event).toBe('deliver');
    expect(trace.hops[1].nodeId).toBe('server-1');
  });

  it('routes through a single router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(3);
    expect(trace.hops[0].event).toBe('create');
    expect(trace.hops[0].nodeId).toBe('client-1');
    expect(trace.hops[1].event).toBe('forward');
    expect(trace.hops[1].nodeId).toBe('router-1');
    expect(trace.hops[2].event).toBe('deliver');
    expect(trace.hops[2].nodeId).toBe('server-1');
  });

  it('decrements TTL at each router hop', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    // hop[1] = router-1: arriving TTL is 64 (pre-decrement)
    expect(trace.hops[1].ttl).toBe(64);
    // hop[2] = server-1: forwarded packet has TTL=63
    expect(trace.hops[2].ttl).toBe(63);
  });

  it('drops packet when TTL reaches 1 at router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1);
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop).toBeDefined();
    expect(dropHop!.reason).toBe('ttl-exceeded');
    expect(dropHop!.nodeId).toBe('router-1');
  });

  it('drops packet when no route exists', async () => {
    const topology = singleRouterTopology();
    // Remove all routes from router-1
    topology.routeTables.set('router-1', []);
    const engine = makeEngine(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop).toBeDefined();
    expect(dropHop!.reason).toBe('no-route');
  });

  it('traverses through a switch', async () => {
    const engine = makeEngine(switchPassthroughTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(3);
    expect(trace.hops[1].nodeId).toBe('switch-1');
    expect(trace.hops[1].event).toBe('forward');
    expect(trace.hops[1].activeEdgeId).toBe('e2');
  });

  it('routes through two routers', async () => {
    const engine = makeEngine(multiHopTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(4);
    expect(trace.hops[0].event).toBe('create');
    expect(trace.hops[1].nodeId).toBe('router-1');
    expect(trace.hops[2].nodeId).toBe('router-2');
    expect(trace.hops[3].event).toBe('deliver');
  });

  it('stops with routing-loop when a node is revisited (triangle cycle)', async () => {
    // Triangle: client-1 → R1 → R2 → R3 → R1 (R1 is revisited, triggering loop detection)
    // R1 and R3 share an edge so R3 can forward back to R1 without backtracking through R2.
    const routeTables = new Map<string, RouteEntry[]>([
      ['router-1', [makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2')]],
      ['router-2', [makeRouteEntry('router-2', '203.0.113.0/24', '192.168.1.2')]],
      ['router-3', [makeRouteEntry('router-3', '203.0.113.0/24', '10.0.0.1')]],
    ]);
    const topology: NetworkTopology = {
      nodes: [
        {
          id: 'client-1',
          type: 'client',
          position: { x: 0, y: 0 },
          data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
        },
        {
          id: 'router-1',
          type: 'router',
          position: { x: 200, y: 0 },
          data: {
            label: 'R-1',
            role: 'router',
            layerId: 'l3',
            interfaces: [
              { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
              { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
              { id: 'eth2', name: 'eth2', ipAddress: '192.168.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:02' },
            ],
          },
        },
        {
          id: 'router-2',
          type: 'router',
          position: { x: 400, y: 0 },
          data: {
            label: 'R-2',
            role: 'router',
            layerId: 'l3',
            interfaces: [
              { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
              { id: 'eth1', name: 'eth1', ipAddress: '192.168.1.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
            ],
          },
        },
        {
          id: 'router-3',
          type: 'router',
          position: { x: 200, y: 200 },
          data: {
            label: 'R-3',
            role: 'router',
            layerId: 'l3',
            interfaces: [
              { id: 'eth0', name: 'eth0', ipAddress: '192.168.1.2', prefixLength: 24, macAddress: '00:00:00:03:00:00' },
              { id: 'eth1', name: 'eth1', ipAddress: '192.168.0.2', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
            ],
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'client-1', target: 'router-1' },
        { id: 'e2', source: 'router-1', target: 'router-2' },
        { id: 'e3', source: 'router-2', target: 'router-3' },
        { id: 'e4', source: 'router-3', target: 'router-1' }, // closes the triangle
      ],
      areas: [],
      routeTables,
    };
    const engine = makeEngine(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops[trace.hops.length - 1];
    expect(dropHop.event).toBe('drop');
    expect(dropHop.reason).toBe('routing-loop');
  });

  it('populates activeEdgeId on forward hops', async () => {
    const topology = singleRouterTopology();
    const engine = makeEngine(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    const edgeIds = topology.edges.map((e) => e.id);
    const forwardHops = trace.hops.filter((h) => h.event === 'create' || h.event === 'forward');
    for (const hop of forwardHops) {
      expect(hop.activeEdgeId).toBeDefined();
      expect(edgeIds).toContain(hop.activeEdgeId);
    }
  });
});

describe('SimulationEngine.step', () => {
  async function loadedEngine() {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    return engine;
  }

  it('starts with currentStep -1 after send', async () => {
    const engine = await loadedEngine();
    expect(engine.getState().currentStep).toBe(-1);
    expect(engine.getState().status).toBe('paused');
  });

  it('advances currentStep on each call', async () => {
    const engine = await loadedEngine();
    engine.step();
    expect(engine.getState().currentStep).toBe(0);
    engine.step();
    expect(engine.getState().currentStep).toBe(1);
  });

  it('sets status to done at last hop', async () => {
    const engine = await loadedEngine();
    // singleRouterTopology has 3 hops (0, 1, 2)
    engine.step();
    engine.step();
    engine.step();
    expect(engine.getState().status).toBe('done');
  });

  it('does not advance beyond last hop', async () => {
    const engine = await loadedEngine();
    engine.step();
    engine.step();
    engine.step();
    engine.step(); // extra step
    expect(engine.getState().currentStep).toBe(2); // stays at last
  });

  it('updates activeEdgeIds from hop', async () => {
    const engine = await loadedEngine();
    engine.step(); // step 0: client-1 create, activeEdgeId = 'e1'
    expect(engine.getState().activeEdgeIds).toEqual(['e1']);
  });

  it('clears activeEdgeIds on deliver hop', async () => {
    const engine = await loadedEngine();
    engine.step();
    engine.step();
    engine.step(); // deliver hop
    expect(engine.getState().activeEdgeIds).toEqual([]);
  });
});

describe('SimulationEngine.play / pause', () => {
  it('auto-advances to done with zero interval', async () => {
    vi.useFakeTimers();
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.play(0);
    expect(engine.getState().status).toBe('running');

    await vi.runAllTimersAsync();
    expect(engine.getState().status).toBe('done');
    vi.useRealTimers();
  });

  it('pauses mid-play', async () => {
    vi.useFakeTimers();
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.play(100);
    await vi.advanceTimersByTimeAsync(100); // advance one step
    engine.pause();

    expect(engine.getState().status).toBe('paused');
    const stepAfterPause = engine.getState().currentStep;
    await vi.advanceTimersByTimeAsync(500); // would advance more if not paused
    expect(engine.getState().currentStep).toBe(stepAfterPause);
    vi.useRealTimers();
  });
});

describe('SimulationEngine.reset', () => {
  it('resets playback position without clearing traces', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    engine.step();
    engine.step();
    engine.reset();

    const state = engine.getState();
    expect(state.currentStep).toBe(-1);
    expect(state.activeEdgeIds).toEqual([]);
    expect(state.selectedHop).toBeNull();
    expect(state.traces).toHaveLength(1); // trace still present
    expect(state.status).toBe('paused');
  });
});

describe('SimulationEngine.subscribe', () => {
  it('calls listener on step', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const listener = vi.fn();
    engine.subscribe(listener);
    engine.step();

    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not call listener after unsubscribe', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const listener = vi.fn();
    const unsub = engine.subscribe(listener);
    unsub();
    engine.step();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('SimulationEngine hook emission', () => {
  it('emits packet:forward when stepping through a forward hop', async () => {
    const hookEngine = new HookEngine();
    const topology = singleRouterTopology();
    const engine = new SimulationEngine(topology, hookEngine);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const forwardSpy = vi.fn(async (_ctx, next) => { await next(); });
    hookEngine.on('packet:forward', forwardSpy);

    engine.step(); // step 0: create
    engine.step(); // step 1: forward at router-1

    // Allow async hook emission to complete
    await Promise.resolve();

    expect(forwardSpy).toHaveBeenCalledOnce();
    const ctx = forwardSpy.mock.calls[0][0];
    expect(ctx.fromNodeId).toBe('client-1');
    expect(ctx.toNodeId).toBe('server-1');
  });

  it('emits packet:deliver on the deliver hop', async () => {
    const hookEngine = new HookEngine();
    const engine = new SimulationEngine(singleRouterTopology(), hookEngine);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const deliverSpy = vi.fn(async (_ctx, next) => { await next(); });
    hookEngine.on('packet:deliver', deliverSpy);

    engine.step();
    engine.step();
    engine.step(); // deliver

    await Promise.resolve();
    expect(deliverSpy).toHaveBeenCalledOnce();
    expect(deliverSpy.mock.calls[0][0].destinationNodeId).toBe('server-1');
  });
});

describe('SimulationEngine.selectHop', () => {
  it('updates selectedHop and activeEdgeIds without advancing currentStep', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.selectHop(1); // router-1 forward hop
    const state = engine.getState();
    expect(state.selectedHop?.nodeId).toBe('router-1');
    expect(state.currentStep).toBe(-1); // not advanced
    expect(state.activeEdgeIds).toEqual(['e2']);
  });
});
