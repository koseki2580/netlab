import { describe, expect, it, vi } from 'vitest';
import type { IcmpMessage, InFlightPacket, IpPacket } from '../types/packets';
import type { PacketHop, PacketTrace } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import { buildIpv4HeaderBytes, bytesToRawString, buildTransportBytes } from '../utils/packetLayout';
import type { ForwardingPipeline } from './ForwardingPipeline';
import { ICMP_CODE, ICMP_TYPE } from './icmp';
import { IPV4_DEFAULT_PMTU } from './PathMtuCache';
import type { ServiceOrchestrator, ServiceEventSink } from './ServiceOrchestrator';
import { TraceCoordinator } from './TraceCoordinator';
import { TraceRecorder } from './TraceRecorder';

const CLIENT_ID = 'client-1';
const CLIENT_IP = '10.0.0.10';
const ORIGINAL_DST_IP = '203.0.113.10';
const NEXT_HOP_MTU = 600;

function makeTopology(clientRole: 'client' | 'router' = 'client'): NetworkTopology {
  return {
    nodes: [
      {
        id: CLIENT_ID,
        type: clientRole,
        position: { x: 0, y: 0 },
        data: {
          label: 'Client',
          role: clientRole,
          layerId: clientRole === 'router' ? 'l3' : 'l7',
          ip: CLIENT_IP,
        },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

function makeOriginalTcpPacket(): IpPacket {
  return {
    layer: 'L3',
    srcIp: CLIENT_IP,
    dstIp: ORIGINAL_DST_IP,
    ttl: 64,
    protocol: 6,
    flags: { df: true, mf: false },
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 1000,
      ack: 0,
      flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
      payload: { layer: 'raw', data: 'hello' },
    },
  };
}

function makeFragNeededIp(): IpPacket {
  const original = makeOriginalTcpPacket();
  const quoted = bytesToRawString([
    ...buildIpv4HeaderBytes(original),
    ...buildTransportBytes(original.payload).slice(0, 8),
  ]);
  const icmp: IcmpMessage = {
    layer: 'L4',
    type: ICMP_TYPE.DESTINATION_UNREACHABLE,
    code: ICMP_CODE.FRAGMENTATION_NEEDED,
    checksum: 0,
    sequenceNumber: NEXT_HOP_MTU,
    data: quoted,
  };
  return {
    layer: 'L3',
    srcIp: '203.0.113.1',
    dstIp: CLIENT_IP,
    ttl: 64,
    protocol: 1,
    payload: icmp,
  };
}

function makeFragNeededSnapshot(packetId: string): InFlightPacket {
  return {
    id: packetId,
    srcNodeId: 'router-x',
    dstNodeId: CLIENT_ID,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: makeFragNeededIp(),
    },
    currentDeviceId: CLIENT_ID,
    ingressPortId: '',
    path: [],
    timestamp: 0,
  };
}

function makeDeliverHop(): PacketHop {
  return {
    step: 0,
    nodeId: CLIENT_ID,
    nodeLabel: 'Client',
    srcIp: '203.0.113.1',
    dstIp: CLIENT_IP,
    ttl: 64,
    protocol: 'ICMP',
    event: 'deliver',
    timestamp: 0,
  };
}

function makeForwardHop(): PacketHop {
  return {
    step: 0,
    nodeId: CLIENT_ID,
    nodeLabel: 'Client',
    srcIp: '203.0.113.1',
    dstIp: CLIENT_IP,
    ttl: 64,
    protocol: 'ICMP',
    event: 'forward',
    timestamp: 0,
  };
}

function makeTrace(packetId: string, hops: PacketHop[]): PacketTrace {
  return {
    packetId,
    label: 'test',
    srcNodeId: 'router-x',
    dstNodeId: CLIENT_ID,
    hops,
    status: 'delivered',
  };
}

function makeCoordinator(topology: NetworkTopology): {
  coordinator: TraceCoordinator;
  traceRecorder: TraceRecorder;
} {
  const traceRecorder = new TraceRecorder();
  const pipeline = {} as unknown as ForwardingPipeline;
  const services = {} as unknown as ServiceOrchestrator;
  const coordinator = new TraceCoordinator(topology, pipeline, services, traceRecorder);
  return { coordinator, traceRecorder };
}

describe('TraceCoordinator.observePathMtuSignals', () => {
  it('updates the destination cache when a deliver hop carries an ICMP Fragmentation-Needed signal', () => {
    const { coordinator, traceRecorder } = makeCoordinator(makeTopology('client'));
    const packetId = 'pkt-pmtu-1';
    traceRecorder.setSnapshots(packetId, [makeFragNeededSnapshot(packetId)]);

    coordinator.observePathMtuSignals(makeTrace(packetId, [makeDeliverHop()]));

    expect(coordinator.getPathMtuCache(CLIENT_ID).get(ORIGINAL_DST_IP)).toBe(NEXT_HOP_MTU);
  });

  it('ignores PMTU signals when the arrival node is a router', () => {
    const { coordinator, traceRecorder } = makeCoordinator(makeTopology('router'));
    const packetId = 'pkt-pmtu-router';
    traceRecorder.setSnapshots(packetId, [makeFragNeededSnapshot(packetId)]);

    coordinator.observePathMtuSignals(makeTrace(packetId, [makeDeliverHop()]));

    // No PMTU update; lookup returns the default
    expect(coordinator.getPathMtuCache(CLIENT_ID).get(ORIGINAL_DST_IP)).toBe(IPV4_DEFAULT_PMTU);
  });

  it('ignores non-deliver hops even when the snapshot contains a Frag-Needed packet', () => {
    const { coordinator, traceRecorder } = makeCoordinator(makeTopology('client'));
    const packetId = 'pkt-pmtu-forward';
    traceRecorder.setSnapshots(packetId, [makeFragNeededSnapshot(packetId)]);

    coordinator.observePathMtuSignals(makeTrace(packetId, [makeForwardHop()]));

    expect(coordinator.getPathMtuCache(CLIENT_ID).get(ORIGINAL_DST_IP)).toBe(IPV4_DEFAULT_PMTU);
  });

  it('is idempotent: repeated calls with the same trace do not lower the cached MTU', () => {
    const { coordinator, traceRecorder } = makeCoordinator(makeTopology('client'));
    const packetId = 'pkt-pmtu-idempotent';
    traceRecorder.setSnapshots(packetId, [makeFragNeededSnapshot(packetId)]);
    const trace = makeTrace(packetId, [makeDeliverHop()]);

    coordinator.observePathMtuSignals(trace);
    coordinator.observePathMtuSignals(trace);

    expect(coordinator.getPathMtuCache(CLIENT_ID).get(ORIGINAL_DST_IP)).toBe(NEXT_HOP_MTU);
  });
});

describe('TraceCoordinator PMTU cache lifecycle', () => {
  it('returns the same cache instance for repeated lookups of the same node', () => {
    const { coordinator } = makeCoordinator(makeTopology('client'));

    const first = coordinator.getPathMtuCache(CLIENT_ID);
    const second = coordinator.getPathMtuCache(CLIENT_ID);

    expect(second).toBe(first);
  });

  it('clearAllCacheEntries drains entries but preserves cache instances', () => {
    const { coordinator } = makeCoordinator(makeTopology('client'));
    const cache = coordinator.getPathMtuCache(CLIENT_ID);
    cache.update(ORIGINAL_DST_IP, NEXT_HOP_MTU);

    coordinator.clearAllCacheEntries();

    expect(cache.size()).toBe(0);
    expect(coordinator.getPathMtuCache(CLIENT_ID)).toBe(cache);
  });

  it('dropAllCaches removes cache instances entirely', () => {
    const { coordinator } = makeCoordinator(makeTopology('client'));
    const cache = coordinator.getPathMtuCache(CLIENT_ID);

    coordinator.dropAllCaches();

    expect(coordinator.getPathMtuCache(CLIENT_ID)).not.toBe(cache);
  });
});

describe('TraceCoordinator.prepareForSend', () => {
  function makeSendablePacket(): InFlightPacket {
    return {
      id: 'pkt-1',
      srcNodeId: CLIENT_ID,
      dstNodeId: 'server-1',
      frame: {
        layer: 'L2',
        srcMac: '00:00:00:00:00:01',
        dstMac: '00:00:00:00:00:02',
        etherType: 0x0800,
        payload: makeOriginalTcpPacket(),
      },
      currentDeviceId: CLIENT_ID,
      ingressPortId: '',
      path: [],
      timestamp: 0,
    };
  }

  function makeStubSink(): ServiceEventSink {
    return {
      appendTrace: vi.fn(),
      notify: vi.fn(),
    };
  }

  it('returns the packet with a generated sessionId when no DHCP/DNS work is needed', async () => {
    const topology = makeTopology('client');
    const traceRecorder = new TraceRecorder();
    const pipeline = {
      findNode: vi.fn(() => topology.nodes[0]),
      getEffectiveNodeIp: vi.fn(() => undefined),
      withPacketIps: vi.fn((p) => p),
    } as unknown as ForwardingPipeline;
    const services = {
      getRuntimeNodeIp: vi.fn(() => CLIENT_IP),
      simulateDhcp: vi.fn(),
      simulateDns: vi.fn(),
    } as unknown as ServiceOrchestrator;
    const coordinator = new TraceCoordinator(topology, pipeline, services, traceRecorder);
    const packet = makeSendablePacket();

    const result = await coordinator.prepareForSend(packet, undefined, makeStubSink());

    expect(result).not.toBeNull();
    expect(result?.sessionId).toBeTypeOf('string');
    expect(result?.sessionId).toHaveLength(36);
    expect(services.simulateDhcp).not.toHaveBeenCalled();
    expect(services.simulateDns).not.toHaveBeenCalled();
  });

  it('returns null and commits a synthetic drop trace when DHCP fails', async () => {
    const topology: NetworkTopology = {
      nodes: [
        {
          id: CLIENT_ID,
          type: 'client',
          position: { x: 0, y: 0 },
          data: {
            label: 'DHCP Client',
            role: 'client',
            layerId: 'l7',
            dhcpClient: { enabled: true },
          },
        },
      ],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };
    const traceRecorder = new TraceRecorder();
    const pipeline = {
      findNode: vi.fn(() => topology.nodes[0]),
      getEffectiveNodeIp: vi.fn(() => undefined),
      withPacketIps: vi.fn((p) => p),
    } as unknown as ForwardingPipeline;
    const services = {
      getRuntimeNodeIp: vi.fn(() => null),
      simulateDhcp: vi.fn(async () => false),
      simulateDns: vi.fn(),
    } as unknown as ServiceOrchestrator;
    const coordinator = new TraceCoordinator(topology, pipeline, services, traceRecorder);
    const sink = makeStubSink();
    const packet = makeSendablePacket();

    const result = await coordinator.prepareForSend(packet, undefined, sink);

    expect(result).toBeNull();
    expect(services.simulateDhcp).toHaveBeenCalledOnce();
    const appendTraceMock = sink.appendTrace as ReturnType<typeof vi.fn>;
    expect(appendTraceMock).toHaveBeenCalledOnce();
    const [appendedTrace] = appendTraceMock.mock.calls[0] as [PacketTrace];
    expect(appendedTrace.status).toBe('dropped');
    expect(appendedTrace.hops[0]?.event).toBe('drop');
    expect(appendedTrace.hops[0]?.reason).toBe('dhcp-assignment-failed');
  });
});
