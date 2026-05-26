/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aggregateTags,
  matchesFilters,
  readFiltersFromUrl,
  useGalleryFilters,
  type DemoLike,
  type GalleryFilters,
  type UseGalleryFilters,
} from './galleryFilters';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const DEMOS: DemoLike[] = [
  {
    title: 'TCP Handshake',
    desc: 'SYN/ACK',
    meta: { difficulty: 'intermediate', tags: ['L4', 'TCP'] },
    sandboxReady: true,
  },
  {
    title: 'OSPF Convergence',
    desc: 'recompute',
    meta: { difficulty: 'advanced', tags: ['OSPF'] },
    sandboxReady: true,
  },
  { title: 'Minimal', desc: 'two nodes', meta: { difficulty: 'beginner', tags: ['L1–L2'] } },
];

const NONE: GalleryFilters = { q: '', difficulties: [], tags: [], sandboxOnly: false };

describe('matchesFilters', () => {
  it('matches everything with empty filters', () => {
    expect(DEMOS.every((d) => matchesFilters(d, NONE, ''))).toBe(true);
  });

  it('filters by query against title/desc/tags', () => {
    expect(matchesFilters(DEMOS[0]!, NONE, 'tcp')).toBe(true);
    expect(matchesFilters(DEMOS[1]!, NONE, 'tcp')).toBe(false);
  });

  it('prefers the searchText blob for the query when supplied', () => {
    const demo: DemoLike = { ...DEMOS[1]!, searchText: 'OSPF Convergence routing track' };
    expect(matchesFilters(demo, NONE, 'routing')).toBe(true);
  });

  it('filters by difficulty (multi-select)', () => {
    const f = { ...NONE, difficulties: ['advanced' as const] };
    expect(matchesFilters(DEMOS[1]!, f, '')).toBe(true);
    expect(matchesFilters(DEMOS[0]!, f, '')).toBe(false);
  });

  it('filters by tag intersection and sandbox-ready', () => {
    expect(matchesFilters(DEMOS[0]!, { ...NONE, tags: ['TCP'] }, '')).toBe(true);
    expect(matchesFilters(DEMOS[1]!, { ...NONE, tags: ['TCP'] }, '')).toBe(false);
    expect(matchesFilters(DEMOS[2]!, { ...NONE, sandboxOnly: true }, '')).toBe(false);
    expect(matchesFilters(DEMOS[0]!, { ...NONE, sandboxOnly: true }, '')).toBe(true);
  });
});

describe('aggregateTags', () => {
  it('counts and sorts by frequency then name', () => {
    const tags = aggregateTags([
      { title: 'a', desc: '', meta: { tags: ['L4', 'TCP'] } },
      { title: 'b', desc: '', meta: { tags: ['L4'] } },
    ]);
    expect(tags[0]).toEqual({ tag: 'L4', count: 2 });
    expect(tags[1]).toEqual({ tag: 'TCP', count: 1 });
  });
});

describe('readFiltersFromUrl', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('round-trips every dimension', () => {
    window.history.replaceState(null, '', '/?q=tcp&difficulty=intermediate&tags=TCP,L4&sandbox=1');
    expect(readFiltersFromUrl()).toEqual({
      q: 'tcp',
      difficulties: ['intermediate'],
      tags: ['TCP', 'L4'],
      sandboxOnly: true,
    });
  });

  it('drops invalid difficulty values and uses initialQuery when q is absent', () => {
    window.history.replaceState(null, '', '/?difficulty=bogus');
    expect(readFiltersFromUrl('seed')).toEqual({
      q: 'seed',
      difficulties: [],
      tags: [],
      sandboxOnly: false,
    });
  });
});

describe('useGalleryFilters', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let api: UseGalleryFilters | null = null;

  function Harness() {
    api = useGalleryFilters();
    return null;
  }

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
    api = null;
    vi.useRealTimers();
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    window.history.replaceState(null, '', '/');
  });

  it('debounces the query into debouncedQ and the URL (150ms)', () => {
    act(() => root?.render(<Harness />));
    act(() => api?.setQuery('tcp'));

    // Before the debounce window elapses, debouncedQ has not advanced.
    expect(api?.debouncedQ).toBe('');
    act(() => vi.advanceTimersByTime(150));
    expect(api?.debouncedQ).toBe('tcp');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('tcp');
  });

  it('applies chip toggles immediately to the URL', () => {
    act(() => root?.render(<Harness />));
    act(() => api?.toggleDifficulty('intermediate'));
    act(() => vi.advanceTimersByTime(1));
    expect(new URLSearchParams(window.location.search).get('difficulty')).toBe('intermediate');
    expect(api?.isEmpty).toBe(false);
  });

  it('clearAll empties state and the URL', () => {
    act(() => root?.render(<Harness />));
    act(() => api?.toggleTag('TCP'));
    act(() => api?.setSandboxOnly(true));
    act(() => vi.advanceTimersByTime(150));
    expect(window.location.search).not.toBe('');

    act(() => api?.clearAll());
    act(() => vi.advanceTimersByTime(150));
    expect(api?.isEmpty).toBe(true);
    expect(window.location.search).toBe('');
  });
});
