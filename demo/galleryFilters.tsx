/**
 * R09 R3 — Gallery filters.
 *
 * Search + difficulty + tags + sandbox-ready filtering for the demo gallery.
 * State is URL-synced (NOT localStorage) so a filtered gallery is shareable:
 *   ?q=&difficulty=&tags=&sandbox=1
 *
 * The text query is debounced (150ms) before it hits the URL / filtering; the
 * chip toggles apply immediately. The q substring match runs against a caller-
 * supplied `searchText` blob when present (so category label + scenario id stay
 * searchable), falling back to title/desc/tags.
 */

import { useCallback, useEffect, useState } from 'react';

const MONO = 'ui-monospace, monospace';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export const DIFFICULTY_VALUES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export interface DemoLike {
  title: string;
  desc: string;
  meta?: { difficulty?: Difficulty; tags?: string[] };
  sandboxReady?: boolean;
  /** Extra text folded into the q search blob (e.g. category label, scenarioId). */
  searchText?: string;
}

export interface GalleryFilters {
  q: string;
  difficulties: Difficulty[];
  tags: string[];
  sandboxOnly: boolean;
}

const EMPTY_FILTERS: GalleryFilters = { q: '', difficulties: [], tags: [], sandboxOnly: false };

// ─────────────────────────────────────────────────────────────────────────────
// URL <-> state
// ─────────────────────────────────────────────────────────────────────────────

export function readFiltersFromUrl(initialQuery = ''): GalleryFilters {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS, q: initialQuery };
  const sp = new URLSearchParams(window.location.search);
  const difficulties = (sp.get('difficulty')?.split(',') ?? []).filter((d): d is Difficulty =>
    (DIFFICULTY_VALUES as readonly string[]).includes(d),
  );
  const tags = (sp.get('tags')?.split(',') ?? []).filter(Boolean);
  return {
    q: sp.get('q') ?? initialQuery,
    difficulties,
    tags,
    sandboxOnly: sp.get('sandbox') === '1',
  };
}

export function writeFiltersToUrl(f: GalleryFilters): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const sp = url.searchParams;
  setOrDelete(sp, 'q', f.q || null);
  setOrDelete(sp, 'difficulty', f.difficulties.length ? f.difficulties.join(',') : null);
  setOrDelete(sp, 'tags', f.tags.length ? f.tags.join(',') : null);
  setOrDelete(sp, 'sandbox', f.sandboxOnly ? '1' : null);
  window.history.replaceState(window.history.state, '', url.toString());
}

