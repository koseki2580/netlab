import { useMemo, useState, type CSSProperties } from 'react';
import { LinkDetailPanel } from '../../src/components/LinkDetailPanel';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { LinkQosConfig } from '../../src/types/link';
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

function route(nodeId: string, destination: string, nextHop: string, metric = 0) {
  return {
    nodeId,
    destination,
    nextHop,
    metric,
    protocol: 'static' as const,
    adminDistance: 1,
  };
}

function buildTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 60, y: 220 },
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
        position: { x: 220, y: 220 },
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
            { destination: '10.0.4.0/24', nextHop: '10.0.1.2', metric: 10 },
          ],
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 380, y: 220 },
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
              prefixLength: 30,
              macAddress: '02:00:00:00:02:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.2.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.0.0/24', nextHop: '10.0.1.1', metric: 10 },
            { destination: '10.0.4.0/24', nextHop: '10.0.2.2', metric: 10 },
          ],
        },
      },
      {
        id: 'r3',
        type: 'router',
        position: { x: 540, y: 220 },
        data: {
          label: 'R3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.2.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:03:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.4.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:03:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.2.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.0.0/24', nextHop: '10.0.2.1', metric: 10 },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 700, y: 220 },
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
      { id: 'e-client-r1', source: 'client-1', target: 'r1' },
      { id: 'e-r1-r2', source: 'r1', target: 'r2' },
      {
        id: 'e-r2-r3',
        source: 'r2',
        target: 'r3',
        data: {
          link: {
            bandwidthBps: 1_000_000,
            propagationDelayMs: 20,
            lossPct: 5,
            queueDepthSegments: 100,
            lossSeed: 42,
          },
        },
      },
      { id: 'e-r3-server', source: 'r3', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          route('r1', '10.0.0.0/24', 'direct'),
          route('r1', '10.0.1.0/30', 'direct'),
          route('r1', '10.0.4.0/24', '10.0.1.2', 10),
        ],
      ],
      [
        'r2',
        [
          route('r2', '10.0.1.0/30', 'direct'),
          route('r2', '10.0.2.0/30', 'direct'),
          route('r2', '10.0.0.0/24', '10.0.1.1', 10),
          route('r2', '10.0.4.0/24', '10.0.2.2', 10),
        ],
      ],
      [
        'r3',
        [
          route('r3', '10.0.2.0/30', 'direct'),
          route('r3', '10.0.4.0/24', 'direct'),
          route('r3', '10.0.0.0/24', '10.0.2.1', 10),
        ],
      ],
    ]),
  };
}

function updateQos(topology: NetworkTopology, link: LinkQosConfig): NetworkTopology {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === 'e-r2-r3'
        ? {
            ...edge,
            data: {
              ...(edge.data ?? {}),
              link,
            },
          }
        : edge,
    ),
  };
}

function DemoInner({
  topology,
  onQosChange,
}: {
  readonly topology: NetworkTopology;
  readonly onQosChange: (link: LinkQosConfig) => void;
}) {
  const { sendPacket, state } = useSimulation();
  const edge = useMemo(
    () => topology.edges.find((candidate) => candidate.id === 'e-r2-r3') ?? topology.edges[0],
    [topology.edges],
  );

  const sendBurst = async () => {
    const packet = buildUdpPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp: '10.0.0.10',
      dstIp: '10.0.4.10',
      srcPort: 49200,
      dstPort: 7777,
      srcMac: '02:00:00:00:00:10',
      dstMac: '02:00:00:00:00:20',
      payload: { layer: 'raw', data: 'x'.repeat(1472) },
    });
    await sendPacket({
      ...packet,
      id: `link-qos-${state.traces.length + 1}`,
      frame: {
        ...packet.frame,
        payload: {
          ...packet.frame.payload,
          totalLength: 1500,
        },
      },
    });
  };

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', height: '100%' }}>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <aside
        aria-label="Link QoS controls"
        style={{
          borderLeft: '1px solid var(--netlab-border-subtle)',
          background: 'var(--netlab-bg-panel)',
          color: 'var(--netlab-text-primary)',
          overflow: 'auto',
          padding: 14,
        }}
      >
        <button type="button" data-testid="link-qos-burst" onClick={sendBurst} style={BUTTON_STYLE}>
          Send QoS burst
        </button>
        {edge && <LinkDetailPanel edge={edge} onQosChange={onQosChange} />}
        <div style={{ marginTop: 14 }}>
          <TraceSummary />
          <PacketTimeline />
        </div>
      </aside>
    </main>
  );
}

export default function LinkQosDemo() {
  const [topology, setTopology] = useState(() => buildTopology());

  return (
    <DemoShell
      title="Per-Link QoS"
      desc="Bandwidth, propagation delay, seeded loss, and drop-tail queue annotations on one bottleneck link."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner
            topology={topology}
            onQosChange={(link) => setTopology(updateQos(topology, link))}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
