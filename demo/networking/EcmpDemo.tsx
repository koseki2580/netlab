import { useMemo, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { RouteEntry } from '../../src/types/routing';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: '#082f49',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

function route(nodeId: string, destination: string, nextHop: string, metric = 0): RouteEntry {
  return {
    nodeId,
    destination,
    nextHop,
    metric,
    protocol: 'static',
    adminDistance: 1,
  };
}

function buildTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 40, y: 220 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'leaf-a',
        type: 'router',
        position: { x: 190, y: 220 },
        data: {
          label: 'Leaf A',
          role: 'router',
          layerId: 'l3',
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
              ipAddress: '10.0.12.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:01:01',
            },
            {
              id: 'eth2',
              name: 'eth2',
              ipAddress: '10.0.13.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:01:02',
            },
          ],
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.12.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.13.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: '10.0.12.2', metric: 10 },
            { destination: '10.0.4.0/24', nextHop: '10.0.13.2', metric: 10 },
          ],
        },
      },
      {
        id: 'spine-1',
        type: 'router',
        position: { x: 380, y: 120 },
        data: {
          label: 'Spine 1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.12.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:02:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.24.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:02:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.12.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.24.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: '10.0.24.2', metric: 10 },
            { destination: '10.0.0.0/24', nextHop: '10.0.12.1', metric: 10 },
          ],
        },
      },
      {
        id: 'spine-2',
        type: 'router',
        position: { x: 380, y: 320 },
        data: {
          label: 'Spine 2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.13.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:03:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.34.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:03:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.13.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.34.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: '10.0.34.2', metric: 10 },
            { destination: '10.0.0.0/24', nextHop: '10.0.13.1', metric: 10 },
          ],
        },
      },
      {
        id: 'leaf-b',
        type: 'router',
        position: { x: 570, y: 220 },
        data: {
          label: 'Leaf B',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.24.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:04:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.34.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:04:01',
            },
            {
              id: 'eth2',
              name: 'eth2',
              ipAddress: '10.0.4.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:04:02',
            },
          ],
          staticRoutes: [
            { destination: '10.0.24.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.34.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.0.0/24', nextHop: '10.0.24.1', metric: 10 },
            { destination: '10.0.0.0/24', nextHop: '10.0.34.1', metric: 10 },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 730, y: 220 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.4.10',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e-client-leaf-a', source: 'client-1', target: 'leaf-a' },
      { id: 'e-leaf-a-spine-1', source: 'leaf-a', target: 'spine-1' },
      { id: 'e-leaf-a-spine-2', source: 'leaf-a', target: 'spine-2' },
      { id: 'e-spine-1-leaf-b', source: 'spine-1', target: 'leaf-b' },
      { id: 'e-spine-2-leaf-b', source: 'spine-2', target: 'leaf-b' },
      { id: 'e-leaf-b-server', source: 'leaf-b', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'leaf-a',
        [
          route('leaf-a', '10.0.0.0/24', 'direct'),
          route('leaf-a', '10.0.12.0/30', 'direct'),
          route('leaf-a', '10.0.13.0/30', 'direct'),
          route('leaf-a', '10.0.4.0/24', '10.0.12.2', 10),
          route('leaf-a', '10.0.4.0/24', '10.0.13.2', 10),
        ],
      ],
    ]),
  };
}

function DemoInner() {
  const { sendPacket, state } = useSimulation();
  const ecmpHops = useMemo(
    () => state.traces.flatMap((trace) => trace.hops.filter((hop) => hop.ecmpTrace)),
    [state.traces],
  );

  const sendFlows = async () => {
    for (let index = 0; index < 8; index += 1) {
      const packet = buildUdpPacket({
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        srcIp: '10.0.0.10',
        dstIp: '10.0.4.10',
        srcPort: 49152 + index,
        dstPort: 443,
        srcMac: '02:00:00:00:00:10',
        dstMac: '02:00:00:00:00:20',
        timestamp: 1_000 + index,
        packetId: `ecmp-${index + 1}`,
        payload: { layer: 'raw', data: `flow-${index + 1}` },
      });
      await sendPacket(packet);
    }
  };

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', height: '100%' }}>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <aside
        aria-label="ECMP controls"
        style={{
          borderLeft: '1px solid var(--netlab-border-subtle)',
          background: 'var(--netlab-bg-panel)',
          color: 'var(--netlab-text-primary)',
          overflow: 'auto',
          padding: 14,
        }}
      >
        <button type="button" onClick={sendFlows} style={BUTTON_STYLE}>
          Send ECMP flows
        </button>
        <section aria-label="ECMP decisions" style={{ marginTop: 12 }}>
          <h2
            style={{
              fontSize: 12,
              letterSpacing: 1,
              margin: '0 0 8px',
              textTransform: 'uppercase',
            }}
          >
            ECMP Decisions
          </h2>
          {ecmpHops.length === 0 ? (
            <p style={{ color: 'var(--netlab-text-secondary)', margin: 0 }}>
              No ECMP flow sent yet.
            </p>
          ) : (
            <ul style={{ display: 'grid', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
              {ecmpHops.map((hop, index) => (
                <li key={`${hop.step}-${index}`}>
                  bucket {(hop.ecmpTrace?.bucket ?? 0) + 1}/{hop.ecmpTrace?.candidateCount} via{' '}
                  {hop.ecmpTrace?.chosen.nextHop}
                </li>
              ))}
            </ul>
          )}
        </section>
        <div style={{ marginTop: 14 }}>
          <TraceSummary />
          <PacketTimeline />
        </div>
      </aside>
    </main>
  );
}

export default function EcmpDemo() {
  const topology = useMemo(() => buildTopology(), []);

  return (
    <DemoShell
      title="ECMP Multipath"
      desc="Equal-cost static routes hash UDP flows across two spine paths while each flow stays on one bucket."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
