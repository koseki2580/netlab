import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
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
      id: 'server-1',
      type: 'server',
      position: { x: 200, y: 0 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
  areas: [],
  routeTables: new Map(),
};

function renderTraceSummary(trace: PacketTrace | null): string {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(TOPOLOGY, hookEngine);
  const state: SimulationState = {
    status: 'paused',
    traces: trace ? [trace] : [],
    currentTraceId: trace?.packetId ?? null,
    currentStep: 0,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };

  return renderToStaticMarkup(
    <NetlabContext.Provider
      value={{
        topology: TOPOLOGY,
        routeTable: TOPOLOGY.routeTables,
        areas: TOPOLOGY.areas,
        hookEngine,
      }}
    >
      <SimulationContext.Provider
        value={{
          engine,
          state,
          sendPacket: vi.fn(),
          simulateDhcp: vi.fn(),
          simulateDns: vi.fn(),
          getDhcpLeaseState: () => null,
          getDnsCache: () => null,
          exportPcap: () => new Uint8Array(),
          animationSpeed: 500,
          setAnimationSpeed: vi.fn(),
          isRecomputing: false,
        }}
      >
        <TraceSummary />
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

describe('TraceSummary', () => {
  it('returns null when no trace is selected', () => {
    expect(renderTraceSummary(null)).toBe('');
  });

  it('renders trace summary with hop count, status, and destination', () => {
    const trace: PacketTrace = {
      packetId: 'pkt-1',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      hops: [
        {
          step: 0,
          nodeId: 'client-1',
          nodeLabel: 'Client',
          event: 'forward',
          srcIp: '10.0.0.10',
          dstIp: '203.0.113.10',
          ttl: 64,
          protocol: 'ICMP',
          timestamp: 0,
        },
      ],
      status: 'delivered',
    };

    const html = renderTraceSummary(trace);

    expect(html).toContain('TRACE SUMMARY');
    expect(html).toContain('1');
    expect(html).toContain('delivered');
    expect(html).toContain('Server');
    expect(html).toContain('203.0.113.10');
  });

  it('perf: is wrapped in React.memo', () => {
    expect((TraceSummary as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });
});
