import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
import { HopInspector } from './HopInspector';

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
  routeTables: new Map(),
};

function renderHopInspector(selectedHop: PacketHop): string {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(TOPOLOGY, hookEngine);
  const trace: PacketTrace = {
    packetId: 'pkt-hop-inspector',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops: [selectedHop],
    status: 'in-flight',
  };
  const state: SimulationState = {
    status: 'paused',
    traces: [trace],
    currentTraceId: trace.packetId,
    currentStep: selectedHop.step,
    activeEdgeIds: [],
    selectedHop,
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
          sendPacket: async () => {},
          simulateDhcp: async () => false,
          simulateDns: async () => null,
          getDhcpLeaseState: () => null,
          getDnsCache: () => null,
          exportPcap: () => new Uint8Array(),
          animationSpeed: 500,
          setAnimationSpeed: () => {},
          isRecomputing: false,
        }}
      >
        <HopInspector />
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

describe('HopInspector', () => {
  it('renders source and destination MAC rows when hop MACs are present', () => {
    const html = renderHopInspector({
      step: 1,
      nodeId: 'router-1',
      nodeLabel: 'R-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcMac: '00:00:00:01:00:01',
      dstMac: '02:00:00:00:00:20',
      ttl: 63,
      protocol: 'TCP',
      event: 'forward',
      fromNodeId: 'client-1',
      toNodeId: 'server-1',
      timestamp: 1,
    });

    expect(html).toContain('Src MAC');
    expect(html).toContain('Dst MAC');
    expect(html).toContain('00:00:00:01:00:01');
    expect(html).toContain('02:00:00:00:00:20');
  });

  it('renders em dashes for missing MAC values on legacy hops', () => {
    const html = renderHopInspector({
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
    });
    const emDash = String.fromCharCode(8212);

    expect(html).toContain('Src MAC');
    expect(html).toContain('Dst MAC');
    expect(html).toContain(emDash);
  });
});
