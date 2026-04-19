import { useEffect, useRef } from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop, RoutingDecision } from '../../types/simulation';
import { TraceSelector } from './TraceSelector';

// ── Style constants (dark theme, monospace) ───────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  create: '#7dd3fc',
  forward: '#4ade80',
  deliver: '#34d399',
  drop: '#f87171',
  'arp-request': '#f59e0b',
  'arp-reply': '#f59e0b',
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface HopHeaderProps {
  hop: PacketHop;
  current: number;
  total: number;
}

function HopHeader({ hop, current, total }: HopHeaderProps) {
  const eventColor = EVENT_COLORS[hop.event] ?? '#94a3b8';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        Hop {current} of {total}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 'bold',
            letterSpacing: 0.5,
            background: `${eventColor}22`,
            color: eventColor,
            border: `1px solid ${eventColor}44`,
          }}
        >
          {hop.event.toUpperCase()}
        </span>
        <span style={{ fontSize: 13, fontWeight: 'bold', color: '#f1f5f9' }}>{hop.nodeLabel}</span>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        {hop.srcIp} → {hop.dstIp} &nbsp;|&nbsp; TTL {hop.ttl} &nbsp;|&nbsp; {hop.protocol}
      </div>
    </div>
  );
}

interface RoutingTableProps {
  decision: RoutingDecision;
}

function RoutingTable({ decision }: RoutingTableProps) {
  const { candidates, winner, explanation } = decision;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 'bold', letterSpacing: 1, color: '#94a3b8' }}>
        LPM ROUTING TABLE
      </div>

      <div
        style={{
          border: '1px solid #1e293b',
          borderRadius: 6,
          overflow: 'hidden',
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 80px 40px 60px 70px',
            padding: '4px 8px',
            background: '#1e293b',
            color: '#94a3b8',
            fontWeight: 'bold',
            letterSpacing: 0.5,
            fontSize: 10,
          }}
        >
          <span>DESTINATION</span>
          <span>NEXT HOP</span>
          <span>PROTOCOL</span>
          <span>AD</span>
          <span>METRIC</span>
          <span></span>
        </div>

        {/* Data rows */}
        {candidates.map((c, i) => {
          let rowBg = '#0f172a';
          let badgeColor = 'transparent';
          let badgeTextColor = 'transparent';
          let badgeText = '';

          if (c.selectedByLpm) {
            rowBg = '#052e16';
            badgeColor = '#14532d';
            badgeTextColor = '#4ade80';
            badgeText = 'MATCH ✓';
          } else if (c.matched) {
            rowBg = '#451a03';
            badgeColor = '#78350f';
            badgeTextColor = '#fbbf24';
            badgeText = 'MATCHED';
          }

          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 40px 60px 70px',
                padding: '5px 8px',
                background: rowBg,
                borderTop: '1px solid #1e293b',
                color: c.matched ? '#e2e8f0' : '#94a3b8',
                alignItems: 'center',
              }}
            >
              <span>{c.destination}</span>
              <span>{c.nextHop}</span>
              <span>{c.protocol}</span>
              <span>{c.adminDistance}</span>
              <span>{c.metric}</span>
              <span>
                {badgeText && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontSize: 10,
                      background: badgeColor,
                      color: badgeTextColor,
                      fontWeight: 'bold',
                    }}
                  >
                    {badgeText}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div
        style={{
          fontSize: 11,
          color: winner ? '#4ade80' : '#fbbf24',
          padding: '6px 8px',
          background: winner ? '#052e1644' : '#45190344',
          borderRadius: 4,
          border: `1px solid ${winner ? '#14532d' : '#78350f'}`,
        }}
      >
        {explanation}
      </div>
    </div>
  );
}

// ── StepEntry: one hop in the accumulated log ─────────────────────────────────

interface StepEntryProps {
  hop: PacketHop;
  isCurrent: boolean;
  isLast: boolean;
  totalHops: number;
}

