import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import { useNetlabUI } from '../../components/NetlabUIContext';

const SWITCH_STYLE: React.CSSProperties = {
  background: 'var(--netlab-node-switch-bg)',
  border: '2px solid var(--netlab-accent-blue)',
  borderRadius: 10,
  padding: '12px 8px',
  width: 80,
  textAlign: 'center',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  cursor: 'pointer',
};

const HANDLE_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: 'var(--netlab-accent-blue)',
  border: '1px solid var(--netlab-accent-blue)',
};

function SwitchIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="4"
        y="13"
        width="32"
        height="14"
        rx="3"
        style={{ stroke: 'var(--netlab-accent-blue)', fill: 'var(--netlab-accent-blue)' }}
        strokeWidth="1.5"
        fillOpacity="0.2"
      />
      <rect
        x="8"
        y="22"
        width="4"
        height="3"
        rx="1"
        style={{ fill: 'var(--netlab-accent-blue)' }}
      />
      <rect
        x="14"
        y="22"
        width="4"
        height="3"
        rx="1"
        style={{ fill: 'var(--netlab-accent-blue)' }}
      />
      <rect
        x="20"
        y="22"
        width="4"
        height="3"
        rx="1"
        style={{ fill: 'var(--netlab-accent-blue)' }}
      />
      <rect
        x="26"
        y="22"
        width="4"
        height="3"
        rx="1"
        style={{ fill: 'var(--netlab-accent-blue)' }}
      />
      <circle cx="10" cy="17" r="2" style={{ fill: 'var(--netlab-accent-green)' }} />
      <circle cx="16" cy="17" r="2" style={{ fill: 'var(--netlab-accent-green)' }} />
      <circle cx="22" cy="17" r="2" style={{ fill: 'var(--netlab-accent-yellow)' }} />
      <circle cx="28" cy="17" r="2" style={{ fill: 'var(--netlab-text-faint)' }} />
    </svg>
  );
}

export function SwitchNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div style={SWITCH_STYLE} onClick={() => setSelectedNodeId(id)}>
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <SwitchIcon />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: 'var(--netlab-text-primary)' }}>
        {d.label}
      </div>
    </div>
  );
}
