import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import { useNetlabUI } from '../../components/NetlabUIContext';

const SWITCH_STYLE: React.CSSProperties = {
  background: '#0d1f3c',
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
  background: '#60a5fa',
  border: '1px solid #1e40af',
};

function SwitchIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="13" width="32" height="14" rx="3" stroke="#60a5fa" strokeWidth="1.5" fill="#1e40af" fillOpacity="0.4" />
      <rect x="8"  y="22" width="4" height="3" rx="1" fill="#60a5fa" />
      <rect x="14" y="22" width="4" height="3" rx="1" fill="#60a5fa" />
      <rect x="20" y="22" width="4" height="3" rx="1" fill="#60a5fa" />
      <rect x="26" y="22" width="4" height="3" rx="1" fill="#60a5fa" />
      <circle cx="10" cy="17" r="2" fill="#4ade80" />
      <circle cx="16" cy="17" r="2" fill="#4ade80" />
      <circle cx="22" cy="17" r="2" fill="#fbbf24" />
      <circle cx="28" cy="17" r="2" fill="#475569" />
    </svg>
  );
}

export function SwitchNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div style={SWITCH_STYLE} onClick={() => setSelectedNodeId(id)}>
      <Handle type="source" position={Position.Top}    id="top"    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  id="right"  style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left}   id="left"   style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <SwitchIcon />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: '#e2e8f0' }}>{d.label}</div>
    </div>
  );
}
