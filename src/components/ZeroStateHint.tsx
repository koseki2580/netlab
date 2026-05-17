import { useContext, useEffect, useState } from 'react';
import { NetlabUIContext } from './NetlabUIContext';

/**
 * One-time onboarding pill anchored to the bottom of the canvas frame. The
 * playbook (v5, N5) replaces the always-pulsing tip pill with a single
 * deliberate prompt that fades out 6s after first paint and never returns —
 * the persistent `<StatusLine />` does the long-haul job of telling the user
 * what's happening.
 *
 * Trigger conditions, all required:
 *   - no node currently selected (read from {@link NetlabUIContext})
 *   - the localStorage flag for this storage key is not `'1'`
 *   - `suppress` prop is false
 *
 * The component renders nothing if any condition fails — there is no spinner
 * or empty fallback.
 */
export interface ZeroStateHintProps {
  /** localStorage key that records "user has seen this hint". */
  storageKey?: string;
  /** Message text. Defaults to the playbook copy. */
  message?: string;
  /** Suppress the hint regardless of other conditions (e.g. in tests). */
  suppress?: boolean;
  /** Override the auto-dismiss delay (ms). 0 disables auto-dismiss. */
  fadeAfterMs?: number;
}

const DEFAULT_STORAGE_KEY = 'nl_seen_select_hint';
const DEFAULT_MESSAGE = 'select any node to inspect — try R1';
const DEFAULT_FADE_MS = 6000;

function readSeen(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markSeen(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // ignore quota / private mode
  }
}

export function ZeroStateHint({
  storageKey = DEFAULT_STORAGE_KEY,
  message = DEFAULT_MESSAGE,
  suppress = false,
  fadeAfterMs = DEFAULT_FADE_MS,
}: ZeroStateHintProps) {
  const ui = useContext(NetlabUIContext);
  const selectedNodeId = ui?.selectedNodeId ?? null;
  const [seen, setSeen] = useState(() => readSeen(storageKey));
  const [fading, setFading] = useState(false);

  // Dismiss as soon as the user selects a node — they don't need the hint
  // after they've done the action it suggests.
  useEffect(() => {
    if (selectedNodeId && !seen) {
      markSeen(storageKey);
      setFading(true);
      const t = window.setTimeout(() => setSeen(true), 220);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [selectedNodeId, seen, storageKey]);

  // Auto-dismiss after the configured delay.
  useEffect(() => {
    if (seen || suppress || fadeAfterMs <= 0) return undefined;
    const fadeTimer = window.setTimeout(() => {
      markSeen(storageKey);
      setFading(true);
    }, fadeAfterMs);
    return () => window.clearTimeout(fadeTimer);
  }, [seen, suppress, fadeAfterMs, storageKey]);

  // Final unmount once the fade transition finishes.
  useEffect(() => {
    if (!fading) return undefined;
    const t = window.setTimeout(() => setSeen(true), 220);
    return () => window.clearTimeout(t);
  }, [fading]);

  if (seen || suppress) return null;
  if (selectedNodeId) return null;

  return (
    <div
      data-netlab-zero-state-hint=""
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '6px 12px',
        borderRadius: 999,
        background: 'var(--netlab-bg-surface)',
        border: '1px solid var(--netlab-border)',
        color: 'var(--netlab-text-secondary)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 220ms cubic-bezier(0.2, 0.7, 0.3, 1)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {message}
    </div>
  );
}
