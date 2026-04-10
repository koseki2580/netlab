import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { NatTable } from '../../types/nat';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
import { NetlabUIContext } from '../NetlabUIContext';
import { HopInspector } from './HopInspector';
import { NatTableViewer } from './NatTableViewer';
import { PacketTimeline } from './PacketTimeline';
import { TraceSummary } from './TraceSummary';

const TOPOLOGY: NetworkTopology = {
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
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00', nat: 'inside' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01', nat: 'outside' },
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
  routeTables: new Map([
    [
      'router-1',
      [
        {
          nodeId: 'router-1',
          destination: '10.0.0.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
        },
        {
          nodeId: 'router-1',
          destination: '203.0.113.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
        },
      ],
    ],
  ]),
};

const BASE_HOPS: PacketHop[] = [
  {
    step: 0,
    nodeId: 'client-1',
    nodeLabel: 'Client',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'create',
    toNodeId: 'router-1',
    timestamp: 1,
  },
  {
    step: 1,
    nodeId: 'router-1',
    nodeLabel: 'R-1',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 63,
    protocol: 'TCP',
    event: 'forward',
    fromNodeId: 'client-1',
    toNodeId: 'server-1',
    activeEdgeId: 'e2',
    ingressInterfaceId: 'eth0',
    ingressInterfaceName: 'eth0',
    egressInterfaceId: 'eth1',
    egressInterfaceName: 'eth1',
    routingDecision: {
      dstIp: '203.0.113.10',
      winner: {
        destination: '203.0.113.0/24',
        nextHop: 'direct',
        metric: 0,
        protocol: 'static',
        adminDistance: 1,
        matched: true,
        selectedByLpm: true,
      },
      candidates: [
        {
          destination: '203.0.113.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          matched: true,
          selectedByLpm: true,
        },
        {
          destination: '10.0.0.0/24',
          nextHop: 'direct',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          matched: false,
          selectedByLpm: false,
        },
      ],
      explanation: 'Matched 203.0.113.0/24 via direct (static, AD=1)',
    },
    timestamp: 2,
  },
  {
    step: 2,
    nodeId: 'server-1',
    nodeLabel: 'Server',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 62,
    protocol: 'TCP',
    event: 'deliver',
    fromNodeId: 'router-1',
    timestamp: 3,
  },
];

const ARP_REQUEST_HOP: PacketHop = {
  step: 1,
  nodeId: 'client-1',
  nodeLabel: 'Client',
  srcIp: '10.0.0.10',
  dstIp: '203.0.113.10',
  ttl: 0,
  protocol: 'ARP',
  event: 'arp-request',
  toNodeId: 'server-1',
  activeEdgeId: 'e1',
  arpFrame: {
    layer: 'L2',
    srcMac: '02:00:00:00:00:10',
    dstMac: 'ff:ff:ff:ff:ff:ff',
    etherType: 0x0806,
    payload: {
      layer: 'ARP',
      hardwareType: 1,
      protocolType: 0x0800,
      operation: 'request',
      senderMac: '02:00:00:00:00:10',
      senderIp: '10.0.0.10',
      targetMac: '00:00:00:00:00:00',
      targetIp: '203.0.113.10',
    },
  },
  timestamp: 2,
};

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  const trace: PacketTrace = {
    packetId: 'pkt-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops: BASE_HOPS,
    status: 'delivered',
  };

  return {
    status: 'paused',
    traces: [trace],
    currentTraceId: trace.packetId,
    currentStep: -1,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
    ...overrides,
  };
}

