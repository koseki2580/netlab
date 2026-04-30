import type React from 'react';

interface Category {
  id: string;
  label: string;
  color: string;
  demos: { path: string }[];
}

const GITHUB_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

interface SidebarProps {
  categories: Category[];
  featuredCount: number;
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

function NavRow({
  dot,
  label,
  count,
  href,
}: {
  dot?: string;
  label: string;
  count?: number;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        color: 'var(--netlab-text-secondary)',
        textDecoration: 'none',
        fontSize: 12,
        borderRadius: 4,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'var(--netlab-bg-elevated)';
        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--netlab-text-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = '';
        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--netlab-text-secondary)';
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
    </a>
  );
}

export function Sidebar({ categories, featuredCount }: SidebarProps) {
  return (
    <aside
      aria-label="Demo navigation"
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--netlab-bg-surface)',
        borderRight: '1px solid var(--netlab-border)',
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
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>📡 netlab</span>
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
        <NavRow
          dot="var(--netlab-accent-yellow)"
          label="Start here"
          count={featuredCount}
          href="#featured"
        />
        {categories.map((cat) => (
          <NavRow
            key={cat.id}
            dot={cat.color}
            label={cat.label}
            count={cat.demos.length}
            href={`#${cat.id}`}
          />
        ))}
      </NavGroup>

      {/* Reference */}
      <NavGroup label="Reference">
        <NavRow label="Docs" href="#" />
        <NavRow label="API" href="#" />
        <NavRow label="Layer Plugins" href="#" />
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
