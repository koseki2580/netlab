import { useEffect } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { StepControls } from '../../src/components/simulation/StepControls';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import type { NetworkTopology } from '../../src/types/topology';
import type { InFlightPacket } from '../../src/types/packets';
import DemoShell from '../DemoShell';

// ────────────────────────────────────────────────────────────────────────────
// 3-router topology:
//   client-1 (10.0.0.10)
//     → router-1 (eth0: 10.0.0.1/24, eth1: 172.16.0.1/30)
//     → router-2 (eth0: 172.16.0.2/30, eth1: 192.168.1.1/30)
//       [has both /24 specific and 0.0.0.0/0 default — LPM demo]
//     → router-3 (eth0: 192.168.1.2/30, eth1: 203.0.113.1/24)
//     → server-1 (203.0.113.10)
// ────────────────────────────────────────────────────────────────────────────

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 200 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 260, y: 200 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 30, macAddress: '00:00:00:01:00:01' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },
          { destination: '0.0.0.0/0', nextHop: '172.16.0.2' },
        ],
      },
    },
    {
      id: 'router-2',
      type: 'router',
      position: { x: 460, y: 200 },
      data: {
        label: 'R-2',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 30, macAddress: '00:00:00:02:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '192.168.1.1', prefixLength: 30, macAddress: '00:00:00:02:00:01' },
        ],
        staticRoutes: [
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '192.168.1.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '192.168.1.2' },
          { destination: '10.0.0.0/24', nextHop: '172.16.0.1' },
          { destination: '0.0.0.0/0', nextHop: '192.168.1.2' },
        ],
      },
    },
    {
      id: 'router-3',
      type: 'router',
      position: { x: 660, y: 200 },
      data: {
        label: 'R-3',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '192.168.1.2', prefixLength: 30, macAddress: '00:00:00:03:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
        ],
        staticRoutes: [
          { destination: '192.168.1.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '192.168.1.1' },
          { destination: '0.0.0.0/0', nextHop: '192.168.1.1' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 860, y: 200 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1' },
    { id: 'e2', source: 'router-1', target: 'router-2' },
    { id: 'e3', source: 'router-2', target: 'router-3' },
    { id: 'e4', source: 'router-3', target: 'server-1' },
  ],
  areas: [],
  routeTables: new Map(),
};

// ── Inner component that auto-sends a packet on mount ────────────────────────

function StepSimDemoInner() {
  const { sendPacket, state } = useSimulation();
  const { topology } = useNetlabContext();

  useEffect(() => {
    // Auto-load packet so user can start stepping immediately
    if (state.status === 'idle') {
      const client = topology.nodes.find((n) => n.data.role === 'client');
      const server = topology.nodes.find((n) => n.data.role === 'server');
      if (!client || !server) return;

      const srcIp = (client.data.ip as string | undefined) ?? '0.0.0.0';
      const dstIp = (server.data.ip as string | undefined) ?? '0.0.0.0';

      const packet: InFlightPacket = {
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

      void sendPacket(packet);
    }
  }, []); // run once on mount

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <NetlabCanvas />
      </div>
      {/* Step controls side panel */}
      <ResizableSidebar
        defaultWidth={480}
        maxWidth={700}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <StepControls />
          </div>
          <PacketStructureViewer />
        </div>
      </ResizableSidebar>
    </div>
  );
}

// ── Main demo export ─────────────────────────────────────────────────────────

export default function StepSimDemo() {
  return (
    <DemoShell
      title="Step-by-Step Simulation"
      desc="Trace routing decisions hop by hop — see LPM in action"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <StepSimDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
