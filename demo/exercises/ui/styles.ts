import type { CSSProperties } from 'react';

/**
 * The looks the exercise pages share. Colours come from the app's theme
 * variables, as on the final test's page, so both themes are covered.
 */

export const CARD: CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border)',
  borderRadius: 10,
  padding: 16,
  color: 'var(--netlab-text-primary)',
  lineHeight: 1.7,
};

/** The one thing to press next. 48px high: the biggest target on the page. */
export const PRIMARY: CSSProperties = {
  minHeight: 48,
  padding: '10px 20px',
  borderRadius: 8,
  border: '1px solid #0f766e',
  background: '#115e59',
  color: '#ecfeff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 16,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

/** Everything else that can be pressed. */
export const SECONDARY: CSSProperties = {
  minHeight: 44,
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--netlab-border)',
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

export const LINK: CSSProperties = {
  color: 'var(--netlab-accent-cyan)',
  textDecoration: 'underline',
  fontWeight: 600,
};

/** 16px text, so iOS does not zoom the page when the field is tapped. */
export const INPUT: CSSProperties = {
  minHeight: 44,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--netlab-border)',
  background: 'var(--netlab-bg-primary)',
  color: 'var(--netlab-text-primary)',
  fontSize: 16,
  fontFamily: 'ui-monospace, monospace',
  boxSizing: 'border-box',
  maxWidth: '100%',
};

/**
 * A list to pick from. Safari draws a native `<select>` at its own height
 * (23px) whatever `minHeight` says, so the native look is switched off and the
 * arrow drawn here; the list then takes the 44px a finger needs everywhere.
 */
const SELECT_ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23808a99' stroke-width='2'/%3E%3C/svg%3E\")";

export const SELECT: CSSProperties = {
  ...INPUT,
  appearance: 'none',
  WebkitAppearance: 'none',
  padding: '8px 32px 8px 10px',
  background: `var(--netlab-bg-primary) ${SELECT_ARROW} no-repeat right 10px center / 12px 8px`,
};

export const MUTED: CSSProperties = { color: 'var(--netlab-text-secondary)' };

/** A page that is a column of cards (hub, level, placement, report). */
export const PAGE: CSSProperties = { height: '100%', overflow: 'auto' };
export const COLUMN: CSSProperties = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '24px 16px',
  display: 'grid',
  gap: 16,
};
