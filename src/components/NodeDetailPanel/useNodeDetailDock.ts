import { useEffect, useReducer } from 'react';

/**
 * Dock state for NodeDetailPanel, shared across the panel and its host layout
 * (NetlabCanvas) via localStorage + a process-wide listener set.
 *
 * Why a module-level emitter and not React context: NodeDetailPanel and
 * NetlabCanvas both need to react to mode/width changes (one for the panel
 * chrome, the other for whether the canvas reflows as a flex sibling), and we
 * also want the panel to work in standalone tests with no parent provider.
 * A shared localStorage-backed source of truth keeps both layers honest.
 */

export type DpMode = 'overlay' | 'pinned';
export type DpTab = 'overview' | 'ifaces' | 'routes' | 'arp' | 'acl' | 'sandbox';

export const DP_MIN_WIDTH = 320;
export const DP_MAX_WIDTH = 640;
export const DP_DEFAULT_WIDTH = 420;
export const DP_NARROW_BREAKPOINT = 380;

export const DP_MODE_KEY = 'netlab_dp_mode';
export const DP_WIDTH_KEY = 'netlab_dp_width';
export const DP_TAB_KEY = 'netlab_dp_tab';

export const DP_TAB_IDS: readonly DpTab[] = [
  'overview',
  'ifaces',
  'routes',
  'arp',
  'acl',
  'sandbox',
];

function isMode(value: string | null): value is DpMode {
  return value === 'overlay' || value === 'pinned';
}

function isTab(value: string | null): value is DpTab {
  return value !== null && (DP_TAB_IDS as readonly string[]).includes(value);
}

export function clampDpWidth(value: number): number {
  if (!Number.isFinite(value)) return DP_DEFAULT_WIDTH;
  return Math.max(DP_MIN_WIDTH, Math.min(DP_MAX_WIDTH, Math.round(value)));
}

function readMode(): DpMode {
  if (typeof window === 'undefined') return 'overlay';
  try {
    const value = window.localStorage.getItem(DP_MODE_KEY);
    return isMode(value) ? value : 'overlay';
  } catch {
    return 'overlay';
  }
}

function readWidth(): number {
  if (typeof window === 'undefined') return DP_DEFAULT_WIDTH;
  try {
    const raw = window.localStorage.getItem(DP_WIDTH_KEY);
    if (raw === null) return DP_DEFAULT_WIDTH;
    const parsed = Number(raw);
    return clampDpWidth(parsed);
  } catch {
    return DP_DEFAULT_WIDTH;
  }
}

function readTab(): DpTab | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(DP_TAB_KEY);
    return isTab(value) ? value : null;
  } catch {
    return null;
  }
}

function persist(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage is optional (private/embedded contexts) — silently drop.
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

export interface NodeDetailDock {
  readonly mode: DpMode;
  readonly width: number;
  /** Persisted active tab (may be hidden for the current target — caller
   *  resolves to a visible tab via `resolveDpTab`). */
  readonly persistedTab: DpTab | null;
  setMode(mode: DpMode): void;
  setWidth(width: number): void;
  setTab(tab: DpTab): void;
}

export function useNodeDetailDock(): NodeDetailDock {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, []);

  return {
    mode: readMode(),
    width: readWidth(),
    persistedTab: readTab(),
    setMode(mode) {
      persist(DP_MODE_KEY, mode);
      notify();
    },
    setWidth(width) {
      persist(DP_WIDTH_KEY, String(clampDpWidth(width)));
      notify();
    },
    setTab(tab) {
      persist(DP_TAB_KEY, tab);
      notify();
    },
  };
}

/** Pick a visible tab: the persisted one if it's allowed, else the default for
 *  the current target. */
export function resolveDpTab(
  persisted: DpTab | null,
  visibleTabs: readonly DpTab[],
  defaultTab: DpTab,
): DpTab {
  if (persisted && visibleTabs.includes(persisted)) return persisted;
  if (visibleTabs.includes(defaultTab)) return defaultTab;
  return visibleTabs[0] ?? defaultTab;
}
