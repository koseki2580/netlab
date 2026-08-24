import type { GraphNodeProps as NodeProps } from '../../types/graph';
import { NodePorts } from '../../components/NodePorts';
import type { NetlabNodeData } from '../../types/topology';
import { NodeGlyph } from '../../components/NodeGlyph';
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

export function SwitchNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  return (
    <div
      // The device, named the same way whichever engine draws it, so a test
      // can find it without knowing the graph library.
      data-testid="topology-node"
      style={SWITCH_STYLE}
      onClick={() => setSelectedNodeId(id)}
    >
      <NodePorts style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <NodeGlyph kind="switch" />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: 'var(--netlab-text-primary)' }}>
        {d.label}
      </div>
    </div>
  );
}
