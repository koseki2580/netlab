const SEARCH_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
);

export function SearchBox() {
  // TODO(search): wire up filtering against demo list
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--netlab-bg-elevated)',
        border: '1px solid var(--netlab-border)',
        borderRadius: 6,
        padding: '0 10px',
        height: 32,
        cursor: 'text',
      }}
    >
      <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{SEARCH_ICON}</span>
      <input
        type="search"
        aria-label="Search demos, protocols, layers"
        placeholder="Search demos, protocols, layers…"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 12,
          width: 220,
        }}
      />
      <kbd
        style={{
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 4,
          padding: '1px 5px',
          fontSize: 10,
          color: 'var(--netlab-text-muted)',
          flexShrink: 0,
        }}
      >
        ⌘K
      </kbd>
    </label>
  );
}
