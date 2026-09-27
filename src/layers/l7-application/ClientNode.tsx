import type { GraphNodeProps as NodeProps } from '../../types/graph';
import { NodePorts } from '../../components/NodePorts';
import type { NetlabNodeData } from '../../types/topology';
import { NodeGlyph } from '../../components/NodeGlyph';
import { useNetlabUI } from '../../components/NetlabUIContext';

const CLIENT_STYLE: React.CSSProperties = {
  position: 'relative',
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

/**
 * A host's IP address, under its name. The lessons talk about addresses all the
 * time, and a learner reading the diagram had to open a panel to find one.
 * Drawn just under the box rather than inside it: a taller host box moved its
 * link anchor down and put a step in every link to a switch or router.
 */
export function HostAddress({ ip }: { ip: string | undefined }) {
  if (!ip) return null;
  return (
    <div
      data-testid="topology-node-ip"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 3,
        fontSize: 10,
        whiteSpace: 'nowrap',
        color: 'var(--netlab-text-secondary)',
      }}
    >
      {ip}
    </div>
  );
}

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
      <NodePorts style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <NodeGlyph kind="client" />
      </div>
      <div style={{ fontWeight: 'bold', fontSize: 11, color: 'var(--netlab-text-primary)' }}>
        {d.label}
      </div>
      <HostAddress ip={d.ip} />
    </div>
  );
}
