import { useT } from '../localeContext';
import './gallery.css';

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

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

export function SearchBox({ value, onChange, onClear, resultCount, totalCount }: SearchBoxProps) {
  const t = useT();
  const hasQuery = value.trim().length > 0;

  return (
    <label
      className="nl-gallery-search"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--netlab-bg-surface) 88%, var(--netlab-bg-primary)) 0%, color-mix(in srgb, var(--netlab-bg-elevated) 68%, var(--netlab-bg-primary)) 100%)',
        border: '1px solid color-mix(in srgb, var(--netlab-accent-blue) 16%, var(--netlab-border))',
        borderRadius: 999,
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
        padding: '0 14px',
        height: 40,
        cursor: 'text',
        maxWidth: '100%',
      }}
    >
      <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{SEARCH_ICON}</span>
      <input
        type="search"
        aria-label={t('Search demos, protocols, layers', 'デモ・プロトコル・レイヤーを検索')}
        placeholder={t('Search demos, protocols, layers…', 'デモ・プロトコル・レイヤーを検索…')}
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 12.5,
          width: 240,
          maxWidth: '100%',
        }}
      />
      {hasQuery ? (
        <>
          <span
            style={{
              fontSize: 10,
              color: 'var(--netlab-text-muted)',
              background: 'color-mix(in srgb, var(--netlab-bg-surface) 80%, transparent)',
              border: '1px solid var(--netlab-border)',
              borderRadius: 999,
              padding: '2px 7px',
              flexShrink: 0,
            }}
          >
            {resultCount}/{totalCount}
          </span>
          <button
            type="button"
            aria-label={t('Clear search', '検索をクリア')}
            onClick={onClear}
            className="nl-gallery-focusable"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--netlab-text-muted)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: 0,
              flexShrink: 0,
            }}
          >
            {t('Clear', 'クリア')}
          </button>
        </>
      ) : (
        <kbd
          style={{
            background: 'color-mix(in srgb, var(--netlab-bg-surface) 80%, transparent)',
            border: '1px solid var(--netlab-border)',
            borderRadius: 999,
            padding: '2px 7px',
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            flexShrink: 0,
          }}
        >
          ⌘K
        </kbd>
      )}
    </label>
  );
}
