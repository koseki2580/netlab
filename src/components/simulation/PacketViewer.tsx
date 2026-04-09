import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';

const PANEL: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 220,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 10,
};

const LABEL: React.CSSProperties = {
  color: 'var(--netlab-text-muted)',
  fontSize: 10,
  letterSpacing: 1,
  fontWeight: 'bold',
  marginBottom: 8,
};

const ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 4,
  lineHeight: 1.6,
};

const KEY: React.CSSProperties = { color: 'var(--netlab-text-secondary)' };
const VAL: React.CSSProperties = { color: 'var(--netlab-text-primary)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' };

const EVENT_COLORS: Record<string, string> = {
  create:        '#7dd3fc',
  forward:       '#4ade80',
  deliver:       '#34d399',
  drop:          '#f87171',
  'arp-request': '#f59e0b',
  'arp-reply':   '#f59e0b',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={ROW}>
      <span style={KEY}>{label}</span>
      <span style={VAL}>{value}</span>
    </div>
  );
}

function EventBadge({ event }: { event: PacketHop['event'] }) {
  const color = EVENT_COLORS[event] ?? '#94a3b8';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 'bold',
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {event}
    </span>
  );
}

export function PacketViewer() {
  const { state } = useSimulation();
  const { selectedHop, traces, currentTraceId } = state;
  const trace = traces.find((t) => t.packetId === currentTraceId);
  const totalHops = trace?.hops.length ?? 0;

  return (
    <div style={PANEL}>
      <div style={LABEL}>PACKET VIEWER</div>

      {!selectedHop ? (
        <div style={{ color: 'var(--netlab-border)', fontSize: 11 }}>
          No hop selected — press Step or click a row in the timeline.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: 10 }}>
              Hop {selectedHop.step + 1} / {totalHops}
            </span>
            <EventBadge event={selectedHop.event} />
          </div>

          <div style={{ borderTop: '1px solid var(--netlab-bg-surface)', paddingTop: 8 }}>
            <Field label="Node" value={selectedHop.nodeLabel} />
            <Field label="Src IP" value={selectedHop.srcIp} />
            <Field label="Dst IP" value={selectedHop.dstIp} />
            <Field label="TTL" value={String(selectedHop.ttl)} />
            <Field label="Protocol" value={selectedHop.protocol} />

            {selectedHop.toNodeId && (
              <Field label="→ Next" value={selectedHop.toNodeId} />
            )}
            {selectedHop.reason && (
              <Field label="Reason" value={selectedHop.reason} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
