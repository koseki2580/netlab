import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
import { NetlabUIContext } from '../NetlabUIContext';
import { NatTableViewer } from './NatTableViewer';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'router-1',
      type: 'router',
      position: { x: 0, y: 0 },
      data: {
        label: 'R1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '00:00:00:00:00:01',
            nat: 'inside' as const,
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:00:00:02',
            nat: 'outside' as const,
          },
        ],
      },
    },
  ],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

function renderNatTableViewer(
  overrides: Partial<SimulationState> = {},
  selectedNodeId: string | null = null,
): string {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(TOPOLOGY, hookEngine);
  const state: SimulationState = {
    status: 'paused',
    traces: [],
    currentTraceId: null,
    currentStep: 0,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
    ...overrides,
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
      <NetlabUIContext.Provider
        value={{
          selectedNodeId,
          setSelectedNodeId: () => {},
          selectedEdgeId: null,
          setSelectedEdgeId: () => {},
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
          <NatTableViewer />
        </SimulationContext.Provider>
      </NetlabUIContext.Provider>
    </NetlabContext.Provider>,
  );
}

describe('NatTableViewer', () => {
  it('renders empty state when no NAT entries', () => {
    const html = renderNatTableViewer();

    expect(html).toContain('NAT TABLE');
    expect(html).toContain('No active NAT entries');
  });

  it('renders NAT entries when present', () => {
    const html = renderNatTableViewer(
      {
        natTables: [
          {
            routerId: 'router-1',
            entries: [
              {
                id: 'nat-1',
                proto: 'tcp',
                insideLocalIp: '10.0.0.10',
                insideLocalPort: 5000,
                insideGlobalIp: '203.0.113.1',
                insideGlobalPort: 40000,
                outsidePeerIp: '8.8.8.8',
                outsidePeerPort: 80,
                type: 'snat' as const,
                createdAt: 0,
                lastSeenAt: 0,
              },
            ],
          },
        ],
      },
      'router-1',
    );

    expect(html).toContain('NAT TABLE');
    expect(html).toContain('R1');
    expect(html).toContain('TCP');
    expect(html).toContain('10.0.0.10');
    expect(html).toContain('5000');
    expect(html).toContain('203.0.113.1');
    expect(html).toContain('40000');
  });

  it('perf: is wrapped in React.memo', () => {
    expect((NatTableViewer as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });
});
