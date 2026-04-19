import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import type { NetworkTopology, TopologySnapshot } from '../../src/types/topology';
import { decodeTopology, encodeTopology } from '../../src/utils/topology-url';
import DemoShell from '../DemoShell';
import { STEP_SIM_TOPOLOGY } from '../simulation/stepSimShared';

const INITIAL_TOPOLOGY: NetworkTopology = {
  nodes: STEP_SIM_TOPOLOGY.nodes,
  edges: STEP_SIM_TOPOLOGY.edges,
  areas: STEP_SIM_TOPOLOGY.areas,
  routeTables: new Map(),
};

export const CONTROLLED_TOPOLOGY_INITIAL_TOPOLOGY = INITIAL_TOPOLOGY;

function formatSnapshot(snapshot: TopologySnapshot): string {
  return JSON.stringify(
    {
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      snapshot,
    },
    null,
    2,
  );
}

export function ControlledTopologyDemo() {
  const [topology, setTopology] = useState<NetworkTopology>(INITIAL_TOPOLOGY);
  const [encodedSearch, setEncodedSearch] = useState(() => encodeTopology(INITIAL_TOPOLOGY));
  const [status, setStatus] = useState(
    'Drag nodes, connect links, or delete edges to update the snapshot.',
  );

  const snapshot: TopologySnapshot = {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };

  const handleTopologyChange = (nextSnapshot: TopologySnapshot) => {
    setTopology((prev) => ({ ...prev, ...nextSnapshot }));
    setStatus('Topology updated from canvas interaction.');
  };

  const handleEncode = () => {
    const nextSearch = encodeTopology(snapshot);
    setEncodedSearch(nextSearch);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    );
    setStatus('Current topology encoded into window.location.search.');
  };

  const handleRestore = () => {
    const restored = decodeTopology(window.location.search);
    if (!restored) {
      setStatus('No valid topology found in the current URL.');
      return;
    }

    setTopology(restored);
    setEncodedSearch(window.location.search || encodeTopology(restored));
    setStatus('Topology restored from the current URL.');
  };

  return (
    <DemoShell
      title="Controlled Topology"
      desc="Parent-owned topology state with live JSON and URL serialization"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          height: '100%',
          padding: 16,
          boxSizing: 'border-box',
          background: '#020617',
        }}
      >
        <div
          style={{
            flex: '1 1 640px',
            minHeight: 420,
            border: '1px solid #1e293b',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#0f172a',
          }}
        >
          <NetlabProvider topology={topology}>
            <NetlabCanvas onTopologyChange={handleTopologyChange} />
          </NetlabProvider>
        </div>

        <aside
          tabIndex={0}
          style={{
            flex: '0 1 380px',
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            border: '1px solid #1e293b',
            borderRadius: 12,
            background: '#111827',
            color: '#e5e7eb',
            fontFamily: 'monospace',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1, color: '#93c5fd', marginBottom: 6 }}>
              TOPOLOGY STATE (JSON)
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{status}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleEncode}
              style={{
                border: '1px solid #2563eb',
                borderRadius: 8,
                padding: '8px 12px',
                background: '#1d4ed8',
                color: '#eff6ff',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Encode to URL
            </button>
            <button
              onClick={handleRestore}
              style={{
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                background: '#0f172a',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Restore from URL
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
            <div>Nodes: {snapshot.nodes.length}</div>
            <div>Edges: {snapshot.edges.length}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>URL Query</div>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #1e293b',
                background: '#020617',
                color: '#7dd3fc',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {encodedSearch}
            </pre>
          </div>

          <pre
            style={{
              margin: 0,
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #1e293b',
              background: '#020617',
              color: '#cbd5e1',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {formatSnapshot(snapshot)}
          </pre>
        </aside>
      </div>
    </DemoShell>
  );
}

export default ControlledTopologyDemo;
