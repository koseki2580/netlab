import { beforeAll, describe, expect, it } from 'vitest';
import type { IcmpMessage, InFlightPacket } from '../types/packets';
import type { FailureState } from '../types/failure';
import { makeInterfaceFailureId } from '../types/failure';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { ICMP_CODE, ICMP_TYPE } from './icmp';
import {
  CLIENT_MAC,
  SERVER_MAC,
  deriveDeterministicMac,
  makeEngine,
  makePacket,
  makeRouteEntry,
  packetAtStep,
} from './__fixtures__/helpers';
import {
  asymmetricRoutingTopology,
  diamondTopology,
  directTopology,
  directTopologyWithoutServerMac,
  failureFallbackTopology,
  multiHopTopology,
  singleRouterTopology,
  singleRouterTopologyWithoutServerMac,
  threeHopChainTopology,
} from './__fixtures__/topologies';

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

function selectTraceSnapshot(
  engine: ReturnType<typeof makeEngine>,
  traceId: string,
  step: number,
): InFlightPacket {
  engine.selectTrace(traceId);
  engine.selectHop(step);
  const snapshot = engine.getState().selectedPacket;

  if (!snapshot) {
    throw new Error(`No packet snapshot available for trace ${traceId} step ${step}`);
  }

  return snapshot;
}

function icmpPayloadFrom(packet: InFlightPacket | null): IcmpMessage {
  if (!packet || packet.frame.payload.protocol !== 1) {
    throw new Error('Expected an ICMP packet snapshot');
  }

  const payload = packet.frame.payload.payload;
  if (!('type' in payload) || !('code' in payload)) {
    throw new Error('Expected an ICMP payload');
  }

  return payload as IcmpMessage;
}

