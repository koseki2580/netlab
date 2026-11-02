import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import type { InFlightPacket } from '../../../types/packets';
import type { PacketHop } from '../../../types/simulation';
import type { NetworkTopology } from '../../../types/topology';
import { ServiceOrchestrator } from '../../ServiceOrchestrator';
import { AddressPlane } from '../../AddressPlane';
import { TraceRecorder } from '../../TraceRecorder';
import { LinkQueueRegistry } from '../../LinkQueueRegistry';
import { makePacket } from '../../__fixtures__/helpers';
import { directTopology } from '../../__fixtures__/topologies';
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
  const addresses = new AddressPlane(topology);
  const macResolver = new MacResolver(ifaceResolver, addresses);
  const portResolver = new PortResolver(topology);
  const icmpBuilder = new IcmpBuilder();
  const frameMaterializer = new FrameMaterializer();
  const arpBuilder = new ArpBuilder();
  const traceRecorder = new TraceRecorder();
  const services = new ServiceOrchestrator(topology, new HookEngine());
  const arpDispatcher = new ArpDispatcher(
    traceRecorder,
    ifaceResolver,
    macResolver,
    portResolver,
    arpBuilder,
    frameMaterializer,
    addresses,
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
    addresses,
    (nodeId, excludeNodeId, failureState) =>
      ifaceResolver.getNeighbors(nodeId, excludeNodeId ?? null, failureState),
  );
}

describe('ForwardingLoop', () => {
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
    const materialized = loop.materializePacket(packet, EMPTY_FAILURE_STATE, cache);
    const hops: PacketHop[] = [];
    const snapshots: InFlightPacket[] = [];

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
        linkQueues: new LinkQueueRegistry(),
        failureState: EMPTY_FAILURE_STATE,
        options: {},
      },
    );

    expect(result.stepCounter).toBeGreaterThan(0);
    expect(hops.some((h) => h.event === 'deliver')).toBe(true);
  });

  it('preserves direct topology trace event sequence', async () => {
    const loop = makeForwardingLoop(directTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const cache = new Map<string, string>();
    const materialized = loop.materializePacket(packet, EMPTY_FAILURE_STATE, cache);
    const hops: PacketHop[] = [];

    await loop.run(
      {
        packet: materialized,
        current: 'client-1',
        ingressFrom: null,
        ingressEdgeId: null,
        senderIp: null,
        stepCounter: 0,
        baseTs: 1,
        visitedStates: new Set(),
      },
      {
        hops,
        snapshots: [],
        nodeArpTables: {},
        arpCache: cache,
        reassemblers: new Map(),
        linkQueues: new LinkQueueRegistry(),
        failureState: EMPTY_FAILURE_STATE,
        options: {},
      },
    );

    expect(hops.map((hop) => `${hop.event}:${hop.nodeId}`)).toEqual([
      'create:client-1',
      'arp-request:client-1',
      'arp-reply:server-1',
      'forward:client-1',
      'deliver:server-1',
    ]);
  });
});
