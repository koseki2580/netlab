import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import type { RouterInterface } from '../../types/routing';

const ROUTER_STYLE: React.CSSProperties = {
  background: '#166534',
  border: '2px solid #14532d',
  borderRadius: 6,
  padding: '10px 16px',
  minWidth: 120,
  textAlign: 'center',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'monospace',
};

export function RouterNode({ data }: NodeProps) {
  const d = data as NetlabNodeData;
  const ifaces = (d.interfaces ?? []) as RouterInterface[];
  return (
    <div style={ROUTER_STYLE}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold', fontSize: 13 }}>🌐 {d.label}</div>
      <div style={{ opacity: 0.8, marginTop: 2 }}>Router (L3)</div>
      {ifaces.map((iface) => (
        <div key={iface.id} style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>
          {iface.name}: {iface.ipAddress}/{iface.prefixLength}
        </div>
      ))}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
