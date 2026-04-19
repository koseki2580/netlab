import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { layerRegistry } from '../registry/LayerRegistry';
import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import type { IpPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { makePacket } from './__fixtures__/helpers';
import { singleRouterTopology } from './__fixtures__/topologies';
import { ForwardingPipeline, isUdpDatagram } from './ForwardingPipeline';
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

describe('isUdpDatagram', () => {
  it('returns true for a well-formed UdpDatagram', () => {
    const udp: IpPacket['payload'] = {
      layer: 'L4',
      srcPort: 49152,
      dstPort: 53,
      payload: { layer: 'raw', data: '' },
    };
    expect(isUdpDatagram(udp)).toBe(true);
  });

  it('returns false for a TcpSegment', () => {
    const tcp: IpPacket['payload'] = {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 0,
      ack: 0,
      flags: {
        syn: true,
        ack: false,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      },
      payload: { layer: 'raw', data: '' },
    };
    expect(isUdpDatagram(tcp)).toBe(false);
  });

  it('returns false for an IcmpMessage', () => {
    const icmp: IpPacket['payload'] = {
      layer: 'L4',
      type: 8,
      code: 0,
      checksum: 0,
    };
    expect(isUdpDatagram(icmp)).toBe(false);
  });

  it('returns false for a RawPayload', () => {
    const raw: IpPacket['payload'] = {
      layer: 'raw',
      data: 'test',
    };
    expect(isUdpDatagram(raw)).toBe(false);
  });
});

describe('ForwardingPipeline — UDP hop annotation', () => {
  it('annotates a delivered UDP hop with srcPort and dstPort', async () => {
    const topology = singleRouterTopology();
    const pipeline = makePipeline(topology);

    const udpPacket = buildUdpPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcPort: 49200,
      dstPort: 53,
      timestamp: 1000,
    });

    const result = await pipeline.precompute(udpPacket, EMPTY_FAILURE_STATE);

    const deliverHop = result.trace.hops.find((h) => h.event === 'deliver');
    expect(deliverHop).toBeDefined();
    expect(deliverHop!.protocol).toBe('UDP');
    expect(deliverHop!.srcPort).toBe(49200);
    expect(deliverHop!.dstPort).toBe(53);
  });

  it('preserves existing TCP hop annotation when both flows coexist', async () => {
    const topology = singleRouterTopology();
    const pipeline = makePipeline(topology);

    const tcpPacket = makePacket(
      'tcp-test',
      'client-1',
      'server-1',
      '10.0.0.10',
      '203.0.113.10',
      64,
      12345,
      80,
    );

    const result = await pipeline.precompute(tcpPacket, EMPTY_FAILURE_STATE);

    const deliverHop = result.trace.hops.find((h) => h.event === 'deliver');
    expect(deliverHop).toBeDefined();
    expect(deliverHop!.protocol).toBe('TCP');
    expect(deliverHop!.srcPort).toBe(12345);
    expect(deliverHop!.dstPort).toBe(80);
  });
});
