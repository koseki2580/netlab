import type React from 'react';
import { useEffect, useState } from 'react';
import type { ShellStatusTone } from './NetlabAppShellV2';
import { STATUS_TONE_COLOR, STATUS_TONE_LABEL } from './shellStatusTones';
import { TOAST_EMIT_EVENT, type ToastEmitDetail } from './ToastBus';
import { useKbdMod } from '../utils/useKbdMod';

const MONO = 'ui-monospace, monospace';
const TOAST_MIRROR_MS = 5000;

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
  /**
   * P2: when wired, the `⌘K` segment becomes a real button that opens the
   * command palette. When omitted it renders as muted, non-interactive text —
   * the bar never advertises an action that does nothing.
   */
  onOpenPalette?: () => void;
  /** P2: when wired, the `? help` segment becomes a real button. */
  onOpenHelp?: () => void;
  /** Style override for the outer wrapper. */
  style?: React.CSSProperties;
  /** ClassName forwarded to the outer wrapper. */
  className?: string;
}

function sep() {
  return (
    <span aria-hidden="true" style={{ color: 'var(--netlab-text-muted)', padding: '0 6px' }}>
      ·
    </span>
  );
}

/** Ghost styling for the right-side StatusLine actions; cyan + pointer only when interactive. */
function statusLineActionStyle(interactive: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: interactive ? 'pointer' : 'default',
    color: interactive ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)',
    fontFamily: MONO,
    fontSize: 10,
    padding: '0 2px',
    borderRadius: 3,
  };
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
  onOpenPalette,
  onOpenHelp,
  style,
  className,
}: StatusLineProps) {
  const mod = useKbdMod();
  const paletteLabel = mod === '⌘' ? '⌘K' : 'Ctrl+K';

  // R5 — briefly mirror the latest toast message into the selection slot so the
  // bar acknowledges the action even after the toast itself auto-dismisses.
  const [toastMirror, setToastMirror] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let timer: number | null = null;
    function onEmit(event: Event) {
      const detail = (event as CustomEvent<ToastEmitDetail>).detail;
      if (!detail) return;
      setToastMirror(detail.message);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setToastMirror(null), TOAST_MIRROR_MS);
    }
    window.addEventListener(TOAST_EMIT_EVENT, onEmit);
    return () => {
      window.removeEventListener(TOAST_EMIT_EVENT, onEmit);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);
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
        {toastMirror ? (
          <span data-netlab-status-toast="" style={{ color: 'var(--netlab-accent-cyan)' }}>
            {toastMirror}
          </span>
        ) : (
          <span style={{ color: 'var(--netlab-text-muted)' }}>{selectedId ?? '—'} selected</span>
        )}
        {sep()}
        {onOpenPalette ? (
          <button
            type="button"
            aria-label="Open command palette"
            title={`Open command palette (${paletteLabel})`}
            onClick={onOpenPalette}
            style={statusLineActionStyle(true)}
          >
            {paletteLabel}
          </button>
        ) : (
          <span style={statusLineActionStyle(false)}>{paletteLabel}</span>
        )}
        {sep()}
        {onOpenHelp ? (
          <button
            type="button"
            aria-label="Open help"
            title="Open help"
            onClick={onOpenHelp}
            style={statusLineActionStyle(true)}
          >
            ? help
          </button>
        ) : (
          <span style={statusLineActionStyle(false)}>? help</span>
        )}
      </span>
    </div>
  );
}
