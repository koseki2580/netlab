import { useEffect, useRef, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const INTERFACE_AWARE_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-a',
      type: 'client',
      position: { x: 80, y: 160 },
      data: {
        label: 'Client A',
        role: 'client',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 340, y: 240 },
      data: {
        label: 'R1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '192.168.1.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ],
        staticRoutes: [
          { destination: '192.168.1.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: 'direct' },
        ],
      },
    },
    {
      id: 'client-b',
      type: 'client',
      position: { x: 600, y: 320 },
      data: {
        label: 'Client B',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-a', target: 'router-1' },
    { id: 'e2', source: 'router-1', target: 'client-b' },
  ],
  areas: [],
  routeTables: new Map(),
};

const BTN: CSSProperties = {
  padding: '5px 12px',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'monospace',
  fontWeight: 'bold',
};

const BTN_PRIMARY: CSSProperties = {
  ...BTN,
  background: 'var(--netlab-accent-blue)',
  color: '#fff',
};

const BTN_SECONDARY: CSSProperties = {
  ...BTN,
  background: 'var(--netlab-border)',
  color: 'var(--netlab-text-primary)',
};

const BTN_DISABLED: CSSProperties = {
  ...BTN,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-faint)',
  cursor: 'not-allowed',
};

function buildPacket(
  topology: NetworkTopology,
  srcNodeId: string,
  dstNodeId: string,
): InFlightPacket | null {
  const srcNode = topology.nodes.find((node) => node.id === srcNodeId);
  const dstNode = topology.nodes.find((node) => node.id === dstNodeId);
  const srcIp = srcNode?.data.ip;
  const dstIp = dstNode?.data.ip;
  if (!srcNode || !dstNode || typeof srcIp !== 'string' || typeof dstIp !== 'string') {
    return null;
  }

  return {
    id: `pkt-${Date.now()}`,
    srcNodeId,
    dstNodeId,
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
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

function findFirstRouterHopIndex(
  topology: NetworkTopology,
  traces: PacketTrace[],
  traceId: string | null,
): number {
  if (!traceId) return -1;
  const trace = traces.find((item) => item.packetId === traceId);
  if (!trace) return -1;

  return trace.hops.findIndex((hop) => {
    const node = topology.nodes.find((candidate) => candidate.id === hop.nodeId);
    return node?.data.role === 'router';
  });
}

function InterfaceAwareDemoControls() {
  const { topology } = useNetlabContext();
  const { engine, state, sendPacket } = useSimulation();
  const didAutoSend = useRef(false);

  const selectRouterHop = () => {
    const nextState = engine.getState();
    const routerHopIndex = findFirstRouterHopIndex(
      topology,
      nextState.traces,
      nextState.currentTraceId,
    );
    if (routerHopIndex >= 0) {
      engine.selectHop(routerHopIndex);
    }
  };

  const sendBetween = async (srcNodeId: string, dstNodeId: string) => {
    const packet = buildPacket(topology, srcNodeId, dstNodeId);
    if (!packet) return;
    engine.reset();
    await sendPacket(packet);
    selectRouterHop();
  };

  useEffect(() => {
    if (didAutoSend.current || state.status !== 'idle') return;
    didAutoSend.current = true;
    void sendBetween('client-a', 'client-b');
  }, [state.status]);

  const resetDisabled = state.status === 'idle';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--netlab-bg-surface)',
        borderTop: '1px solid var(--netlab-border)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        onClick={() => void sendBetween('client-a', 'client-b')}
        style={BTN_PRIMARY}
      >
        Send A to B
      </button>
      <button
        type="button"
        onClick={() => void sendBetween('client-b', 'client-a')}
        style={BTN_SECONDARY}
      >
        Send B to A
      </button>
      <button
        type="button"
        onClick={() => engine.reset()}
        disabled={resetDisabled}
        style={resetDisabled ? BTN_DISABLED : BTN_SECONDARY}
      >
        Reset
      </button>

      <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, color: 'var(--netlab-text-muted)' }}>
        {state.status === 'idle' && 'Loading initial trace'}
        {state.status === 'paused' && state.currentStep === -1 && 'Router hop selected automatically for interface inspection'}
        {state.status === 'paused' && state.currentStep >= 0 && `Paused - hop ${state.currentStep + 1}`}
        {state.status === 'running' && `Running - hop ${state.currentStep + 1}`}
        {state.status === 'done' && 'Done'}
      </div>
    </div>
  );
}

function InterfaceAwareDemoInner() {
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

          <InterfaceAwareDemoControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function InterfaceAwareDemo() {
  return (
    <DemoShell
      title="Interface-Aware Forwarding"
      desc="Inspect which router interface is chosen for each direction of a two-subnet packet trace"
    >
      <NetlabProvider topology={INTERFACE_AWARE_TOPOLOGY}>
        <SimulationProvider>
          <InterfaceAwareDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