describe('Packet routing correctness', () => {
  describe('three-hop chain', () => {
    it('delivers through 3 routers with correct hop sequence', async () => {
      const engine = makeEngine(threeHopChainTopology());
      const trace = await engine.precompute(
        makePacket('routing-chain', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      );

      expect(trace.status).toBe('delivered');
      expect(trace.hops.map((hop) => hop.nodeId)).toEqual([
        'client-1',
        'router-1',
        'router-2',
        'router-3',
        'server-1',
      ]);
      expect(trace.hops.map((hop) => hop.event)).toEqual([
        'create',
        'forward',
        'forward',
        'forward',
        'deliver',
      ]);
    });

    it('decrements TTL at each of 3 router hops', async () => {
      const engine = makeEngine(threeHopChainTopology());
      const trace = await engine.precompute(
        makePacket('routing-ttl', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 64),
      );

      expect(trace.hops.map((hop) => hop.ttl)).toEqual([64, 64, 63, 62, 61]);
    });

    it('rewrites MAC addresses at each router boundary', async () => {
      const packet = makePacket(
        'routing-mac',
        'client-1',
        'server-1',
        '10.0.0.10',
        '203.0.113.10',
      );

      const r1Snapshot = await packetAtStep(makeEngine(threeHopChainTopology()), packet, 1);
      const r2Snapshot = await packetAtStep(makeEngine(threeHopChainTopology()), packet, 2);
      const r3Snapshot = await packetAtStep(makeEngine(threeHopChainTopology()), packet, 3);

      expect([r1Snapshot.frame.srcMac, r1Snapshot.frame.dstMac]).toEqual([
        '00:00:00:01:00:01',
        '00:00:00:02:00:00',
      ]);
      expect([r2Snapshot.frame.srcMac, r2Snapshot.frame.dstMac]).toEqual([
        '00:00:00:02:00:01',
        '00:00:00:03:00:00',
      ]);
      expect([r3Snapshot.frame.srcMac, r3Snapshot.frame.dstMac]).toEqual([
        '00:00:00:03:00:01',
        SERVER_MAC,
      ]);
    });
  });

  describe('diamond topology with LPM', () => {
    it('selects the more-specific /24 route over the default route', async () => {
      const engine = makeEngine(diamondTopology());
      const trace = await engine.precompute(
        makePacket('diamond-lpm', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      );

      const r1Hop = trace.hops.find((hop) => hop.nodeId === 'router-1');
      expect(r1Hop?.toNodeId).toBe('router-2');
    });

    it.each([
      { dstIp: '203.0.113.10', expectedVia: 'router-2', desc: '/24 match via R2' },
      { dstIp: '8.8.8.8', expectedVia: 'router-3', desc: 'default route via R3' },
    ])('routes $desc to $expectedVia', async ({ dstIp, expectedVia }) => {
      const engine = makeEngine(diamondTopology());
      const trace = await engine.precompute(
        makePacket(`diamond-${dstIp}`, 'client-1', 'server-1', '10.0.0.10', dstIp),
      );

      const r1Hop = trace.hops.find((hop) => hop.nodeId === 'router-1');
      expect(r1Hop?.toNodeId).toBe(expectedVia);
    });
  });

  describe('asymmetric routing', () => {
    it('forward path goes Client->R1->R2->Server', async () => {
      const engine = makeEngine(asymmetricRoutingTopology());
      const trace = await engine.precompute(
        makePacket('asymmetric-forward', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      );

      expect(trace.hops.map((hop) => hop.nodeId)).toEqual([
        'client-1',
        'router-1',
        'router-2',
        'server-1',
      ]);
    });

    it('return path goes Server->R3->R1->Client', async () => {
      const engine = makeEngine(asymmetricRoutingTopology());
      const trace = await engine.precompute(
        makePacket('asymmetric-return', 'server-1', 'client-1', '203.0.113.10', '10.0.0.10'),
      );

      expect(trace.hops.map((hop) => hop.nodeId)).toEqual([
        'server-1',
        'router-3',
        'router-1',
        'client-1',
      ]);
    });
  });
});

describe('TTL expiration', () => {
  it.each([
    { ttl: 0, desc: 'TTL=0' },
    { ttl: 1, desc: 'TTL=1' },
  ])('drops packet at first router when $desc', async ({ ttl }) => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket(`ttl-first-${ttl}`, 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', ttl),
    );

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.reason).toBe('ttl-exceeded');
    expect(dropHop?.nodeId).toBe('router-1');
  });

  it('preserves TTL on direct delivery (no router in path)', async () => {
    const engine = makeEngine(directTopology());
    const trace = await engine.precompute(
      makePacket('ttl-direct', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 42),
    );

    expect(trace.status).toBe('delivered');
    expect(trace.hops[trace.hops.length - 1]?.ttl).toBe(42);
  });

  it('drops at second router when TTL=2 in a two-router chain', async () => {
    const engine = makeEngine(multiHopTopology());
    const trace = await engine.precompute(
      makePacket('ttl-second-router', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 2),
    );

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.nodeId).toBe('router-2');
    expect(dropHop?.reason).toBe('ttl-exceeded');
  });

  it('drops at third router when TTL=3 in a three-router chain', async () => {
    const engine = makeEngine(threeHopChainTopology());
    const trace = await engine.precompute(
      makePacket('ttl-third-router', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 3),
    );

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.nodeId).toBe('router-3');
    expect(dropHop?.reason).toBe('ttl-exceeded');
  });

  it('ICMP TIME_EXCEEDED has type=11 and code=0 on the generated response', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.ping('client-1', '203.0.113.10', { ttl: 1 });
    const responseHopIndex = trace.hops.findIndex(
      (hop) => hop.nodeId === 'client-1' && hop.event === 'deliver',
    );

    expect(responseHopIndex).toBeGreaterThan(-1);
    const responsePacket = selectTraceSnapshot(engine, trace.packetId, responseHopIndex);
    const icmpPayload = icmpPayloadFrom(responsePacket);

    expect(icmpPayload.type).toBe(ICMP_TYPE.TIME_EXCEEDED);
    expect(icmpPayload.code).toBe(ICMP_CODE.TTL_EXCEEDED_IN_TRANSIT);
  });

  it('ICMP TIME_EXCEEDED data contains original destination IP', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.ping('client-1', '203.0.113.10', { ttl: 1 });
    const responseHopIndex = trace.hops.findIndex(
      (hop) => hop.nodeId === 'client-1' && hop.event === 'deliver',
    );

    expect(responseHopIndex).toBeGreaterThan(-1);
    const responsePacket = selectTraceSnapshot(engine, trace.packetId, responseHopIndex);
    const icmpPayload = icmpPayloadFrom(responsePacket);

    expect(icmpPayload.data).toContain('203.0.113.10');
  });

  it('traceroute collects TTL-exceeded at each router in a 3-hop chain', async () => {
    const engine = makeEngine(threeHopChainTopology());
    const traces = await engine.traceroute('client-1', '203.0.113.10');

    expect(traces).toHaveLength(4);
    expect(
      traces[0]?.hops.some((hop) => hop.nodeId === 'router-1' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[1]?.hops.some((hop) => hop.nodeId === 'router-2' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[2]?.hops.some((hop) => hop.nodeId === 'router-3' && hop.reason === 'ttl-exceeded'),
    ).toBe(true);
    expect(
      traces[3]?.hops.some((hop) => hop.nodeId === 'server-1' && hop.event === 'deliver'),
    ).toBe(true);
  });

  it('TTL is not decremented when packet is dropped for TTL exceeded', async () => {
    const engine = makeEngine(singleRouterTopology());
    const snapshot = await packetAtStep(
      engine,
      makePacket('ttl-drop-snapshot', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1),
      1,
    );

    expect(snapshot.frame.payload.ttl).toBe(1);
  });
});

