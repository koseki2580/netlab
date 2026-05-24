import type React from 'react';
import { densityToVars, type NetlabDensity } from './densities';
import {
  ACADEMIC_LEARNING_SURFACE_OVERRIDES,
  DARK_LEARNING_SURFACE,
  LIGHT_LEARNING_SURFACE,
  RADIUS_SCALE,
  type LearningSurfaceTokens,
} from './learningSurface';
import { CBSAFE_ACCENTS, paletteOverrides, type NetlabPalette } from './palettes';

export type { NetlabPalette } from './palettes';
export type { NetlabDensity, NetlabDensityTokens } from './densities';
export type { LearningSurfaceTokens } from './learningSurface';
export { NETLAB_PALETTES } from './palettes';
export { NETLAB_DENSITIES, densityToVars } from './densities';
export { RADIUS_SCALE } from './learningSurface';

/**
 * Audience axis — does not affect tokens but is read by components to
 * show or hide explanatory copy ("what is this?" callouts, hint pulses,
 * legends). Learner mode adds scaffolding; pro mode is chrome-only.
 */
export type NetlabAudience = 'learner' | 'pro';

/** Color-blind-safe accent remap toggle (M6). */
export type NetlabCbSafe = 'off' | 'on';
/** Contrast level (M6). `'more'` promotes muted text and strengthens borders. */
export type NetlabContrast = 'normal' | 'more';

/** Optional theme axes layered on top of the base {@link NetlabTheme}. */
export interface NetlabThemeAxes {
  /** Accent flavor — defaults to `studio` (current palette). */
  palette?: NetlabPalette;
  /** Layout density — defaults to `standard`. */
  density?: NetlabDensity;
  /** Color-blind-safe accent remap — defaults to `'off'`. */
  colorBlindSafe?: NetlabCbSafe;
  /** Contrast level — defaults to `'normal'`. */
  contrast?: NetlabContrast;
}

/**
 * Color token configuration for NetlabApp.
 *
 * Each field maps to a CSS custom property (`--netlab-*`) injected on the
 * outermost container. See docs/ui/theming.md for the full reference.
 *
 * Extends {@link LearningSurfaceTokens} (the second-tier onboarding surface);
 * those fields emit `--netlab-learning-*` and are consumed only by Gallery /
 * PreFlightBrief / conclusion. Simulator chrome stays on the terminal tokens.
 */
export interface NetlabTheme extends LearningSurfaceTokens {
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
  /** Warning / advisory validation highlights. */
  accentOrange: string;
  /** MAC address highlights. */
  accentYellow: string;
  /** IP address highlights and primary text accents. */
  accentCyan: string;
  /** Server nodes, sandbox edits, and lineage markers. */
  accentPurple: string;

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
  bgPrimary: '#0f172a',
  bgSurface: '#1e293b',
  bgElevated: '#263144',
  bgPanel: 'rgba(15, 23, 42, 0.95)',
  border: '#334155',
  borderSubtle: 'rgba(100, 116, 139, 0.4)',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#94a3b8',
  textFaint: '#94a3b8',
  accentBlue: '#2563eb',
  accentGreen: '#4ade80',
  accentRed: '#f87171',
  accentOrange: '#f59e0b',
  accentYellow: '#fbbf24',
  accentCyan: '#7dd3fc',
  accentPurple: '#a371f7',
  nodeRouterBg: '#0f2a1a',
  nodeSwitchBg: '#0d1f3c',
  nodeClientBg: '#0d1a2e',
  nodeServerBg: '#0a1f14',
  ...DARK_LEARNING_SURFACE,
};

/** Built-in light theme suitable for embedding in light-mode host pages. */
export const NETLAB_LIGHT_THEME: NetlabTheme = {
  bgPrimary: '#f8fafc',
  bgSurface: '#f1f5f9',
  bgElevated: '#e2e8f0',
  bgPanel: 'rgba(248, 250, 252, 0.95)',
  border: '#cbd5e1',
  borderSubtle: 'rgba(148, 163, 184, 0.4)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#5a6a7e',
  textFaint: '#94a3b8',
  accentBlue: '#2563eb',
  accentGreen: '#166534',
  accentRed: '#dc2626',
  accentOrange: '#f59e0b',
  accentYellow: '#d97706',
  accentCyan: '#0369a1',
  accentPurple: '#7c3aed',
  nodeRouterBg: '#f0fdf4',
  nodeSwitchBg: '#eff6ff',
  nodeClientBg: '#f0f9ff',
  nodeServerBg: '#f0fdf4',
  ...LIGHT_LEARNING_SURFACE,
};

