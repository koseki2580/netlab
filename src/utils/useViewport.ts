/**
 * S1 — viewport observer for the responsive simulator shell.
 *
 * Returns the current window size plus a derived `isNarrow` flag. Narrow
 * layouts (< 900px — iframe embeds, phones, split-screen) switch the shell to
 * a bottom nav rail and a slide-in detail drawer.
 *
 * SSR-safe: with no `window` it reports a wide default so server renders pick
 * the desktop layout. Resize handling is `requestAnimationFrame`-coalesced so a
 * drag-resize fires at most one state update per frame.
 */

import { useEffect, useState } from 'react';

/** Width (px) below which the shell uses its narrow (drawer + bottom-bar) layout. */
export const NARROW_BREAKPOINT = 900;

export interface ViewportInfo {
  width: number;
  height: number;
  /** `true` when `width < NARROW_BREAKPOINT`. */
  isNarrow: boolean;
}

function readViewport(): ViewportInfo {
  if (typeof window === 'undefined') {
    return { width: 1200, height: 800, isNarrow: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { width, height, isNarrow: width < NARROW_BREAKPOINT };
}

export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(readViewport);

  useEffect(() => {
    let rafId: number | null = null;
    const onResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setViewport(readViewport());
      });
    };
    // Sync once on mount in case the size changed between render and effect.
    setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return viewport;
}
