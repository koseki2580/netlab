import type { CSSProperties } from 'react';

export const MONO_FONT_STACK = 'ui-monospace, monospace';

export const TEXT = {
  primary: 'var(--netlab-text-primary)',
  secondary: 'var(--netlab-text-secondary)',
  muted: 'var(--netlab-text-muted)',
  faint: 'var(--netlab-text-faint)',
} as const;

export const PANEL_HEADER: CSSProperties = {
  color: TEXT.secondary,
  fontFamily: MONO_FONT_STACK,
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

export const SECTION_HEADER: CSSProperties = {
  ...PANEL_HEADER,
  marginBottom: 10,
};

export const FIELD_ROW: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '84px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 8,
};

export const INLINE_FIELD_ROW: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 3,
};

export const NODE_SECTION_HEADER: CSSProperties = {
  ...PANEL_HEADER,
  margin: '10px 0 6px',
};

export const CARD: CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

export function statusPill(tone: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    border: `1px solid color-mix(in srgb, ${tone} 28%, var(--netlab-border))`,
    color: tone,
    background: `color-mix(in srgb, ${tone} 12%, transparent)`,
    fontFamily: MONO_FONT_STACK,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.4,
    padding: '2px 8px',
  };
}
