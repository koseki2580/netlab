import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SimulationEngine } from './SimulationEngine';
import { StepSimulationController } from './StepSimulationController';
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

// ── Helpers (mirrors SimulationEngine.test.ts) ────────────────────────────────

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

function makeEngine(topology: NetworkTopology) {
  return new SimulationEngine(topology, new HookEngine());
}

function makeController(topology: NetworkTopology) {
  return new StepSimulationController(makeEngine(topology));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StepSimulationController initial state', () => {
  it('is idle with correct defaults before any load', () => {
    const ctrl = makeController(singleRouterTopology());
    const state = ctrl.getState();
    expect(state.status).toBe('idle');
    expect(state.currentStep).toBe(-1);
    expect(state.totalSteps).toBe(0);
    expect(state.currentHop).toBeNull();
    expect(state.canStep).toBe(false);
    expect(state.canReset).toBe(false);
  });
});

describe('StepSimulationController.load', () => {
  it('status becomes loaded after load(), totalSteps > 0, canStep true', async () => {
    const ctrl = makeController(singleRouterTopology());
    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const state = ctrl.getState();
    expect(state.status).toBe('loaded');
    expect(state.totalSteps).toBeGreaterThan(0);
    expect(state.canStep).toBe(true);
    expect(state.canReset).toBe(true);
  });
});

describe('StepSimulationController.nextStep', () => {
  it('advances step and returns the hop', async () => {
    const ctrl = makeController(singleRouterTopology());
    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const hop = ctrl.nextStep();
    expect(hop).not.toBeNull();
    expect(hop!.step).toBe(0);
    expect(ctrl.getState().currentStep).toBe(0);
    expect(ctrl.getState().status).toBe('stepping');
  });

  it('status becomes done after last step and canStep is false', async () => {
    const ctrl = makeController(singleRouterTopology());
    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    // singleRouterTopology has 3 hops (0, 1, 2)
    ctrl.nextStep();
    ctrl.nextStep();
    ctrl.nextStep();

    const state = ctrl.getState();
    expect(state.status).toBe('done');
    expect(state.canStep).toBe(false);
  });

  it('returns null when no step advance happens (already done)', async () => {
    const ctrl = makeController(singleRouterTopology());
    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    ctrl.nextStep();
    ctrl.nextStep();
    ctrl.nextStep();
    const hop = ctrl.nextStep(); // extra — should not advance
    expect(hop).toBeNull();
  });
});

describe('StepSimulationController.reset', () => {
  it('restores to loaded state after stepping', async () => {
    const ctrl = makeController(singleRouterTopology());
    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    ctrl.nextStep();
    ctrl.nextStep();
    ctrl.reset();

    const state = ctrl.getState();
    expect(state.status).toBe('loaded');
    expect(state.currentStep).toBe(-1);
    expect(state.currentHop).toBeNull();
    expect(state.canStep).toBe(true);
    expect(state.canReset).toBe(true);
  });
});

describe('StepSimulationController.subscribe', () => {
  it('listener fires on load and step', async () => {
    const ctrl = makeController(singleRouterTopology());
    const listener = vi.fn();
    ctrl.subscribe(listener);

    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    expect(listener).toHaveBeenCalled();

    const countAfterLoad = listener.mock.calls.length;
    ctrl.nextStep();
    expect(listener.mock.calls.length).toBeGreaterThan(countAfterLoad);
  });

  it('unsubscribed listener does not fire', async () => {
    const ctrl = makeController(singleRouterTopology());
    const listener = vi.fn();
    const unsub = ctrl.subscribe(listener);
    unsub();

    await ctrl.load(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    ctrl.nextStep();
    expect(listener).not.toHaveBeenCalled();
  });
});
