/**
 * P1 — shared shell status tone palette.
 *
 * Single source of truth for the colored dot rendered by both
 * `CommandBar.tsx` (top toolbar) and `StatusLine.tsx` (bottom bar).
 * These two UIs sit one above the other in the simulator chrome and
 * **must agree** on what `ready` / `running` / `paused` look like —
 * before this module they drifted (CommandBar said `ready=green`,
 * StatusLine said `ready=yellow`, etc.), which read as a bug. The
 * CommandBar mapping is the canonical one; StatusLine was the drift.
 */

import type { ShellStatusTone } from './NetlabAppShellV2';

/** Color token for the dot + label of each tone. CSS custom property string. */
export const STATUS_TONE_COLOR: Record<ShellStatusTone, string> = {
  idle: 'var(--netlab-text-muted)',
  ready: 'var(--netlab-accent-green)',
  running: 'var(--netlab-accent-cyan)',
  paused: 'var(--netlab-accent-yellow)',
  error: 'var(--netlab-accent-red)',
};

/** Default human label per tone. Caller may override (e.g. CommandBar passes scenario-specific status.label). */
export const STATUS_TONE_LABEL: Record<ShellStatusTone, string> = {
  idle: 'idle',
  ready: 'ready',
  running: 'running',
  paused: 'paused',
  error: 'error',
};
