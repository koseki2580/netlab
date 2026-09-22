/**
 * R09 R1 — Central keyboard shortcut registry.
 *
 * This is **documentation derived from** the real key handlers, not an
 * authoritative dispatcher. The handlers live where they always have:
 *   - global / simulator playback: `src/utils/keymap.ts` (installKeymap)
 *   - compare-speed keys:          `demo/compare/CompareShell.tsx`
 *   - brief reopen (`B`):          `src/components/PreFlightBrief.tsx` (P11)
 *
 * Keep this list in sync with those sites; do not add a key here that nothing
 * actually handles.
 */

export type ShortcutCategory = 'Playback' | 'Navigation' | 'Compare' | 'Help';

/**
 * Where the shortcut is live. `global` is always active; `simulator` /
 * `compare` are only active on those surfaces. Used by the overlay to filter.
 */
export type ShortcutScope = 'global' | 'simulator' | 'compare';

export interface Shortcut {
  /** Display tokens, e.g. `['Space']` or `['⌘', 'K']`. Each renders as one `<kbd>`. */
  keys: string[];
  /** Catalog key of the one-line description, so the overlay shows it in the reader's language. */
  descriptionKey: string;
  category: ShortcutCategory;
  scope?: ShortcutScope;
}

export const SHORTCUTS: readonly Shortcut[] = [
  // ── Playback (simulator) — installKeymap + PacketScrubTimeline ─────────────
  {
    keys: ['Space'],
    descriptionKey: 'simulation.shortcuts.playPause',
    category: 'Playback',
    scope: 'simulator',
  },
  {
    keys: ['←'],
    descriptionKey: 'simulation.shortcuts.stepBack',
    category: 'Playback',
    scope: 'simulator',
  },
  {
    keys: ['→'],
    descriptionKey: 'simulation.shortcuts.stepForward',
    category: 'Playback',
    scope: 'simulator',
  },
  {
    keys: ['⇧', '←'],
    descriptionKey: 'simulation.shortcuts.stepBackFive',
    category: 'Playback',
    scope: 'simulator',
  },
  {
    keys: ['⇧', '→'],
    descriptionKey: 'simulation.shortcuts.stepForwardFive',
    category: 'Playback',
    scope: 'simulator',
  },
  {
    keys: ['Home'],
    descriptionKey: 'simulation.shortcuts.firstStep',
    category: 'Playback',
    scope: 'simulator',
  },
  {
    keys: ['End'],
    descriptionKey: 'simulation.shortcuts.lastStep',
    category: 'Playback',
    scope: 'simulator',
  },
  // ── Navigation (global) — installKeymap ────────────────────────────────────
  {
    keys: ['⌘', 'K'],
    descriptionKey: 'simulation.shortcuts.openPalette',
    category: 'Navigation',
    scope: 'global',
  },
  {
    keys: ['Esc'],
    descriptionKey: 'simulation.shortcuts.closeOverlay',
    category: 'Navigation',
    scope: 'global',
  },
  // ── Compare (compare) — CompareShell ───────────────────────────────────────
  {
    keys: ['↑'],
    descriptionKey: 'simulation.shortcuts.compareFaster',
    category: 'Compare',
    scope: 'compare',
  },
  {
    keys: ['↓'],
    descriptionKey: 'simulation.shortcuts.compareSlower',
    category: 'Compare',
    scope: 'compare',
  },
  {
    keys: ['0'],
    descriptionKey: 'simulation.shortcuts.compareReset',
    category: 'Compare',
    scope: 'compare',
  },
  // ── Help (global / simulator) — installKeymap + PreFlightBrief ─────────────
  {
    keys: ['?'],
    descriptionKey: 'simulation.shortcuts.openHelp',
    category: 'Help',
    scope: 'global',
  },
  {
    keys: ['B'],
    descriptionKey: 'simulation.shortcuts.reopenBrief',
    category: 'Help',
    scope: 'simulator',
  },
];

export const SHORTCUT_CATEGORY_ORDER: readonly ShortcutCategory[] = [
  'Playback',
  'Navigation',
  'Compare',
  'Help',
];

/** Stable signature for a key combo, used for de-dup checks. */
export function shortcutKeySignature(shortcut: Shortcut): string {
  return shortcut.keys.join('+');
}

/**
 * Shortcuts visible for a given surface: `global` plus the matching scope.
 * Pass `undefined` to get the full list (used by the global cheat sheet).
 */
export function shortcutsForScope(scope?: ShortcutScope): readonly Shortcut[] {
  if (!scope) return SHORTCUTS;
  return SHORTCUTS.filter((s) => !s.scope || s.scope === 'global' || s.scope === scope);
}
