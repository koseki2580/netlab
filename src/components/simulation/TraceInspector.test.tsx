import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
import { HopInspector } from './HopInspector';
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
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
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

  it('HopInspector omits interface rows when the selected hop has no interface metadata', () => {
    const html = renderWithContexts(
      <HopInspector />,
      makeState({ selectedHop: BASE_HOPS[0] }),
    );

    expect(html).not.toContain('Ingress If');
    expect(html).not.toContain('Egress If');
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
});
