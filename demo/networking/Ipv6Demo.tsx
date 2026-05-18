import { useMemo, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
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

function route(nodeId: string, destination: string, nextHop: string): RouteEntry {
  return {
    nodeId,
    destination,
    nextHop,
    metric: 0,
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
        position: { x: 80, y: 180 },
        data: {
          label: 'Dual-stack Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.1.10',
          ipv6: '2001:db8:1::10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 310, y: 180 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:1::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:2::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/24', nextHop: 'direct' },
            { destination: '10.0.2.0/24', nextHop: 'direct' },
          ],
          staticRoutes6: [
            { destination: '2001:db8:1::/64', nextHop: 'direct' },
            { destination: '2001:db8:2::/64', nextHop: 'direct' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 540, y: 180 },
        data: {
          label: 'Dual-stack Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.2.20',
          ipv6: '2001:db8:2::20',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e-client-r1', source: 'client-1', target: 'router-1' },
      { id: 'e-r1-server', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'router-1',
        [
          route('router-1', '10.0.1.0/24', 'direct'),
          route('router-1', '10.0.2.0/24', 'direct'),
          route('router-1', '2001:db8:1::/64', 'direct'),
          route('router-1', '2001:db8:2::/64', 'direct'),
        ],
      ],
    ]),
  };
}

function DemoInner() {
  const { engine, state } = useSimulation();
  const ipv6Hops = useMemo(
    () => state.traces.flatMap((trace) => trace.hops.filter((hop) => hop.protocol === 'ICMPv6')),
    [state.traces],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 360px',
        gap: 16,
        minHeight: 620,
      }}
    >
      <section style={{ minHeight: 560, border: '1px solid var(--netlab-border-subtle)' }}>
        <NetlabCanvas style={{ height: 560 }} />
      </section>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          type="button"
          data-testid="ipv6-send-echo"
          style={BUTTON_STYLE}
          onClick={() => void engine.ping('client-1', '2001:db8:2::20')}
        >
          Send IPv6 Echo
        </button>
        <TraceSummary />
        <div
          data-testid="demo-trace-log"
          style={{
            border: '1px solid var(--netlab-border-subtle)',
            borderRadius: 8,
            padding: 10,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          <div style={{ color: 'var(--netlab-text-secondary)', marginBottom: 6 }}>ICMPv6 hops</div>
          <div style={{ color: 'var(--netlab-text-muted)', marginBottom: 8 }}>
            2001:db8:1::10 to 2001:db8:2::20
          </div>
          {ipv6Hops.length === 0 ? (
            <div style={{ color: 'var(--netlab-text-muted)' }}>No IPv6 trace yet</div>
          ) : (
            ipv6Hops.map((hop) => (
              <div key={`${hop.step}-${hop.nodeId}`} style={{ marginBottom: 4 }}>
                {hop.step}: {hop.nodeLabel} {hop.event}
              </div>
            ))
          )}
        </div>
        <PacketTimeline />
      </aside>
    </div>
  );
}

export default function Ipv6Demo() {
  const topology = useMemo(() => buildTopology(), []);

  return (
    <DemoShell
      title="IPv6 Dual-Stack"
      desc="Send ICMPv6 echo across static dual-stack routes and inspect IPv6 trace hops."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
