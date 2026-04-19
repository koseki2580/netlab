import { beforeAll, describe, expect, it } from 'vitest';
import { MINIMAL_DEMO_TOPOLOGY } from '../../demo/basic/MinimalDemo';
import { THREE_TIER_DEMO_TOPOLOGY } from '../../demo/basic/ThreeTierDemo';
import { STAR_DEMO_TOPOLOGY } from '../../demo/basic/StarDemo';
import { CLIENT_SERVER_INITIAL_TOPOLOGY } from '../../demo/routing/ClientServerDemo';
import { buildDynamicRoutingTopology } from '../../demo/routing/DynamicRoutingDemo';
import { MULTI_HOP_DEMO_TOPOLOGY } from '../../demo/routing/MultiHopDemo';
import { VLAN_DEMO_TOPOLOGY } from '../../demo/networking/VlanDemo';
import { buildStpDemoTopology } from '../../demo/networking/StpLoopDemo';
import { DMZ_DEMO_TOPOLOGY } from '../../demo/areas/DmzDemo';
import { DHCP_DNS_DEMO_TOPOLOGY } from '../../demo/services/DhcpDnsDemo';
import { FAILURE_SIM_DEMO_TOPOLOGY } from '../../demo/simulation/FailureSimDemo';
import { STEP_SIM_TOPOLOGY } from '../../demo/simulation/stepSimShared';
import { NAT_DEMO_TOPOLOGY } from '../../demo/simulation/NatDemo';
import { ACL_DEMO_TOPOLOGY } from '../../demo/simulation/AclDemo';
import { INTERFACE_AWARE_TOPOLOGY } from '../../demo/simulation/InterfaceAwareDemo';
import { SESSION_DEMO_TOPOLOGY } from '../../demo/simulation/SessionDemo';
import { TCP_HANDSHAKE_DEMO_TOPOLOGY } from '../../demo/simulation/TcpHandshakeDemo';
import { EMBED_DEMO_TOPOLOGY } from '../../demo/embed/EmbedDemo';
import { CONTROLLED_TOPOLOGY_INITIAL_TOPOLOGY } from '../../demo/topology/ControlledTopologyDemo';
import { EDITOR_EXAMPLE_TOPOLOGY } from '../../demo/editor/EditorDemo';
import {
  ALL_IN_ONE_INITIAL_TOPOLOGY,
  toSimulationTopology,
} from '../../demo/comprehensive/AllInOneDemo';
import { HookEngine } from '../hooks/HookEngine';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { InFlightPacket } from '../types/packets';
import type { FailureState } from '../types/failure';
import type { NetworkTopology } from '../types/topology';
import { EMPTY_FAILURE_STATE } from '../types/failure';
import { buildTransportBytes, buildIpv4HeaderBytes, rawStringToBytes } from '../utils/packetLayout';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';
import { makePacket } from './__fixtures__/helpers';
import {
  multiHopTopology,
  singleRouterTopology,
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

function makeLargePacket(
  totalLength = 1500,
  overrides: Partial<InFlightPacket['frame']['payload']> = {},
): InFlightPacket {
  const packet = makePacket('fp-frag', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
  const payloadBytes = Math.max(totalLength - 40, 0);
  const tcpPayload = {
    layer: 'L4' as const,
    srcPort: 12345,
    dstPort: 80,
    seq: 0,
    ack: 0,
    flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
    payload: {
      layer: 'raw' as const,
      data: 'x'.repeat(payloadBytes),
    },
  };

  return {
    ...packet,
    sessionId: 'session-frag',
    frame: {
      ...packet.frame,
      payload: {
        layer: 'L3',
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        ttl: packet.frame.payload.ttl,
        protocol: 6,
        flags: { df: false, mf: false },
        payload: tcpPayload,
        ...overrides,
      },
    },
  };
}

function withEdgeMtu(topology: NetworkTopology, edgeId: string, mtuBytes: number): NetworkTopology {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, data: { ...(edge.data ?? {}), mtuBytes } } : edge,
    ),
  };
}

