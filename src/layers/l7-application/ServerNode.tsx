import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';

const SERVER_STYLE: React.CSSProperties = {
  background: '#1a3a2a',
  border: '2px solid #166534',
  borderRadius: 8,
  padding: '10px 16px',
  minWidth: 110,
  textAlign: 'center',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'monospace',
};

export function ServerNode({ data }: NodeProps) {
  const d = data as NetlabNodeData;
  return (
    <div style={SERVER_STYLE}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold', fontSize: 13 }}>🖥️ {d.label}</div>
      <div style={{ opacity: 0.8, marginTop: 2 }}>Server</div>
      {d.ip && (
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{d.ip}</div>
      )}
    </div>
  );
}
