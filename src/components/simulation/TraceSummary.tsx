import { useNetlabContext } from '../NetlabContext';
import { useSimulation } from '../../simulation/SimulationContext';

const STATUS_META = {
  delivered: { label: 'delivered', color: '#34d399' },
  dropped: { label: 'dropped', color: '#f87171' },
  'in-flight': { label: 'in-progress', color: '#94a3b8' },
} as const;

export function TraceSummary() {
  const { topology } = useNetlabContext();
  const { state } = useSimulation();
  const trace = state.traces.find((item) => item.packetId === state.currentTraceId);

  if (!trace) {
    return null;
  }

  const dstNode = topology.nodes.find((node) => node.id === trace.dstNodeId);
  const dstLabel = dstNode?.data.label ?? trace.dstNodeId;
  const dstIp = (dstNode?.data.ip as string | undefined) ?? trace.hops[trace.hops.length - 1]?.dstIp ?? 'unknown';
  const status = STATUS_META[trace.status] ?? STATUS_META['in-flight'];

  return (
    <div
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: '12px 14px',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-muted)',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        TRACE SUMMARY
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}>
        <span style={{ color: 'var(--netlab-text-secondary)' }}>
          Hops:{' '}
          <span style={{ color: 'var(--netlab-text-primary)', fontWeight: 'bold' }}>
            {trace.hops.length}
          </span>
        </span>
        <span style={{ color: 'var(--netlab-text-secondary)' }}>
          Status:{' '}
          <span
            style={{
              color: status.color,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {status.label}
          </span>
        </span>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
        Dst:{' '}
        <span style={{ color: 'var(--netlab-text-primary)', fontWeight: 'bold' }}>
          {dstLabel}
        </span>{' '}
        <span style={{ color: 'var(--netlab-text-muted)' }}>({dstIp})</span>
      </div>
    </div>
  );
}
