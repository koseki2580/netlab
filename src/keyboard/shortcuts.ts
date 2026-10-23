/**
 * R09 R1 — Central keyboard shortcut registry.
 *
 * The table is both what the help overlay lists and what the key dispatcher
 * runs: an entry with a `binding` is dispatched by `dispatchShortcut`, which
 * `installKeymap` (global) and the scrub timeline both use. Entries without
 * one are handled where their surface lives:
 *   - compare-speed keys: `demo/compare/CompareShell.tsx`
 *   - brief reopen (`B`): `src/components/PreFlightBrief.tsx` (P11)
 *
 * Do not add a key here that nothing actually handles.
 */

export type ShortcutCategory = 'Playback' | 'Navigation' | 'Compare' | 'Help';

/**
 * Where the shortcut is live. `global` is always active; `simulator` /
 * `compare` are only active on those surfaces. Used by the overlay to filter.
 */
export type ShortcutScope = 'global' | 'simulator' | 'compare';

/** What a bound key does. The names are `KeymapActions`' (`src/utils/keymap.ts`). */
export type ShortcutAction =
  | 'togglePalette'
  | 'openHelp'
  | 'closeOverlays'
  | 'playPause'
  | 'stepBackward'
  | 'stepForward'
  | 'jumpStart'
  | 'jumpEnd';

/** The handlers a surface offers; a key whose action has none is left alone. */
export interface ShortcutHandlers {
  togglePalette?: () => void;
  openHelp?: () => void;
  closeOverlays?: () => void;
  playPause?: () => void;
  stepBackward?: (steps: number) => void;
  stepForward?: (steps: number) => void;
  jumpStart?: () => void;
  jumpEnd?: () => void;
}

/** How a key press is matched to an entry, and what it then does. */
export interface ShortcutBinding {
  /** `KeyboardEvent.key`. With `mod`, compared without case. */
  key: string;
  /** ⌘ or Ctrl must be held. Without it, none of ⌘, Ctrl or Alt may be. */
  mod?: true;
  /** Shift must (true) or must not (false) be held; unset, it does not matter. */
  shift?: boolean;
  action: ShortcutAction;
  /** How many steps a step action moves. */
  steps?: number;
}

export interface Shortcut {
  /** Display tokens, e.g. `['Space']` or `['⌘', 'K']`. Each renders as one `<kbd>`. */
  keys: string[];
  /** Catalog key of the one-line description, so the overlay shows it in the reader's language. */
  descriptionKey: string;
  category: ShortcutCategory;
  scope?: ShortcutScope;
  /** Dispatched by `dispatchShortcut`; absent where the key is handled elsewhere. */
  binding?: ShortcutBinding;
}

export const SHORTCUTS: readonly Shortcut[] = [
  // ── Playback (simulator) ──────────────────────────────────────────────────
  {
    keys: ['Space'],
    descriptionKey: 'simulation.shortcuts.playPause',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: ' ', action: 'playPause' },
  },
  {
    keys: ['←'],
    descriptionKey: 'simulation.shortcuts.stepBack',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: 'ArrowLeft', shift: false, action: 'stepBackward', steps: 1 },
  },
  {
    keys: ['→'],
    descriptionKey: 'simulation.shortcuts.stepForward',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: 'ArrowRight', shift: false, action: 'stepForward', steps: 1 },
  },
  {
    keys: ['⇧', '←'],
    descriptionKey: 'simulation.shortcuts.stepBackFive',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: 'ArrowLeft', shift: true, action: 'stepBackward', steps: 5 },
  },
  {
    keys: ['⇧', '→'],
    descriptionKey: 'simulation.shortcuts.stepForwardFive',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: 'ArrowRight', shift: true, action: 'stepForward', steps: 5 },
  },
  {
    keys: ['Home'],
    descriptionKey: 'simulation.shortcuts.firstStep',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: 'Home', action: 'jumpStart' },
  },
  {
    keys: ['End'],
    descriptionKey: 'simulation.shortcuts.lastStep',
    category: 'Playback',
    scope: 'simulator',
    binding: { key: 'End', action: 'jumpEnd' },
  },
  // ── Navigation (global) ───────────────────────────────────────────────────
  {
    keys: ['⌘', 'K'],
    descriptionKey: 'simulation.shortcuts.openPalette',
    category: 'Navigation',
    scope: 'global',
    binding: { key: 'k', mod: true, action: 'togglePalette' },
  },
  {
    keys: ['Esc'],
    descriptionKey: 'simulation.shortcuts.closeOverlay',
    category: 'Navigation',
    scope: 'global',
    binding: { key: 'Escape', action: 'closeOverlays' },
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
  // ── Help (global / simulator) — `B` is PreFlightBrief's ─────────────────────
  {
    keys: ['?'],
    descriptionKey: 'simulation.shortcuts.openHelp',
    category: 'Help',
    scope: 'global',
    binding: { key: '?', action: 'openHelp' },
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

function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function matches(binding: ShortcutBinding, event: KeyboardEvent): boolean {
  if (binding.mod) {
    return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === binding.key;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (binding.shift !== undefined && binding.shift !== event.shiftKey) return false;
  return event.key === binding.key;
}

/**
 * Run the bound shortcut a key press names, if the surface handles it.
 *
 * Nothing happens while the learner types in a field. A press is taken (its
 * default prevented) only when a handler ran. Returns whether one did.
 */
export function dispatchShortcut(event: KeyboardEvent, handlers: ShortcutHandlers): boolean {
  if (isTypingTarget(event.target)) return false;
  for (const { binding } of SHORTCUTS) {
    if (!binding || !matches(binding, event)) continue;
    const handler = handlers[binding.action];
    if (!handler) continue;
    event.preventDefault();
    handler(binding.steps ?? 1);
    return true;
  }
  return false;
}
