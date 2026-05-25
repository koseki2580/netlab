/**
 * R09 R1 — Global keyboard cheat sheet.
 *
 * A centered modal listing every shortcut in the registry, grouped by category.
 * Replaces the old bottom-right `ShortcutsHelp` popover. Wired through the same
 * `helpOpen` / `openHelp` shell state, so the `?` key, the StatusLine `? help`
 * button, the rail Help button, and the palette "Show keyboard shortcuts"
 * command all open it.
 */

import { useEffect } from 'react';
import {
  SHORTCUT_CATEGORY_ORDER,
  shortcutsForScope,
  type Shortcut,
  type ShortcutScope,
} from '../keyboard/shortcuts';

const MONO = 'ui-monospace, monospace';

export interface KeyboardHelpOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Restrict to `global` + this scope. Omit to show every shortcut. */
  scope?: ShortcutScope;
}

export function KeyboardHelpOverlay({ open, onClose, scope }: KeyboardHelpOverlayProps) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const visible = shortcutsForScope(scope);

  return (
    <div
      data-testid="keyboard-help-overlay"
      role="none"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'color-mix(in srgb, var(--netlab-bg-primary) 60%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        data-netlab-shortcuts-help=""
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, calc(100% - 40px))',
          maxHeight: 'calc(100% - 80px)',
          overflow: 'auto',
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-learning-surface-border, var(--netlab-border))',
          borderRadius: 'var(--netlab-radius-md, 16px)',
          boxShadow: 'var(--netlab-learning-shadow, 0 12px 28px rgba(0,0,0,.32))',
          padding: '20px 24px',
          fontFamily: MONO,
          color: 'var(--netlab-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: 'var(--netlab-accent-cyan)',
            }}
          >
            keyboard shortcuts
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            style={{
              all: 'unset',
              marginLeft: 'auto',
              cursor: 'pointer',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--netlab-radius-sm, 8px)',
              border: '1px solid var(--netlab-border)',
              color: 'var(--netlab-text-secondary)',
            }}
          >
            esc · close
          </button>
        </div>

        {SHORTCUT_CATEGORY_ORDER.map((cat) => {
          const rows = visible.filter((s) => s.category === cat);
          if (rows.length === 0) return null;
          return (
            <section key={cat} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--netlab-text-muted)',
                  marginBottom: 6,
                }}
              >
                {cat}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '6px 16px',
                  alignItems: 'baseline',
                }}
              >
                {rows.map((s) => (
                  <ShortcutRow key={`${cat}:${s.keys.join('+')}`} shortcut={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <>
      <span style={{ fontSize: 12, color: 'var(--netlab-text-primary)' }}>
        {shortcut.description}
      </span>
      <span style={{ display: 'inline-flex', gap: 4 }}>
        {shortcut.keys.map((k, i) => (
          <kbd
            key={i}
            style={{
              fontFamily: MONO,
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: 'var(--netlab-bg-elevated)',
              border: '1px solid var(--netlab-border)',
              color: 'var(--netlab-text-secondary)',
              boxShadow: 'inset 0 -1px 0 var(--netlab-border)',
            }}
          >
            {k}
          </kbd>
        ))}
      </span>
    </>
  );
}
