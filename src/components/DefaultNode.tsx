import { useNetlabUI } from './NetlabUIContext';
import { NodePorts } from './NodePorts';
import type { GraphNodeProps } from '../types/graph';
import type { NetlabNodeData } from '../types/topology';

/**
 * The drawing for a device whose kind the canvas has none for.
 *
 * A topology may describe a device the layer registry does not cover — the
 * wireless demo's access point and its stations, for instance. React Flow had a
 * built-in box for that case and drew it; a canvas without one drew nothing,
 * and the lesson lost every device on it while still reporting a canvas. So
 * this is the floor: whatever the kind, the device is on screen with its name.
 */
const DEFAULT_STYLE: React.CSSProperties = {
  position: 'relative',
  background: 'var(--netlab-bg-surface)',
  border: '2px solid var(--netlab-border)',
  borderRadius: 10,
  padding: '10px 12px',
  minWidth: 88,
  textAlign: 'center',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  cursor: 'pointer',
};

const PORT_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: 'var(--netlab-border)',
  border: '1px solid var(--netlab-border)',
};

export function DefaultNode({ id, data }: GraphNodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as Partial<NetlabNodeData>;
  return (
    <div
      // The device, named the same way whichever engine draws it, so a test
      // can find it without knowing the graph library.
      data-testid="topology-node"
      style={DEFAULT_STYLE}
      onClick={() => setSelectedNodeId(id)}
    >
      <NodePorts style={PORT_STYLE} />
      <div style={{ fontWeight: 'bold', fontSize: 11 }}>{d.label ?? id}</div>
      {d.role ? (
        <div style={{ fontSize: 9, color: 'var(--netlab-text-secondary)' }}>{d.role}</div>
      ) : null}
    </div>
  );
}
