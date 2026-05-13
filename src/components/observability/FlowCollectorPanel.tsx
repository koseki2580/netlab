import { useMemo, useState, type CSSProperties } from 'react';
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

function traceDeviceId(trace: ObservabilityTrace): string {
  return trace.kind === 'netflow:flow-update' || trace.kind === 'netflow:flow-export'
    ? trace.routerId
    : trace.switchId;
}

export function FlowCollectorPanel({ traces }: FlowCollectorPanelProps) {
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
    <section aria-label="Flow collector" style={PANEL_STYLE}>
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
          onClick={() => setTab('sflow')}
          aria-pressed={tab === 'sflow'}
          style={BUTTON_STYLE}
        >
          sFlow
        </button>
        <label style={{ marginLeft: 'auto' }}>
          <span style={{ marginRight: 6 }}>Device</span>
          <select
            aria-label="Flow device filter"
            value={deviceId}
            onChange={(event) => setDeviceId(event.currentTarget.value)}
          >
            <option value="">All</option>
            {devices.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table role="grid" aria-rowcount={visibleRows.length}>
        <thead>
          <tr>
            <th>Packet</th>
            <th>Step</th>
            <th>Device</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map(({ packetId, hop }, index) => {
            const obs = hop.observabilityTrace;
            if (!obs) return null;
            const device = traceDeviceId(obs);
            const details =
              obs.kind === 'netflow:flow-update'
                ? `${obs.packets} packets / ${obs.bytes} bytes`
                : obs.kind === 'netflow:flow-export'
                  ? obs.reason
                  : obs.kind === 'sflow:sampled'
                    ? `seq ${obs.sequence} port ${obs.portId}`
                    : obs.reason;
            return (
              <tr key={`${packetId}-${hop.step}-${index}`}>
                <td>{packetId}</td>
                <td>{hop.step}</td>
                <td>{device}</td>
                <td>{obs.kind}</td>
                <td>{details}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
