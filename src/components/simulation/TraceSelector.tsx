import { useSimulation } from '../../simulation/SimulationContext';

function shortId(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}

export function TraceSelector() {
  const { engine, state } = useSimulation();
  const { traces, currentTraceId } = state;

  if (traces.length < 2) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: 'var(--netlab-text-muted)',
        }}
      >
        TRACES
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {traces.map((trace) => {
          const active = trace.packetId === currentTraceId;
          return (
            <button
              key={trace.packetId}
              type="button"
              onClick={() => engine.selectTrace(trace.packetId)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: `1px solid ${active ? 'var(--netlab-accent-blue)' : 'var(--netlab-border-subtle)'}`,
                background: active ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                color: active ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
              title={trace.sessionId ? `session ${trace.sessionId}` : trace.packetId}
            >
              {trace.label ?? `Trace ${shortId(trace.packetId)}`}
              {trace.sessionId && (
                <span style={{ marginLeft: 6, color: 'var(--netlab-text-faint)' }}>
                  #{shortId(trace.sessionId)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
