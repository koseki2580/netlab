import { useEffect, useRef } from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';

const EVENT_COLORS: Record<string, string> = {
  create:  '#7dd3fc',
  forward: '#4ade80',
  deliver: '#34d399',
  drop:    '#f87171',
};

const EVENT_LABELS: Record<string, string> = {
  create:  'CREATE',
  forward: 'FWD',
  deliver: 'DELIVER',
  drop:    'DROP',
};

function HopRow({
  hop,
  isActive,
  onClick,
}: {
  hop: PacketHop;
  isActive: boolean;
  onClick: () => void;
}) {
  const color = EVENT_COLORS[hop.event] ?? '#94a3b8';
  const label = EVENT_LABELS[hop.event] ?? hop.event.toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        background: isActive ? 'rgba(125, 211, 252, 0.08)' : 'transparent',
        borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
        marginBottom: 2,
      }}
    >
      <span style={{ color: '#475569', fontSize: 10, minWidth: 18, textAlign: 'right' }}>
        {hop.step}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 'bold',
          padding: '1px 5px',
          borderRadius: 3,
          background: `${color}22`,
          color,
          minWidth: 46,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
      <span style={{ color: '#cbd5e1', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {hop.nodeLabel}
      </span>
      {hop.toNodeId && (
        <span style={{ color: '#475569', fontSize: 10 }}>→ {hop.toNodeId}</span>
      )}
    </div>
  );
}

export function PacketTimeline() {
  const { engine, state } = useSimulation();
  const { traces, currentTraceId, currentStep } = state;
  const trace = traces.find((t) => t.packetId === currentTraceId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active row
  useEffect(() => {
    if (!scrollRef.current || currentStep < 0) return;
    const rows = scrollRef.current.querySelectorAll('[data-step]');
    const activeRow = rows[currentStep] as HTMLElement | undefined;
    activeRow?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentStep]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid #1e293b',
          color: '#64748b',
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        PACKET TIMELINE
        {trace && (
          <span style={{ marginLeft: 8, color: '#334155', fontWeight: 'normal' }}>
            {trace.hops.length} hops · {trace.status}
          </span>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {!trace ? (
          <div style={{ color: '#334155', fontSize: 11, padding: '8px 8px' }}>
            No trace yet — click "Send Packet" to start.
          </div>
        ) : (
          trace.hops.map((hop) => (
            <div key={hop.step} data-step={hop.step}>
              <HopRow
                hop={hop}
                isActive={hop.step === currentStep}
                onClick={() => engine.selectHop(hop.step)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
