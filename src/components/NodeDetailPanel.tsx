import { useEffect } from 'react';
import { useNetlabUI } from './NetlabUIContext';
import { useNetlabContext } from './NetlabContext';
import type { NetlabNodeData } from '../types/topology';
import type { RouterInterface } from '../types/routing';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: 12,
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(100, 116, 139, 0.4)',
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 260,
  maxHeight: 360,
  overflowY: 'auto',
  color: '#e2e8f0',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 200,
  pointerEvents: 'all',
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 3,
};

function RouterDetail({ data }: { data: NetlabNodeData }) {
  const ifaces = (data.interfaces ?? []) as RouterInterface[];
  return (
    <>
      {ifaces.length === 0 ? (
        <div style={{ color: '#64748b' }}>No interfaces</div>
      ) : (
        ifaces.map((iface) => (
          <div key={iface.id} style={{ marginBottom: 6 }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>{iface.name}</div>
            <div style={ROW_STYLE}>
              <span style={{ color: '#94a3b8', minWidth: 36 }}>IP</span>
              <span style={{ color: '#7dd3fc' }}>{iface.ipAddress}/{iface.prefixLength}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: '#94a3b8', minWidth: 36 }}>MAC</span>
              <span style={{ color: '#fbbf24' }}>{iface.macAddress}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function SwitchDetail({ data }: { data: NetlabNodeData }) {
  const ports = data.ports ?? [];
  return (
    <>
      {ports.length === 0 ? (
        <div style={{ color: '#64748b' }}>No ports</div>
      ) : (
        ports.map((port) => (
          <div key={port.id} style={{ marginBottom: 4 }}>
            <div style={ROW_STYLE}>
              <span style={{ color: '#94a3b8', minWidth: 36 }}>Port</span>
              <span style={{ color: '#60a5fa' }}>{port.name}</span>
            </div>
            <div style={ROW_STYLE}>
              <span style={{ color: '#94a3b8', minWidth: 36 }}>MAC</span>
              <span style={{ color: '#fbbf24' }}>{port.macAddress}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}

function HostDetail({ data }: { data: NetlabNodeData }) {
  return (
    <>
      {data.ip && (
        <div style={ROW_STYLE}>
          <span style={{ color: '#94a3b8', minWidth: 36 }}>IP</span>
          <span style={{ color: '#7dd3fc' }}>{data.ip}</span>
        </div>
      )}
      {data.mac && (
        <div style={ROW_STYLE}>
          <span style={{ color: '#94a3b8', minWidth: 36 }}>MAC</span>
          <span style={{ color: '#fbbf24' }}>{data.mac}</span>
        </div>
      )}
    </>
  );
}

export function NodeDetailPanel() {
  const { selectedNodeId, setSelectedNodeId } = useNetlabUI();
  const { topology } = useNetlabContext();

  useEffect(() => {
    if (!selectedNodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNodeId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, setSelectedNodeId]);

  if (!selectedNodeId) return null;

  const node = topology.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const d = node.data as NetlabNodeData;

  return (
    <div style={PANEL_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: 10, letterSpacing: 1 }}>
          NODE DETAIL
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: 13 }}>{d.label}</span>
        <span style={{ color: '#64748b', marginLeft: 8 }}>{d.role}</span>
        <span style={{ color: '#475569', marginLeft: 8 }}>{d.layerId}</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(100,116,139,0.2)', paddingTop: 8 }}>
        {d.role === 'router' && <RouterDetail data={d} />}
        {d.role === 'switch' && <SwitchDetail data={d} />}
        {(d.role === 'client' || d.role === 'server') && <HostDetail data={d} />}
      </div>
    </div>
  );
}
