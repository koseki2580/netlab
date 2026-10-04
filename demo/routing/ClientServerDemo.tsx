import { useState } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { AreaLegend } from '../../src/components/controls/AreaLegend';
import { RouteTablePanel } from '../../src/components/controls/RouteTable';
import { PacketViewerPanel } from '../../src/components/simulation/PacketViewer';
import { useViewport } from '../../src/utils/useViewport';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import type { NetworkTopology } from '../../src/types/topology';
import type { NetworkArea } from '../../src/types/areas';
import { encodeTopology, decodeTopology } from '../../src/utils/topology-url';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

// ────────────────────────────────────────────────
// Demo topology: Client → SW-1 → Router → SW-2 → Server
//   Private area: 10.0.0.0/24  (Client, SW-1)
//   Public area:  203.0.113.0/24 (SW-2, Server)
//   Router straddles both areas
// ────────────────────────────────────────────────

const AREAS: NetworkArea[] = [
  {
    id: 'private',
    name: 'Private Network',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: ['client-1', 'switch-1'],
    visualConfig: { x: 20, y: 40, width: 380, height: 340 },
  },
  {
    id: 'public',
    name: 'Public Network',
    type: 'public',
    subnet: '203.0.113.0/24',
    devices: ['switch-2', 'server-1'],
    visualConfig: { x: 620, y: 40, width: 380, height: 340 },
  },
];

const INITIAL_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 170 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
        areaId: 'private',
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 240, y: 170 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        areaId: 'private',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
        ],
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 440, y: 170 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:01',
          },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
        ],
      },
    },
    {
      id: 'switch-2',
      type: 'switch',
      position: { x: 640, y: 170 },
      data: {
        label: 'SW-2',
        role: 'switch',
        layerId: 'l2',
        areaId: 'public',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:03:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:03:00:01' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 840, y: 170 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
        areaId: 'public',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
    { id: 'e2', source: 'switch-1', target: 'router-1', type: 'smoothstep' },
    { id: 'e3', source: 'router-1', target: 'switch-2', type: 'smoothstep' },
    { id: 'e4', source: 'switch-2', target: 'server-1', type: 'smoothstep' },
  ],
  areas: AREAS,
  routeTables: new Map(),
};

export const CLIENT_SERVER_INITIAL_TOPOLOGY = INITIAL_TOPOLOGY;

/**
 * What this lesson is showing, in words. The page used to be a timeline and a
 * route table with no sentence at all, and learners answered the routing
 * question by piecing together the course and other lessons.
 */
