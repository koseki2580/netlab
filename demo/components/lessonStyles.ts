import type { CSSProperties } from 'react';

/**
 * The style primitives lessons share, so a lesson's button, panel, card and
 * section label are written once.
 *
 * Each was copied into the lessons one by one, and some copies drifted. The
 * drifted ones are kept as named variants here rather than made to match:
 * moving a lesson onto this module must not change how it looks.
 */

/** The cyan action button most protocol lessons use. */
export const LESSON_BUTTON: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

/** The same button without its colours, for a lesson that sets them per state. */
export const LESSON_BUTTON_PLAIN: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

/**
 * The teal "send" button of the beginner lessons. Its colours are fixed hex
 * values: no theme token has them in both themes, so they stay as they are.
 */
export const LESSON_TEAL_BUTTON: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #0f766e',
  background: '#115e59',
  color: '#ecfeff',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
};

/** A bordered box in a lesson's side column. */
export const LESSON_PANEL: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

/** A card in a lesson's panel, with the dark edge the beginner lessons use. */
export const LESSON_CARD: CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid #1f2937',
  borderRadius: 10,
  padding: 12,
};

/** The small upper-case heading over a card's contents. */
export const LESSON_LABEL: CSSProperties = {
  color: 'var(--netlab-text-secondary)',
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  marginBottom: 8,
  textTransform: 'uppercase',
};
