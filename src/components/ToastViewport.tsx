/**
 * R09 R5 — Toast render layer.
 *
 * Mounts once at the app root. Reads from the ToastBus singleton and renders
 * up to 3 stacked toasts in the bottom-right. Older entries wait in the queue
 * (off-screen) until a visible one dismisses. Esc closes the latest non-sticky
 * toast. The fade-in is disabled under prefers-reduced-motion (see
 * animations.css).
 */

import { useEffect, useState } from 'react';
import { ToastBus, type ToastEntry, type ToastLevel } from './ToastBus';

const MONO = 'ui-monospace, monospace';
const MAX_VISIBLE = 3;

export function ToastViewport() {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  useEffect(() => ToastBus.subscribe(setEntries), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') ToastBus.dismissTopNonSticky();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Cap the visible stack; the rest queue until one dismisses.
  const visible = entries.slice(-MAX_VISIBLE);

  return (
    <div
      data-testid="toast-viewport"
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 40,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        maxWidth: 380,
        pointerEvents: 'none',
      }}
    >
      {visible.map((entry) => (
        <ToastCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

// The viewport mounts at the app root, which can be *outside* a NetlabThemeScope
// (e.g. some sandbox shells). Without fallbacks the theme vars are undefined there
// and the text collapses to black on the dark page (1.17:1 — axe-confirmed). The
// fallbacks match the dark palette so toasts stay readable everywhere.
const LEVEL_COLOR: Record<ToastLevel, string> = {
  info: 'var(--netlab-accent-cyan, #7dd3fc)',
  success: 'var(--netlab-accent-green, #4ade80)',
  warn: 'var(--netlab-accent-yellow, #fbbf24)',
  error: 'var(--netlab-accent-red, #f87171)',
};

const LEVEL_ICON: Record<ToastLevel, string> = {
  info: 'ℹ',
  success: '✓',
  warn: '!',
  error: '✕',
};

function ToastCard({ entry }: { entry: ToastEntry }) {
  const color = LEVEL_COLOR[entry.level];
  return (
    <div
      data-testid="toast-card"
      data-toast-level={entry.level}
      role={entry.level === 'error' ? 'alert' : 'status'}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--netlab-bg-surface, #1e293b)',
        border: `1px solid color-mix(in srgb, ${color} 38%, var(--netlab-border, #334155))`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--netlab-radius-sm, 8px)',
        boxShadow: 'var(--netlab-learning-shadow, 0 12px 28px rgba(0,0,0,.32))',
        fontFamily: MONO,
        fontSize: 11,
        animation: 'nl-toast-in 180ms ease-out',
      }}
    >
      <span aria-hidden style={{ color, fontWeight: 700 }}>
        {LEVEL_ICON[entry.level]}
      </span>
      <span style={{ flex: 1, color: 'var(--netlab-text-primary, #e2e8f0)', lineHeight: 1.5 }}>
        {entry.message}
      </span>
      {entry.actionLabel && (
        <button
          type="button"
          onClick={() => {
            entry.onAction?.();
            ToastBus.dismiss(entry.id);
          }}
          style={{
            all: 'unset',
            cursor: 'pointer',
            color,
            fontFamily: MONO,
            fontSize: 11,
            padding: '0 6px',
          }}
        >
          {entry.actionLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => ToastBus.dismiss(entry.id)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          color: 'var(--netlab-text-muted, #94a3b8)',
          fontSize: 12,
          padding: '0 2px',
        }}
      >
        ×
      </button>
    </div>
  );
}
