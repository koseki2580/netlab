import { describe, expect, it, vi } from 'vitest';
import { en } from '../i18n/locales/en';
import { ja } from '../i18n/locales/ja';
import {
  dispatchShortcut,
  SHORTCUTS,
  SHORTCUT_CATEGORY_ORDER,
  shortcutKeySignature,
  shortcutsForScope,
  type ShortcutHandlers,
  type ShortcutScope,
} from './shortcuts';

describe('keyboard shortcut registry', () => {
  it('every entry is well-formed', () => {
    for (const s of SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0);
      expect(s.keys.every((k) => k.length > 0)).toBe(true);
      // Described in both languages the overlay can be read in.
      expect(en[s.descriptionKey]?.trim().length ?? 0).toBeGreaterThan(0);
      expect(ja[s.descriptionKey]?.trim().length ?? 0).toBeGreaterThan(0);
      expect(SHORTCUT_CATEGORY_ORDER).toContain(s.category);
    }
  });

  it('has unique key combos within each scope', () => {
    const byScope = new Map<ShortcutScope | 'unscoped', Set<string>>();
    for (const s of SHORTCUTS) {
      const scope = s.scope ?? 'unscoped';
      const seen = byScope.get(scope) ?? new Set<string>();
      const sig = shortcutKeySignature(s);
      expect(seen.has(sig)).toBe(false);
      seen.add(sig);
      byScope.set(scope, seen);
    }
  });

  it('category order covers every category present', () => {
    const present = new Set(SHORTCUTS.map((s) => s.category));
    for (const cat of present) {
      expect(SHORTCUT_CATEGORY_ORDER).toContain(cat);
    }
    // counts sum: total entries == sum of per-category counts
    const sum = SHORTCUT_CATEGORY_ORDER.reduce(
      (acc, cat) => acc + SHORTCUTS.filter((s) => s.category === cat).length,
      0,
    );
    expect(sum).toBe(SHORTCUTS.length);
  });

  it('scope filter returns global + matching scope only', () => {
    const sim = shortcutsForScope('simulator');
    expect(sim.every((s) => !s.scope || s.scope === 'global' || s.scope === 'simulator')).toBe(
      true,
    );
    expect(sim.some((s) => s.scope === 'compare')).toBe(false);
    // global entries are always present
    expect(sim.some((s) => s.keys.join('') === '⌘K')).toBe(true);
    // no scope → full list
    expect(shortcutsForScope()).toBe(SHORTCUTS);
  });
});

/** A key press without a DOM: only what the dispatcher reads. */
function keyPress(
  key: string,
  mods: Partial<Record<'shift' | 'meta' | 'ctrl' | 'alt', boolean>> = {},
) {
  let prevented = false;
  const event = {
    key,
    shiftKey: mods.shift ?? false,
    metaKey: mods.meta ?? false,
    ctrlKey: mods.ctrl ?? false,
    altKey: mods.alt ?? false,
    target: null,
    preventDefault: () => {
      prevented = true;
    },
  } as unknown as KeyboardEvent;
  return { event, prevented: () => prevented };
}

/** Records which action ran, and with how many steps. */
function recorder() {
  const calls: string[] = [];
  const handlers: ShortcutHandlers = {
    togglePalette: () => calls.push('togglePalette'),
    openHelp: () => calls.push('openHelp'),
    closeOverlays: () => calls.push('closeOverlays'),
    playPause: () => calls.push('playPause'),
    stepBackward: (steps) => calls.push(`stepBackward:${steps}`),
    stepForward: (steps) => calls.push(`stepForward:${steps}`),
    jumpStart: () => calls.push('jumpStart'),
    jumpEnd: () => calls.push('jumpEnd'),
  };
  return { calls, handlers };
}

describe('dispatchShortcut — the table drives the keys', () => {
  it.each([
    ['Space', ' ', {}, 'playPause'],
    ['Space with Shift', ' ', { shift: true }, 'playPause'],
    ['←', 'ArrowLeft', {}, 'stepBackward:1'],
    ['⇧ ←', 'ArrowLeft', { shift: true }, 'stepBackward:5'],
    ['→', 'ArrowRight', {}, 'stepForward:1'],
    ['⇧ →', 'ArrowRight', { shift: true }, 'stepForward:5'],
    ['Home', 'Home', {}, 'jumpStart'],
    ['End', 'End', {}, 'jumpEnd'],
    ['⌘ K', 'k', { meta: true }, 'togglePalette'],
    ['Ctrl K', 'k', { ctrl: true }, 'togglePalette'],
    ['⌘ ⇧ K', 'K', { meta: true, shift: true }, 'togglePalette'],
    ['Esc', 'Escape', {}, 'closeOverlays'],
    ['?', '?', { shift: true }, 'openHelp'],
  ] as const)('%s runs %s', (_name, key, mods, expected) => {
    const { calls, handlers } = recorder();
    const press = keyPress(key, mods);
    expect(dispatchShortcut(press.event, handlers)).toBe(true);
    expect(calls).toEqual([expected]);
    expect(press.prevented()).toBe(true);
  });

  it.each([
    ['K without ⌘ or Ctrl', 'k', {}],
    ['an arrow with Ctrl', 'ArrowLeft', { ctrl: true }],
    ['Space with Alt', ' ', { alt: true }],
    ['End with ⌘', 'End', { meta: true }],
    ['an unbound key', 'x', {}],
  ] as const)('%s runs nothing and is left to the page', (_name, key, mods) => {
    const { calls, handlers } = recorder();
    const press = keyPress(key, mods);
    expect(dispatchShortcut(press.event, handlers)).toBe(false);
    expect(calls).toEqual([]);
    expect(press.prevented()).toBe(false);
  });

  it('leaves a key alone when the surface does not handle its action', () => {
    const playPause = vi.fn();
    const press = keyPress('Home');
    expect(dispatchShortcut(press.event, { playPause })).toBe(false);
    expect(press.prevented()).toBe(false);
    expect(playPause).not.toHaveBeenCalled();
  });

  it('binds every playback, navigation and help entry, and no two to the same press', () => {
    const unbound = SHORTCUTS.filter((s) => !s.binding).map((s) => s.descriptionKey);
    // Compare keys are CompareShell's and `B` is the brief's; nothing else is unbound.
    expect(unbound.sort()).toEqual(
      [
        'simulation.shortcuts.compareFaster',
        'simulation.shortcuts.compareReset',
        'simulation.shortcuts.compareSlower',
        'simulation.shortcuts.reopenBrief',
      ].sort(),
    );
    const presses = SHORTCUTS.flatMap((s) =>
      s.binding ? [`${s.binding.key}|${s.binding.mod ?? ''}|${s.binding.shift ?? ''}`] : [],
    );
    expect(new Set(presses).size).toBe(presses.length);
  });
});
