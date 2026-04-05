import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import { useNetlabUI } from '../../components/NetlabUIContext';

const SERVER_STYLE: React.CSSProperties = {
  background: '#0a1f14',
  border: '2px solid #166534',
  borderRadius: 10,
  padding: '12px 8px',
  width: 80,
  textAlign: 'center',
  color: '#fff',
  fontSize: 11,
  fontFamily: 'monospace',
  cursor: 'pointer',
};

const HANDLE_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: '#4ade80',
  border: '1px solid #166534',
};

function ServerIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="6" width="30" height="28" rx="2" stroke="#4ade80" strokeWidth="1.5" fill="#1a3a2a" fillOpacity="0.5" />
      <line x1="5" y1="20" x2="35" y2="20" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.4" />
      <rect x="8"  y="9"  width="8" height="8" rx="1" fill="#0f172a" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.5" />
      <rect x="18" y="9"  width="8" height="8" rx="1" fill="#0f172a" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="31" cy="13" r="2.5" fill="#4ade80" />
      <rect x="8"  y="22" width="8" height="8" rx="1" fill="#0f172a" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.5" />
      <rect x="18" y="22" width="8" height="8" rx="1" fill="#0f172a" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="31" cy="26" r="2.5" fill="#fbbf24" />
    </svg>
  );
}

export function ServerNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div style={SERVER_STYLE} onClick={() => setSelectedNodeId(id)}>
      <Handle type="source" position={Position.Top}    id="top"    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  id="right"  style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left}   id="left"   style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <ServerIcon />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: '#e2e8f0' }}>{d.label}</div>
    </div>
  );
}
