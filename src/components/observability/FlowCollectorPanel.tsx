import { useMemo, useState, type CSSProperties } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { PacketTrace } from '../../types/simulation';
import type { ObservabilityTrace } from '../../types/simulation';

export interface FlowCollectorPanelProps {
  readonly traces: readonly PacketTrace[];
}

type Tab = 'netflow' | 'sflow';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  background: 'var(--netlab-bg-panel)',
  color: 'var(--netlab-text-primary)',
  padding: 12,
};

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 6,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  cursor: 'pointer',
  padding: '5px 8px',
};

const KIND_LABEL_KEYS: Record<ObservabilityTrace['kind'], string> = {
  'netflow:flow-update': 'simulation.flowView.kind.netflowUpdate',
  'netflow:flow-export': 'simulation.flowView.kind.netflowExport',
  'sflow:sampled': 'simulation.flowView.kind.sflowSampled',
  'sflow:dropped': 'simulation.flowView.kind.sflowDropped',
};

// Five columns in a ~400px rail: small type, headers that never break inside
// a word, and long identifiers allowed to wrap at any character.
const TABLE_STYLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
  lineHeight: 1.4,
};

const HEADER_CELL_STYLE: CSSProperties = {
  textAlign: 'left',
  whiteSpace: 'nowrap',
  padding: '4px 6px 4px 0',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--netlab-text-secondary)',
  borderBottom: '1px solid var(--netlab-border-subtle)',
};

const CELL_STYLE: CSSProperties = {
  verticalAlign: 'top',
  padding: '4px 6px 4px 0',
  overflowWrap: 'anywhere',
  borderBottom: '1px solid var(--netlab-border-subtle)',
};

function traceDeviceId(trace: ObservabilityTrace): string {
  return trace.kind === 'netflow:flow-update' || trace.kind === 'netflow:flow-export'
    ? trace.routerId
    : trace.switchId;
}

export function FlowCollectorPanel({ traces }: FlowCollectorPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('netflow');
  const [deviceId, setDeviceId] = useState('');
  const rows = useMemo(
    () =>
      traces.flatMap((trace) =>
        trace.hops
          .filter((hop) => hop.observabilityTrace)
          .map((hop) => ({ packetId: trace.packetId, hop })),
      ),
    [traces],
  );
  const devices = Array.from(
    new Set(
      rows
        .map(({ hop }) => {
          const obs = hop.observabilityTrace;
          if (!obs) return null;
          return traceDeviceId(obs);
        })
        .filter((value): value is string => value !== null),
    ),
  );
  const visibleRows = rows.filter(({ hop }) => {
    const obs = hop.observabilityTrace;
    if (!obs) return false;
    if (tab === 'netflow' && !obs.kind.startsWith('netflow:')) return false;
    if (tab === 'sflow' && !obs.kind.startsWith('sflow:')) return false;
    if (deviceId && traceDeviceId(obs) !== deviceId) {
      return false;
    }
    return true;
  });

  return (
    <section aria-label={t('simulation.flow.aria')} style={PANEL_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setTab('netflow')}
          aria-pressed={tab === 'netflow'}
          style={BUTTON_STYLE}
        >
          NetFlow
        </button>
        <button
          type="button"
          data-testid="observability-sflow-tab"
          onClick={() => setTab('sflow')}
          aria-pressed={tab === 'sflow'}
          style={BUTTON_STYLE}
        >
          sFlow
        </button>
        <label style={{ marginLeft: 'auto' }}>
          <span style={{ marginRight: 6 }}>{t('simulation.flow.device')}</span>
          <select
            aria-label={t('simulation.flow.deviceFilter')}
            value={deviceId}
            onChange={(event) => setDeviceId(event.currentTarget.value)}
          >
            <option value="">{t('simulation.flow.all')}</option>
            {devices.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p
        data-testid="observability-flow-explainer"
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          lineHeight: 1.5,
          color: 'var(--netlab-text-secondary)',
        }}
      >
        {t('simulation.flowView.explainer')}
      </p>
      {visibleRows.length === 0 ? (
        <p
          data-testid="observability-flow-empty"
          style={{ margin: 0, fontSize: 11, color: 'var(--netlab-text-muted)' }}
        >
          {t('simulation.flowView.empty')}
        </p>
      ) : (
        <table role="grid" aria-rowcount={visibleRows.length} style={TABLE_STYLE}>
          <thead>
            <tr>
              <th style={HEADER_CELL_STYLE}>{t('simulation.flow.column.packet')}</th>
              <th style={HEADER_CELL_STYLE}>{t('simulation.flow.column.step')}</th>
              <th style={HEADER_CELL_STYLE}>{t('simulation.flow.device')}</th>
              <th style={HEADER_CELL_STYLE}>{t('simulation.flow.column.action')}</th>
              <th style={HEADER_CELL_STYLE}>{t('simulation.flow.column.details')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ packetId, hop }, index) => {
              const obs = hop.observabilityTrace;
              if (!obs) return null;
              const device = traceDeviceId(obs);
              const details =
                obs.kind === 'netflow:flow-update'
                  ? t('simulation.flow.counts', { packets: obs.packets, bytes: obs.bytes })
                  : obs.kind === 'netflow:flow-export'
                    ? obs.reason
                    : obs.kind === 'sflow:sampled'
                      ? t('simulation.flow.sample', { sequence: obs.sequence, port: obs.portId })
                      : obs.reason;
              return (
                <tr key={`${packetId}-${hop.step}-${index}`}>
                  <td style={CELL_STYLE}>{packetId}</td>
                  <td style={CELL_STYLE}>{hop.step}</td>
                  <td style={CELL_STYLE}>{device}</td>
                  <td style={CELL_STYLE} data-testid="observability-flow-kind">
                    <span style={{ display: 'block' }}>{t(KIND_LABEL_KEYS[obs.kind])}</span>
                    <code style={{ fontSize: 9, color: 'var(--netlab-text-muted)' }}>
                      {obs.kind}
                    </code>
                  </td>
                  <td style={CELL_STYLE}>{details}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