function withInterfaceMtu(
  topology: NetworkTopology,
  routerId: string,
  interfaceId: string,
  mtu: number,
): NetworkTopology {
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === routerId && node.data.role === 'router'
        ? {
            ...node,
            data: {
              ...node.data,
              interfaces: (node.data.interfaces ?? []).map((iface) =>
                iface.id === interfaceId ? { ...iface, mtu } : iface,
              ),
            },
          }
        : node,
    ),
  };
}

function resolveNodeIp(topology: NetworkTopology, nodeId: string): string | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (typeof node.data.ip === 'string') return node.data.ip;
  return node.data.interfaces?.[0]?.ipAddress ?? null;
}

function buildRegressionPacket(topology: NetworkTopology): InFlightPacket | null {
  const candidates = topology.nodes.filter((node) => node.data.role !== 'router');
  const srcNode = candidates.find((node) => resolveNodeIp(topology, node.id));
  const dstNode = [...candidates]
    .reverse()
    .find((node) => node.id !== srcNode?.id && resolveNodeIp(topology, node.id));
  const srcIp = srcNode ? resolveNodeIp(topology, srcNode.id) : null;
  const dstIp = dstNode ? resolveNodeIp(topology, dstNode.id) : null;

  if (!srcNode || !dstNode || !srcIp || !dstIp) {
    return null;
  }

  return {
    id: `regression-${srcNode.id}-${dstNode.id}`,
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
    currentDeviceId: srcNode.id,
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 40000,
          dstPort: 80,
          seq: 1,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'demo-regression' },
        },
      },
    },
  };
}

const DEMO_REGRESSION_SCENARIOS: [string, NetworkTopology][] = [
  ['Minimal', MINIMAL_DEMO_TOPOLOGY],
  ['Three-Tier LAN', THREE_TIER_DEMO_TOPOLOGY],
  ['Star Topology', STAR_DEMO_TOPOLOGY],
  ['Client–Server', CLIENT_SERVER_INITIAL_TOPOLOGY],
  ['Dynamic Routing (RIP)', buildDynamicRoutingTopology('rip')],
  ['Dynamic Routing (OSPF)', buildDynamicRoutingTopology('ospf')],
  ['Dynamic Routing (BGP)', buildDynamicRoutingTopology('bgp')],
  ['Multi-Hop', MULTI_HOP_DEMO_TOPOLOGY],
  ['VLAN Segmentation', VLAN_DEMO_TOPOLOGY],
  ['Spanning Tree', buildStpDemoTopology()],
  ['DMZ Segmentation', DMZ_DEMO_TOPOLOGY],
  ['DHCP & DNS', DHCP_DNS_DEMO_TOPOLOGY],
  ['Step-by-Step', STEP_SIM_TOPOLOGY],
  ['Trace Inspector', STEP_SIM_TOPOLOGY],
  ['Failure Injection', FAILURE_SIM_DEMO_TOPOLOGY],
  ['NAT / PAT', NAT_DEMO_TOPOLOGY],
  ['Firewalls & ACLs', ACL_DEMO_TOPOLOGY],
  ['Interface-Aware Forwarding', INTERFACE_AWARE_TOPOLOGY],
  ['Session Inspector', SESSION_DEMO_TOPOLOGY],
  ['TCP Handshake', TCP_HANDSHAKE_DEMO_TOPOLOGY],
  ['Embed', EMBED_DEMO_TOPOLOGY],
  ['Controlled Topology', CONTROLLED_TOPOLOGY_INITIAL_TOPOLOGY],
  ['Topology Editor', { ...EDITOR_EXAMPLE_TOPOLOGY, areas: [], routeTables: new Map() }],
  ['All-in-One', toSimulationTopology(ALL_IN_ONE_INITIAL_TOPOLOGY)],
];

