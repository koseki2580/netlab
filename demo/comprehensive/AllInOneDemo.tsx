import { useEffect, useState } from 'react';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { StepControls } from '../../src/components/simulation/StepControls';
import { FailureTogglePanel } from '../../src/components/simulation/FailureTogglePanel';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { TopologyEditor } from '../../src/editor/components/TopologyEditor';
import { FailureProvider, useFailure } from '../../src/simulation/FailureContext';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { EditorTopology } from '../../src/editor/types';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';

type TabId = 'editor' | 'simulation' | 'failure' | 'trace';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'editor', label: 'Editor' },
  { id: 'simulation', label: 'Step Simulation' },
  { id: 'failure', label: 'Failure Injection' },
  { id: 'trace', label: 'Trace Inspector' },
];

const INITIAL_TOPOLOGY: EditorTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 300, y: 40 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 300, y: 180 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 30, macAddress: '00:00:00:01:00:01' },
          { id: 'eth2', name: 'eth2', ipAddress: '172.17.0.1', prefixLength: 30, macAddress: '00:00:00:01:00:02' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '172.17.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },
          { destination: '0.0.0.0/0', nextHop: '172.17.0.2' },
        ],
      },
    },
    {
      id: 'router-2',
      type: 'router',
      position: { x: 140, y: 340 },
      data: {
        label: 'R-2',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 30, macAddress: '00:00:00:02:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
        ],
        staticRoutes: [
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '172.16.0.1' },
          { destination: '0.0.0.0/0', nextHop: '172.16.0.1' },
        ],
      },
    },
    {
      id: 'router-3',
      type: 'router',
      position: { x: 460, y: 340 },
      data: {
        label: 'R-3',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '172.17.0.2', prefixLength: 30, macAddress: '00:00:00:03:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.2', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
        ],
        staticRoutes: [
          { destination: '172.17.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '172.17.0.1' },
          { destination: '0.0.0.0/0', nextHop: '172.17.0.1' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 300, y: 500 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1' },
    { id: 'e2', source: 'router-1', target: 'router-2' },
    { id: 'e3', source: 'router-1', target: 'router-3' },
    { id: 'e4', source: 'router-2', target: 'server-1' },
    { id: 'e5', source: 'router-3', target: 'server-1' },
  ],
};

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 18px',
            background: activeTab === tab.id ? '#263144' : 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
            fontFamily: 'monospace',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(event) => {
            if (activeTab !== tab.id) {
              (event.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }
          }}
          onMouseLeave={(event) => {
            if (activeTab !== tab.id) {
              (event.currentTarget as HTMLButtonElement).style.color = '#64748b';
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function makePacket(topology: NetworkTopology): InFlightPacket | null {
  const client = topology.nodes.find((node) => node.data.role === 'client');
  const server = topology.nodes.find((node) => node.data.role === 'server');
  if (!client || !server) return null;

  const srcIp = (client.data.ip as string | undefined) ?? '0.0.0.0';
  const dstIp = (server.data.ip as string | undefined) ?? '0.0.0.0';

  return {
    id: `pkt-${Date.now()}`,
    srcNodeId: client.id,
    dstNodeId: server.id,
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
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
        },
      },
    },
    currentDeviceId: client.id,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

function toSimulationTopology(topology: EditorTopology): NetworkTopology {
  return {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: [],
    routeTables: new Map(),
  };
}

function EditorTab({
  topology,
  onChange,
}: {
  topology: EditorTopology;
  onChange: (nextTopology: EditorTopology) => void;
}) {
  return (
    <TopologyEditor
      initialTopology={topology}
      onTopologyChange={onChange}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function SimulationTabInner() {
  const { topology } = useNetlabContext();
  const { sendPacket, state } = useSimulation();

  useEffect(() => {
    if (state.status !== 'idle') return;
    const packet = makePacket(topology);
    if (!packet) return;
    void sendPacket(packet);
  }, [sendPacket, state.status, topology]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <ResizableSidebar
        defaultWidth={380}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <StepControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

function SimulationTab({ topology }: { topology: NetworkTopology }) {
  return (
    <NetlabProvider topology={topology}>
      <SimulationProvider>
        <SimulationTabInner />
      </SimulationProvider>
    </NetlabProvider>
  );
}

function FailureTabInner() {
  const { sendPacket } = useSimulation();
  const { topology } = useNetlabContext();
  const { failureState } = useFailure();

  const handleSend = () => {
    const packet = makePacket(topology);
    if (!packet) return;
    void sendPacket(packet);
  };

  const downCount =
    failureState.downNodeIds.size +
    failureState.downEdgeIds.size +
    failureState.downInterfaceIds.size;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleSend}
            style={{
              padding: '6px 14px',
              background: '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            Send Packet
          </button>
          {downCount > 0 && (
            <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>
              {downCount} failure{downCount > 1 ? 's' : ''} active
            </span>
          )}
        </div>
      </div>
      <ResizableSidebar
        defaultWidth={300}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <FailureTogglePanel />
        </div>
        <div style={{ height: 1, background: '#1e293b', flexShrink: 0 }} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <StepControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

function FailureTab({ topology }: { topology: NetworkTopology }) {
  return (
    <NetlabProvider topology={topology}>
      <FailureProvider>
        <SimulationProvider>
          <FailureTabInner />
        </SimulationProvider>
      </FailureProvider>
    </NetlabProvider>
  );
}

function TraceTabInner() {
  const { topology } = useNetlabContext();
  const { sendPacket, state } = useSimulation();

  useEffect(() => {
    if (state.status !== 'idle') return;
    const packet = makePacket(topology);
    if (!packet) return;
    void sendPacket(packet);
  }, [sendPacket, state.status, topology]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <ResizableSidebar
        defaultWidth={420}
        maxWidth={700}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 12,
            }}
          >
            <TraceSummary />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                background: 'var(--netlab-bg-panel)',
                border: '1px solid var(--netlab-border-subtle)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <PacketTimeline />
            </div>
            <div style={{ flex: 2, minHeight: 0 }}>
              <HopInspector />
            </div>
          </div>
          <SimulationControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

function TraceTab({ topology }: { topology: NetworkTopology }) {
  return (
    <NetlabProvider topology={topology}>
      <SimulationProvider>
        <TraceTabInner />
      </SimulationProvider>
    </NetlabProvider>
  );
}

export default function AllInOneDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('editor');
  const [topology, setTopology] = useState<EditorTopology>(INITIAL_TOPOLOGY);
  const simulationTopology = toSimulationTopology(topology);

  return (
    <DemoShell
      title="All-in-One"
      desc="Edit topology, run simulation, inject failures, and inspect traces in one place"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'editor' && (
            <EditorTab topology={topology} onChange={setTopology} />
          )}
          {activeTab === 'simulation' && (
            <SimulationTab key="simulation" topology={simulationTopology} />
          )}
          {activeTab === 'failure' && (
            <FailureTab key="failure" topology={simulationTopology} />
          )}
          {activeTab === 'trace' && (
            <TraceTab key="trace" topology={simulationTopology} />
          )}
        </div>
      </div>
    </DemoShell>
  );
}