function setOrDelete(sp: URLSearchParams, key: string, value: string | null): void {
  if (value === null) {
    sp.delete(key);
  } else {
    sp.set(key, value);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseGalleryFilters {
  filters: GalleryFilters;
  /** The query after the 150ms debounce — use this for filtering. */
  debouncedQ: string;
  setQuery: (q: string) => void;
  toggleDifficulty: (d: Difficulty) => void;
  toggleTag: (t: string) => void;
  setSandboxOnly: (v: boolean) => void;
  clearAll: () => void;
  isEmpty: boolean;
}

export function useGalleryFilters(initialQuery = ''): UseGalleryFilters {
  const [filters, setFilters] = useState<GalleryFilters>(() => readFiltersFromUrl(initialQuery));
  const [debouncedQ, setDebouncedQ] = useState(filters.q);

  // Debounce the typed query (150ms) before it reaches the URL / filtering.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filters.q), 150);
    return () => window.clearTimeout(id);
  }, [filters.q]);

  // The chip toggles apply immediately; the query rides the debounced value.
  useEffect(() => {
    writeFiltersToUrl({ ...filters, q: debouncedQ });
  }, [debouncedQ, filters]);

  const setQuery = useCallback((q: string) => setFilters((f) => ({ ...f, q })), []);
  const toggleDifficulty = useCallback((d: Difficulty) => {
    setFilters((f) => ({
      ...f,
      difficulties: f.difficulties.includes(d)
        ? f.difficulties.filter((x) => x !== d)
        : [...f.difficulties, d],
    }));
  }, []);
  const toggleTag = useCallback((t: string) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
    }));
  }, []);
  const setSandboxOnly = useCallback(
    (v: boolean) => setFilters((f) => ({ ...f, sandboxOnly: v })),
    [],
  );
  const clearAll = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const isEmpty =
    !filters.q &&
    filters.difficulties.length === 0 &&
    filters.tags.length === 0 &&
    !filters.sandboxOnly;

  return {
    filters,
    debouncedQ,
    setQuery,
    toggleDifficulty,
    toggleTag,
    setSandboxOnly,
    clearAll,
    isEmpty,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// matching + aggregation
// ─────────────────────────────────────────────────────────────────────────────

export function matchesFilters(demo: DemoLike, f: GalleryFilters, debouncedQ: string): boolean {
  if (f.sandboxOnly && !demo.sandboxReady) return false;
  if (f.difficulties.length > 0) {
    const d = demo.meta?.difficulty;
    if (!d || !f.difficulties.includes(d)) return false;
  }
  if (f.tags.length > 0) {
    const ts = demo.meta?.tags ?? [];
    if (!f.tags.some((t) => ts.includes(t))) return false;
  }
  const q = debouncedQ.trim().toLowerCase();
  if (q) {
    const blob = (
      demo.searchText ?? `${demo.title} ${demo.desc} ${(demo.meta?.tags ?? []).join(' ')}`
    ).toLowerCase();
    if (!blob.includes(q)) return false;
  }
  return true;
}

export function aggregateTags(demos: DemoLike[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of demos) {
    for (const t of d.meta?.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// ─────────────────────────────────────────────────────────────────────────────
// presentational
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterChipProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

export function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: '4px 10px',
        borderRadius: 'var(--netlab-radius-pill, 999px)',
        border: `1px solid ${active ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
        background: active
          ? 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)'
          : 'var(--netlab-bg-surface)',
        color: active ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-secondary)',
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 0.4,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ color: 'var(--netlab-text-muted)', fontWeight: 400 }}>{count}</span>
      )}
    </button>
  );
}

const CHIP_ROW: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
};

const TOP_TAGS = 8;

export interface GalleryFilterControlsProps {
  filters: GalleryFilters;
  tags: { tag: string; count: number }[];
  onToggleDifficulty: (d: Difficulty) => void;
  onToggleTag: (t: string) => void;
  onSetSandboxOnly: (v: boolean) => void;
}

export function GalleryFilterControls({
  filters,
  tags,
  onToggleDifficulty,
  onToggleTag,
  onSetSandboxOnly,
}: GalleryFilterControlsProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const visibleTags = showAllTags ? tags : tags.slice(0, TOP_TAGS);

  return (
    <div
      data-testid="gallery-filter-controls"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}
    >
      <div style={CHIP_ROW} role="group" aria-label="Difficulty">
        {DIFFICULTY_VALUES.map((d) => (
          <FilterChip
            key={d}
            label={d}
            active={filters.difficulties.includes(d)}
            onClick={() => onToggleDifficulty(d)}
          />
        ))}
      </div>
      <span aria-hidden style={{ color: 'var(--netlab-text-muted)' }}>
        ·
      </span>
      <div style={CHIP_ROW} role="group" aria-label="Tags">
        {visibleTags.map(({ tag, count }) => (
          <FilterChip
            key={tag}
            label={tag}
            count={count}
            active={filters.tags.includes(tag)}
            onClick={() => onToggleTag(tag)}
          />
        ))}
        {tags.length > TOP_TAGS && (
          <button
            type="button"
            onClick={() => setShowAllTags((v) => !v)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: MONO,
              fontSize: 10,
              color: 'var(--netlab-accent-cyan)',
              padding: '4px 6px',
            }}
          >
            {showAllTags ? 'less' : `more (${tags.length - TOP_TAGS})`}
          </button>
        )}
      </div>
      <span aria-hidden style={{ color: 'var(--netlab-text-muted)' }}>
        ·
      </span>
      <FilterChip
        label="sandbox-ready"
        active={filters.sandboxOnly}
        onClick={() => onSetSandboxOnly(!filters.sandboxOnly)}
      />
    </div>
  );
}

export interface ActiveFiltersProps {
  filters: GalleryFilters;
  onToggleDifficulty: (d: Difficulty) => void;
  onToggleTag: (t: string) => void;
  onSetSandboxOnly: (v: boolean) => void;
  onClearAll: () => void;
}

/** Removable chips for every applied filter + a clear-all on the right. */
export function ActiveFilters({
  filters,
  onToggleDifficulty,
  onToggleTag,
  onSetSandboxOnly,
  onClearAll,
}: ActiveFiltersProps) {
  return (
    <div
      data-testid="gallery-active-filters"
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
    >
      <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--netlab-text-muted)' }}>
        active:
      </span>
      {filters.difficulties.map((d) => (
        <RemovableChip key={`d:${d}`} label={d} onRemove={() => onToggleDifficulty(d)} />
      ))}
      {filters.tags.map((t) => (
        <RemovableChip key={`t:${t}`} label={t} onRemove={() => onToggleTag(t)} />
      ))}
      {filters.sandboxOnly && (
        <RemovableChip label="sandbox-ready" onRemove={() => onSetSandboxOnly(false)} />
      )}
      <button
        type="button"
        onClick={onClearAll}
        style={{
          all: 'unset',
          marginLeft: 'auto',
          cursor: 'pointer',
          fontFamily: MONO,
          fontSize: 10,
          color: 'var(--netlab-accent-cyan)',
          padding: '4px 6px',
        }}
      >
        clear all
      </button>
    </div>
  );
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label} filter`}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 'var(--netlab-radius-pill, 999px)',
        border: '1px solid var(--netlab-accent-cyan)',
        background: 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)',
        color: 'var(--netlab-accent-cyan)',
        fontFamily: MONO,
        fontSize: 10,
      }}
    >
      {label}
      <span aria-hidden style={{ color: 'var(--netlab-text-muted)' }}>
        ×
      </span>
    </button>
  );
}

export function GalleryEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div
      data-testid="gallery-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        padding: 24,
        borderRadius: 'var(--netlab-radius-lg, 16px)',
        border: '1px dashed var(--netlab-border)',
        background: 'var(--netlab-bg-surface)',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 13, color: 'var(--netlab-text-primary)' }}>
        no demos match — clear filters
      </div>
      <button
        type="button"
        onClick={onClear}
        style={{
          all: 'unset',
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: 'var(--netlab-radius-pill, 999px)',
          border: '1px solid var(--netlab-accent-cyan)',
          color: 'var(--netlab-accent-cyan)',
          fontFamily: MONO,
          fontSize: 11,
        }}
      >
        clear all
      </button>
    </div>
  );
}