describe('ARP resolution', () => {
  it('ARP request frame has broadcast destination MAC ff:ff:ff:ff:ff:ff', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const trace = await engine.precompute(
      makePacket('arp-broadcast', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const arpReqHop = trace.hops.find((hop) => hop.event === 'arp-request');
    expect(arpReqHop?.arpFrame?.dstMac).toBe('ff:ff:ff:ff:ff:ff');
  });

  it('ARP reply frame has unicast destination MAC matching the requester', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const trace = await engine.precompute(
      makePacket('arp-reply-unicast', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const arpReplyHop = trace.hops.find((hop) => hop.event === 'arp-reply');
    expect(arpReplyHop?.arpFrame?.payload.operation).toBe('reply');
    expect(arpReplyHop?.arpFrame?.dstMac).toBe(CLIENT_MAC);
  });

  it('ARP request payload contains correct sender and target IPs', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const trace = await engine.precompute(
      makePacket('arp-addresses', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const arpReqHop = trace.hops.find((hop) => hop.event === 'arp-request');
    expect(arpReqHop?.arpFrame?.payload.senderIp).toBe('10.0.0.10');
    expect(arpReqHop?.arpFrame?.payload.targetIp).toBe('203.0.113.10');
  });

  it('ARP resolution assigns deterministic MAC to nodes without explicit MAC', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    await engine.send(
      makePacket('arp-deterministic', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(engine.getState().nodeArpTables['client-1']?.['203.0.113.10']).toBe(
      deriveDeterministicMac('server-1'),
    );
  });

  it('router generates ARP when forwarding to directly connected host without MAC', async () => {
    const engine = makeEngine(singleRouterTopologyWithoutServerMac());
    const trace = await engine.precompute(
      makePacket('arp-router-hop', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const routerArp = trace.hops.find(
      (hop) => hop.event === 'arp-request' && hop.nodeId === 'router-1',
    );
    expect(routerArp?.arpFrame?.payload.targetIp).toBe('203.0.113.10');
  });

  it('populates ARP tables for both requester and responder', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    await engine.send(
      makePacket('arp-both-tables', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const tables = engine.getState().nodeArpTables;
    expect(tables['client-1']?.['203.0.113.10']).toBeDefined();
    expect(tables['server-1']?.['10.0.0.10']).toBe(CLIENT_MAC);
  });

  it('in-run ARP cache resets between separate precompute calls', async () => {
    const engine = makeEngine(directTopologyWithoutServerMac());
    const first = await engine.precompute(
      makePacket('arp-reset-1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );
    const second = await engine.precompute(
      makePacket('arp-reset-2', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(first.hops.filter((hop) => hop.event === 'arp-request')).toHaveLength(1);
    expect(second.hops.filter((hop) => hop.event === 'arp-request')).toHaveLength(1);
  });
});

describe('No-route handling', () => {
  it('drops at R2 when R1 has a route but R2 does not (partial route failure)', async () => {
    const topology = multiHopTopology();
    topology.routeTables.set('router-2', [
      makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
    ]);

    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('no-route-partial', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    const r1Hop = trace.hops.find((hop) => hop.nodeId === 'router-1');
    expect(dropHop?.nodeId).toBe('router-2');
    expect(dropHop?.reason).toBe('no-route');
    expect(r1Hop?.event).toBe('forward');
  });

  it.each([
    { emptyAt: 'router-1', expectedDropNode: 'router-1' },
    { emptyAt: 'router-2', expectedDropNode: 'router-2' },
  ])('drops at $expectedDropNode when $emptyAt has no routes', async ({ emptyAt, expectedDropNode }) => {
    const topology = multiHopTopology();
    topology.routeTables.set(emptyAt, []);

    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket(`no-route-${emptyAt}`, 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('dropped');
    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.nodeId).toBe(expectedDropNode);
    expect(dropHop?.reason).toBe('no-route');
  });

  it('no-route drop includes routingDecision with null winner', async () => {
    const topology = singleRouterTopology();
    topology.routeTables.set('router-1', []);

    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('no-route-null-winner', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.routingDecision?.winner).toBeNull();
  });

  it('no-route drop shows candidates that exist but do not match destination', async () => {
    const topology = singleRouterTopology();
    topology.routeTables.set('router-1', [
      makeRouteEntry('router-1', '192.168.0.0/24', 'direct'),
    ]);

    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('no-route-candidates', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.routingDecision?.candidates).toHaveLength(1);
    expect(dropHop?.routingDecision?.winner).toBeNull();
  });

  it('no-route at R3 preserves R1 and R2 forward hops in trace', async () => {
    const topology = threeHopChainTopology();
    topology.routeTables.set('router-3', []);

    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('no-route-r3', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(trace.status).toBe('dropped');
    const events = trace.hops.map((hop) => ({ nodeId: hop.nodeId, event: hop.event }));
    expect(events).toContainEqual({ nodeId: 'router-1', event: 'forward' });
    expect(events).toContainEqual({ nodeId: 'router-2', event: 'forward' });
    expect(events).toContainEqual({ nodeId: 'router-3', event: 'drop' });
  });

  it('routingDecision.explanation is descriptive on no-route drop', async () => {
    const topology = singleRouterTopology();
    topology.routeTables.set('router-1', []);

    const engine = makeEngine(topology);
    const trace = await engine.precompute(
      makePacket('no-route-explanation', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    const dropHop = trace.hops.find((hop) => hop.event === 'drop');
    expect(dropHop?.routingDecision?.explanation).toBeDefined();
    expect(dropHop?.routingDecision?.explanation.length).toBeGreaterThan(0);
  });
});

describe('Failure injection', () => {
  describe('combined failures', () => {
    it('node-down takes precedence over edge-down when both affect same router', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(['router-1']),
        downEdgeIds: new Set(['e2']),
        downInterfaceIds: new Set(),
      };

      const trace = await engine.precompute(
        makePacket('failure-node-vs-edge', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.reason).toBe('node-down');
      expect(dropHop?.nodeId).toBe('router-1');
    });

    it('edge-down + interface-down on separate routers: packet dropped', async () => {
      const engine = makeEngine(failureFallbackTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(['e2']),
        downInterfaceIds: new Set([makeInterfaceFailureId('router-3', 'eth1')]),
      };

      const trace = await engine.precompute(
        makePacket('failure-edge-interface', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.nodeId).toBe('router-3');
      expect(dropHop?.reason).toBe('interface-down');
    });

    it('node-down on R2 + edge-down on e3 still drops on the primary path at R2', async () => {
      const engine = makeEngine(failureFallbackTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(['router-2']),
        downEdgeIds: new Set(['e3']),
        downInterfaceIds: new Set(),
      };

      const trace = await engine.precompute(
        makePacket('failure-blocked-all-paths', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.nodeId).toBe('router-2');
      expect(dropHop?.reason).toBe('node-down');
    });
  });

  describe('cascading failures', () => {
    it('downing R2 in a two-router chain drops packet at R2 with node-down', async () => {
      const engine = makeEngine(multiHopTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(['router-2']),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set(),
      };

      const trace = await engine.precompute(
        makePacket('failure-cascade', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      const r1Hop = trace.hops.find((hop) => hop.nodeId === 'router-1');
      expect(dropHop?.nodeId).toBe('router-2');
      expect(dropHop?.reason).toBe('node-down');
      expect(r1Hop?.event).toBe('forward');
    });
  });

  describe('failure recovery', () => {
    it('packet delivers normally after failure state is cleared', async () => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(['router-1']),
        downEdgeIds: new Set(),
        downInterfaceIds: new Set(),
      };

      const failed = await engine.precompute(
        makePacket('failure-recovery-down', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );
      const recovered = await engine.precompute(
        makePacket('failure-recovery-up', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
      );

      expect(failed.status).toBe('dropped');
      expect(recovered.status).toBe('delivered');
    });

    it('switching from full failure to partial failure re-enables the fallback path', async () => {
      const engine = makeEngine(failureFallbackTopology());
      const fullFailure: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(['e2', 'e3']),
        downInterfaceIds: new Set(),
      };
      const partialFailure: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(['e2']),
        downInterfaceIds: new Set(),
      };

      const blocked = await engine.precompute(
        makePacket('failure-full', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        fullFailure,
      );
      const fallback = await engine.precompute(
        makePacket('failure-partial', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        partialFailure,
      );

      expect(blocked.status).toBe('dropped');
      expect(fallback.status).toBe('delivered');
      const r1Hop = fallback.hops.find((hop) => hop.nodeId === 'router-1');
      expect(r1Hop?.toNodeId).toBe('router-3');
    });
  });

  describe('edge failure symmetry', () => {
    it('edge failure blocks traffic in both directions', async () => {
      const engine = makeEngine(multiHopTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(),
        downEdgeIds: new Set(['e2']),
        downInterfaceIds: new Set(),
      };

      const forward = await engine.precompute(
        makePacket('failure-symmetric-forward', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );
      const reverse = await engine.precompute(
        makePacket('failure-symmetric-reverse', 'server-1', 'client-1', '203.0.113.10', '10.0.0.10'),
        failureState,
      );

      expect(forward.status).toBe('dropped');
      expect(reverse.status).toBe('dropped');
    });
  });

  describe('multiple simultaneous failures', () => {
    it.each([
      {
        downNodes: ['router-1'],
        downEdges: [] as string[],
        downInterfaces: [] as string[],
        expectedReason: 'node-down',
        desc: 'node only',
      },
      {
        downNodes: [] as string[],
        downEdges: ['e2'],
        downInterfaces: [] as string[],
        expectedReason: 'no-route',
        desc: 'edge only',
      },
      {
        downNodes: [] as string[],
        downEdges: [] as string[],
        downInterfaces: [makeInterfaceFailureId('router-1', 'eth1')],
        expectedReason: 'interface-down',
        desc: 'interface only',
      },
      {
        downNodes: ['router-1'],
        downEdges: ['e2'],
        downInterfaces: [makeInterfaceFailureId('router-1', 'eth1')],
        expectedReason: 'node-down',
        desc: 'all three',
      },
    ])('$desc -> drop with $expectedReason', async ({ downNodes, downEdges, downInterfaces, expectedReason }) => {
      const engine = makeEngine(singleRouterTopology());
      const failureState: FailureState = {
        downNodeIds: new Set(downNodes),
        downEdgeIds: new Set(downEdges),
        downInterfaceIds: new Set(downInterfaces),
      };

      const trace = await engine.precompute(
        makePacket(`failure-table-${expectedReason}`, 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
        failureState,
      );

      expect(trace.status).toBe('dropped');
      const dropHop = trace.hops.find((hop) => hop.event === 'drop');
      expect(dropHop?.reason).toBe(expectedReason);
    });
  });
});
