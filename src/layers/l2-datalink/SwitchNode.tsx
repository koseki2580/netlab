import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';

const SWITCH_STYLE: React.CSSProperties = {
  background: '#1e40af',
  border: '2px solid #1e3a8a',
  borderRadius: 6,
  padding: '10px 16px',
  minWidth: 100,
  textAlign: 'center',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'monospace',
};

export function SwitchNode({ data }: NodeProps) {
  const d = data as NetlabNodeData;
  return (
    <div style={SWITCH_STYLE}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold', fontSize: 13 }}>🔀 {d.label}</div>
      <div style={{ opacity: 0.8, marginTop: 2 }}>Switch (L2)</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