function ClientServerBrief() {
  const t = useT();
  const { state } = useSimulation();
  const trace = state.traces[state.traces.length - 1];
  // The devices the packet passed, each once and in order; the router's own
  // address lookup (ARP) happens beside the path, not along it.
  const route: string[] = [];
  for (const hop of trace?.hops ?? []) {
    if (hop.event === 'arp-request' || hop.event === 'arp-reply') continue;
    if (route[route.length - 1] !== hop.nodeLabel) route.push(hop.nodeLabel);
  }
  return (
    <div
      data-testid="lesson-brief"
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--netlab-bg-surface)',
        fontSize: 13,
        lineHeight: 1.7,
        color: 'var(--netlab-text-primary)',
      }}
    >
      <div style={{ color: 'var(--netlab-text-secondary)', fontWeight: 700 }}>
        {t('Crossing a router', 'ルータを越える通信')}
      </div>
      <div
        data-testid="lesson-lead"
        style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, margin: '2px 0 6px' }}
      >
        {t(
          'To reach another network, a packet first goes to the router: the way out.',
          '別のネットワークへ送るときは、まず出口のルータに渡します。',
        )}
      </div>
      <div>
        {t(
          'The Client and the Server are on different networks. The Client cannot deliver directly, so it hands the packet to the router R-1 (10.0.0.1). That way out is called the default gateway.',
          'Client と Server は、別々のネットワークにいます。直接は届けられないので、出口のルータ R-1（10.0.0.1）に渡します。この出口を「デフォルトゲートウェイ」と呼びます。',
        )}
      </div>
      <div style={{ marginTop: 6 }}>
        {t(
          'R-1 picks the row of its route table (its list of destinations) that matches 203.0.113.10, and sends the packet out on that side.',
          'R-1 は経路表（行き先の一覧）から 203.0.113.10 に合う行を選び、その側へ送り出します。',
        )}
      </div>
      {trace?.status === 'delivered' ? (
        <div
          data-testid="client-server-result"
          style={{ marginTop: 8, fontWeight: 700, color: 'var(--netlab-accent-green)' }}
        >
          {t(
            `Delivered: ${route.join(' → ')}. The packet crossed the router R-1 and reached the Server on the other network.`,
            `届きました：${route.join(' → ')}。ルータ R-1 を越えて、別のネットワークの Server に着きました。`,
          )}
        </div>
      ) : null}
      {/* What the trace records: 64 on every row up to and including R-1's
          FWD row, 63 from the SW-2 row on. The text used to say "64 when it
          reaches R-1, 63 once it leaves", and R-1's own row shows 64. */}
      <div data-testid="client-server-ttl" style={{ marginTop: 6 }}>
        {t(
          'A packet carries a TTL, a lifetime count. Each router it passes takes one off, so a lost packet cannot circle forever. Press a row in the timeline to read it: still 64 on the R-1 row (FWD R-1), and 63 from the next row, SW-2, onward.',
          'パケットには TTL（寿命の数）があり、ルータを通るたびに 1 減ります。迷ったパケットが回り続けないためです。タイムラインの行を押すと読めます。R-1 の行（FWD R-1）ではまだ 64、次の SW-2 の行から 63 です。',
        )}
      </div>
    </div>
  );
}

export default function ClientServerDemo() {
  const topology = decodeTopology(window.location.search) ?? INITIAL_TOPOLOGY;
  const [copied, setCopied] = useState(false);
  const { isNarrow } = useViewport();

  const handleCopyLink = () => {
    const qs = encodeTopology(topology);
    const url = `${location.origin}${location.pathname}${qs}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <DemoShell
      title="Client–Server"
      desc="Send one packet from a client to a server on another network, and watch the router pass it on."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <div
              style={{
                padding: '4px 12px',
                background: 'var(--netlab-bg-surface)',
                borderBottom: '1px solid var(--netlab-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
                // The controls are wider than a phone; without this the ones
                // past the right edge could not be reached.
                ...(isNarrow ? { overflowX: 'auto' } : {}),
              }}
            >
              {/* SimulationControls owns Send Packet + Play/Pause/Step/Reset */}
              <SimulationControls />

              <div style={{ marginLeft: 'auto' }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '5px 14px',
                    background: copied ? '#16a34a' : 'var(--netlab-bg-elevated)',
                    color: copied ? '#fff' : 'var(--netlab-text-primary)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              </div>
            </div>

            {/* Main content */}
            <LessonSplit style={{ flex: 1, overflow: 'hidden' }}>
              {/* Canvas */}
              <LessonCanvas
                style={{ flex: 1, position: 'relative' }}
                canvas={
                  <>
                    <NetlabCanvas />
                    {!isNarrow && <SimulationOverlayDock showRouteTable />}
                    {!isNarrow && <AreaLegend />}
                  </>
                }
              />

              {/* Timeline panel */}
              <LessonPanel
                defaultWidth={380}
                style={{
                  background: 'var(--netlab-bg-primary)',
                  borderLeft: '1px solid var(--netlab-bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ClientServerBrief />
                {/* Over a phone-width canvas the route table and the legend
                    hid every device, so there they are read in the panel
                    instead. The legend places itself against the bottom of
                    its box, which is given the height of its two rows. */}
                {isNarrow && (
                  <div style={{ display: 'grid', gap: 12, padding: 12 }}>
                    <div style={{ position: 'relative', height: 96 }}>
                      <AreaLegend />
                    </div>
                    <RouteTablePanel />
                    <PacketViewerPanel />
                  </div>
                )}
                <PacketTimeline />
              </LessonPanel>
            </LessonSplit>
          </div>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
