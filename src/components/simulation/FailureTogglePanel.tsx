import { useFailure } from '../../simulation/FailureContext';
import { useOptionalSimulation } from '../../simulation/SimulationContext';
import { useNetlabContext } from '../NetlabContext';

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
      <span
        style={{
          color: 'var(--netlab-text-primary)',
          fontSize: 12,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          color: isDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-green)',
          minWidth: 30,
          textAlign: 'right',
        }}
      >
        {isDown ? 'DOWN' : 'UP'}
      </span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={!isDown}
        aria-label={`Toggle ${label}`}
        className="netlab-focus-ring"
        style={{
          fontSize: 10,
          padding: '2px 8px',
          background: isDown
            ? '#7f1d1d'
            : 'color-mix(in srgb, var(--netlab-accent-green) 18%, transparent)',
          color: isDown ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-green)',
          border: `1px solid ${isDown ? '#ef4444' : 'var(--netlab-accent-green)'}`,
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
  const simulation = useOptionalSimulation();

  const visibleNodes = topology.nodes.filter((n) => n.type !== 'netlab-area');
  const routerNodes = visibleNodes.filter(
    (node) => Array.isArray(node.data.interfaces) && node.data.interfaces.length > 0,
  );

  return (
    <div
      style={{
        background: 'var(--netlab-bg-primary)',
        border: '1px solid var(--netlab-bg-surface)',
        borderRadius: 8,
        padding: '12px 14px',
        fontFamily: 'monospace',
        fontSize: 12,
        color: 'var(--netlab-text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflow: 'auto',
      }}
      tabIndex={0}
    >
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 11,
          color: 'var(--netlab-text-secondary)',
          letterSpacing: '0.08em',
        }}
      >
        FAILURE INJECTION
      </div>

      {simulation?.isRecomputing && (
        <div
          style={{
            padding: '6px 10px',
            background: '#172554',
            border: '1px solid #1e40af',
            borderRadius: 6,
            fontSize: 11,
            color: '#60a5fa',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3b82f6',
              flexShrink: 0,
            }}
          />
          Calculating...
        </div>
      )}

      <div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-secondary)',
            marginBottom: 4,
            letterSpacing: '0.06em',
          }}
        >
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
        <div
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-secondary)',
            marginBottom: 4,
            letterSpacing: '0.06em',
          }}
        >
          LINKS
        </div>
        {topology.edges.map((edge) => {
          const srcLabel =
            topology.nodes.find((n) => n.id === edge.source)?.data.label ?? edge.source;
          const dstLabel =
            topology.nodes.find((n) => n.id === edge.target)?.data.label ?? edge.target;
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
          <div
            style={{
              fontSize: 10,
              color: 'var(--netlab-text-secondary)',
              marginBottom: 4,
              letterSpacing: '0.06em',
            }}
          >
            INTERFACES
          </div>
          {routerNodes.flatMap((node) =>
            (node.data.interfaces ?? []).map((iface) => (
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
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-secondary)',
          border: '1px solid var(--netlab-border)',
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
