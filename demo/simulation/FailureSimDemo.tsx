import { useEffect } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { FailureProvider, useFailure } from '../../src/simulation/FailureContext';
import { StepControls } from '../../src/components/simulation/StepControls';
import { FailureTogglePanel } from '../../src/components/simulation/FailureTogglePanel';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import type { NetworkTopology } from '../../src/types/topology';
import type { InFlightPacket } from '../../src/types/packets';
import DemoShell from '../DemoShell';

// ────────────────────────────────────────────────────────────────────────────
// Diamond topology with primary and backup paths:
//
//   client-1 (10.0.0.10)
//       | e1
//   router-1 (eth0: 10.0.0.1/24, eth1: 172.16.0.1/30, eth2: 172.17.0.1/30)
//       | e2 (primary)        | e3 (backup)
//   router-2                router-3
//   (eth0: 172.16.0.2/30)   (eth0: 172.17.0.2/30)
//   (eth1: 203.0.113.1/24)  (eth1: 203.0.113.2/24)
//       | e4                  | e5
//              server-1 (203.0.113.10)
//
// Route tables:
//   R-1: 203.0.113.0/24 via 172.16.0.2 (primary, metric=1)
//        0.0.0.0/0        via 172.17.0.2 (fallback, metric=5)
//   R-2: 203.0.113.0/24 direct
//   R-3: 203.0.113.0/24 direct
//
// Toggle e2 down → R-1 can no longer reach R-2 → no-route drop at R-1
// Toggle R-2 down → packet arrives at R-2 but drops with node-down
// ────────────────────────────────────────────────────────────────────────────

const TOPOLOGY: NetworkTopology = {
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
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1',    prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1',  prefixLength: 30, macAddress: '00:00:00:01:00:01' },
          { id: 'eth2', name: 'eth2', ipAddress: '172.17.0.1',  prefixLength: 30, macAddress: '00:00:00:01:00:02' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24',    nextHop: 'direct' },
          { destination: '172.16.0.0/30',  nextHop: 'direct' },
          { destination: '172.17.0.0/30',  nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },  // primary via R-2
          { destination: '0.0.0.0/0',      nextHop: '172.17.0.2' },  // fallback via R-3
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
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2',  prefixLength: 30, macAddress: '00:00:00:02:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
        ],
        staticRoutes: [
          { destination: '172.16.0.0/30',  nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24',    nextHop: '172.16.0.1' },
          { destination: '0.0.0.0/0',      nextHop: '172.16.0.1' },
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
          { id: 'eth0', name: 'eth0', ipAddress: '172.17.0.2',  prefixLength: 30, macAddress: '00:00:00:03:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.2', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
        ],
        staticRoutes: [
          { destination: '172.17.0.0/30',  nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24',    nextHop: '172.17.0.1' },
          { destination: '0.0.0.0/0',      nextHop: '172.17.0.1' },
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
  areas: [],
  routeTables: new Map(),
};

// ── Helper to build a packet ─────────────────────────────────────────────────

function makePacket(srcNodeId: string, dstNodeId: string, srcIp: string, dstIp: string): InFlightPacket {
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

// ── Inner component ──────────────────────────────────────────────────────────

function FailureSimDemoInner() {
  const { sendPacket, state, animationSpeed, setAnimationSpeed } = useSimulation();
  const { topology } = useNetlabContext();
  const { failureState } = useFailure();

  useEffect(() => {
    if (state.status !== 'idle') return;
    const client = topology.nodes.find((n) => n.data.role === 'client');
    const server = topology.nodes.find((n) => n.data.role === 'server');
    if (!client || !server) return;
    const srcIp = (client.data.ip as string | undefined) ?? '0.0.0.0';
    const dstIp = (server.data.ip as string | undefined) ?? '0.0.0.0';
    void sendPacket(makePacket(client.id, server.id, srcIp, dstIp));
  }, []);

  const downCount =
    failureState.downNodeIds.size +
    failureState.downEdgeIds.size +
    failureState.downInterfaceIds.size;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <NetlabCanvas />
        {downCount > 0 && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>
              {downCount} failure{downCount > 1 ? 's' : ''} active
            </span>
          </div>
        )}
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
        <div style={{ flex: 1, overflow: 'hidden', padding: 12 }}>
          <FailureTogglePanel />
        </div>

        <div style={{ height: 1, background: '#1e293b', flexShrink: 0 }} />

        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>
          <label style={{ display: 'block', fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
            SPEED: {animationSpeed}ms
          </label>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={animationSpeed}
            onChange={(event) => setAnimationSpeed(Number(event.target.value))}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <StepControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function FailureSimDemo() {
  return (
    <DemoShell
      title="Failure Injection"
      desc="Toggle failures and watch packets recompute, reroute, or drop"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <FailureProvider>
          <SimulationProvider autoRecompute>
            <FailureSimDemoInner />
          </SimulationProvider>
        </FailureProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
