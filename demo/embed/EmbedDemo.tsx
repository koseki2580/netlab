import { NetlabApp } from '../../src/components/NetlabApp';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

// Simple 3-node topology: Client → Router → Server
const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 80, y: 160 },
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
      position: { x: 340, y: 160 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '192.168.1.1', prefixLength: 24, macAddress: '00:00:00:01:00:01' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '192.168.1.0/24', nextHop: 'direct' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 600, y: 160 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1', type: 'smoothstep' },
    { id: 'e2', source: 'router-1', target: 'server-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

const PROSE_STYLE: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 13,
  color: '#94a3b8',
  lineHeight: 1.6,
};

const CODE_STYLE: React.CSSProperties = {
  display: 'block',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '10px 14px',
  fontSize: 12,
  color: '#7dd3fc',
  whiteSpace: 'pre',
  overflowX: 'auto',
};

export default function EmbedDemo() {
  return (
    <DemoShell title="Embed" desc="NetlabApp embedded inside a host page">
      <div
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          background: '#0f172a',
        }}
      >
        {/* Host page header */}
        <div style={PROSE_STYLE}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
            My Network Documentation
          </div>
          <div style={{ color: '#64748b' }}>
            The component below is a live <code style={{ color: '#7dd3fc' }}>NetlabApp</code> embed
            — width: 100%, height: 480px. It lives inside this prose layout and does not overflow.
          </div>
        </div>

        {/* ── THE EMBED ─────────────────────────────────────────────────────── */}
        <NetlabApp
          topology={TOPOLOGY}
          width="100%"
          height={480}
          simulation
          style={{ borderRadius: 8, border: '1px solid #334155' }}
        />
        {/* ──────────────────────────────────────────────────────────────────── */}

        {/* Usage example */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...PROSE_STYLE, color: '#64748b' }}>
            The embed above is produced by the following JSX. Copy it into any React page:
          </div>
          <code style={CODE_STYLE}>{`import { NetlabApp } from 'netlab';

<NetlabApp
  topology={topology}
  width="100%"
  height={480}
  simulation
  style={{ borderRadius: 8, border: '1px solid #334155' }}
/>`}</code>
        </div>

        {/* Static variant */}
        <div style={{ ...PROSE_STYLE, color: '#64748b' }}>
          Static view (no simulation controls) — width: 100%, height: 260px:
        </div>
        <NetlabApp
          topology={TOPOLOGY}
          width="100%"
          height={260}
          style={{ borderRadius: 8, border: '1px solid #334155' }}
        />

        {/* Host page footer */}
        <div style={{ ...PROSE_STYLE, color: '#475569', fontSize: 12 }}>
          Both components are fully contained — they do not use viewport height and can be placed
          anywhere in a document.
        </div>
      </div>
    </DemoShell>
  );
}
