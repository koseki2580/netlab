import type React from 'react';

export interface ToolGroupProps {
  /** Eyebrow label rendered above the segmented control (e.g. `'RUN'`). */
  title: string;
  /**
   * Accent color (CSS variable or any valid color). Drives the 2px inset
   * shadow under the segmented control to communicate the zone.
   */
  accent: string;
  /** Children — typically `<ToolGroupButton>` or any inline-flex content. */
  children: React.ReactNode;
  /** Optional className applied to the outermost wrapper. */
  className?: string;
  /** Optional style merged into the segmented-control wrapper. */
  style?: React.CSSProperties;
}

/**
 * Vertically stacked eyebrow + segmented control used by the simulator
 * toolbar to surface the TOPOLOGY / RUN / INSPECT / SANDBOX zones from
 * the flow-v1 handoff. The accent prop is rendered as an `inset` shadow
 * along the bottom edge so the zone color is visible without being
 * shouted in the chrome.
 */
export function ToolGroup({ title, accent, children, className, style }: ToolGroupProps) {
  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      data-tool-group={title}
    >
      <div
        style={{
          fontSize: 'var(--netlab-eyebrow, 9px)',
          fontWeight: 700,
          letterSpacing: 0.8,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <div
        role="group"
        aria-label={title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          borderRadius: 8,
          background: 'var(--netlab-bg-elevated)',
          border: '1px solid var(--netlab-border)',
          boxShadow: `inset 0 -2px 0 color-mix(in srgb, ${accent} 24%, transparent)`,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface ToolGroupButtonProps {
  /** Whether this button is the active selection within the group. */
  active?: boolean;
  /**
   * Accent color used when the button is active. Defaults to
   * `var(--netlab-text-primary)`. Typically matches the enclosing
   * `<ToolGroup accent>`.
   */
  accent?: string;
  /** Click handler. */
  onClick?: () => void;
  /** Tooltip-style hover label. */
  title?: string;
  /** ARIA-pressed override; defaults to `active`. */
  ariaPressed?: boolean;
  children: React.ReactNode;
}

export function ToolGroupButton({
  active = false,
  accent = 'var(--netlab-text-primary)',
  onClick,
  title,
  ariaPressed,
  children,
}: ToolGroupButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={ariaPressed ?? active}
      style={{
        all: 'unset',
        cursor: 'pointer',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 'var(--netlab-font, 11px)',
        padding: '5px 9px',
        borderRadius: 5,
        color: active ? accent : 'var(--netlab-text-secondary)',
        background: active ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'transparent',
        fontWeight: active ? 700 : 400,
      }}
    >
      {children}
    </button>
  );
}