describe('ForwardingPipeline — fragmentation (DF=0)', () => {
  it('passes unchanged when every link has Infinity mtu', async () => {
    const pipeline = makePipeline(singleRouterTopology());
    const result = await pipeline.precompute(makeLargePacket(1500));

    expect(result.trace.status).toBe('delivered');
    expect(result.trace.hops.some((hop) => hop.action === 'fragment')).toBe(false);
  });

  it('fragments a 1500-byte packet into two when a link has mtuBytes=1000', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(makeLargePacket(1500));
    const fragmentHops = result.trace.hops.filter((hop) => hop.action === 'fragment');

    expect(fragmentHops).toHaveLength(2);
    expect(fragmentHops.map((hop) => hop.nodeId)).toEqual(['router-1', 'router-1']);
  });

  it('annotates each hop with action=fragment and fragmentIndex/Count', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(makeLargePacket(1500));
    const fragmentHops = result.trace.hops.filter((hop) => hop.action === 'fragment');

    expect(fragmentHops.map((hop) => [hop.fragmentIndex, hop.fragmentCount])).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });

  it('respects RouterInterface.mtu override even if link.mtuBytes is larger', async () => {
    const topology = withInterfaceMtu(
      withEdgeMtu(singleRouterTopology(), 'e2', 1500),
      'router-1',
      'eth1',
      1000,
    );
    const pipeline = makePipeline(topology);
    const result = await pipeline.precompute(makeLargePacket(1500));

    expect(result.trace.hops.filter((hop) => hop.action === 'fragment')).toHaveLength(2);
  });

  it('uses the lower effective MTU when both link.mtuBytes and interface.mtu are set', async () => {
    const topology = withInterfaceMtu(
      withEdgeMtu(singleRouterTopology(), 'e2', 900),
      'router-1',
      'eth1',
      1200,
    );
    const pipeline = makePipeline(topology);
    const result = await pipeline.precompute(makeLargePacket(1500));
    const fragmentHops = result.trace.hops.filter((hop) => hop.action === 'fragment');

    expect(fragmentHops).toHaveLength(2);
    expect(fragmentHops.every((hop) => hop.nextHopMtu === 900)).toBe(true);
  });

  it('fragments at most once per egress when later links are large enough', async () => {
    const topology = withEdgeMtu(threeHopChainTopology(), 'e2', 1000);
    const pipeline = makePipeline(topology);
    const result = await pipeline.precompute(makeLargePacket(1500));
    const fragmentHops = result.trace.hops.filter((hop) => hop.action === 'fragment');

    expect(fragmentHops).toHaveLength(2);
    expect(new Set(fragmentHops.map((hop) => hop.nodeId))).toEqual(new Set(['router-1']));
  });

  it('re-fragments a fragment whose size still exceeds a later link mtu', async () => {
    const topology = withEdgeMtu(withEdgeMtu(threeHopChainTopology(), 'e2', 1200), 'e3', 600);
    const pipeline = makePipeline(topology);
    const result = await pipeline.precompute(makeLargePacket(1500));
    const fragmentHops = result.trace.hops.filter((hop) => hop.action === 'fragment');

    expect(fragmentHops.length).toBeGreaterThan(2);
    expect(fragmentHops.some((hop) => hop.nodeId === 'router-2')).toBe(true);
  });

  it('preserves session and identification across all fragments of a packet', async () => {
    const pipeline = makePipeline(withEdgeMtu(multiHopTopology(), 'e2', 1000));
    const packet = makeLargePacket(1500);
    const result = await pipeline.precompute(packet);
    const fragmentSteps = result.trace.hops
      .filter((hop) => hop.action === 'fragment')
      .map((hop) => hop.step);
    const fragmentSnapshots = fragmentSteps.map((step) => result.snapshots[step]);

    expect(new Set(fragmentSnapshots.map((snapshot) => snapshot.sessionId))).toEqual(
      new Set(['session-frag']),
    );
    expect(
      new Set(fragmentSnapshots.map((snapshot) => snapshot.frame.payload.identification)),
    ).toHaveProperty('size', 1);
  });
});

