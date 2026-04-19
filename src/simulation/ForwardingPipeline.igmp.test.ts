import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { IgmpProcessor } from '../layers/l3-network/IgmpProcessor';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import type { IpPacket } from '../types/packets';
import type { RouteEntry } from '../types/routing';
import type { NetworkTopology } from '../types/topology';
import { ForwardingPipeline, isIgmpMessage } from './ForwardingPipeline';
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

/** client-1 -- e1 -- router-1 -- e2 -- client-2 */
function igmpTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        {
          destination: '10.0.0.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'router-1',
        },
        {
          destination: '10.0.1.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'router-1',
        },
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Client-1',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:10',
        },
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
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
          ],
        },
      },
      {
        id: 'client-2',
        type: 'client',
        position: { x: 400, y: 0 },
        data: {
          label: 'Client-2',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.1.10',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'client-2' },
    ],
    areas: [],
    routeTables,
  };
}

function makePipeline(topology: NetworkTopology) {
  const hookEngine = new HookEngine();
  const traceRecorder = new TraceRecorder();
  const services = new ServiceOrchestrator(topology, hookEngine);
  const pipeline = new ForwardingPipeline(topology, hookEngine, traceRecorder, services);
  services.setPacketSender({
    precompute: (packet, failureState, options) =>
      pipeline.precompute(packet, failureState, options),
    findNode: (nodeId) => pipeline.findNode(nodeId) ?? undefined,
    getNeighbors: (nodeId, excludeNodeId = null, failureState = EMPTY_FAILURE_STATE) =>
      pipeline.getNeighbors(nodeId, excludeNodeId, failureState),
  });
  return { pipeline, services };
}

describe('isIgmpMessage', () => {
  it('distinguishes IGMP from ICMP/TCP/UDP payloads', () => {
    const igmp: IpPacket['payload'] = {
      layer: 'L4',
      igmpType: 'v2-membership-report',
      groupAddress: '224.1.2.3',
    };
    expect(isIgmpMessage(igmp)).toBe(true);

    const icmp: IpPacket['payload'] = {
      layer: 'L4',
      type: 8,
      code: 0,
      checksum: 0,
    };
    expect(isIgmpMessage(icmp)).toBe(false);

    const tcp: IpPacket['payload'] = {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 0,
      ack: 0,
      flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
      payload: { layer: 'raw', data: '' },
    };
    expect(isIgmpMessage(tcp)).toBe(false);

    const udp: IpPacket['payload'] = {
      layer: 'L4',
      srcPort: 49152,
      dstPort: 53,
      payload: { layer: 'raw', data: '' },
    };
    expect(isIgmpMessage(udp)).toBe(false);
  });
});

describe('ForwardingPipeline — IGMP trace annotation', () => {
  it('annotates a Report hop as "IGMP v2-membership-report group=..."', async () => {
    const topology = igmpTopology();
    const { pipeline } = makePipeline(topology);

    const reportPacket = IgmpProcessor.buildMembershipReport(
      '10.0.0.10',
      '02:00:00:00:00:10',
      '224.1.2.3',
    );
    reportPacket.srcNodeId = 'client-1';
    reportPacket.dstNodeId = 'router-1';

    const result = await pipeline.precompute(reportPacket, EMPTY_FAILURE_STATE);
    const hops = result.trace.hops;

    // At least one hop should have the IGMP annotation
    const annotatedHop = hops.find((h) => h.action?.startsWith('IGMP'));
    expect(annotatedHop).toBeDefined();
    expect(annotatedHop!.action).toBe('IGMP v2-membership-report group=224.1.2.3');
    expect(annotatedHop!.protocol).toBe('IGMP');
  });

  it('annotates a Query hop as "IGMP v2-membership-query"', async () => {
    const topology = igmpTopology();
    const { pipeline, services } = makePipeline(topology);

    const igmpProcessor = services.getIgmpProcessor('router-1');
    expect(igmpProcessor).not.toBeNull();

    const queryPacket = igmpProcessor!.buildGeneralQuery({
      ip: '10.0.0.1',
      mac: '00:00:00:01:00:00',
    });
    queryPacket.srcNodeId = 'router-1';
    queryPacket.dstNodeId = 'client-1';

    const result = await pipeline.precompute(queryPacket, EMPTY_FAILURE_STATE);
    const hops = result.trace.hops;

    const annotatedHop = hops.find((h) => h.action?.startsWith('IGMP'));
    expect(annotatedHop).toBeDefined();
    expect(annotatedHop!.action).toBe('IGMP v2-membership-query');
    expect(annotatedHop!.protocol).toBe('IGMP');
  });
});

describe('ForwardingPipeline — IGMP router processing', () => {
  it('calls IgmpProcessor.recordReport when a Report arrives at a router interface', async () => {
    const topology = igmpTopology();
    const { pipeline, services } = makePipeline(topology);

    const reportPacket = IgmpProcessor.buildMembershipReport(
      '10.0.0.10',
      '02:00:00:00:00:10',
      '224.1.2.3',
    );
    reportPacket.srcNodeId = 'client-1';
    reportPacket.dstNodeId = 'router-1';

    await pipeline.precompute(reportPacket, EMPTY_FAILURE_STATE);

    const igmpProcessor = services.getIgmpProcessor('router-1');
    expect(igmpProcessor).not.toBeNull();
    const snapshot = igmpProcessor!.snapshot();
    expect(snapshot.some((s) => s.group === '224.1.2.3')).toBe(true);
  });

  it('calls IgmpProcessor.recordLeave when a Leave arrives at a router interface', async () => {
    const topology = igmpTopology();
    const { pipeline, services } = makePipeline(topology);

    // First join
    const reportPacket = IgmpProcessor.buildMembershipReport(
      '10.0.0.10',
      '02:00:00:00:00:10',
      '224.1.2.3',
    );
    reportPacket.srcNodeId = 'client-1';
    reportPacket.dstNodeId = 'router-1';
    await pipeline.precompute(reportPacket, EMPTY_FAILURE_STATE);

    // Then leave
    const leavePacket = IgmpProcessor.buildLeaveGroup(
      '10.0.0.10',
      '02:00:00:00:00:10',
      '224.1.2.3',
    );
    leavePacket.srcNodeId = 'client-1';
    leavePacket.dstNodeId = 'router-1';
    await pipeline.precompute(leavePacket, EMPTY_FAILURE_STATE);

    const igmpProcessor = services.getIgmpProcessor('router-1');
    expect(igmpProcessor).not.toBeNull();
    const snapshot = igmpProcessor!.snapshot();
    expect(snapshot.some((s) => s.group === '224.1.2.3')).toBe(false);
  });
});
