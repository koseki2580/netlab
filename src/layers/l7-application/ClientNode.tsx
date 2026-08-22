import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import { NodeGlyph } from '../../components/NodeGlyph';
import { useNetlabUI } from '../../components/NetlabUIContext';

const CLIENT_STYLE: React.CSSProperties = {
  background: 'var(--netlab-node-client-bg)',
  border: '2px solid var(--netlab-accent-cyan)',
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
  background: 'var(--netlab-accent-cyan)',
  border: '1px solid var(--netlab-accent-cyan)',
};

export function ClientNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div
      // The device, named the same way whichever engine draws it, so a test
      // can find it without knowing the graph library.
      data-testid="topology-node"
      style={CLIENT_STYLE}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <NodeGlyph kind="client" />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: 'var(--netlab-text-primary)' }}>
        {d.label}
      </div>
    </div>
  );
}
