import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNetlabUI } from '../../../components/NetlabUIContext';
import type { NetlabNodeData } from '../../../types/topology';

const HUB_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-surface)',
  border: '2px solid var(--netlab-accent-yellow)',
  borderRadius: '50%',
  width: 72,
  height: 72,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  cursor: 'pointer',
};

const HANDLE_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: 'var(--netlab-accent-yellow)',
  border: '1px solid var(--netlab-accent-yellow)',
};

export function HubNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div
      // The device, named the same way whichever engine draws it, so a test
      // can find it without knowing the graph library.
      data-testid="topology-node"
      style={HUB_STYLE}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: 20 }}>H</div>
        <div style={{ fontSize: 10 }}>{d.label}</div>
      </div>
    </div>
  );
}