describe('ForwardingPipeline — DF=1 (do not fragment)', () => {
  it('drops a packet with flags.df=true when size > mtu', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        flags: { df: true, mf: false },
      }),
    );

    expect(result.trace.status).toBe('dropped');
    expect(result.trace.hops.some((hop) => hop.reason === 'fragmentation-needed')).toBe(true);
  });

  it('emits ICMP type=3 code=4 back to the source', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        flags: { df: true, mf: false },
      }),
    );

    expect(
      result.trace.hops.some(
        (hop) => hop.protocol === 'ICMP' && hop.event === 'deliver' && hop.nodeId === 'client-1',
      ),
    ).toBe(true);
  });

  it('encodes the next-hop mtu in the ICMP sequenceNumber field', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        flags: { df: true, mf: false },
      }),
    );
    const icmpSnapshot = result.snapshots.find(
      (snapshot) =>
        snapshot.frame.payload.protocol === 1 &&
        'type' in snapshot.frame.payload.payload &&
        snapshot.frame.payload.payload.type === 3 &&
        snapshot.frame.payload.payload.code === 4,
    );

    expect(icmpSnapshot?.frame.payload.payload.layer).toBe('L4');
    expect('sequenceNumber' in (icmpSnapshot?.frame.payload.payload ?? {})).toBe(true);
    expect(
      icmpSnapshot?.frame.payload.payload.layer === 'L4' &&
        'type' in icmpSnapshot.frame.payload.payload
        ? icmpSnapshot.frame.payload.payload.sequenceNumber
        : null,
    ).toBe(1000);
  });

  it('includes the offending IP header + first 8 bytes of L4 in ICMP data', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        flags: { df: true, mf: false },
      }),
    );
    const dropStep =
      result.trace.hops.find((hop) => hop.reason === 'fragmentation-needed')?.step ?? -1;
    const droppedPacket = result.snapshots[dropStep];
    const icmpSnapshot = result.snapshots.find(
      (snapshot) =>
        snapshot.frame.payload.protocol === 1 &&
        'type' in snapshot.frame.payload.payload &&
        snapshot.frame.payload.payload.type === 3 &&
        snapshot.frame.payload.payload.code === 4,
    )!;
    const expected = [
      ...buildIpv4HeaderBytes(droppedPacket.frame.payload),
      ...buildTransportBytes(droppedPacket.frame.payload.payload).slice(0, 8),
    ];
    const payload = icmpSnapshot.frame.payload.payload;

    expect('data' in payload ? rawStringToBytes(payload.data ?? '') : []).toEqual(expected);
  });

  it('does NOT emit ICMP when source is 0.0.0.0', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        srcIp: '0.0.0.0',
        flags: { df: true, mf: false },
      }),
    );

    expect(result.trace.hops.some((hop) => hop.protocol === 'ICMP')).toBe(false);
  });

  it('does NOT emit ICMP when source is 255.255.255.255', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        srcIp: '255.255.255.255',
        flags: { df: true, mf: false },
      }),
    );

    expect(result.trace.hops.some((hop) => hop.protocol === 'ICMP')).toBe(false);
  });

  it('annotates the drop hop with reason=fragmentation-needed', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1000));
    const result = await pipeline.precompute(
      makeLargePacket(1500, {
        flags: { df: true, mf: false },
      }),
    );

    expect(result.trace.hops.find((hop) => hop.reason === 'fragmentation-needed')).toEqual(
      expect.objectContaining({
        nodeId: 'router-1',
        event: 'drop',
      }),
    );
  });

  it('passes unchanged when size <= mtu even if DF=1', async () => {
    const pipeline = makePipeline(withEdgeMtu(singleRouterTopology(), 'e2', 1500));
    const result = await pipeline.precompute(
      makeLargePacket(500, {
        flags: { df: true, mf: false },
      }),
    );

    expect(result.trace.status).toBe('delivered');
    expect(result.trace.hops.some((hop) => hop.reason === 'fragmentation-needed')).toBe(false);
  });
});

describe('ForwardingPipeline — regression: existing demos produce no fragmentation', () => {
  it.each(DEMO_REGRESSION_SCENARIOS)(
    '%s produces zero fragment/Frag-Needed hops',
    async (_name, topology) => {
      const packet = buildRegressionPacket(topology);
      expect(packet).not.toBeNull();

      const pipeline = makePipeline(topology);
      const result = await pipeline.precompute(packet!);

      expect(result.trace.hops.filter((hop) => hop.action === 'fragment')).toHaveLength(0);
      expect(result.trace.hops.filter((hop) => hop.reason === 'fragmentation-needed')).toHaveLength(
        0,
      );
    },
  );
});
