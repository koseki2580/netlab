import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface CommandPaletteItem {
  id: string;
  label: string;
  subtitle?: string;
  keywords?: readonly string[];
  group?: string;
  onSelect: () => void;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (needle.length === 0) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function matchScore(item: CommandPaletteItem, normalizedQuery: string): number | null {
  const label = normalize(item.label);
  const id = normalize(item.id);
  const subtitle = normalize(item.subtitle ?? '');
  const group = normalize(item.group ?? '');
  const keywords = (item.keywords ?? []).map(normalize);
  const searchable = [id, label, subtitle, group, ...keywords].join('');

  if (label === normalizedQuery) return 500;
  if (id === normalizedQuery) return 480;
  if (keywords.some((keyword) => keyword === normalizedQuery)) return 460;
  if (label.startsWith(normalizedQuery)) return 440;
  if (id.startsWith(normalizedQuery)) return 420;
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) return 400;
  if (label.includes(normalizedQuery)) return 360;
  if (id.includes(normalizedQuery)) return 340;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) return 320;
  if (subtitle.includes(normalizedQuery)) return 260;
  if (group.includes(normalizedQuery)) return 220;
  if (fuzzyIncludes(searchable, normalizedQuery)) return 100;
  return null;
}

export function filterCommandPaletteItems(
  items: readonly CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [...items];
  return items
    .map((item, index) => ({ item, index, score: matchScore(item, normalizedQuery) }))
    .filter((entry): entry is { item: CommandPaletteItem; index: number; score: number } => {
      return entry.score !== null;
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

export interface CommandPaletteProps {
  open: boolean;
  items: readonly CommandPaletteItem[];
  onClose: () => void;
}

export function CommandPalette({ open, items, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredItems = useMemo(() => filterCommandPaletteItems(items, query), [items, query]);

  const selectActiveIndex = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    selectActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, selectActiveIndex]);

  useEffect(() => {
    selectActiveIndex(0);
  }, [query, selectActiveIndex]);

  if (!open) return null;

  const runItem = (item: CommandPaletteItem | null) => {
    if (!item) return;
    item.onSelect();
    onClose();
  };

  return (
    <div
      data-netlab-command-palette=""
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        background: 'rgba(2, 6, 23, 0.58)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(620px, calc(100vw - 32px))',
          borderRadius: 10,
          border: '1px solid var(--netlab-border)',
          background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
          color: 'var(--netlab-text-primary)',
          boxShadow: '0 24px 72px rgba(0, 0, 0, 0.42)',
          overflow: 'hidden',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <input
          ref={inputRef}
          aria-label="Command palette search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onInput={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              selectActiveIndex(
                Math.max(0, Math.min(filteredItems.length - 1, activeIndexRef.current + 1)),
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              selectActiveIndex(Math.max(0, activeIndexRef.current - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const currentItems = filterCommandPaletteItems(items, event.currentTarget.value);
              runItem(currentItems[activeIndexRef.current] ?? currentItems[0] ?? null);
            }
          }}
          placeholder="Search scenarios and commands..."
          autoComplete="off"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 46,
            border: 'none',
            borderBottom: '1px solid var(--netlab-border)',
            background: 'transparent',
            color: 'var(--netlab-text-primary)',
            outline: 'none',
            padding: '0 14px',
            fontFamily: 'inherit',
            fontSize: 13,
          }}
        />
        <div
          role="listbox"
          aria-label="Command results"
          style={{ maxHeight: 360, overflow: 'auto' }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: 14, color: 'var(--netlab-text-muted)', fontSize: 12 }}>
              No commands found
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(item)}
                style={{
                  all: 'unset',
                  display: 'grid',
                  gap: 3,
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background:
                    index === activeIndex
                      ? 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)'
                      : 'transparent',
                  borderLeft:
                    index === activeIndex
                      ? '2px solid var(--netlab-accent-cyan)'
                      : '2px solid transparent',
                }}
              >
                <span
                  style={{ color: 'var(--netlab-text-primary)', fontSize: 12, fontWeight: 700 }}
                >
                  {item.label}
                </span>
                {(item.subtitle || item.group) && (
                  <span style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
                    {[item.group, item.subtitle].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