function renderWithContexts(
  ui: React.ReactElement,
  state: SimulationState,
  topology: NetworkTopology = TOPOLOGY,
): string {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(topology, hookEngine);

  return renderToStaticMarkup(
    <NetlabContext.Provider
      value={{
        topology,
        routeTable: topology.routeTables,
        areas: topology.areas,
        hookEngine,
      }}
    >
      <SimulationContext.Provider
        value={{
          engine,
          state,
          sendPacket: async () => {},
          simulateDhcp: async () => false,
          simulateDns: async () => null,
          getDhcpLeaseState: () => null,
          getDnsCache: () => null,
        }}
      >
        {ui}
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

describe('Trace Inspector components', () => {
  it('PacketTimeline resolves next-hop labels from topology nodes', () => {
    const html = renderWithContexts(
      <PacketTimeline />,
      makeState({ selectedHop: BASE_HOPS[1] }),
    );

    expect(html).toContain('→ Server');
    expect(html).not.toContain('→ server-1');
  });

  it('PacketTimeline renders ARP-specific labels and helper copy for ARP hops', () => {
    const trace: PacketTrace = {
      packetId: 'pkt-arp',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      hops: [BASE_HOPS[0], ARP_REQUEST_HOP],
      status: 'in-flight',
    };

    const html = renderWithContexts(
      <PacketTimeline />,
      makeState({
        traces: [trace],
        currentTraceId: trace.packetId,
        selectedHop: ARP_REQUEST_HOP,
      }),
    );

    expect(html).toContain('ARP-REQ');
    expect(html).toContain('who has 203.0.113.10?');
  });

  it('HopInspector renders derived TTL Out and routing explanation for router hops', () => {
    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: BASE_HOPS[1] }),
    );

    expect(html).toContain('Hop 2 / 3');
    expect(html).toContain('TTL Out');
    expect(html).toContain('62');
    expect(html).toContain('Ingress If');
    expect(html).toContain('eth0');
    expect(html).toContain('Egress If');
    expect(html).toContain('eth1');
    expect(html).toContain('Matched 203.0.113.0/24 via direct (static, AD=1)');
  });

  it('HopInspector shows drop reason alongside routing details on drop hops', () => {
    const dropHop: PacketHop = {
      ...BASE_HOPS[1],
      event: 'drop',
      toNodeId: undefined,
      reason: 'no-route',
      routingDecision: {
        dstIp: '198.51.100.10',
        winner: null,
        candidates: [
          {
            destination: '10.0.0.0/24',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 1,
            matched: false,
            selectedByLpm: false,
          },
        ],
        explanation: 'No matching route for 198.51.100.10 — packet will be dropped',
      },
    };
    const trace: PacketTrace = {
      packetId: 'pkt-drop',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      hops: [BASE_HOPS[0], dropHop],
      status: 'dropped',
    };

    const html = renderWithContexts(
      <HopInspector />,
      makeState({
        traces: [trace],
        currentTraceId: trace.packetId,
        selectedHop: dropHop,
      }),
    );

    expect(html).toContain('DROP REASON');
    expect(html).toContain('no-route');
    expect(html).toContain('No matching route for 198.51.100.10');
  });

  it('HopInspector renders NAT translation details with changed and unchanged post values', () => {
    const natHop: PacketHop = {
      ...BASE_HOPS[1],
      natTranslation: {
        type: 'snat',
        preSrcIp: '10.0.0.10',
        preSrcPort: 54321,
        postSrcIp: '203.0.113.1',
        postSrcPort: 1024,
        preDstIp: '203.0.113.10',
        preDstPort: 80,
        postDstIp: '203.0.113.10',
        postDstPort: 80,
      },
    };

    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: natHop }),
    );

    expect(html).toContain('NAT TRANSLATION');
    expect(html).toContain('SNAT');
    expect(html).toContain('203.0.113.1:1024');
    expect(html).toContain('var(--netlab-accent-green)');
    expect(html).toContain('var(--netlab-text-muted)');
  });

  it('HopInspector renders ACL filter details for explicit rule matches', () => {
    const aclHop: PacketHop = {
      ...BASE_HOPS[1],
      aclMatch: {
        direction: 'inbound',
        interfaceId: 'eth0',
        interfaceName: 'eth0',
        matchedRule: {
          id: 'allow-http',
          priority: 10,
          action: 'permit',
          protocol: 'tcp',
          srcIp: '10.0.0.0/24',
          dstPort: 80,
        },
        action: 'permit',
        byConnTrack: false,
      },
    };

    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: aclHop }),
    );

    expect(html).toContain('ACL FILTER');
    expect(html).toContain('INBOUND');
    expect(html).toContain('eth0');
    expect(html).toContain('#10 permit tcp 10.0.0.0/24 any dst 80');
    expect(html).toContain('PERMIT');
  });

  it('HopInspector distinguishes conn-track permits from default policy denies', () => {
    const connTrackHop: PacketHop = {
      ...BASE_HOPS[1],
      aclMatch: {
        direction: 'inbound',
        interfaceId: 'eth1',
        interfaceName: 'eth1',
        matchedRule: null,
        action: 'permit',
        byConnTrack: true,
      },
    };
    const defaultDenyHop: PacketHop = {
      ...BASE_HOPS[1],
      event: 'drop',
      reason: 'acl-deny',
      aclMatch: {
        direction: 'inbound',
        interfaceId: 'eth0',
        interfaceName: 'eth0',
        matchedRule: null,
        action: 'deny',
        byConnTrack: false,
      },
    };

    const connTrackHtml = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: connTrackHop }),
    );
    const defaultDenyHtml = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: defaultDenyHop }),
    );

    expect(connTrackHtml).toContain('stateful return traffic');
    expect(connTrackHtml).toContain('(conn-track)');
    expect(defaultDenyHtml).toContain('(default policy)');
    expect(defaultDenyHtml).toContain('ACL Deny');
  });

  it('HopInspector renders ARP-specific field details and skips routing decision for ARP hops', () => {
    const trace: PacketTrace = {
      packetId: 'pkt-arp-hop',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      hops: [BASE_HOPS[0], ARP_REQUEST_HOP],
      status: 'in-flight',
    };

    const html = renderWithContexts(
      <HopInspector />,
      makeState({
        traces: [trace],
        currentTraceId: trace.packetId,
        selectedHop: ARP_REQUEST_HOP,
      }),
    );

    expect(html).toContain('ARP FIELDS');
    expect(html).toContain('REQUEST (1)');
    expect(html).toContain('ff:ff:ff:ff:ff:ff');
    expect(html).not.toContain('ROUTING DECISION');
  });

  it('HopInspector omits interface rows when the selected hop has no interface metadata', () => {
    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: BASE_HOPS[0] }),
    );

    expect(html).not.toContain('Ingress If');
    expect(html).not.toContain('Egress If');
  });

  it('HopInspector empty state uses the secondary text token for visible copy', () => {
    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: null }),
    );

    expect(html).toContain('No hop selected. Click a timeline row to inspect packet details.');
    expect(html).toContain('var(--netlab-text-secondary)');
    expect(html).not.toContain('var(--netlab-text-muted)');
  });

  it('PacketTimeline exposes ACL deny as a human-readable tooltip label', () => {
    const dropHop: PacketHop = {
      ...BASE_HOPS[1],
      event: 'drop',
      toNodeId: undefined,
      reason: 'acl-deny',
    };
    const trace: PacketTrace = {
      packetId: 'pkt-acl-drop',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      hops: [BASE_HOPS[0], dropHop],
      status: 'dropped',
    };

    const html = renderWithContexts(
      <PacketTimeline />,
      makeState({
        traces: [trace],
        currentTraceId: trace.packetId,
        selectedHop: dropHop,
      }),
    );

    expect(html).toContain('title="ACL Deny"');
  });

  it('HopInspector uses the secondary text token for section headers and routing table headers', () => {
    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: BASE_HOPS[1] }),
    );

    expect(html).toContain('HOP INSPECTOR');
    expect(html).toContain('HOP FIELDS');
    expect(html).toContain('ROUTING DECISION');
    expect(html).toContain('DESTINATION');
    expect(html).toContain('var(--netlab-text-secondary)');
    expect(html).not.toContain('var(--netlab-text-muted)');
  });

  it('TraceSummary maps in-flight traces to the in-progress label', () => {
    const trace: PacketTrace = {
      packetId: 'pkt-in-flight',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      hops: BASE_HOPS,
      status: 'in-flight',
    };

    const html = renderWithContexts(
      <TraceSummary />,
      makeState({
        traces: [trace],
        currentTraceId: trace.packetId,
      }),
    );

    expect(html).toContain('TRACE SUMMARY');
    expect(html).toContain('in-progress');
    expect(html).toContain('Server');
    expect(html).toContain('203.0.113.10');
  });

  it('NatTableViewer renders the selected router NAT table', () => {
    const natTables: NatTable[] = [
      {
        routerId: 'router-1',
        entries: [
          {
            id: 'nat-1',
            proto: 'tcp',
            type: 'snat',
            insideLocalIp: '10.0.0.10',
            insideLocalPort: 54321,
            insideGlobalIp: '203.0.113.1',
            insideGlobalPort: 1024,
            outsidePeerIp: '203.0.113.10',
            outsidePeerPort: 80,
            createdAt: 1,
            lastSeenAt: 1,
          },
        ],
      },
    ];

    const html = renderWithContexts(
      <NetlabUIContext.Provider value={{ selectedNodeId: 'router-1', setSelectedNodeId: () => {} }}>
        <NatTableViewer />
      </NetlabUIContext.Provider>,
      makeState({
        selectedHop: BASE_HOPS[1],
        natTables,
      }),
    );

    expect(html).toContain('NAT TABLE');
    expect(html).toContain('Router: R-1');
    expect(html).toContain('203.0.113.1:1024');
    expect(html).toContain('SNAT');
  });
});
