/**
 * Learning-surface tokens (08 · two-tier system).
 *
 * The **second** visual surface in netlab. Used by the onboarding layer —
 * Gallery, PreFlightBrief (full card), the conclusion card, and future
 * sandbox-intro views — where visual hierarchy (one shadow, one glass, a
 * radius scale, a subtle radial wash) helps beginners scan by silhouette.
 *
 * The first surface, **terminal-surface** (Simulator, NodeDetailPanel,
 * StatusLine, …), is frozen by this layer: it keeps flat backgrounds, 4–8px
 * radii, no shadow, and no backdrop-filter. See docs/ui/theming.md#surfaces.
 *
 * These fields live on {@link NetlabTheme} and are emitted as `--netlab-learning-*`
 * / `--netlab-radius-*` CSS vars by `themeToVars`. They reference existing
 * `--netlab-*` accent/background vars via `color-mix`, so they track the
 * active palette / contrast / cbsafe axes automatically.
 */

/** The learning-surface token channel grown onto {@link NetlabTheme}. */
export interface LearningSurfaceTokens {
  /** Page-level wash for learning-surface routes (radial gradient over bg-primary). */
  learningSurfaceBg: string;
  /** Card / frame border — tinted vs the terminal border. */
  learningSurfaceBorder: string;
  /** The ONE shadow allowed on learning-surface. Single resting state — never animates. */
  learningSurfaceShadow: string;
  /** Hero card background (denser gradient, used once per page). */
  learningSurfaceHeroBg: string;
  /** Glass strip background — paired with {@link LearningSurfaceTokens.learningSurfaceGlassBlur}. */
  learningSurfaceGlassBg: string;
  /** Glass strip blur amount. Hero / search strip only. */
  learningSurfaceGlassBlur: string;
}

/** Radius scale — learning-surface only. Terminal-surface stays 4–8px hardcoded. */
export const RADIUS_SCALE = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  pill: '999px',
} as const;

/** Dark theme learning-surface values. */
export const DARK_LEARNING_SURFACE: LearningSurfaceTokens = {
  learningSurfaceBg:
    'radial-gradient(circle at top left, color-mix(in srgb, var(--netlab-accent-cyan) 6%, var(--netlab-bg-surface)) 0%, transparent 32%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--netlab-accent-purple) 5%, var(--netlab-bg-primary)) 0%, transparent 38%), var(--netlab-bg-primary)',
  learningSurfaceBorder:
    'color-mix(in srgb, var(--netlab-text-secondary) 14%, var(--netlab-border))',
  learningSurfaceShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
  learningSurfaceHeroBg:
    'linear-gradient(135deg, color-mix(in srgb, var(--netlab-accent-blue) 12%, var(--netlab-bg-surface)) 0%, var(--netlab-bg-surface) 55%, color-mix(in srgb, var(--netlab-accent-cyan) 8%, var(--netlab-bg-elevated)) 100%)',
  learningSurfaceGlassBg: 'color-mix(in srgb, var(--netlab-bg-primary) 76%, transparent)',
  learningSurfaceGlassBlur: 'blur(8px)',
};

/** Light theme learning-surface values. Lighter shadows, brighter washes. */
export const LIGHT_LEARNING_SURFACE: LearningSurfaceTokens = {
  learningSurfaceBg:
    'radial-gradient(circle at top left, color-mix(in srgb, var(--netlab-accent-cyan) 10%, var(--netlab-bg-surface)) 0%, transparent 26%), radial-gradient(circle at top right, color-mix(in srgb, var(--netlab-accent-blue) 8%, var(--netlab-bg-primary)) 0%, transparent 32%), radial-gradient(circle at bottom, color-mix(in srgb, var(--netlab-accent-green) 6%, transparent), transparent 40%), var(--netlab-bg-primary)',
  learningSurfaceBorder:
    'color-mix(in srgb, var(--netlab-text-secondary) 18%, var(--netlab-border))',
  learningSurfaceShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
  learningSurfaceHeroBg:
    'linear-gradient(135deg, color-mix(in srgb, var(--netlab-accent-blue) 10%, var(--netlab-bg-surface)) 0%, color-mix(in srgb, var(--netlab-bg-surface) 86%, var(--netlab-bg-primary)) 55%, color-mix(in srgb, var(--netlab-accent-cyan) 7%, var(--netlab-bg-elevated)) 100%)',
  learningSurfaceGlassBg: 'rgba(255, 255, 255, 0.72)',
  learningSurfaceGlassBlur: 'blur(8px)',
};

/**
 * Academic palette desaturates the gradient washes (projector / print friendly).
 * Applied on top of the base theme's learning-surface values when
 * `palette === 'academic'`. cbsafe inherits the base values (no override).
 */
export const ACADEMIC_LEARNING_SURFACE_OVERRIDES: Partial<LearningSurfaceTokens> = {
  learningSurfaceBg:
    'radial-gradient(circle at top left, color-mix(in srgb, var(--netlab-accent-cyan) 5%, var(--netlab-bg-surface)) 0%, transparent 30%), var(--netlab-bg-primary)',
  learningSurfaceHeroBg:
    'linear-gradient(135deg, color-mix(in srgb, var(--netlab-accent-blue) 6%, var(--netlab-bg-surface)) 0%, var(--netlab-bg-surface) 100%)',
};
