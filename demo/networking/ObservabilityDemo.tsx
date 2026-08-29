import { useMemo, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { FlowCollectorPanel } from '../../src/components/observability/FlowCollectorPanel';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

function buildTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 70, y: 220 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 270, y: 220 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          netflow: { enabled: true, inactiveTimeoutMs: 15_000 },
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:01:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:01:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct', metric: 0 },
            { destination: '203.0.113.0/24', nextHop: 'direct', metric: 0 },
          ],
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 480, y: 220 },
        data: {
          label: 'SW1',
          role: 'switch',
          layerId: 'l2',
          sflow: { enabled: true, rate: 1 },
          ports: [
            { id: 'p0', name: 'p0', macAddress: '02:00:00:00:02:00' },
            { id: 'p1', name: 'p1', macAddress: '02:00:00:00:02:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 690, y: 220 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e-client-r1', source: 'client-1', target: 'router-1' },
      { id: 'e-r1-sw1', source: 'router-1', target: 'switch-1' },
      { id: 'e-sw1-server', source: 'switch-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map([
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
            destination: '203.0.113.0/24',
            nextHop: 'direct',
            metric: 0,
            protocol: 'static',
            adminDistance: 1,
            nodeId: 'router-1',
          },
        ],
      ],
    ]),
  };
}

function DemoInner() {
  const { sendPacket, state } = useSimulation();

  const sendObservedFlow = async () => {
    await sendPacket(
      buildUdpPacket({
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        srcIp: '10.0.0.10',
        dstIp: '203.0.113.10',
        srcPort: 53000,
        dstPort: 53,
        srcMac: '02:00:00:00:00:10',
        dstMac: '02:00:00:00:00:20',
        packetId: 'observability-udp',
        timestamp: 3_000,
        payload: { layer: 'raw', data: 'dns query' },
      }),
    );
  };

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 430px', height: '100%' }}>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <aside
        aria-label="Observability controls"
        style={{
          borderLeft: '1px solid var(--netlab-border-subtle)',
          background: 'var(--netlab-bg-panel)',
          color: 'var(--netlab-text-primary)',
          overflow: 'auto',
          padding: 14,
        }}
      >
        <button
          type="button"
          data-testid="observability-send-flow"
          onClick={sendObservedFlow}
          style={BUTTON_STYLE}
        >
          Send observed flow
        </button>
        <div style={{ marginTop: 14 }}>
          <FlowCollectorPanel traces={state.traces} />
        </div>
        <div style={{ marginTop: 14 }}>
          <PacketTimeline />
        </div>
      </aside>
    </main>
  );
}

export default function ObservabilityDemo() {
  const topology = useMemo(() => buildTopology(), []);

  return (
    <DemoShell
      title="Flow Observability"
      desc="Watch router NetFlow updates and deterministic switch sFlow samples alongside packet traces."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
