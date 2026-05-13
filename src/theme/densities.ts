import type React from 'react';

/**
 * Density axis — drives layout-level CSS variables (paddings, gaps,
 * font sizes). Compact is for power-user verification tools that want
 * to see route tables at a glance; relaxed is for projector use.
 */
export type NetlabDensity = 'compact' | 'standard' | 'relaxed';

export interface NetlabDensityTokens {
  /** Generic surface padding. Emitted as `--netlab-pad`. */
  pad: string;
  /** Generic gap between siblings. Emitted as `--netlab-gap`. */
  gap: string;
  /** Default body/data font size. Emitted as `--netlab-font`. */
  font: string;
  /** Title / heading font size. Emitted as `--netlab-title`. */
  title: string;
  /** Eyebrow / kicker font size. Emitted as `--netlab-eyebrow`. */
  eyebrow: string;
}

/**
 * Density → token values. Numbers match the prototype in
 * `handoff/04-flow-v1/reference.html` so the migration produces visually
 * identical output at each density step.
 */
export const NETLAB_DENSITIES: Record<NetlabDensity, NetlabDensityTokens> = {
  compact: {
    pad: '10px',
    gap: '8px',
    font: '10px',
    title: '13px',
    eyebrow: '10px',
  },
  standard: {
    pad: '14px',
    gap: '12px',
    font: '11px',
    title: '14px',
    eyebrow: '10px',
  },
  relaxed: {
    pad: '18px',
    gap: '16px',
    font: '12px',
    title: '16px',
    eyebrow: '11px',
  },
};

/**
 * Convert a density value to a `React.CSSProperties` object of
 * `--netlab-*` custom properties.
 */
export function densityToVars(density: NetlabDensity): React.CSSProperties {
  const tokens = NETLAB_DENSITIES[density];
  return {
    '--netlab-pad': tokens.pad,
    '--netlab-gap': tokens.gap,
    '--netlab-font': tokens.font,
    '--netlab-title': tokens.title,
    '--netlab-eyebrow': tokens.eyebrow,
  } as React.CSSProperties;
}
