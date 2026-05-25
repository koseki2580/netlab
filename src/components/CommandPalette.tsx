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

// ─────────────────────────────────────────────────────────────────────────────
// R09 R2 — recents (LRU, persisted)
// ─────────────────────────────────────────────────────────────────────────────

const RECENTS_KEY = 'nl_palette_recents';
const RECENTS_MAX = 5;

export function loadRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

export function recordRecent(id: string): void {
  try {
    const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENTS_MAX);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* localStorage unavailable — recents are best-effort */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// R09 R2 — subsequence highlight (independent of ranking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Case-insensitive subsequence positions of `query` within the original
 * `label`, for highlighting. Returns `[]` when not all query chars are present
 * (e.g. when the item matched via keyword/subtitle, not the visible label).
 */
export function labelMatchIndices(label: string, query: string): number[] {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return [];
  const l = label.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  for (let li = 0; li < l.length && qi < q.length; li++) {
    if (l[li] === q[qi]) {
      indices.push(li);
      qi++;
    }
  }
  return qi === q.length ? indices : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// R09 R2 — view model: Recents + category groups (empty query) / flat (query)
// ─────────────────────────────────────────────────────────────────────────────

export interface PaletteSection {
  key: string;
  /** Eyebrow shown above the section, or null for an unlabeled flat result list. */
  label: string | null;
  items: CommandPaletteItem[];
}

export interface PaletteView {
  sections: PaletteSection[];
  /** Flat render/navigation order (group headers are skipped). */
  ordered: CommandPaletteItem[];
}

export function buildPaletteView(
  items: readonly CommandPaletteItem[],
  query: string,
  recents: readonly string[],
): PaletteView {
  if (normalize(query)) {
    const ordered = filterCommandPaletteItems(items, query);
    return { sections: [{ key: 'results', label: null, items: ordered }], ordered };
  }

  // Empty query: Recents first, then each group in first-appearance order.
  const byId = new Map(items.map((item) => [item.id, item]));
  const recentItems: CommandPaletteItem[] = [];
  const seen = new Set<string>();
  for (const id of recents) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      recentItems.push(item);
      seen.add(id);
    }
  }

  const groupOrder: string[] = [];
  const grouped = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    if (seen.has(item.id)) continue; // de-dup: recents are not repeated below
    const group = item.group ?? 'Commands';
    if (!grouped.has(group)) {
      grouped.set(group, []);
      groupOrder.push(group);
    }
    grouped.get(group)!.push(item);
  }

  const sections: PaletteSection[] = [];
  if (recentItems.length > 0) {
    sections.push({ key: 'recents', label: 'recents', items: recentItems });
  }
  for (const group of groupOrder) {
    sections.push({ key: `group:${group}`, label: group, items: grouped.get(group)! });
  }

  return { sections, ordered: sections.flatMap((s) => s.items) };
}

export interface CommandPaletteProps {
  open: boolean;
  items: readonly CommandPaletteItem[];
  onClose: () => void;
}

export function CommandPalette({ open, items, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const activeIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const view = useMemo(() => buildPaletteView(items, query, recents), [items, query, recents]);
  const ordered = view.ordered;

  const selectActiveIndex = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRecents(loadRecents());
    selectActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, selectActiveIndex]);

  useEffect(() => {
    selectActiveIndex(0);
  }, [query, selectActiveIndex]);

  const runItem = useCallback(
    (item: CommandPaletteItem | null) => {
      if (!item) return;
      recordRecent(item.id);
      item.onSelect();
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  let runningIndex = -1;

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
          data-testid="command-palette-search"
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
                Math.max(0, Math.min(ordered.length - 1, activeIndexRef.current + 1)),
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              selectActiveIndex(Math.max(0, activeIndexRef.current - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              // Recompute from the live input value: an input+Enter pair can be
              // dispatched in one batch before the query state has re-rendered.
              const live = buildPaletteView(items, event.currentTarget.value, recents).ordered;
              runItem(live[activeIndexRef.current] ?? live[0] ?? null);
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
          {ordered.length === 0 ? (
            <div style={{ padding: 14, color: 'var(--netlab-text-muted)', fontSize: 12 }}>
              No commands found
            </div>
          ) : (
            view.sections.map((section) =>
              section.items.length === 0 ? null : (
                <div key={section.key} role="group" aria-label={section.label ?? undefined}>
                  {section.label && (
                    <div
                      data-testid="command-palette-group"
                      style={{
                        padding: '8px 14px 4px',
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: 'var(--netlab-text-muted)',
                      }}
                    >
                      {section.label}
                    </div>
                  )}
                  {section.items.map((item) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        data-testid="command-palette-option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => selectActiveIndex(index)}
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
                          style={{
                            color: 'var(--netlab-text-primary)',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <HighlightedLabel label={item.label} query={query} />
                        </span>
                        {(item.subtitle || (query && item.group)) && (
                          <span style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
                            {[query ? item.group : null, item.subtitle].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightedLabel({ label, query }: { label: string; query: string }) {
  const indices = labelMatchIndices(label, query);
  if (indices.length === 0) return <>{label}</>;
  const matched = new Set(indices);
  return (
    <>
      {[...label].map((ch, i) =>
        matched.has(i) ? (
          <span key={i} data-match="" style={{ color: 'var(--netlab-accent-cyan)' }}>
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </>
  );
}
