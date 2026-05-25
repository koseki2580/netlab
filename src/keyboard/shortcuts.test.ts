import { describe, expect, it } from 'vitest';
import {
  SHORTCUTS,
  SHORTCUT_CATEGORY_ORDER,
  shortcutKeySignature,
  shortcutsForScope,
  type ShortcutScope,
} from './shortcuts';

describe('keyboard shortcut registry', () => {
  it('every entry is well-formed', () => {
    for (const s of SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0);
      expect(s.keys.every((k) => k.length > 0)).toBe(true);
      expect(s.description.trim().length).toBeGreaterThan(0);
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
