import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';

const CLIENT_STYLE: React.CSSProperties = {
  background: '#1e3a5f',
  border: '2px solid #1e40af',
  borderRadius: 8,
  padding: '10px 16px',
  minWidth: 110,
  textAlign: 'center',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'monospace',
};

export function ClientNode({ data }: NodeProps) {
  const d = data as NetlabNodeData;
  return (
    <div style={CLIENT_STYLE}>
      <div style={{ fontWeight: 'bold', fontSize: 13 }}>💻 {d.label}</div>
      <div style={{ opacity: 0.8, marginTop: 2 }}>Client</div>
      {d.ip && (
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{d.ip}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
