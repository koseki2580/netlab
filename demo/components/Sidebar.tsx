import type React from 'react';

interface Category {
  id: string;
  label: string;
  color: string;
  count: number;
}

interface ReferenceLink {
  label: string;
  href: string;
}

const GITHUB_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

interface SidebarProps {
  browseItems: Category[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
          padding: '0 12px',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function NavButtonRow({
  dot,
  sectionId,
  isActive,
  label,
  count,
  onSelect,
}: {
  dot?: string;
  sectionId: string;
  isActive: boolean;
  label: string;
  count?: number;
  onSelect: (sectionId: string) => void;
}) {
  const borderColor = isActive
    ? `color-mix(in srgb, ${dot ?? 'var(--netlab-accent-blue)'} 22%, var(--netlab-border))`
    : 'color-mix(in srgb, var(--netlab-bg-surface) 72%, var(--netlab-border))';
  const background = isActive
    ? `color-mix(in srgb, ${dot ?? 'var(--netlab-accent-blue)'} 16%, var(--netlab-bg-surface))`
    : 'color-mix(in srgb, var(--netlab-bg-surface) 74%, var(--netlab-bg-primary))';

  return (
    <button
      type="button"
      data-section-id={sectionId}
      data-active={isActive ? 'true' : 'false'}
      aria-pressed={isActive}
      onClick={() => onSelect(sectionId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        margin: '0 8px 4px',
        color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
        background,
        border: `1px solid ${borderColor}`,
        fontSize: 12,
        borderRadius: 12,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        width: 'calc(100% - 16px)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          `color-mix(in srgb, ${dot ?? 'var(--netlab-accent-blue)'} 14%, var(--netlab-bg-surface))`;
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--netlab-text-primary)';
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          `color-mix(in srgb, ${dot ?? 'var(--netlab-accent-blue)'} 24%, var(--netlab-border))`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = background;
        (e.currentTarget as HTMLButtonElement).style.color = isActive
          ? 'var(--netlab-text-primary)'
          : 'var(--netlab-text-secondary)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = borderColor;
      }}
    >
      {dot ? (
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ width: 8, flexShrink: 0 }} />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined ? (
        <span
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            background: 'var(--netlab-bg-elevated)',
            borderRadius: 10,
            padding: '1px 6px',
          }}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function NavLinkRow({ label, href }: ReferenceLink) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        margin: '0 8px 4px',
        color: 'var(--netlab-text-secondary)',
        textDecoration: 'none',
        fontSize: 12,
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--netlab-bg-surface) 74%, var(--netlab-bg-primary))',
        border: '1px solid color-mix(in srgb, var(--netlab-bg-surface) 72%, var(--netlab-border))',
      }}
    >
      <span style={{ width: 8, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>↗</span>
    </a>
  );
}

const REFERENCE_LINKS: ReferenceLink[] = [
  {
    label: 'Docs',
    href: 'https://github.com/koseki2580/netlab/blob/main/docs/README.md',
  },
  {
    label: 'API',
    href: 'https://github.com/koseki2580/netlab/blob/main/docs/core/api.md',
  },
  {
    label: 'Layer Plugins',
    href: 'https://github.com/koseki2580/netlab/blob/main/docs/core/plugins.md',
  },
];

export function Sidebar({ browseItems, activeSectionId, onSelectSection }: SidebarProps) {
  return (
    <aside
      aria-label="Demo navigation"
      data-netlab-sidebar
      style={{
        width: 248,
        flexShrink: 0,
        alignSelf: 'start',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--netlab-bg-surface) 84%, var(--netlab-bg-primary)) 0%, var(--netlab-bg-primary) 100%)',
        borderRight: '1px solid var(--netlab-border)',
        boxShadow: '16px 0 40px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '16px 0',
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: '0 12px 16px',
          borderBottom: '1px solid var(--netlab-border)',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--netlab-text-primary)' }}>
          📡 netlab
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            marginTop: 2,
          }}
        >
          v0.1.0
        </span>
      </div>

      {/* Browse */}
      <NavGroup label="Browse">
        {browseItems.map((item) => (
          <NavButtonRow
            key={item.id}
            dot={item.color}
            sectionId={item.id}
            isActive={item.id === activeSectionId}
            label={item.label}
            count={item.count}
            onSelect={onSelectSection}
          />
        ))}
      </NavGroup>

      {/* Reference */}
      <NavGroup label="Reference">
        {REFERENCE_LINKS.map((link) => (
          <NavLinkRow key={link.label} {...link} />
        ))}
      </NavGroup>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px',
          borderTop: '1px solid var(--netlab-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'color-mix(in srgb, var(--netlab-bg-surface) 48%, var(--netlab-bg-primary))',
        }}
      >
        <a
          href="https://github.com/koseki2580/netlab"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--netlab-text-muted)',
            textDecoration: 'none',
            fontSize: 11,
          }}
        >
          {GITHUB_ICON}
          GitHub
        </a>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span>⌘</span>
          Keyboard shortcuts
        </button>
      </div>
    </aside>
  );
}
