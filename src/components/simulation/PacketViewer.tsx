import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';

const PANEL: React.CSSProperties = {
  width: 220,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
};

const FLOATING_PANEL: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
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
const VAL: React.CSSProperties = {
  color: 'var(--netlab-text-primary)',
  textAlign: 'right',
  maxWidth: '60%',
  wordBreak: 'break-all',
};

const EVENT_COLORS: Record<string, string> = {
  create: 'var(--netlab-accent-cyan)',
  forward: 'var(--netlab-accent-green)',
  deliver: 'var(--netlab-accent-green)',
  drop: 'var(--netlab-accent-red)',
  'arp-request': 'var(--netlab-accent-orange)',
  'arp-reply': 'var(--netlab-accent-orange)',
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
  const color = EVENT_COLORS[event] ?? 'var(--netlab-text-secondary)';
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

interface PacketViewerPanelProps {
  floating?: boolean;
}

export function PacketViewerPanel({ floating = false }: PacketViewerPanelProps) {
  const { state } = useSimulation();
  const { selectedHop, traces, currentTraceId } = state;
  const trace = traces.find((t) => t.packetId === currentTraceId);
  const totalHops = trace?.hops.length ?? 0;

  return (
    <div
      data-testid="packet-viewer-panel"
      style={floating ? { ...PANEL, ...FLOATING_PANEL } : PANEL}
    >
      <div style={LABEL}>PACKET VIEWER</div>

      {!selectedHop ? (
        <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          No hop selected — press Step or click a row in the timeline.
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: 'var(--netlab-text-secondary)', fontSize: 10 }}>
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

            {selectedHop.toNodeId && <Field label="→ Next" value={selectedHop.toNodeId} />}
            {selectedHop.reason && <Field label="Reason" value={selectedHop.reason} />}
          </div>
        </>
      )}
    </div>
  );
}

export function PacketViewer() {
  return <PacketViewerPanel floating />;
}
