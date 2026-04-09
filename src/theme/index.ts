import type React from 'react';

/**
 * Color token configuration for NetlabApp.
 *
 * Each field maps to a CSS custom property (`--netlab-*`) injected on the
 * outermost container. See docs/ui/theming.md for the full reference.
 */
export interface NetlabTheme {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  /** Main container background. */
  bgPrimary: string;
  /** Toolbar and raised surface backgrounds. */
  bgSurface: string;
  /** Hover / elevated element backgrounds. */
  bgElevated: string;
  /** Floating overlay panel backgrounds (rgba supported). */
  bgPanel: string;

  // ── Borders ──────────────────────────────────────────────────────────────
  /** Solid border color. */
  border: string;
  /** Semi-transparent / subtle border color (rgba supported). */
  borderSubtle: string;

  // ── Text ─────────────────────────────────────────────────────────────────
  /** Primary text color. */
  textPrimary: string;
  /** Secondary / label text color. */
  textSecondary: string;
  /** Muted / hint text color. */
  textMuted: string;
  /** Very dim text color. */
  textFaint: string;

  // ── Semantic accents ─────────────────────────────────────────────────────
  /** Action buttons and primary highlights. */
  accentBlue: string;
  /** Router labels and forward packet events. */
  accentGreen: string;
  /** Drop / error packet events. */
  accentRed: string;
  /** MAC address highlights. */
  accentYellow: string;
  /** IP address highlights and primary text accents. */
  accentCyan: string;

  // ── Node backgrounds ────────────────────────────────────────────────────
  /** Router node container background. */
  nodeRouterBg: string;
  /** Switch node container background. */
  nodeSwitchBg: string;
  /** Client node container background. */
  nodeClientBg: string;
  /** Server node container background. */
  nodeServerBg: string;
}

/** Default dark theme — mirrors the legacy hardcoded color palette. */
export const NETLAB_DARK_THEME: NetlabTheme = {
  bgPrimary:     '#0f172a',
  bgSurface:     '#1e293b',
  bgElevated:    '#263144',
  bgPanel:       'rgba(15, 23, 42, 0.95)',
  border:        '#334155',
  borderSubtle:  'rgba(100, 116, 139, 0.4)',
  textPrimary:   '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
  textFaint:     '#475569',
  accentBlue:    '#2563eb',
  accentGreen:   '#4ade80',
  accentRed:     '#f87171',
  accentYellow:  '#fbbf24',
  accentCyan:    '#7dd3fc',
  nodeRouterBg:  '#0f2a1a',
  nodeSwitchBg:  '#0d1f3c',
  nodeClientBg:  '#0d1a2e',
  nodeServerBg:  '#0a1f14',
};

/** Built-in light theme suitable for embedding in light-mode host pages. */
export const NETLAB_LIGHT_THEME: NetlabTheme = {
  bgPrimary:     '#f8fafc',
  bgSurface:     '#f1f5f9',
  bgElevated:    '#e2e8f0',
  bgPanel:       'rgba(248, 250, 252, 0.95)',
  border:        '#cbd5e1',
  borderSubtle:  'rgba(148, 163, 184, 0.4)',
  textPrimary:   '#0f172a',
  textSecondary: '#475569',
  textMuted:     '#94a3b8',
  textFaint:     '#cbd5e1',
  accentBlue:    '#2563eb',
  accentGreen:   '#16a34a',
  accentRed:     '#dc2626',
  accentYellow:  '#d97706',
  accentCyan:    '#0284c7',
  nodeRouterBg:  '#f0fdf4',
  nodeSwitchBg:  '#eff6ff',
  nodeClientBg:  '#f0f9ff',
  nodeServerBg:  '#f0fdf4',
};

/**
 * Converts a `NetlabTheme` to a `React.CSSProperties` object of `--netlab-*`
 * CSS custom properties. The result can be spread into any element's `style`
 * prop to scope the theme to that subtree.
 */
export function themeToVars(theme: NetlabTheme): React.CSSProperties {
  return {
    '--netlab-bg-primary':    theme.bgPrimary,
    '--netlab-bg-surface':    theme.bgSurface,
    '--netlab-bg-elevated':   theme.bgElevated,
    '--netlab-bg-panel':      theme.bgPanel,
    '--netlab-border':        theme.border,
    '--netlab-border-subtle': theme.borderSubtle,
    '--netlab-text-primary':  theme.textPrimary,
    '--netlab-text-secondary':theme.textSecondary,
    '--netlab-text-muted':    theme.textMuted,
    '--netlab-text-faint':    theme.textFaint,
    '--netlab-accent-blue':   theme.accentBlue,
    '--netlab-accent-green':  theme.accentGreen,
    '--netlab-accent-red':    theme.accentRed,
    '--netlab-accent-yellow': theme.accentYellow,
    '--netlab-accent-cyan':   theme.accentCyan,
    '--netlab-node-router-bg':theme.nodeRouterBg,
    '--netlab-node-switch-bg':theme.nodeSwitchBg,
    '--netlab-node-client-bg':theme.nodeClientBg,
    '--netlab-node-server-bg':theme.nodeServerBg,
  } as React.CSSProperties;
}