/**
 * Converts a `NetlabTheme` to a `React.CSSProperties` object of `--netlab-*`
 * CSS custom properties. The result can be spread into any element's `style`
 * prop to scope the theme to that subtree.
 *
 * Optional axes can be layered on top:
 * - `palette` overrides the accent channel (studio / academic).
 * - `density` emits `--netlab-pad / -gap / -font / -title / -eyebrow`.
 *
 * Omitting `axes` (or passing only a subset) preserves the pre-axis behavior,
 * so existing callers are unaffected.
 */
function contrastOverrides(theme: NetlabTheme, contrast: NetlabContrast): Partial<NetlabTheme> {
  if (contrast !== 'more') return {};
  // Promote dim text toward primary and make subtle borders solid for legibility.
  return {
    textMuted: theme.textPrimary,
    textFaint: theme.textSecondary,
    borderSubtle: theme.border,
  };
}

export function themeToVars(theme: NetlabTheme, axes?: NetlabThemeAxes): React.CSSProperties {
  const palette = axes?.palette ?? 'studio';
  let resolved: NetlabTheme = { ...theme, ...paletteOverrides(palette) };
  if (palette === 'academic') {
    // Learning-surface washes desaturate for projector / print use. The accent
    // channel already shifted via paletteOverrides; this calms the gradients.
    resolved = { ...resolved, ...ACADEMIC_LEARNING_SURFACE_OVERRIDES };
  }
  if (axes?.colorBlindSafe === 'on') {
    resolved = { ...resolved, ...CBSAFE_ACCENTS };
  }
  resolved = { ...resolved, ...contrastOverrides(resolved, axes?.contrast ?? 'normal') };
  const base: React.CSSProperties = {
    '--netlab-bg-primary': resolved.bgPrimary,
    '--netlab-bg-surface': resolved.bgSurface,
    '--netlab-bg-elevated': resolved.bgElevated,
    '--netlab-bg-panel': resolved.bgPanel,
    '--netlab-border': resolved.border,
    '--netlab-border-subtle': resolved.borderSubtle,
    '--netlab-text-primary': resolved.textPrimary,
    '--netlab-text-secondary': resolved.textSecondary,
    '--netlab-text-muted': resolved.textMuted,
    '--netlab-text-faint': resolved.textFaint,
    '--netlab-accent-blue': resolved.accentBlue,
    '--netlab-accent-green': resolved.accentGreen,
    '--netlab-accent-red': resolved.accentRed,
    '--netlab-accent-orange': resolved.accentOrange,
    '--netlab-accent-yellow': resolved.accentYellow,
    '--netlab-accent-cyan': resolved.accentCyan,
    '--netlab-accent-purple': resolved.accentPurple,
    '--netlab-node-router-bg': resolved.nodeRouterBg,
    '--netlab-node-switch-bg': resolved.nodeSwitchBg,
    '--netlab-node-client-bg': resolved.nodeClientBg,
    '--netlab-node-server-bg': resolved.nodeServerBg,
    // ── Learning-surface (second tier — Gallery / brief / conclusion) ────────
    '--netlab-learning-surface-bg': resolved.learningSurfaceBg,
    '--netlab-learning-surface-border': resolved.learningSurfaceBorder,
    '--netlab-learning-shadow': resolved.learningSurfaceShadow,
    '--netlab-learning-hero-bg': resolved.learningSurfaceHeroBg,
    '--netlab-learning-glass-bg': resolved.learningSurfaceGlassBg,
    '--netlab-learning-glass-blur': resolved.learningSurfaceGlassBlur,
    // ── Radius scale (learning-surface only — terminal stays 4–8px hardcoded) ─
    '--netlab-radius-sm': RADIUS_SCALE.sm,
    '--netlab-radius-md': RADIUS_SCALE.md,
    '--netlab-radius-lg': RADIUS_SCALE.lg,
    '--netlab-radius-pill': RADIUS_SCALE.pill,
  } as React.CSSProperties;
  if (axes?.density) {
    return { ...base, ...densityToVars(axes.density) };
  }
  return base;
}
