import { useI18n } from '../../i18n/useI18n';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketTrace } from '../../types/simulation';

function shortId(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/**
 * Name a trace by its order and its endpoints — "① Client → Server" — the way
 * the learner sent it. A hash ("#a944f7b8") names nothing a learner can see,
 * and the same flow got a different one on each tab.
 */
function traceName(trace: PacketTrace, index: number): string {
  const order = CIRCLED[index] ?? `${index + 1}.`;
  const labelOf = (nodeId: string) =>
    trace.hops.find((hop) => hop.nodeId === nodeId)?.nodeLabel ?? nodeId;
  const route = `${labelOf(trace.srcNodeId)} → ${labelOf(trace.dstNodeId)}`;
  return trace.label ? `${order} ${route} · ${trace.label}` : `${order} ${route}`;
}

export function TraceSelector() {
  const { t } = useI18n();
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
        {t('simulation.traces.heading')}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {traces.map((trace, index) => {
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
              title={
                trace.sessionId ? `session ${trace.sessionId}` : `trace ${shortId(trace.packetId)}`
              }
              data-testid="trace-selector-chip"
            >
              {traceName(trace, index)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