function StepEntry({ hop, isCurrent, isLast, totalHops }: StepEntryProps) {
  const circleColor = isCurrent ? '#7dd3fc' : '#334155';
  const circleBorder = isCurrent ? '#7dd3fc' : '#475569';

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Timeline column: circle + connector */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 24,
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {/* Circle indicator */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isCurrent ? circleColor : 'transparent',
            border: `2px solid ${circleBorder}`,
            flexShrink: 0,
          }}
        />
        {/* Connector line — omitted after last entry */}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 12,
              background: '#1e293b',
              marginTop: 2,
            }}
          />
        )}
      </div>

      {/* Content column */}
      <div
        style={{
          flex: 1,
          paddingLeft: 8,
          paddingBottom: isLast ? 0 : 16,
          borderLeft: isCurrent ? '2px solid #7dd3fc22' : '2px solid transparent',
          marginLeft: -2,
        }}
      >
        <HopHeader hop={hop} current={hop.step + 1} total={totalHops} />

        {hop.routingDecision && (
          <div style={{ marginTop: 10 }}>
            <RoutingTable decision={hop.routingDecision} />
          </div>
        )}

        {hop.event === 'drop' && !hop.routingDecision && hop.reason && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: '#450a0a',
              border: '1px solid #991b1b',
              borderRadius: 6,
              fontSize: 12,
              color: '#fca5a5',
            }}
          >
            Drop reason: {hop.reason}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StepControls() {
  const { engine, state } = useSimulation();
  const { status, currentStep, traces, currentTraceId } = state;
  const trace = traces.find((t) => t.packetId === currentTraceId);
  const totalHops = trace?.hops.length ?? 0;
  const revealedHops = trace ? trace.hops.slice(0, currentStep + 1) : [];

  const stepDisabled = status === 'running' || status === 'done' || status === 'idle';
  const resetDisabled = status === 'idle';

  // Auto-scroll log to bottom when a new step is revealed
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!logRef.current || currentStep < 0) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [currentStep]);

  return (
    <div
      style={{
        fontFamily: 'monospace',
        color: '#e2e8f0',
        background: '#0f172a',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: '#94a3b8',
        }}
      >
        STEP-BY-STEP SIMULATION
      </div>

      {/* Scrollable accumulated log */}
      <div
        ref={logRef}
        tabIndex={0}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <TraceSelector />
        </div>
        {revealedHops.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            {status === 'idle' ? 'Send a packet to begin.' : 'Press Next Step to start stepping.'}
          </div>
        ) : (
          revealedHops.map((hop, idx) => (
            <StepEntry
              key={hop.step}
              hop={hop}
              isCurrent={hop.step === currentStep}
              isLast={idx === revealedHops.length - 1}
              totalHops={totalHops}
            />
          ))
        )}
      </div>

      {/* Sticky footer: controls */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #1e293b',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => engine.step()}
            disabled={stepDisabled}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 6,
              cursor: stepDisabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              background: stepDisabled ? '#1e293b' : '#2563eb',
              color: stepDisabled ? '#475569' : '#fff',
            }}
          >
            → Next Step
          </button>
          <button
            onClick={() => engine.reset()}
            disabled={resetDisabled}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: 6,
              cursor: resetDisabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              background: resetDisabled ? '#1e293b' : '#334155',
              color: resetDisabled ? '#475569' : '#cbd5e1',
            }}
          >
            ⟳ Reset
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          {status === 'idle' && 'Send a packet to begin'}
          {status === 'paused' && currentStep === -1 && 'Loaded — press Next Step'}
          {status === 'paused' &&
            currentStep >= 0 &&
            `Paused at hop ${currentStep + 1} of ${totalHops}`}
          {status === 'running' && `Running — hop ${currentStep + 1}`}
          {status === 'done' && `Complete — ${totalHops} hops`}
        </div>
      </div>
    </div>
  );
}
