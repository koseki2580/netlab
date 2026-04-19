import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import type { NetworkTopology } from '../../../types/topology';
import { ServiceOrchestrator } from '../../ServiceOrchestrator';
import { TraceRecorder } from '../../TraceRecorder';
import { makePacket } from '../../__fixtures__/helpers';
import { directTopology, singleRouterTopology } from '../../__fixtures__/topologies';
import { ArpBuilder } from '../builders/ArpBuilder';
import { FrameMaterializer } from '../builders/FrameMaterializer';
import { IcmpBuilder } from '../builders/IcmpBuilder';
import { InterfaceResolver } from '../resolvers/InterfaceResolver';
import { MacResolver } from '../resolvers/MacResolver';
import { PortResolver } from '../resolvers/PortResolver';
import { ArpDispatcher } from './ArpDispatcher';
import { ForwardingLoop } from './ForwardingLoop';

function makeForwardingLoop(topology: NetworkTopology) {
  const ifaceResolver = new InterfaceResolver(topology);
  const macResolver = new MacResolver(topology, ifaceResolver, (node) => node?.data.ip);
  const portResolver = new PortResolver(topology);
  const icmpBuilder = new IcmpBuilder();
  const frameMaterializer = new FrameMaterializer();
  const arpBuilder = new ArpBuilder();
  const traceRecorder = new TraceRecorder();
  const services = new ServiceOrchestrator(topology, new HookEngine());
  const arpDispatcher = new ArpDispatcher(
    topology,
    traceRecorder,
    ifaceResolver,
    macResolver,
    portResolver,
    arpBuilder,
    frameMaterializer,
    (node) => node?.data.ip,
  );

  return new ForwardingLoop(
    topology,
    traceRecorder,
    services,
    ifaceResolver,
    macResolver,
    portResolver,
    icmpBuilder,
    frameMaterializer,
    arpDispatcher,
    (node) => node?.data.ip,
    (nodeId, excludeNodeId, failureState) =>
      ifaceResolver.getNeighbors(nodeId, excludeNodeId ?? null, failureState),
  );
}

describe('ForwardingLoop', () => {
  it('seedArpCache populates cache from router interfaces', () => {
    const loop = makeForwardingLoop(singleRouterTopology());
    const cache = new Map<string, string>();
    loop.seedArpCache(cache);
    // Router has eth0 with 10.0.0.1 and eth1 with 203.0.113.1
    expect(cache.has('10.0.0.1')).toBe(true);
    expect(cache.has('203.0.113.1')).toBe(true);
  });

  it('seedArpCache populates endpoint IPs', () => {
    const loop = makeForwardingLoop(directTopology());
    const cache = new Map<string, string>();
    loop.seedArpCache(cache);
    expect(cache.has('10.0.0.10')).toBe(true);
    expect(cache.has('203.0.113.10')).toBe(true);
  });

  it('materializePacket returns packet with FCS', () => {
    const loop = makeForwardingLoop(directTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const result = loop.materializePacket(packet, EMPTY_FAILURE_STATE, new Map());
    expect(result.frame.fcs).toBeDefined();
    expect(result.frame.payload.headerChecksum).toBeDefined();
  });

  it('run delivers packet in direct topology', async () => {
    const loop = makeForwardingLoop(directTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const cache = new Map<string, string>();
    loop.seedArpCache(cache);
    const materialized = loop.materializePacket(packet, EMPTY_FAILURE_STATE, cache);
    const hops: any[] = [];
    const snapshots: any[] = [];

    const result = await loop.run(
      {
        packet: materialized,
        current: 'client-1',
        ingressFrom: null,
        ingressEdgeId: null,
        senderIp: null,
        stepCounter: 0,
        baseTs: Date.now(),
        visitedStates: new Set(),
      },
      {
        hops,
        snapshots,
        nodeArpTables: {},
        arpCache: cache,
        reassemblers: new Map(),
        failureState: EMPTY_FAILURE_STATE,
        options: {},
      },
    );

    expect(result.stepCounter).toBeGreaterThan(0);
    expect(hops.some((h: any) => h.event === 'deliver')).toBe(true);
  });
});
