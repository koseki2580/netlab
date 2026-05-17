import type React from 'react';

export type NavRailView = 'gallery' | 'simulator';

export interface NavRailProps {
  view: NavRailView;
  onSelectView: (view: NavRailView) => void;
  onOpenSandbox?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
}

interface RailItem {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: (() => void) | undefined;
}

const RAIL_STYLE: React.CSSProperties = {
  width: 48,
  flex: '0 0 48px',
  height: '100vh',
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

const CELL_STYLE: React.CSSProperties = {
  all: 'unset',
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

function RailButton({ item }: { item: RailItem }) {
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

export function NavRail({
  view,
  onSelectView,
  onOpenSandbox,
  onOpenSettings,
  onOpenHelp,
}: NavRailProps) {
  const items: RailItem[] = [
    {
      label: 'Browse',
      icon: '⊞',
      active: view === 'gallery',
      onClick: () => onSelectView('gallery'),
    },
    {
      label: 'Run',
      icon: '▶',
      active: view === 'simulator',
      onClick: () => onSelectView('simulator'),
    },
    {
      label: 'Sandbox',
      icon: '✎',
      disabled: true,
      title: 'Sandbox global view is not wired yet',
      onClick: onOpenSandbox,
    },
    {
      label: 'Settings',
      icon: '⚙',
      disabled: true,
      title: 'Settings global view is not wired yet',
      onClick: onOpenSettings,
    },
  ];

  return (
    <nav data-netlab-nav-rail="" aria-label="Global navigation" style={RAIL_STYLE}>
      <button
        type="button"
        aria-label="Netlab gallery"
        title="Netlab gallery"
        onClick={() => onSelectView('gallery')}
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
        <RailButton key={item.label} item={item} />
      ))}
      <div style={{ marginTop: 'auto' }}>
        <RailButton
          item={{
            label: 'Help',
            icon: '?',
            onClick: onOpenHelp,
          }}
        />
      </div>
    </nav>
  );
}
