/**
 * P14 — platform-aware modifier key glyph.
 *
 * `⌘K` reads correctly on macOS but is wrong on Windows/Linux. This hook
 * returns the right symbol once on mount and never re-renders (the user
 * doesn't switch platforms mid-session).
 *
 * Usage:
 *   const mod = useKbdMod();              // '⌘' on mac, 'Ctrl' elsewhere
 *   const palette = mod === '⌘' ? '⌘K' : 'Ctrl+K';
 *
 * Or use the helper for non-React code paths (tests, command registry):
 *   kbdShortcut('K')                  // '⌘K' / 'Ctrl+K'
 *   kbdShortcut('K', { shift: true }) // '⇧⌘K' / 'Ctrl+Shift+K'
 */

import { useEffect, useState } from 'react';

function detectIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  // userAgentData is the modern API; fall back to platform for older browsers.
  const platform =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function useKbdMod(): '⌘' | 'Ctrl' {
  const [mod, setMod] = useState<'⌘' | 'Ctrl'>('Ctrl'); // SSR-safe default
  useEffect(() => {
    setMod(detectIsMac() ? '⌘' : 'Ctrl');
  }, []);
  return mod;
}

export interface KbdShortcutOpts {
  shift?: boolean;
  alt?: boolean;
}

/**
 * Pure helper for non-React code paths. Reads the platform once at call time.
 */
export function kbdShortcut(key: string, opts: KbdShortcutOpts = {}): string {
  const isMac = detectIsMac();
  if (isMac) {
    const parts: string[] = [];
    if (opts.alt) parts.push('⌥');
    if (opts.shift) parts.push('⇧');
    parts.push('⌘');
    parts.push(key.toUpperCase());
    return parts.join('');
  }
  const parts = ['Ctrl'];
  if (opts.shift) parts.push('Shift');
  if (opts.alt) parts.push('Alt');
  parts.push(key.toUpperCase());
  return parts.join('+');
}
