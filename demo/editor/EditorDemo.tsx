import { useState } from 'react';
import { TopologyEditor } from '../../src/editor/components/TopologyEditor';
import { encodeTopology, decodeTopology } from '../../src/utils/topology-url';
import type { EditorTopology } from '../../src/editor/types';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

// ─── Example starting topology ────────────────────────────────────────────

const EXAMPLE_TOPOLOGY: EditorTopology = {
  nodes: [
    {
      id: 'router-1',
      type: 'router',
      position: { x: 380, y: 160 },
      data: {
        label: 'R-1',
        layerId: 'l3',
        role: 'router',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '02:00:aa:bb:cc:01' },
          { id: 'eth1', name: 'eth1', ipAddress: '10.0.1.1', prefixLength: 24, macAddress: '02:00:aa:bb:cc:02' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '10.0.1.0/24', nextHop: 'direct' },
        ],
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 160, y: 160 },
      data: {
        label: 'SW-1',
        layerId: 'l2',
        role: 'switch',
        ports: [
          { id: 'sw1-p0', name: 'fa0/0', macAddress: '02:00:11:22:33:00' },
          { id: 'sw1-p1', name: 'fa0/1', macAddress: '02:00:11:22:33:01' },
        ],
      },
    },
    {
      id: 'client-1',
      type: 'client',
      position: { x: 40, y: 100 },
      data: { label: 'Client-1', layerId: 'l7', role: 'client', ip: '10.0.0.10' },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 560, y: 100 },
      data: { label: 'Server-1', layerId: 'l7', role: 'server', ip: '10.0.1.10' },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
    { id: 'e2', source: 'switch-1', target: 'router-1', type: 'smoothstep' },
    { id: 'e3', source: 'router-1', target: 'server-1', type: 'smoothstep' },
  ],
};

function loadInitialTopology(): EditorTopology {
  const decoded = decodeTopology(window.location.search) as NetworkTopology | null;
  if (decoded) return { nodes: decoded.nodes, edges: decoded.edges };
  return EXAMPLE_TOPOLOGY;
}

// ─── Demo ─────────────────────────────────────────────────────────────────

export default function EditorDemo() {
  const [topology, setTopology] = useState<EditorTopology>(loadInitialTopology);
  const [copied, setCopied] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);

  const handleCopyLink = () => {
    const qs = encodeTopology({ ...topology, areas: [] });
    const url = `${location.origin}${location.pathname}${qs}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <DemoShell
      title="Topology Editor"
      desc="Build and edit network topologies interactively"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Action bar */}
        <div
          style={{
            padding: '6px 14px',
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#64748b',
          }}
        >
          <span>
            {topology.nodes.length} nodes · {topology.edges.length} edges
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setJsonOpen((o) => !o)}
            style={{
              padding: '3px 10px',
              background: jsonOpen ? '#1e3a5f' : '#1e293b',
              color: jsonOpen ? '#7dd3fc' : '#94a3b8',
              border: `1px solid ${jsonOpen ? '#2563eb' : '#334155'}`,
              borderRadius: 5,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {jsonOpen ? '✕ Hide JSON' : '{ } View JSON'}
          </button>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '3px 10px',
              background: copied ? '#14532d' : '#1e293b',
              color: copied ? '#4ade80' : '#94a3b8',
              border: `1px solid ${copied ? '#16a34a' : '#334155'}`,
              borderRadius: 5,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>

        {/* Main area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TopologyEditor
              initialTopology={topology}
              onTopologyChange={setTopology}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* JSON panel */}
          {jsonOpen && (
            <div
              style={{
                width: 300,
                background: '#0f172a',
                borderLeft: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #1e293b',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  fontWeight: 'bold',
                  letterSpacing: 1,
                }}
              >
                TOPOLOGY JSON
              </div>
              <pre
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  margin: 0,
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  color: '#64748b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {JSON.stringify(topology, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </DemoShell>
  );
}
