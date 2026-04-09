import { useFailure } from '../../simulation/FailureContext';
import { useNetlabContext } from '../NetlabContext';
import type { RouterInterface } from '../../types/routing';

function ToggleRow({
  label,
  isDown,
  onToggle,
}: {
  label: string;
  isDown: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
        gap: 8,
      }}
    >
      <span style={{ color: '#cbd5e1', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          color: isDown ? '#f87171' : '#4ade80',
          minWidth: 30,
          textAlign: 'right',
        }}
      >
        {isDown ? 'DOWN' : 'UP'}
      </span>
      <button
        onClick={onToggle}
        style={{
          fontSize: 10,
          padding: '2px 8px',
          background: isDown ? '#7f1d1d' : '#14532d',
          color: isDown ? '#fca5a5' : '#86efac',
          border: `1px solid ${isDown ? '#ef4444' : '#22c55e'}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        Toggle
      </button>
    </div>
  );
}

export function FailureTogglePanel() {
  const {
    toggleNode,
    toggleEdge,
    toggleInterface,
    resetFailures,
    isNodeDown,
    isEdgeDown,
    isInterfaceDown,
  } = useFailure();
  const { topology } = useNetlabContext();

  const visibleNodes = topology.nodes.filter(
    (n) => n.type !== 'netlab-area',
  );
  const routerNodes = visibleNodes.filter(
    (node) => Array.isArray(node.data.interfaces) && node.data.interfaces.length > 0,
  );

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 8,
        padding: '12px 14px',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflow: 'auto',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em' }}>
        FAILURE INJECTION
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, letterSpacing: '0.06em' }}>
          NODES
        </div>
        {visibleNodes.map((node) => (
          <ToggleRow
            key={node.id}
            label={node.data.label}
            isDown={isNodeDown(node.id)}
            onToggle={() => toggleNode(node.id)}
          />
        ))}
      </div>

      <div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, letterSpacing: '0.06em' }}>
          LINKS
        </div>
        {topology.edges.map((edge) => {
          const srcLabel = topology.nodes.find((n) => n.id === edge.source)?.data.label ?? edge.source;
          const dstLabel = topology.nodes.find((n) => n.id === edge.target)?.data.label ?? edge.target;
          return (
            <ToggleRow
              key={edge.id}
              label={`${srcLabel} ↔ ${dstLabel}`}
              isDown={isEdgeDown(edge.id)}
              onToggle={() => toggleEdge(edge.id)}
            />
          );
        })}
      </div>

      {routerNodes.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, letterSpacing: '0.06em' }}>
            INTERFACES
          </div>
          {routerNodes.flatMap((node) =>
            ((node.data.interfaces ?? []) as RouterInterface[]).map((iface) => (
              <ToggleRow
                key={`${node.id}:${iface.id}`}
                label={`${node.data.label} / ${iface.name}`}
                isDown={isInterfaceDown(node.id, iface.id)}
                onToggle={() => toggleInterface(node.id, iface.id)}
              />
            )),
          )}
        </div>
      )}

      <button
        onClick={resetFailures}
        style={{
          marginTop: 4,
          padding: '5px 0',
          background: '#1e293b',
          color: '#94a3b8',
          border: '1px solid #334155',
          borderRadius: 4,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        Reset All
      </button>
    </div>
  );
}
