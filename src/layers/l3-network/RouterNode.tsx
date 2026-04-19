import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetlabNodeData } from '../../types/topology';
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

function RouterIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="20"
        cy="20"
        r="13"
        style={{ stroke: 'var(--netlab-accent-green)', fill: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
        fillOpacity="0.2"
      />
      <line
        x1="7"
        y1="20"
        x2="13"
        y2="20"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
      />
      <polyline
        points="9,17.5 7,20 9,22.5"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="27"
        y1="20"
        x2="33"
        y2="20"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
      />
      <polyline
        points="31,17.5 33,20 31,22.5"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="20"
        y1="7"
        x2="20"
        y2="13"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
      />
      <polyline
        points="17.5,9 20,7 22.5,9"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="20"
        y1="27"
        x2="20"
        y2="33"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
      />
      <polyline
        points="17.5,31 20,33 22.5,31"
        style={{ stroke: 'var(--netlab-accent-green)' }}
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="20" cy="20" r="3" style={{ fill: 'var(--netlab-accent-green)' }} />
    </svg>
  );
}

export function RouterNode({ id, data }: NodeProps) {
  const { setSelectedNodeId } = useNetlabUI();
  const d = data as NetlabNodeData;
  const downInterfaceCount = typeof d._downInterfaceCount === 'number' ? d._downInterfaceCount : 0;
  return (
    <div style={ROUTER_STYLE} onClick={() => setSelectedNodeId(id)}>
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <RouterIcon />
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
