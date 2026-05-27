import type React from 'react';

export type NavRailView = 'gallery' | 'simulator';

/**
 * Layout variant. `'rail'` is the default 48px left column. `'bottom'` is the
 * narrow-viewport (S1) horizontal bar pinned to the bottom of the shell: items
 * run left-to-right with the help button pushed to the right edge.
 */
export type NavRailVariant = 'rail' | 'bottom';

export interface NavRailItem {
  /** Stable identity used as the React key. */
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  /**
   * Disabled at runtime for an item that legitimately can't act yet (e.g.
   * "Compare" with no sibling). NOT a placeholder for "not implemented" — those
   * items must be omitted from the array entirely (P4).
   */
  disabled?: boolean;
  title?: string;
  onClick?: (() => void) | undefined;
}

export interface NavRailProps {
  /** Primary navigation items. Caller-controlled — the rail ships no defaults. */
  items: NavRailItem[];
  /** Brand mark click; returns to the gallery. Omit to render the brand as decoration. */
  onOpenBrand?: () => void;
  /** Bottom help button — opens the global keyboard shortcut popover. */
  onOpenHelp?: () => void;
  /** Layout variant. Defaults to `'rail'` (left column). */
  variant?: NavRailVariant;
}

const RAIL_STYLE: React.CSSProperties = {
  width: 48,
  flex: '0 0 48px',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '8px 6px',
  background: 'var(--netlab-bg-surface, #1e293b)',
  borderRight: '1px solid var(--netlab-border, #334155)',
  color: 'var(--netlab-text-secondary, #94a3b8)',
};

/** Narrow-viewport (S1) horizontal bar pinned to the bottom of the shell. */
const BOTTOM_STYLE: React.CSSProperties = {
  width: '100%',
  flex: '0 0 56px',
  height: 56,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  padding: '0 12px',
  background: 'var(--netlab-bg-surface, #1e293b)',
  borderTop: '1px solid var(--netlab-border, #334155)',
  color: 'var(--netlab-text-secondary, #94a3b8)',
};

const CELL_STYLE: React.CSSProperties = {
  all: 'unset',
  // P5: anchor for the invisible ::before 44px hit-area expander (see shell-chrome.css).
  position: 'relative',
  width: 32,
  height: 32,
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  borderLeftWidth: 2,
  borderLeftStyle: 'solid',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 15,
  lineHeight: 1,
  cursor: 'pointer',
};

function itemStyle(active?: boolean, disabled?: boolean): React.CSSProperties {
  return {
    ...CELL_STYLE,
    borderLeftColor: active ? 'var(--netlab-accent-cyan)' : 'transparent',
    color: active
      ? 'var(--netlab-accent-cyan)'
      : disabled
        ? 'var(--netlab-text-faint, #64748b)'
        : 'var(--netlab-text-secondary, #94a3b8)',
    background: active
      ? 'color-mix(in srgb, var(--netlab-accent-cyan) 12%, transparent)'
      : 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}

function RailButton({ item }: { item: NavRailItem }) {
  return (
    <button
      type="button"
      data-netlab-rail-item=""
      aria-label={item.label}
      aria-current={item.active ? 'page' : undefined}
      disabled={item.disabled}
      tabIndex={item.disabled ? -1 : undefined}
      title={item.title ?? item.label}
      onClick={item.disabled ? undefined : item.onClick}
      style={itemStyle(item.active, item.disabled)}
    >
      {item.icon}
    </button>
  );
}

export function NavRail({ items, onOpenBrand, onOpenHelp, variant = 'rail' }: NavRailProps) {
  const isBottom = variant === 'bottom';
  // In the rail, the help button drops to the bottom (`marginTop`); in the
  // bottom bar it slides to the right edge (`marginLeft`).
  const helpSpacing: React.CSSProperties = isBottom
    ? { marginLeft: 'auto' }
    : { marginTop: 'auto' };
  return (
    <nav
      data-netlab-nav-rail=""
      data-variant={variant}
      aria-label="Global navigation"
      style={isBottom ? BOTTOM_STYLE : RAIL_STYLE}
    >
      <button
        type="button"
        aria-label="Netlab gallery"
        title="Netlab gallery"
        onClick={onOpenBrand}
        style={{
          ...CELL_STYLE,
          borderLeftColor: 'transparent',
          color: 'var(--netlab-text-primary, #e2e8f0)',
          background: 'transparent',
          fontSize: 16,
        }}
      >
        📡
      </button>
      {items.map((item) => (
        <RailButton key={item.id} item={item} />
      ))}
      <div style={helpSpacing}>
        <RailButton item={{ id: 'help', label: 'Help', icon: '?', onClick: onOpenHelp }} />
      </div>
    </nav>
  );
}
