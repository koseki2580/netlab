import type React from 'react';

export type ShellStatusTone = 'idle' | 'ready' | 'running' | 'paused' | 'error';

export interface NetlabAppShellStatus {
  /** Short label such as `'running'` or `'ready'`. */
  label: string;
  tone: ShellStatusTone;
}

export interface NetlabAppShellProps {
  /**
   * Scenario id rendered in the toolbar identity chip (e.g.
   * `'ospf-convergence'`). Optional — omit to hide the chip.
   */
  scenarioId?: string;
  /** Layer label rendered beside the scenario id (e.g. `'L3'`). */
  scenarioLayer?: string;
  /**
   * Click handler for the far-left "← Gallery" button. Omitting hides the
   * button (e.g. for embedded contexts where back-navigation is owned by
   * the host).
   */
  onBackToGallery?: () => void;
  /** Back-button label. Defaults to `'Gallery'`. */
  backLabel?: string;

  /**
   * Zone slots — each is rendered as a flex item between the identity chip
   * and the right-aligned status/export adornments. Compose them with
   * `<ToolGroup>` + `<ToolGroupButton>`.
   */
  topologyZone?: React.ReactNode;
  runZone?: React.ReactNode;
  inspectZone?: React.ReactNode;
  sandboxZone?: React.ReactNode;

  /** Optional status pill rendered far right (`running` / `ready` / ...). */
  status?: NetlabAppShellStatus;
  /** Right-side adornment (typically `<button>Export</button>`). */
  rightAdornment?: React.ReactNode;

  /**
   * Optional hint pill rendered top-right of the canvas frame (e.g.
   * `'Tip · click R1 to inspect →'`). Use `prefers-reduced-motion: reduce`
   * to disable the pulse animation — the `netlab-hint-pulse` class in
   * `animations.css` already handles this.
   */
  hint?: React.ReactNode;

  /** Optional className applied to the outermost wrapper. */
  className?: string;
  /** Optional style merged into the outermost wrapper. */
  style?: React.CSSProperties;

  /** Canvas / body content. Rendered inside a bordered frame. */
  children: React.ReactNode;
}

const STATUS_TONE: Record<ShellStatusTone, string> = {
  idle: 'var(--netlab-text-muted)',
  ready: 'var(--netlab-accent-green)',
  running: 'var(--netlab-accent-cyan)',
  paused: 'var(--netlab-accent-yellow)',
  error: 'var(--netlab-accent-red)',
};

function statusPillStyle(tone: ShellStatusTone): React.CSSProperties {
  const color = STATUS_TONE[tone];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 28%, var(--netlab-border))`,
  };
}

/**
 * Opt-in chrome wrapper that renders the flow-v1 simulator shell — a
 * top toolbar with four semantic zones (TOPOLOGY / RUN / INSPECT /
 * SANDBOX), an identity chip, a back-to-gallery button, and an optional
 * status pill + export adornment on the right. The shell is layout-only
 * — it owns no state. Compose it with `<NetlabApp>` or any other body
 * content.
 */
export function NetlabAppShell({
  scenarioId,
  scenarioLayer,
  onBackToGallery,
  backLabel = 'Gallery',
  topologyZone,
  runZone,
  inspectZone,
  sandboxZone,
  status,
  rightAdornment,
  hint,
  className,
  style,
  children,
}: NetlabAppShellProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--netlab-gap, 12px)',
        padding: 'var(--netlab-pad, 14px)',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--netlab-bg-primary)',
        color: 'var(--netlab-text-primary)',
        ...style,
      }}
      data-netlab-app-shell=""
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 14,
          flexWrap: 'wrap',
          padding: 'var(--netlab-pad, 14px)',
          borderRadius: 10,
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
        }}
      >
        {onBackToGallery && (
          <button
            type="button"
            onClick={onBackToGallery}
            aria-label={`Back to ${backLabel.toLowerCase()}`}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 'var(--netlab-font, 11px)',
              color: 'var(--netlab-text-secondary)',
              border: '1px solid var(--netlab-border)',
              alignSelf: 'center',
            }}
          >
            ← {backLabel}
          </button>
        )}
        {scenarioId && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignSelf: 'center',
            }}
          >
            <span
              style={{
                fontSize: 'var(--netlab-title, 14px)',
                fontWeight: 700,
                color: 'var(--netlab-text-primary)',
              }}
            >
              📡 netlab
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--netlab-text-muted)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              scenario://{scenarioId}
              {scenarioLayer ? ` · ${scenarioLayer}` : ''}
            </span>
          </div>
        )}
        {(scenarioId || onBackToGallery) &&
          (topologyZone || runZone || inspectZone || sandboxZone) && (
            <div
              aria-hidden="true"
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'var(--netlab-border)',
                margin: '0 4px',
              }}
            />
          )}
        {topologyZone}
        {runZone}
        {inspectZone}
        {sandboxZone}
        {(status || rightAdornment) && (
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'center',
            }}
          >
            {status && <span style={statusPillStyle(status.tone)}>{status.label}</span>}
            {rightAdornment}
          </div>
        )}
      </header>
      <section
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          border: '1px solid var(--netlab-border)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--netlab-bg-primary)',
        }}
      >
        {children}
        {hint && (
          <div
            className="netlab-hint-pulse"
            data-netlab-shell-hint=""
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '6px 10px',
              borderRadius: 999,
              background:
                'color-mix(in srgb, var(--netlab-accent-cyan) 14%, var(--netlab-bg-surface))',
              border:
                '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 30%, var(--netlab-border))',
              color: 'var(--netlab-accent-cyan)',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {hint}
          </div>
        )}
      </section>
    </div>
  );
}
