import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { type FailureState, EMPTY_FAILURE_STATE } from '../types/failure';
import type { NetworkTopology } from '../types/topology';
import {
  multiHopTopology,
  directTopologyWithoutServerMac,
  singleRouterTopology,
  singleRouterTopologyWithoutServerMac,
} from './__fixtures__/topologies';
import { CLIENT_MAC, SERVER_MAC, deriveDeterministicMac, makePacket } from './__fixtures__/helpers';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';

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

function makePipeline(topology: NetworkTopology): ForwardingPipeline {
  const hookEngine = new HookEngine();
  const traceRecorder = new TraceRecorder();
  const services = new ServiceOrchestrator(topology, hookEngine);
  const pipeline = new ForwardingPipeline(topology, hookEngine, traceRecorder, services);

  services.setPacketSender({
    precompute: (packet, failureState, options) =>
      pipeline.precompute(packet, failureState, options),
    findNode: (nodeId) => pipeline.findNode(nodeId) ?? undefined,
    getNeighbors: (
      nodeId,
      excludeNodeId: string | null = null,
      failureState: FailureState = EMPTY_FAILURE_STATE,
    ) => pipeline.getNeighbors(nodeId, excludeNodeId, failureState),
  });

  return pipeline;
}

describe('ForwardingPipeline', () => {
  it('forwards a packet through a router', async () => {
    const pipeline = makePipeline(singleRouterTopology());
    const result = await pipeline.precompute(
      makePacket('fp-basic', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.status).toBe('delivered');
    expect(result.trace.hops.map((hop) => hop.event)).toEqual(['create', 'forward', 'deliver']);
    expect(result.trace.hops[1].nodeId).toBe('router-1');
  });

  it('records source and destination MAC addresses at the create step', async () => {
    const pipeline = makePipeline(multiHopTopology());
    const result = await pipeline.precompute(
      makePacket('fp-mac-create', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops[0]).toEqual(
      expect.objectContaining({
        event: 'create',
        srcMac: CLIENT_MAC,
        dstMac: '00:00:00:01:00:00',
      }),
    );
  });

  it('records rewritten MAC addresses at router forward hops', async () => {
    const pipeline = makePipeline(multiHopTopology());
    const result = await pipeline.precompute(
      makePacket('fp-mac-forward', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops[1]).toEqual(
      expect.objectContaining({
        nodeId: 'router-1',
        event: 'forward',
        srcMac: '00:00:00:01:00:01',
        dstMac: '00:00:00:02:00:00',
      }),
    );
    expect(result.trace.hops[2]).toEqual(
      expect.objectContaining({
        nodeId: 'router-2',
        event: 'forward',
        srcMac: '00:00:00:02:00:01',
        dstMac: SERVER_MAC,
      }),
    );
  });

  it('keeps IP addresses stable while MAC pairs change across routed hops', async () => {
    const pipeline = makePipeline(multiHopTopology());
    const result = await pipeline.precompute(
      makePacket('fp-mac-stability', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );
    const nonArpHops = result.trace.hops.filter(
      (hop) => hop.event !== 'arp-request' && hop.event !== 'arp-reply',
    );
    const macPairs = nonArpHops.map((hop) => `${hop.srcMac}->${hop.dstMac}`);

    expect(new Set(nonArpHops.map((hop) => hop.srcIp))).toEqual(new Set(['10.0.0.10']));
    expect(new Set(nonArpHops.map((hop) => hop.dstIp))).toEqual(new Set(['203.0.113.10']));
    expect(macPairs[0]).not.toBe(macPairs[1]);
    expect(macPairs[1]).not.toBe(macPairs[2]);
    expect(macPairs[2]).toBe(macPairs[3]);
  });

  it('records the final hop MAC addresses on delivery', async () => {
    const pipeline = makePipeline(multiHopTopology());
    const result = await pipeline.precompute(
      makePacket('fp-mac-deliver', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );
    const lastHop = result.trace.hops[result.trace.hops.length - 1];

    expect(lastHop).toEqual(
      expect.objectContaining({
        event: 'deliver',
        srcMac: '00:00:00:02:00:01',
        dstMac: SERVER_MAC,
      }),
    );
  });

  it('records ARP hop MAC addresses from the ARP frame', async () => {
    const pipeline = makePipeline(directTopologyWithoutServerMac());
    const result = await pipeline.precompute(
      makePacket('fp-arp-macs', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops[1]).toEqual(
      expect.objectContaining({
        event: 'arp-request',
        srcMac: CLIENT_MAC,
        dstMac: 'ff:ff:ff:ff:ff:ff',
      }),
    );
    expect(result.trace.hops[2]).toEqual(
      expect.objectContaining({
        event: 'arp-reply',
        srcMac: deriveDeterministicMac('server-1'),
        dstMac: CLIENT_MAC,
      }),
    );
  });

  it('drops when TTL expires at the first router hop', async () => {
    const pipeline = makePipeline(singleRouterTopology());
    const result = await pipeline.precompute(
      makePacket('fp-ttl', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10', 1),
    );

    expect(result.trace.status).toBe('dropped');
    expect(result.trace.hops.some((hop) => hop.reason === 'ttl-exceeded')).toBe(true);
  });

  it('drops with no-route when the router lacks a matching route', async () => {
    const pipeline = makePipeline(singleRouterTopology());
    const result = await pipeline.precompute(
      makePacket('fp-no-route', 'client-1', 'server-1', '10.0.0.10', '198.51.100.10'),
    );
    const lastHop = result.trace.hops[result.trace.hops.length - 1];

    expect(result.trace.status).toBe('dropped');
    expect(lastHop).toEqual(
      expect.objectContaining({
        nodeId: 'router-1',
        reason: 'no-route',
      }),
    );
  });

  it('injects ARP request and reply hops when the destination MAC is unknown', async () => {
    const pipeline = makePipeline(directTopologyWithoutServerMac());
    const result = await pipeline.precompute(
      makePacket('fp-arp', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    );

    expect(result.trace.hops.map((hop) => hop.event)).toEqual([
      'create',
      'arp-request',
      'arp-reply',
      'forward',
      'deliver',
    ]);
  });

  it('builds an ICMP echo request/reply exchange through the pipeline', async () => {
    const pipeline = makePipeline(singleRouterTopologyWithoutServerMac());
    const result = await pipeline.ping('client-1', '203.0.113.10');

    expect(result.trace.status).toBe('delivered');
    expect(result.trace.label).toBe('ICMP');
    expect(result.trace.hops.some((hop) => hop.protocol === 'ICMP')).toBe(true);
    expect(
      result.trace.hops.some((hop) => hop.event === 'deliver' && hop.nodeId === 'client-1'),
    ).toBe(true);
  });
});
