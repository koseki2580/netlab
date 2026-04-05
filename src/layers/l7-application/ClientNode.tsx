import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import { useNetlabUI } from '../../components/NetlabUIContext';

const CLIENT_STYLE: React.CSSProperties = {
  background: '#0d1a2e',
  border: '2px solid #1e40af',
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
  background: '#7dd3fc',
  border: '1px solid #1e40af',
};

function ClientIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="7" width="24" height="16" rx="2" stroke="#7dd3fc" strokeWidth="1.5" fill="#1e3a5f" fillOpacity="0.5" />
      <rect x="11" y="10" width="18" height="10" rx="1" fill="#0f172a" />
      <line x1="13" y1="13" x2="24" y2="13" stroke="#7dd3fc" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="13" y1="16" x2="19" y2="16" stroke="#7dd3fc" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="8" y1="23" x2="32" y2="23" stroke="#7dd3fc" strokeWidth="1.5" />
      <path d="M6 23 Q6 31 9 31 H31 Q34 31 34 23 Z" stroke="#7dd3fc" strokeWidth="1.5" fill="#1e3a5f" fillOpacity="0.3" />
    </svg>
  );
}

export function ClientNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div style={CLIENT_STYLE} onClick={() => setSelectedNodeId(id)}>
      <Handle type="source" position={Position.Top}    id="top"    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  id="right"  style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left}   id="left"   style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <ClientIcon />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: '#e2e8f0' }}>{d.label}</div>
    </div>
  );
}
