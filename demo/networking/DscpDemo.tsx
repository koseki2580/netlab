import { useMemo, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
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
        id: 'r1',
        type: 'router',
        position: { x: 260, y: 220 },
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
              macAddress: '02:00:00:00:01:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.1.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:01:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.1.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.2.0/24', nextHop: '10.0.1.2', metric: 10 },
          ],
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 470, y: 220 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:02:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:02:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.2.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.0.0/24', nextHop: '10.0.1.1', metric: 10 },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 680, y: 220 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.2.10',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e-client-r1', source: 'client-1', target: 'r1' },
      {
        id: 'e-r1-r2',
        source: 'r1',
        target: 'r2',
        data: {
          link: {
            bandwidthBps: 1_000_000,
            propagationDelayMs: 10,
            shaper: {
              classes: [
                { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
                { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
              ],
            },
          },
        },
      },
      { id: 'e-r2-server', source: 'r2', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

function DemoInner() {
  const { sendPacket, state } = useSimulation();
  const shaperHops = useMemo(
    () => state.traces.flatMap((trace) => trace.hops.filter((hop) => hop.shaperTrace)),
    [state.traces],
  );

  const sendShapedPackets = async () => {
    for (const [index, dscp] of [0, 46].entries()) {
      const packet = buildUdpPacket({
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        srcIp: '10.0.0.10',
        dstIp: '10.0.2.10',
        srcPort: 50000 + index,
        dstPort: 5004,
        srcMac: '02:00:00:00:00:10',
        dstMac: '02:00:00:00:00:20',
        timestamp: 2_000 + index,
        packetId: `dscp-${dscp}`,
        payload: { layer: 'raw', data: dscp === 46 ? 'voice' : 'bulk' },
      });

      await sendPacket({
        ...packet,
        frame: {
          ...packet.frame,
          payload: {
            ...packet.frame.payload,
            dscp,
          },
        },
      });
    }
  };

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', height: '100%' }}>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <aside
        aria-label="DSCP controls"
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
          data-testid="dscp-send"
          onClick={sendShapedPackets}
          style={BUTTON_STYLE}
        >
          Send shaped packets
        </button>
        <section
          aria-label="Shaper decisions"
          data-testid="demo-trace-log"
          style={{ marginTop: 12 }}
        >
          <h2
            style={{
              fontSize: 12,
              letterSpacing: 1,
              margin: '0 0 8px',
              textTransform: 'uppercase',
            }}
          >
            Shaper Decisions
          </h2>
          {shaperHops.length === 0 ? (
            <p style={{ color: 'var(--netlab-text-secondary)', margin: 0 }}>
              No shaped packet yet.
            </p>
          ) : (
            <ul style={{ display: 'grid', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
              {shaperHops.map((hop, index) => (
                <li key={`${hop.step}-${index}`}>
                  {hop.action} {hop.shaperTrace?.classId} dscp {hop.shaperTrace?.dscp}
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

export default function DscpDemo() {
  const topology = useMemo(() => buildTopology(), []);

  return (
    <DemoShell
      title="DSCP Shaping"
      desc="Classify best-effort and EF-marked packets into per-link DRR queues and inspect shaper annotations."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
