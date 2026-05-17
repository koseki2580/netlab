import type React from 'react';
import type { ShellStatusTone } from './NetlabAppShell';

/**
 * `StatusLine` is the persistent, one-line status bar that sits between the
 * canvas and the timeline. It is intentionally **props-only** — the parent
 * scene wires in the values it has (scenario id, simulation step / status,
 * counts). Anything not provided defaults to zero or `'—'` so the bar is
 * always renderable.
 *
 * The playbook (v5, N5) treats this as the durable replacement for the
 * ephemeral hint pulse pill: instead of pulsing once on load, the status line
 * is always visible — users learn to read it instead of waiting for a tip.
 */

export interface StatusLineProps {
  /** Scenario id rendered as the left segment, e.g. `'ospf-convergence'`. */
  scenarioId?: string;
  /** Current 0-indexed step in the playback. Pair with `totalSteps`. */
  step?: number;
  /** Total number of steps; if omitted the step counter is hidden. */
  totalSteps?: number;
  /** Engine status — drives the colored dot in the center segment. */
  status?: ShellStatusTone;
  /** Cumulative packets emitted so far in the current scenario run. */
  packetsCount?: number;
  /** Cumulative dropped packets. */
  dropsCount?: number;
  /** Cumulative ARP resolutions (or table entries — caller's choice). */
  arpCount?: number;
  /** Currently selected node id, or `null` when nothing is selected. */
  selectedId?: string | null;
  /** Style override for the outer wrapper. */
  style?: React.CSSProperties;
  /** ClassName forwarded to the outer wrapper. */
  className?: string;
}

const STATUS_TONE_COLOR: Record<ShellStatusTone, string> = {
  idle: 'var(--netlab-text-muted)',
  ready: 'var(--netlab-accent-yellow)',
  running: 'var(--netlab-accent-green)',
  paused: 'var(--netlab-accent-yellow)',
  error: 'var(--netlab-accent-red)',
};

const STATUS_TONE_LABEL: Record<ShellStatusTone, string> = {
  idle: 'idle',
  ready: 'ready',
  running: 'running',
  paused: 'paused',
  error: 'error',
};

function sep() {
  return (
    <span aria-hidden="true" style={{ color: 'var(--netlab-text-muted)', padding: '0 6px' }}>
      ·
    </span>
  );
}

export function StatusLine({
  scenarioId,
  step,
  totalSteps,
  status = 'idle',
  packetsCount = 0,
  dropsCount = 0,
  arpCount = 0,
  selectedId,
  style,
  className,
}: StatusLineProps) {
  const showStep = typeof step === 'number' && typeof totalSteps === 'number' && totalSteps > 0;
  const toneColor = STATUS_TONE_COLOR[status];
  const toneLabel = STATUS_TONE_LABEL[status];

  return (
    <div
      data-netlab-status-line=""
      role="status"
      aria-live="polite"
      className={className}
      style={{
        height: 22,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '0 10px',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        color: 'var(--netlab-text-secondary)',
        background: 'var(--netlab-bg-elevated)',
        borderTop: '1px solid var(--netlab-border-subtle, var(--netlab-border))',
        borderBottom: '1px solid var(--netlab-border-subtle, var(--netlab-border))',
        ...style,
      }}
    >
      {/* Left segment */}
      <span style={{ color: 'var(--netlab-text-secondary)' }}>
        {scenarioId ? `scenario://${scenarioId}` : '—'}
      </span>
      {showStep && (
        <>
          {sep()}
          <span style={{ color: 'var(--netlab-accent-cyan)' }}>
            step {(step as number) + 1}/{totalSteps}
          </span>
        </>
      )}

      {sep()}

      {/* Center segment */}
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: toneColor,
          marginRight: 4,
        }}
      />
      <span style={{ color: toneColor }}>{toneLabel}</span>
      {sep()}
      <span>
        pkts <span style={{ color: 'var(--netlab-accent-cyan)' }}>{packetsCount}</span>
      </span>
      {sep()}
      <span>
        drops{' '}
        <span
          style={{
            color: dropsCount > 0 ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-green)',
          }}
        >
          {dropsCount}
        </span>
      </span>
      {sep()}
      <span>
        arp <span style={{ color: 'var(--netlab-accent-yellow)' }}>{arpCount}</span>
      </span>

      {/* Right segment (pushed right) */}
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ color: 'var(--netlab-text-muted)' }}>{selectedId ?? '—'} selected</span>
        {sep()}
        <span style={{ color: 'var(--netlab-accent-cyan)' }}>⌘K</span>
        {sep()}
        <span style={{ color: 'var(--netlab-accent-cyan)' }}>? help</span>
      </span>
    </div>
  );
}
