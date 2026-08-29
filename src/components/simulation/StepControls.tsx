import { useEffect, useRef } from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop, RoutingDecision } from '../../types/simulation';
import { TraceSelector } from './TraceSelector';

// ── Style constants (dark theme, monospace) ───────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  create: 'var(--netlab-accent-cyan)',
  forward: 'var(--netlab-accent-green)',
  deliver: '#34d399',
  drop: 'var(--netlab-accent-red)',
  'arp-request': 'var(--netlab-accent-orange)',
  'arp-reply': 'var(--netlab-accent-orange)',
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface HopHeaderProps {
  hop: PacketHop;
  current: number;
  total: number;
}

function HopHeader({ hop, current, total }: HopHeaderProps) {
  const eventColor = EVENT_COLORS[hop.event] ?? 'var(--netlab-text-secondary)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--netlab-text-secondary)' }}>
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
        <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--netlab-text-primary)' }}>
          {hop.nodeLabel}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--netlab-text-secondary)' }}>
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
      <div
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: 'var(--netlab-text-secondary)',
        }}
      >
        LPM ROUTING TABLE
      </div>

      <div
        style={{
          border: '1px solid var(--netlab-bg-surface)',
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
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-secondary)',
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
          let rowBg = 'var(--netlab-bg-primary)';
          let badgeColor = 'transparent';
          let badgeTextColor = 'transparent';
          let badgeText = '';

          if (c.selectedByLpm) {
            rowBg = '#052e16';
            badgeColor = '#14532d';
            badgeTextColor = 'var(--netlab-accent-green)';
            badgeText = 'MATCH ✓';
          } else if (c.matched) {
            rowBg = '#451a03';
            badgeColor = '#78350f';
            badgeTextColor = 'var(--netlab-accent-yellow)';
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
                borderTop: '1px solid var(--netlab-bg-surface)',
                color: c.matched ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
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
          color: winner ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-yellow)',
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
  const circleColor = isCurrent ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)';
  const circleBorder = isCurrent ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)';

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
              background: 'var(--netlab-bg-surface)',
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

export interface StepControlsProps {
  /**
   * Whether stepping is this demo's primary action.
   *
   * Most demos are driven entirely by stepping, so it defaults to true. A demo
   * that has its own "start the exchange" button passes false: two elements
   * claiming `demo-primary-action` on one page makes the id ambiguous, and the
   * test then clicks whichever happens to come first.
   */
  primary?: boolean;
}

export function StepControls({ primary = true }: StepControlsProps = {}) {
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
        color: 'var(--netlab-text-primary)',
        background: 'var(--netlab-bg-primary)',
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
          borderBottom: '1px solid var(--netlab-bg-surface)',
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: 'var(--netlab-text-secondary)',
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
          <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
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
          borderTop: '1px solid var(--netlab-bg-surface)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => engine.step()}
            data-testid={primary ? 'demo-primary-action' : 'demo-step-action'}
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
              background: stepDisabled ? 'var(--netlab-bg-surface)' : 'var(--netlab-accent-blue)',
              color: stepDisabled ? 'var(--netlab-text-muted)' : '#fff',
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
              background: resetDisabled ? 'var(--netlab-bg-surface)' : 'var(--netlab-border)',
              color: resetDisabled ? 'var(--netlab-text-muted)' : 'var(--netlab-text-primary)',
            }}
          >
            ⟳ Reset
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--netlab-text-secondary)', textAlign: 'center' }}>
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
