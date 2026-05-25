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
  description: string;
  category: ShortcutCategory;
  scope?: ShortcutScope;
}

export const SHORTCUTS: readonly Shortcut[] = [
  // ── Playback (simulator) — installKeymap + PacketScrubTimeline ─────────────
  { keys: ['Space'], description: 'Play / pause', category: 'Playback', scope: 'simulator' },
  { keys: ['←'], description: 'Step back', category: 'Playback', scope: 'simulator' },
  { keys: ['→'], description: 'Step forward', category: 'Playback', scope: 'simulator' },
  { keys: ['⇧', '←'], description: 'Step back ×5', category: 'Playback', scope: 'simulator' },
  { keys: ['⇧', '→'], description: 'Step forward ×5', category: 'Playback', scope: 'simulator' },
  { keys: ['Home'], description: 'Jump to first step', category: 'Playback', scope: 'simulator' },
  { keys: ['End'], description: 'Jump to last step', category: 'Playback', scope: 'simulator' },
  // ── Navigation (global) — installKeymap ────────────────────────────────────
  {
    keys: ['⌘', 'K'],
    description: 'Open command palette',
    category: 'Navigation',
    scope: 'global',
  },
  {
    keys: ['Esc'],
    description: 'Close palette / overlay',
    category: 'Navigation',
    scope: 'global',
  },
  // ── Compare (compare) — CompareShell ───────────────────────────────────────
  {
    keys: ['↑'],
    description: 'Increase compare speed (+0.25×)',
    category: 'Compare',
    scope: 'compare',
  },
  {
    keys: ['↓'],
    description: 'Decrease compare speed (−0.25×)',
    category: 'Compare',
    scope: 'compare',
  },
  { keys: ['0'], description: 'Reset compare speed to 1×', category: 'Compare', scope: 'compare' },
  // ── Help (global / simulator) — installKeymap + PreFlightBrief ─────────────
  { keys: ['?'], description: 'Open keyboard shortcuts', category: 'Help', scope: 'global' },
  { keys: ['B'], description: 'Reopen scenario brief', category: 'Help', scope: 'simulator' },
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
