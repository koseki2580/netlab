import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
import { NodeGlyph } from '../../components/NodeGlyph';
import { useNetlabUI } from '../../components/NetlabUIContext';

const ROUTER_STYLE: React.CSSProperties = {
  position: 'relative',
  background: 'var(--netlab-node-router-bg)',
  border: '2px solid var(--netlab-accent-green)',
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
  background: 'var(--netlab-accent-green)',
  border: '1px solid var(--netlab-accent-green)',
};

export function RouterNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  const downInterfaceCount = typeof d._downInterfaceCount === 'number' ? d._downInterfaceCount : 0;
  return (
    <div
      // The device, named the same way whichever engine draws it, so a test
      // can find it without knowing the graph library.
      data-testid="topology-node"
      style={ROUTER_STYLE}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <NodeGlyph kind="router" />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: 'var(--netlab-text-primary)' }}>
        {d.label}
      </div>
      {downInterfaceCount > 0 && (
        <div
          style={{
            position: 'absolute',
            right: -8,
            bottom: -8,
            background: 'var(--netlab-accent-red)',
            color: '#fff',
            borderRadius: 4,
            padding: '1px 4px',
            fontSize: 9,
            fontWeight: 'bold',
            lineHeight: 1.2,
            pointerEvents: 'none',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.45)',
          }}
        >
          {downInterfaceCount} iface{downInterfaceCount > 1 ? 's' : ''} down
        </div>
      )}
    </div>
  );
}
