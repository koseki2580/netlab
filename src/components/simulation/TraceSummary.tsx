import { memo } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useSimulation } from '../../simulation/SimulationContext';
import { useNetlabContext } from '../NetlabContext';

const STATUS_META = {
  delivered: { labelKey: 'simulation.summary.delivered', color: 'var(--netlab-accent-green)' },
  dropped: { labelKey: 'simulation.summary.dropped', color: 'var(--netlab-accent-red)' },
  'in-flight': { labelKey: 'simulation.summary.inProgress', color: 'var(--netlab-text-secondary)' },
} as const;

export const TraceSummary = memo(function TraceSummary() {
  const { t } = useI18n();
  const { topology } = useNetlabContext();
  const { state } = useSimulation();
  const trace = state.traces.find((item) => item.packetId === state.currentTraceId);

  if (!trace) {
    return null;
  }

  const dstNode = topology.nodes.find((node) => node.id === trace.dstNodeId);
  const dstLabel = dstNode?.data.label ?? trace.dstNodeId;
  const dstIp =
    dstNode?.data.ip ?? trace.hops[trace.hops.length - 1]?.dstIp ?? t('simulation.summary.unknown');
  const status = STATUS_META[trace.status] ?? STATUS_META['in-flight'];

  return (
    <div
      data-testid="trace-summary"
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
        {t('simulation.summary.heading')}
      </div>

      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}
      >
        <span style={{ color: 'var(--netlab-text-secondary)' }}>
          {t('simulation.summary.hops')}{' '}
          <span style={{ color: 'var(--netlab-text-primary)', fontWeight: 'bold' }}>
            {trace.hops.length}
          </span>
        </span>
        <span style={{ color: 'var(--netlab-text-secondary)' }}>
          {t('simulation.summary.status')}{' '}
          <span
            style={{
              color: status.color,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {t(status.labelKey)}
          </span>
        </span>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
        {t('simulation.summary.dst')}{' '}
        <span style={{ color: 'var(--netlab-text-primary)', fontWeight: 'bold' }}>{dstLabel}</span>{' '}
        <span style={{ color: 'var(--netlab-text-muted)' }}>({dstIp})</span>
      </div>
    </div>
  );
});
