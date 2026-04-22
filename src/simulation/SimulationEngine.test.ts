import { beforeAll, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { type FailureState, EMPTY_FAILURE_STATE, makeInterfaceFailureId } from '../types/failure';
import type { RouteEntry } from '../types/routing';
import type { PacketTrace } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import { computeFcs, computeIpv4Checksum } from '../utils/checksum';
import { buildEthernetFrameBytes, buildIpv4HeaderBytes } from '../utils/packetLayout';
import { serializeArpFrame } from '../utils/packetSerializer';
import { assertDefined, getRequired } from '../utils/typedAccess';
import {
  CLIENT_MAC,
  SERVER_MAC,
  SERVER_TWO_MAC,
  countPcapRecords,
  deriveDeterministicMac,
  makeEngine,
  makePacket,
  makeRouteEntry,
  packetAtStep,
  pcapRecordBytes,
} from './__fixtures__/helpers';
import {
  aclTopology,
  directTopology,
  directTopologyWithoutServerMac,
  failureFallbackTopology,
  multiHopTopology,
  natTopology,
  routerSwitchHostTopology,
  singleRouterTopology,
  singleRouterTopologyWithoutServerMac,
  switchPassthroughTopology,
  switchPassthroughTopologyWithHandles,
} from './__fixtures__/topologies';
import { DataTransferController } from './DataTransferController';
import { SimulationEngine } from './SimulationEngine';

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

// ── Tests ─────────────────────────────────────────────────────────────────────

function hopAt(trace: PacketTrace, index: number) {
  return getRequired(trace.hops, index, {
    packetId: trace.packetId,
    reason: 'expected trace hop',
    index,
  });
}

function traceForPacketId(engine: ReturnType<typeof makeEngine>, packetId: string) {
  const trace = engine.getState().traces.find((candidate) => candidate.packetId === packetId);
  assertDefined(trace, `expected trace for packet ${packetId}`);
  return trace;
}

function selectedPacketSnapshot(engine: ReturnType<typeof makeEngine>, message: string) {
  const packet = engine.getState().selectedPacket;
  if (packet == null) {
    throw new Error(message);
  }
  return packet;
}

function spyCall<T extends unknown[]>(spy: { mock: { calls: T[] } }, index = 0): T {
  const call = spy.mock.calls[index];
  assertDefined(call, `expected spy call at index ${index}`);
  return call;
}

describe('SimulationEngine.precompute', () => {
  it('delivers directly to adjacent server', async () => {
    const engine = makeEngine(directTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);
    const createHop = hopAt(trace, 0);
    const deliverHop = hopAt(trace, 1);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(2);
    expect(createHop.event).toBe('create');
    expect(createHop.nodeId).toBe('client-1');
    expect(createHop.toNodeId).toBe('server-1');
    expect(deliverHop.event).toBe('deliver');
    expect(deliverHop.nodeId).toBe('server-1');
  });

  it('routes through a single router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);
    const createHop = hopAt(trace, 0);
    const forwardHop = hopAt(trace, 1);
    const deliverHop = hopAt(trace, 2);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(3);
    expect(createHop.event).toBe('create');
    expect(createHop.nodeId).toBe('client-1');
    expect(forwardHop.event).toBe('forward');
    expect(forwardHop.nodeId).toBe('router-1');
    expect(deliverHop.event).toBe('deliver');
    expect(deliverHop.nodeId).toBe('server-1');
  });

  it('does not inject ARP hops when endpoint and interface MACs are explicitly configured', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p-explicit', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.some((hop) => hop.event === 'arp-request' || hop.event === 'arp-reply')).toBe(
      false,
    );
  });

  it('injects host-side ARP request/reply hops before the first forward when the destination MAC is unknown', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const packet = makePacket('p-arp-host', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.map((hop) => hop.event)).toEqual([
      'create',
      'arp-request',
      'arp-reply',
      'forward',
      'deliver',
    ]);

    const arpRequest = hopAt(trace, 1);
    const arpReply = hopAt(trace, 2);
    expect(arpRequest.nodeId).toBe('client-1');
    expect(arpRequest.arpFrame?.payload.operation).toBe('request');
    expect(arpRequest.arpFrame?.dstMac).toBe('ff:ff:ff:ff:ff:ff');
    expect(arpReply.nodeId).toBe('server-1');
    expect(arpReply.arpFrame?.payload.operation).toBe('reply');
    expect(arpReply.arpFrame?.payload.senderMac).toBe(deriveDeterministicMac('server-1'));
  });

  it('injects router-side ARP request/reply hops before a directly connected forward when the destination MAC is unknown', async () => {
    const engine = makeEngine(singleRouterTopologyWithoutServerMac());
    const packet = makePacket('p-arp-router', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.map((hop) => hop.event)).toEqual([
      'create',
      'arp-request',
      'arp-reply',
      'forward',
      'deliver',
    ]);

    expect(hopAt(trace, 1).nodeId).toBe('router-1');
    expect(hopAt(trace, 2).nodeId).toBe('server-1');
    expect(hopAt(trace, 3).nodeId).toBe('router-1');
  });

  it('populates nodeArpTables for both the requester and the responder when ARP is simulated', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    await engine.send(
      makePacket('p-arp-state', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(engine.getState().nodeArpTables['client-1']?.['203.0.113.10']).toBe(
      deriveDeterministicMac('server-1'),
    );
    expect(engine.getState().nodeArpTables['server-1']?.['10.0.0.10']).toBe(CLIENT_MAC);
  });

  it('assigns contiguous step numbers when ARP hops are injected', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const packet = makePacket('p-arp-steps', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);

    expect(trace.hops.map((hop) => hop.step)).toEqual([0, 1, 2, 3, 4]);
  });

  it('resets the in-run ARP cache between precompute calls', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const packet = makePacket('p-arp-reset', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');

    const firstTrace = await engine.precompute(packet);
    const secondTrace = await engine.precompute({ ...packet, id: 'p-arp-reset-2' });

    expect(firstTrace.hops.filter((hop) => hop.event === 'arp-request')).toHaveLength(1);
    expect(secondTrace.hops.filter((hop) => hop.event === 'arp-request')).toHaveLength(1);
  });

  it('annotates router ingress and egress interfaces on direct forwarding hops', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);
    const routerHop = hopAt(trace, 1);

    expect(routerHop.ingressInterfaceId).toBe('eth0');
    expect(routerHop.ingressInterfaceName).toBe('eth0');
    expect(routerHop.egressInterfaceId).toBe('eth1');
    expect(routerHop.egressInterfaceName).toBe('eth1');
  });

  it('materializes identification, IPv4 checksum, and FCS before the create hop snapshot', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const createSnapshot = await packetAtStep(engine, packet, 0);
    const expectedChecksum = computeIpv4Checksum(
      buildIpv4HeaderBytes(createSnapshot.frame.payload, { checksumOverride: 0 }),
    );
    const expectedFcs = computeFcs(
      buildEthernetFrameBytes(
        { ...createSnapshot.frame, fcs: 0 },
        { includePreamble: false, includeFcs: false },
      ),
    );

    expect(createSnapshot.frame.payload.identification).toBeDefined();
    expect(createSnapshot.frame.payload.headerChecksum).toBe(expectedChecksum);
    expect(createSnapshot.frame.fcs).toBe(expectedFcs);
    expect(createSnapshot.frame.srcMac).toBe(CLIENT_MAC);
    expect(createSnapshot.frame.dstMac).toBe('00:00:00:01:00:00');
  });

  it('rewrites router-hop source and destination MAC addresses to the egress segment', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const routerSnapshot = await packetAtStep(engine, packet, 1);

    expect(routerSnapshot.frame.srcMac).toBe('00:00:00:01:00:01');
    expect(routerSnapshot.frame.dstMac).toBe(SERVER_MAC);
    expect(routerSnapshot.frame.fcs).toBe(
      computeFcs(
        buildEthernetFrameBytes(
          { ...routerSnapshot.frame, fcs: 0 },
          { includePreamble: false, includeFcs: false },
        ),
      ),
    );
  });

  it('decrements TTL at each router hop', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    // hop[1] = router-1: arriving TTL is 64 (pre-decrement)
    expect(hopAt(trace, 1).ttl).toBe(64);
    // hop[2] = server-1: forwarded packet has TTL=63
    expect(hopAt(trace, 2).ttl).toBe(63);
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
    expect(dropHop!.ingressInterfaceId).toBe('eth0');
    expect(dropHop!.ingressInterfaceName).toBe('eth0');
  });

  it('marks router-hop field mutations for UI diff highlighting', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);

    expect(hopAt(trace, 1).changedFields).toEqual([
      'TTL',
      'Header Checksum',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]);
    expect(hopAt(trace, 0).changedFields).toBeUndefined();
  });

  it('traverses through a switch', async () => {
    const engine = makeEngine(switchPassthroughTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);
    const switchHop = hopAt(trace, 1);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(3);
    expect(switchHop.nodeId).toBe('switch-1');
    expect(switchHop.event).toBe('forward');
    expect(switchHop.activeEdgeId).toBe('e2');
  });

  it('annotates switch ingress and egress ports when edge handles are present', async () => {
    const engine = makeEngine(switchPassthroughTopologyWithHandles());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const trace = await engine.precompute(packet);
    const switchHop = hopAt(trace, 1);

    expect(switchHop.nodeId).toBe('switch-1');
    expect(switchHop.ingressInterfaceId).toBe('p0');
    expect(switchHop.ingressInterfaceName).toBe('fa0/0');
    expect(switchHop.egressInterfaceId).toBe('p1');
    expect(switchHop.egressInterfaceName).toBe('fa0/1');
  });

  it('keeps MAC addresses stable on client-to-switch hops with no L3 boundary', async () => {
    const engine = makeEngine(switchPassthroughTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    await engine.send(packet);

    engine.selectHop(0);
    const createSnapshot = selectedPacketSnapshot(engine, 'expected create snapshot');
    engine.selectHop(1);
    const switchSnapshot = selectedPacketSnapshot(engine, 'expected switch snapshot');

    expect(createSnapshot.frame.srcMac).toBe(CLIENT_MAC);
    expect(createSnapshot.frame.dstMac).toBe(SERVER_MAC);
    expect(switchSnapshot.frame.srcMac).toBe(createSnapshot.frame.srcMac);
    expect(switchSnapshot.frame.dstMac).toBe(createSnapshot.frame.dstMac);
  });

  it('resolves router destination MAC through transparent switches to the host MAC', async () => {
    const engine = makeEngine(routerSwitchHostTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const routerSnapshot = await packetAtStep(engine, packet, 1);

    expect(routerSnapshot.frame.srcMac).toBe('00:00:00:01:00:01');
    expect(routerSnapshot.frame.dstMac).toBe(SERVER_TWO_MAC);
  });

  it('routes through two routers', async () => {
    const engine = makeEngine(multiHopTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);
    const createHop = hopAt(trace, 0);
    const firstRouterHop = hopAt(trace, 1);
    const secondRouterHop = hopAt(trace, 2);
    const deliverHop = hopAt(trace, 3);

    expect(trace.status).toBe('delivered');
    expect(trace.hops).toHaveLength(4);
    expect(createHop.event).toBe('create');
    expect(firstRouterHop.nodeId).toBe('router-1');
    expect(secondRouterHop.nodeId).toBe('router-2');
    expect(deliverHop.event).toBe('deliver');
  });

  it('tracks sender IP across router hops to resolve downstream ingress interfaces', async () => {
    const engine = makeEngine(multiHopTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64);
    const trace = await engine.precompute(packet);
    const firstRouterHop = hopAt(trace, 1);
    const secondRouterHop = hopAt(trace, 2);

    expect(firstRouterHop.egressInterfaceId).toBe('eth1');
    expect(secondRouterHop.ingressInterfaceId).toBe('eth0');
    expect(secondRouterHop.ingressInterfaceName).toBe('eth0');
    expect(secondRouterHop.egressInterfaceId).toBe('eth1');
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
              {
                id: 'eth0',
                name: 'eth0',
                ipAddress: '10.0.0.1',
                prefixLength: 24,
                macAddress: '00:00:00:01:00:00',
              },
              {
                id: 'eth1',
                name: 'eth1',
                ipAddress: '172.16.0.1',
                prefixLength: 24,
                macAddress: '00:00:00:01:00:01',
              },
              {
                id: 'eth2',
                name: 'eth2',
                ipAddress: '192.168.0.1',
                prefixLength: 24,
                macAddress: '00:00:00:01:00:02',
              },
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
              {
                id: 'eth0',
                name: 'eth0',
                ipAddress: '172.16.0.2',
                prefixLength: 24,
                macAddress: '00:00:00:02:00:00',
              },
              {
                id: 'eth1',
                name: 'eth1',
                ipAddress: '192.168.1.1',
                prefixLength: 24,
                macAddress: '00:00:00:02:00:01',
              },
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
              {
                id: 'eth0',
                name: 'eth0',
                ipAddress: '192.168.1.2',
                prefixLength: 24,
                macAddress: '00:00:00:03:00:00',
              },
              {
                id: 'eth1',
                name: 'eth1',
                ipAddress: '192.168.0.2',
                prefixLength: 24,
                macAddress: '00:00:00:03:00:01',
              },
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
    const dropHop = hopAt(trace, trace.hops.length - 1);
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

  it('tracks the selected trace path separately from the current hop highlight', async () => {
    const engine = await loadedEngine();

    expect(engine.getState()).toMatchObject({
      activePathEdgeIds: ['e1', 'e2'],
      highlightMode: 'path',
      traceColors: {
        p1: 'var(--netlab-accent-cyan)',
      },
    });

    engine.step();

    expect(engine.getState()).toMatchObject({
      activeEdgeIds: ['e1'],
      activePathEdgeIds: ['e1', 'e2'],
    });
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

describe('SimulationEngine animation speed', () => {
  it('returns the default play interval before configuration', () => {
    const engine = makeEngine(singleRouterTopology());

    expect(engine.getPlayInterval()).toBe(500);
  });

  it('stores the configured play interval', () => {
    const engine = makeEngine(singleRouterTopology());

    engine.setPlayInterval(250);

    expect(engine.getPlayInterval()).toBe(250);
  });

  it('clamps configured play interval to the minimum value', () => {
    const engine = makeEngine(singleRouterTopology());

    engine.setPlayInterval(25);

    expect(engine.getPlayInterval()).toBe(50);
  });

  it('clamps configured play interval to the maximum value', () => {
    const engine = makeEngine(singleRouterTopology());

    engine.setPlayInterval(10000);

    expect(engine.getPlayInterval()).toBe(5000);
  });

  it('uses the configured play interval when play() is called without an override', async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('speed-play', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    engine.setPlayInterval(250);
    engine.play();

    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 250);

    engine.pause();
    vi.useRealTimers();
  });
});

describe('SimulationEngine last-packet tracking', () => {
  it('returns null before any packet is sent', () => {
    const engine = makeEngine(singleRouterTopology());

    expect(engine.getLastPacket()).toBeNull();
  });

  it('stores the last packet after send()', async () => {
    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('last-packet', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');

    await engine.send(packet);

    expect(engine.getLastPacket()).toBe(packet);
  });

  it('resend() replays the last packet with a fresh id and the provided failure state', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T00:00:00Z'));

    const engine = makeEngine(singleRouterTopology());
    const packet = makePacket('resend-source', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    await engine.send(packet);

    vi.setSystemTime(new Date('2026-04-14T00:00:01Z'));
    const sendSpy = vi.spyOn(engine, 'send');
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set(),
    };

    await engine.resend(failureState);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const resentPacket = sendSpy.mock.calls[0]?.[0];
    const resentFailureState = sendSpy.mock.calls[0]?.[1];
    expect(resentPacket?.id).not.toBe(packet.id);
    expect(resentPacket?.timestamp).not.toBe(packet.timestamp);
    expect(resentFailureState).toBe(failureState);

    vi.useRealTimers();
  });

  it('resend() is a no-op when no packet has been sent yet', async () => {
    const engine = makeEngine(singleRouterTopology());
    const sendSpy = vi.spyOn(engine, 'send');

    await engine.resend();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('clear() resets the stored last packet', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('clear-last-packet', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    engine.clear();

    expect(engine.getLastPacket()).toBeNull();
  });
});

describe('SimulationEngine.sendTransfer', () => {
  it('creates a transfer controller lazily', async () => {
    const engine = makeEngine(singleRouterTopology());

    expect(engine.getTransferController()).toBeNull();

    await engine.sendTransfer('client-1', 'server-1', 'payload', { chunkDelay: 0 });

    expect(engine.getTransferController()).toBeInstanceOf(DataTransferController);
  });

  it('delegates to DataTransferController.startTransfer', async () => {
    const engine = makeEngine(singleRouterTopology());
    const startTransferSpy = vi.spyOn(DataTransferController.prototype, 'startTransfer');

    await engine.sendTransfer('client-1', 'server-1', 'payload', { chunkDelay: 0 });

    expect(startTransferSpy).toHaveBeenCalledTimes(1);
    expect(startTransferSpy).toHaveBeenCalledWith(
      'client-1',
      'server-1',
      'payload',
      expect.objectContaining({
        chunkDelay: 0,
        pmtuLookup: expect.any(Function),
      }),
    );
  });

  it('clear resets the transfer controller', async () => {
    const engine = makeEngine(singleRouterTopology());

    await engine.sendTransfer('client-1', 'server-1', 'payload', { chunkDelay: 0 });

    const controller = engine.getTransferController();
    expect(controller).not.toBeNull();

    const clearSpy = controller ? vi.spyOn(controller, 'clear') : null;
    engine.clear();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(engine.getTransferController()).toBeNull();
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

describe('SimulationEngine.exportPcap', () => {
  it('returns a 24-byte header-only export when no trace exists', () => {
    const engine = makeEngine(singleRouterTopology());

    expect(engine.exportPcap()).toHaveLength(24);
  });

  it('returns a valid PCAP whose record count matches the hop count', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('pcap-basic', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const trace = traceForPacketId(engine, 'pcap-basic');
    const bytes = engine.exportPcap('pcap-basic');

    expect(countPcapRecords(bytes)).toBe(trace.hops.length);
  });

  it('defaults to the currentTraceId when no trace id is provided', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('pcap-current', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(Array.from(engine.exportPcap())).toEqual(Array.from(engine.exportPcap('pcap-current')));
  });

  it('returns a 24-byte header-only export when the requested trace id is missing', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('pcap-known', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(engine.exportPcap('missing-trace')).toHaveLength(24);
  });

  it('uses arpFrame bytes for ARP hops instead of packet snapshots', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    await engine.send(makePacket('pcap-arp', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const trace = traceForPacketId(engine, 'pcap-arp');
    const arpHop = trace.hops.find((hop) => hop.event === 'arp-request');
    assertDefined(arpHop, 'expected arp-request hop');
    const arpHopIndex = arpHop.step;
    const arpFrame = arpHop.arpFrame;
    assertDefined(arpFrame, 'expected arp frame on arp-request hop');
    const bytes = engine.exportPcap('pcap-arp');
    const expectedFrameBytes = arpFrame
      ? serializeArpFrame(arpFrame).bytes.slice(0, serializeArpFrame(arpFrame).bytes.length - 4)
      : null;

    expect(arpHopIndex).toBeGreaterThanOrEqual(0);
    expect(expectedFrameBytes).not.toBeNull();
    expect(Array.from(pcapRecordBytes(bytes, arpHopIndex))).toEqual(
      Array.from(expectedFrameBytes!),
    );
  });

  it('uses the stored packet snapshot bytes for drop hops', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('pcap-drop', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1),
    );

    const trace = traceForPacketId(engine, 'pcap-drop');
    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    assertDefined(dropHop, 'expected drop hop for PCAP export');
    const dropHopIndex = dropHop.step;
    expect(dropHopIndex).toBeGreaterThanOrEqual(0);

    engine.selectTrace('pcap-drop');
    engine.selectHop(dropHopIndex);
    const snapshot = selectedPacketSnapshot(engine, 'expected drop snapshot');
    const expectedFrameBytes = snapshot
      ? Uint8Array.from(
          buildEthernetFrameBytes(snapshot.frame, { includePreamble: false, includeFcs: false }),
        )
      : null;
    const bytes = engine.exportPcap('pcap-drop');

    expect(expectedFrameBytes).not.toBeNull();
    expect(Array.from(pcapRecordBytes(bytes, dropHopIndex))).toEqual(
      Array.from(expectedFrameBytes!),
    );
  });
});

describe('SimulationEngine NAT', () => {
  it('annotates SNAT hops and exposes live NAT table state', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-snat',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );

    const trace = engine.getState().traces.find((candidate) => candidate.packetId === 'nat-snat');
    const natHop = trace?.hops.find((hop) => hop.nodeId === 'nat-router');
    const natTable = engine.getState().natTables.find((table) => table.routerId === 'nat-router');

    expect(trace?.status).toBe('delivered');
    expect(natHop?.natTranslation).toEqual({
      type: 'snat',
      preSrcIp: '192.168.1.10',
      preSrcPort: 54321,
      postSrcIp: '203.0.113.1',
      postSrcPort: 1024,
      preDstIp: '198.51.100.10',
      preDstPort: 80,
      postDstIp: '198.51.100.10',
      postDstPort: 80,
    });
    expect(natHop?.changedFields).toEqual(
      expect.arrayContaining([
        'TTL',
        'Header Checksum',
        'Src IP',
        'Src Port',
        'Src MAC',
        'Dst MAC',
        'FCS',
      ]),
    );
    expect(natTable?.entries).toHaveLength(1);
    expect(natTable?.entries[0]?.insideGlobalIp).toBe('203.0.113.1');
    expect(natTable?.entries[0]?.insideGlobalPort).toBe(1024);
  });

  it('reverse-translates return traffic for an existing SNAT session', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-snat',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );

    const mappedPort = engine.getState().natTables[0]?.entries[0]?.insideGlobalPort;
    expect(mappedPort).toBe(1024);

    await engine.send(
      makePacket(
        'nat-return',
        'server-1',
        'client-1',
        '198.51.100.10',
        '203.0.113.1',
        64,
        80,
        mappedPort ?? 0,
      ),
    );

    const trace = engine.getState().traces.find((candidate) => candidate.packetId === 'nat-return');
    const natHop = trace?.hops.find((hop) => hop.nodeId === 'nat-router');

    expect(trace?.status).toBe('delivered');
    expect(natHop?.natTranslation).toEqual({
      type: 'snat',
      preSrcIp: '198.51.100.10',
      preSrcPort: 80,
      postSrcIp: '198.51.100.10',
      postSrcPort: 80,
      preDstIp: '203.0.113.1',
      preDstPort: 1024,
      postDstIp: '192.168.1.10',
      postDstPort: 54321,
    });
    expect(natHop?.changedFields).toEqual(
      expect.arrayContaining([
        'TTL',
        'Header Checksum',
        'Dst IP',
        'Dst Port',
        'Src MAC',
        'Dst MAC',
        'FCS',
      ]),
    );
  });

  it('applies DNAT for port forwarding and reuses that mapping on the response', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-dnat-in',
        'server-1',
        'client-1',
        '198.51.100.10',
        '203.0.113.1',
        64,
        55000,
        8080,
      ),
    );

    const inboundTrace = engine
      .getState()
      .traces.find((candidate) => candidate.packetId === 'nat-dnat-in');
    const inboundNatHop = inboundTrace?.hops.find((hop) => hop.nodeId === 'nat-router');

    expect(inboundTrace?.status).toBe('delivered');
    expect(inboundNatHop?.natTranslation).toEqual({
      type: 'dnat',
      preSrcIp: '198.51.100.10',
      preSrcPort: 55000,
      postSrcIp: '198.51.100.10',
      postSrcPort: 55000,
      preDstIp: '203.0.113.1',
      preDstPort: 8080,
      postDstIp: '192.168.1.10',
      postDstPort: 80,
    });
    expect(inboundNatHop?.changedFields).toEqual(
      expect.arrayContaining([
        'TTL',
        'Header Checksum',
        'Dst IP',
        'Dst Port',
        'Src MAC',
        'Dst MAC',
        'FCS',
      ]),
    );

    await engine.send(
      makePacket(
        'nat-dnat-out',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        80,
        55000,
      ),
    );

    const outboundTrace = engine
      .getState()
      .traces.find((candidate) => candidate.packetId === 'nat-dnat-out');
    const outboundNatHop = outboundTrace?.hops.find((hop) => hop.nodeId === 'nat-router');

    expect(outboundTrace?.status).toBe('delivered');
    expect(outboundNatHop?.natTranslation).toEqual({
      type: 'dnat',
      preSrcIp: '192.168.1.10',
      preSrcPort: 80,
      postSrcIp: '203.0.113.1',
      postSrcPort: 8080,
      preDstIp: '198.51.100.10',
      preDstPort: 55000,
      postDstIp: '198.51.100.10',
      postDstPort: 55000,
    });
    expect(outboundNatHop?.changedFields).toEqual(
      expect.arrayContaining([
        'TTL',
        'Header Checksum',
        'Src IP',
        'Src Port',
        'Src MAC',
        'Dst MAC',
        'FCS',
      ]),
    );
  });

  it('reset clears NAT tables and restarts PAT port allocation', async () => {
    const engine = makeEngine(natTopology());

    await engine.send(
      makePacket(
        'nat-before-reset',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );
    expect(engine.getState().natTables[0]?.entries[0]?.insideGlobalPort).toBe(1024);

    engine.reset();
    expect(engine.getState().natTables).toEqual([]);

    await engine.send(
      makePacket(
        'nat-after-reset',
        'client-1',
        'server-1',
        '192.168.1.10',
        '198.51.100.10',
        64,
        54321,
        80,
      ),
    );
    expect(engine.getState().natTables[0]?.entries[0]?.insideGlobalPort).toBe(1024);
  });
});

describe('SimulationEngine ACL', () => {
  it('drops on an explicit ACL deny rule and terminates the trace at the router', async () => {
    const engine = makeEngine(
      aclTopology({
        lanInboundAcl: [
          {
            id: 'deny-ssh',
            priority: 10,
            action: 'deny',
            protocol: 'tcp',
            dstPort: 22,
          },
        ],
      }),
    );

    const trace = await engine.precompute(
      makePacket(
        'acl-deny-explicit',
        'client-1',
        'server-1',
        '10.0.1.10',
        '203.0.113.50',
        64,
        41000,
        22,
      ),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(trace.status).toBe('dropped');
    expect(trace.hops).toHaveLength(2);
    expect(dropHop?.nodeId).toBe('router-1');
    expect(dropHop?.reason).toBe('acl-deny');
    expect(dropHop?.aclMatch?.action).toBe('deny');
    expect(dropHop?.aclMatch?.matchedRule?.id).toBe('deny-ssh');
  });

  it('annotates permitted router hops with the matching ACL rule', async () => {
    const engine = makeEngine(
      aclTopology({
        lanInboundAcl: [
          {
            id: 'allow-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            srcIp: '10.0.1.0/24',
            dstPort: 80,
          },
        ],
      }),
    );

    const trace = await engine.precompute(
      makePacket('acl-permit', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );

    const routerHop = trace.hops.find(
      (hop) => hop.nodeId === 'router-1' && hop.event === 'forward',
    );
    expect(trace.status).toBe('delivered');
    expect(routerHop?.aclMatch?.action).toBe('permit');
    expect(routerHop?.aclMatch?.matchedRule?.id).toBe('allow-http');
    expect(routerHop?.aclMatch?.direction).toBe('inbound');
  });

  it('applies implicit default deny when no rule matches', async () => {
    const engine = makeEngine(
      aclTopology({
        lanInboundAcl: [
          {
            id: 'allow-https',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 443,
          },
        ],
      }),
    );

    const trace = await engine.precompute(
      makePacket(
        'acl-default-deny',
        'client-1',
        'server-1',
        '10.0.1.10',
        '203.0.113.50',
        64,
        41000,
        22,
      ),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(trace.status).toBe('dropped');
    expect(dropHop?.reason).toBe('acl-deny');
    expect(dropHop?.aclMatch?.matchedRule).toBeNull();
    expect(dropHop?.aclMatch?.byConnTrack).toBe(false);
  });

  it('auto-permits return traffic via conn-track and exposes the live table', async () => {
    const engine = makeEngine(
      aclTopology({
        stateful: true,
        lanInboundAcl: [
          {
            id: 'allow-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
        wanInboundAcl: [],
      }),
    );

    await engine.precompute(
      makePacket(
        'acl-stateful-out',
        'client-1',
        'server-1',
        '10.0.1.10',
        '203.0.113.50',
        64,
        40000,
        80,
      ),
    );

    const returnTrace = await engine.precompute(
      makePacket(
        'acl-stateful-return',
        'server-1',
        'client-1',
        '203.0.113.50',
        '10.0.1.10',
        64,
        80,
        40000,
      ),
    );

    const routerHop = returnTrace.hops.find(
      (hop) => hop.nodeId === 'router-1' && hop.event === 'forward',
    );
    const connTrackTable = engine
      .getState()
      .connTrackTables.find((table) => table.routerId === 'router-1');

    expect(returnTrace.status).toBe('delivered');
    expect(routerHop?.aclMatch?.action).toBe('permit');
    expect(routerHop?.aclMatch?.byConnTrack).toBe(true);
    expect(connTrackTable?.entries).toHaveLength(1);
    expect(connTrackTable?.entries[0]?.srcIp).toBe('10.0.1.10');
    expect(connTrackTable?.entries[0]?.dstIp).toBe('203.0.113.50');
  });

  it('reset clears conn-track entries and repeated forward flows reuse the same entry', async () => {
    const engine = makeEngine(
      aclTopology({
        stateful: true,
        lanInboundAcl: [
          {
            id: 'allow-http',
            priority: 10,
            action: 'permit',
            protocol: 'tcp',
            dstPort: 80,
          },
        ],
        wanInboundAcl: [],
      }),
    );

    await engine.precompute(
      makePacket('acl-reuse-1', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );
    await engine.precompute(
      makePacket('acl-reuse-2', 'client-1', 'server-1', '10.0.1.10', '203.0.113.50', 64, 40000, 80),
    );

    expect(engine.getState().connTrackTables[0]?.entries).toHaveLength(1);

    engine.reset();

    expect(engine.getState().connTrackTables).toEqual([]);
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

    const forwardSpy = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:forward', forwardSpy);

    engine.step(); // step 0: create
    engine.step(); // step 1: forward at router-1

    // Allow async hook emission to complete
    await Promise.resolve();

    expect(forwardSpy).toHaveBeenCalledOnce();
    const [ctx] = spyCall(forwardSpy);
    expect(ctx.fromNodeId).toBe('client-1');
    expect(ctx.toNodeId).toBe('server-1');
  });

  it('emits packet:deliver on the deliver hop', async () => {
    const hookEngine = new HookEngine();
    const engine = new SimulationEngine(singleRouterTopology(), hookEngine);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    const deliverSpy = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:deliver', deliverSpy);

    engine.step();
    engine.step();
    engine.step(); // deliver

    await Promise.resolve();
    expect(deliverSpy).toHaveBeenCalledOnce();
    expect(spyCall(deliverSpy)[0].destinationNodeId).toBe('server-1');
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

  it('keeps the full path highlight while selecting a specific hop', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('select-hop-path', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    engine.selectHop(1);

    expect(engine.getState()).toMatchObject({
      activeEdgeIds: ['e2'],
      activePathEdgeIds: ['e1', 'e2'],
    });
  });
});

describe('SimulationEngine highlight mode', () => {
  it('defaults to path mode and allows switching between path and hop mode', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('highlight-mode', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(engine.getState()).toMatchObject({ highlightMode: 'path' });

    engine.setHighlightMode('hop');
    expect(engine.getState()).toMatchObject({ highlightMode: 'hop' });

    engine.setHighlightMode('path');
    expect(engine.getState()).toMatchObject({ highlightMode: 'path' });
  });

  it('assigns distinct colors to traces as they are appended', async () => {
    const engine = makeEngine(singleRouterTopology());
    await engine.send(
      makePacket('highlight-color-1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );
    await engine.send(
      makePacket('highlight-color-2', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(engine.getState()).toMatchObject({
      traceColors: {
        'highlight-color-1': 'var(--netlab-accent-cyan)',
        'highlight-color-2': 'var(--netlab-accent-orange)',
      },
      activePathEdgeIds: ['e1', 'e2'],
    });
  });
});

describe('SimulationEngine.routingDecision', () => {
  it('router hop has routingDecision defined', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(routerHop).toBeDefined();
    expect(routerHop!.routingDecision).toBeDefined();
  });

  it('client and server hops do NOT have routingDecision', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const clientHop = trace.hops.find((h) => h.nodeId === 'client-1');
    const serverHop = trace.hops.find((h) => h.nodeId === 'server-1');
    expect(clientHop!.routingDecision).toBeUndefined();
    expect(serverHop!.routingDecision).toBeUndefined();
  });

  it('winner is non-null on successful forward', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(routerHop!.routingDecision!.winner).not.toBeNull();
  });

  it('winner is null on no-route drop', async () => {
    const topology = singleRouterTopology();
    topology.routeTables.set('router-1', []);
    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(routerHop).toBeDefined();
    expect(routerHop!.routingDecision).toBeDefined();
    expect(routerHop!.routingDecision!.winner).toBeNull();
  });

  it('TTL-exceeded drop has no routingDecision', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1),
    );

    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop).toBeDefined();
    expect(dropHop!.reason).toBe('ttl-exceeded');
    expect(dropHop!.routingDecision).toBeUndefined();
  });

  it('candidates count matches router route table size', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    // singleRouterTopology has 2 routes for router-1
    expect(routerHop!.routingDecision!.candidates).toHaveLength(2);
  });

  it('exactly one candidate has selectedByLpm true', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    const lpmWinners = routerHop!.routingDecision!.candidates.filter((c) => c.selectedByLpm);
    expect(lpmWinners).toHaveLength(1);
  });

  it('explanation is a non-empty string', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerHop = trace.hops.find((h) => h.nodeId === 'router-1');
    expect(typeof routerHop!.routingDecision!.explanation).toBe('string');
    expect(routerHop!.routingDecision!.explanation.length).toBeGreaterThan(0);
  });
});

describe('SimulationEngine ICMP helpers', () => {
  it('ping sends an echo request and appends the echo reply path on success', async () => {
    const engine = makeEngine(singleRouterTopology());

    const trace = await engine.ping('client-1', '203.0.113.10');

    expect(trace.status).toBe('delivered');

    const serverDeliverIndex = trace.hops.findIndex(
      (hop) => hop.nodeId === 'server-1' && hop.event === 'deliver',
    );
    const clientDeliverIndex = trace.hops.findIndex(
      (hop) =>
        hop.nodeId === 'client-1' && hop.event === 'deliver' && hop.fromNodeId === 'router-1',
    );

    expect(serverDeliverIndex).toBeGreaterThan(-1);
    expect(clientDeliverIndex).toBeGreaterThan(serverDeliverIndex);
    expect(trace.hops[0]?.protocol).toBe('ICMP');
  });

  it('ping drops with no-route when the destination IP is unreachable', async () => {
    const engine = makeEngine(singleRouterTopology());

    const trace = await engine.ping('client-1', '198.51.100.10');

    expect(trace.status).toBe('dropped');
    expect(trace.hops.some((hop) => hop.event === 'drop' && hop.reason === 'no-route')).toBe(true);
  });

  it('ping with TTL=1 marks the router drop hop and appends the generated ICMP response', async () => {
    const engine = makeEngine(singleRouterTopology());

    const trace = await engine.ping('client-1', '203.0.113.10', { ttl: 1 });

    expect(trace.status).toBe('dropped');

    const ttlDropHop = trace.hops.find(
      (hop) => hop.nodeId === 'router-1' && hop.event === 'drop' && hop.reason === 'ttl-exceeded',
    );

    expect(ttlDropHop?.icmpGenerated).toBe(true);
    expect(trace.hops.some((hop) => hop.nodeId === 'client-1' && hop.event === 'deliver')).toBe(
      true,
    );
  });

  it('traceroute stops after the destination is reached', async () => {
    const engine = makeEngine(multiHopTopology());

    const traces = await engine.traceroute('client-1', '203.0.113.10');

    expect(traces).toHaveLength(3);
    expect(
      traces[0]?.hops.some((hop) => hop.nodeId === 'router-1' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[1]?.hops.some((hop) => hop.nodeId === 'router-2' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[2]?.hops.some((hop) => hop.nodeId === 'server-1' && hop.event === 'deliver'),
    ).toBe(true);
  });
});

describe('SimulationEngine failure-aware routing fallback', () => {
  it('uses the forwarder-selected primary route on the healthy path', async () => {
    const engine = makeEngine(failureFallbackTopology());

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('delivered');
    expect('selectReachableRoute' in engine).toBe(false);
    expect('resolveNextNode' in engine).toBe(false);

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-2');
    expect(routerHop?.routingDecision?.winner?.destination).toBe('203.0.113.0/24');
  });

  it('reroutes through the fallback route when the primary edge is down', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set(),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('delivered');

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-3');
    expect(routerHop?.activeEdgeId).toBe('e3');
    expect(routerHop?.egressInterfaceId).toBe('eth2');

    const decision = routerHop?.routingDecision;
    expect(decision?.winner?.destination).toBe('0.0.0.0/0');
    expect(decision?.winner?.nextHop).toBe('172.17.0.2');
    expect(decision?.explanation).toContain('Fallback via 0.0.0.0/0 (172.17.0.2)');

    const primaryCandidate = decision?.candidates.find(
      (candidate) => candidate.destination === '203.0.113.0/24',
    );
    const fallbackCandidate = decision?.candidates.find(
      (candidate) => candidate.destination === '0.0.0.0/0',
    );
    expect(primaryCandidate?.selectedByLpm).toBe(true);
    expect(primaryCandidate?.selectedByFailover).not.toBe(true);
    expect(fallbackCandidate?.selectedByLpm).toBe(false);
    expect(fallbackCandidate?.selectedByFailover).toBe(true);
  });

  it('does not retain the legacy reachable-route helper after fallback', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set(),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('delivered');
    expect('selectReachableRoute' in engine).toBe(false);
    expect('resolveNextNode' in engine).toBe(false);

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-3');
    expect(routerHop?.routingDecision?.winner?.destination).toBe('0.0.0.0/0');
  });

  it('keeps selectedByFailover unset on the normal primary path', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('delivered');

    const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(routerHop?.toNodeId).toBe('router-2');
    expect(routerHop?.egressInterfaceId).toBe('eth1');
    expect(routerHop?.routingDecision?.winner?.destination).toBe('203.0.113.0/24');
    expect(
      routerHop?.routingDecision?.candidates.some((candidate) => candidate.selectedByFailover),
    ).toBe(false);
  });

  it('reports no reachable winner when both primary and fallback edges are down', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2', 'e3']),
      downInterfaceIds: new Set(),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('dropped');

    const dropHop = trace.hops.find((hop) => hop.event === 'drop' && hop.nodeId === 'router-1');
    expect(dropHop?.reason).toBe('no-route');
    expect(dropHop?.routingDecision?.winner).toBeNull();
    expect(dropHop?.routingDecision?.explanation).toContain('No reachable route');

    const primaryCandidate = dropHop?.routingDecision?.candidates.find(
      (candidate) => candidate.destination === '203.0.113.0/24',
    );
    expect(primaryCandidate?.selectedByLpm).toBe(true);
    expect(
      dropHop?.routingDecision?.candidates.some((candidate) => candidate.selectedByFailover),
    ).toBe(false);
  });

  it('uses the failover route subnet for interface-down checks', async () => {
    const engine = makeEngine(failureFallbackTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']),
      downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth2')]),
    };

    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );

    expect(trace.status).toBe('dropped');

    const dropHop = trace.hops.find((hop) => hop.event === 'drop' && hop.nodeId === 'router-1');
    expect(dropHop?.reason).toBe('interface-down');
    expect(dropHop?.egressInterfaceId).toBe('eth2');
    expect(dropHop?.routingDecision?.winner?.nextHop).toBe('172.17.0.2');
  });
});

// ── Failure simulation ────────────────────────────────────────────────────────

describe('SimulationEngine failure simulation', () => {
  function makeEngine(topology: NetworkTopology): SimulationEngine {
    return new SimulationEngine(topology, new HookEngine());
  }

  it('EMPTY_FAILURE_STATE has no effect — packet is delivered normally', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      EMPTY_FAILURE_STATE,
    );
    expect(trace.status).toBe('delivered');
  });

  it('down node drops packet with reason node-down', async () => {
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(['router-1']),
      downEdgeIds: new Set(),
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop?.reason).toBe('node-down');
    expect(dropHop?.nodeId).toBe('router-1');
  });

  it('down source node drops packet at step 0 with reason node-down', async () => {
    const engine = makeEngine(directTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(['client-1']),
      downEdgeIds: new Set(),
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('dropped');
    const dropHop = hopAt(trace, 0);
    expect(dropHop.event).toBe('drop');
    expect(dropHop.reason).toBe('node-down');
    expect(dropHop.nodeId).toBe('client-1');
  });

  it('down edge causes no-route drop at the router', async () => {
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e2']), // router-1 → server-1
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((h) => h.event === 'drop');
    expect(dropHop?.reason).toBe('no-route');
    expect(dropHop?.nodeId).toBe('router-1');
  });

  it('down edge not on the path does not affect delivery', async () => {
    // e1 is client-1 → router-1 (on path), e2 is router-1 → server-1 (on path)
    // singleRouterTopology only has two edges; put a non-existent edge id down
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds: new Set(['e-nonexistent']),
      downInterfaceIds: new Set(),
    };
    const trace = await engine.precompute(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    expect(trace.status).toBe('delivered');
  });

  it('send() forwards failureState to precompute — drop result is persisted in engine state', async () => {
    const engine = makeEngine(singleRouterTopology());
    const failureState: FailureState = {
      downNodeIds: new Set(['router-1']),
      downEdgeIds: new Set(),
      downInterfaceIds: new Set(),
    };
    await engine.send(
      makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      failureState,
    );
    const trace = engine.getState().traces.find((t) => t.packetId === 'p1');
    expect(trace?.status).toBe('dropped');
    const dropHop = trace?.hops.find((h) => h.event === 'drop');
    expect(dropHop?.reason).toBe('node-down');
  });

  describe('interface-down failure', () => {
    it('drops packet at a router when the resolved egress interface is down', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.nodeId).toBe('router-1');
      expect(dropHop?.reason).toBe('interface-down');
      expect(dropHop?.egressInterfaceId).toBe('eth1');
      expect(dropHop?.egressInterfaceName).toBe('eth1');
    });

    it('keeps delivery working when only the ingress interface on the next router is down', async () => {
      const engine = makeEngine(multiHopTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-2', 'eth0')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('delivered');
      const routerHop = hopAt(trace, 2);
      expect(routerHop.nodeId).toBe('router-2');
      expect(routerHop.ingressInterfaceId).toBe('eth0');
      expect(routerHop.egressInterfaceId).toBe('eth1');
    });

    it('prefers interface-down over normal forwarding when the router itself is still up', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const routerHop = trace.hops.find((hop) => hop.nodeId === 'router-1');
      expect(routerHop?.event).toBe('drop');
      expect(routerHop?.reason).toBe('interface-down');
    });

    it('keeps edge-down precedence over interface-down when no next hop is available', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(['e2']),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-1', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.nodeId).toBe('router-1');
      expect(dropHop?.reason).toBe('no-route');
    });
  });
});
