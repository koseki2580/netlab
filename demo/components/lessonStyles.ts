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

/**
 * A prediction choice or a tab. Unchosen options are outlined (accent border
 * and text, no fill); the chosen one is filled with the accent and ringed, so
 * it reads as the strongest option in both themes rather than as a disabled
 * one. Pair it with `aria-checked`/`aria-selected` and a leading "✓ " in the
 * label.
 */
export function lessonChoice(chosen: boolean): CSSProperties {
  return chosen
    ? {
        ...LESSON_BUTTON,
        border: '1px solid var(--netlab-accent-cyan)',
        minHeight: 44,
        outline: '2px solid var(--netlab-accent-cyan)',
        outlineOffset: 2,
      }
    : {
        ...LESSON_BUTTON,
        border: '1px solid var(--netlab-accent-cyan)',
        background: 'transparent',
        color: 'var(--netlab-accent-cyan)',
        minHeight: 44,
      };
}

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
  minHeight: 44,
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

/**
 * The teal button while it is disabled (before a prediction is chosen). It is
 * drawn as an outlined neutral button rather than faded with opacity, so its
 * label ("Predict first") still reads at 4.5:1 in both themes.
 */
export const LESSON_TEAL_BUTTON_DISABLED: CSSProperties = {
  ...LESSON_TEAL_BUTTON,
  border: '1px solid var(--netlab-border-strong)',
  background: 'var(--netlab-bg-elevated)',
  color: 'var(--netlab-text-secondary)',
  cursor: 'not-allowed',
};

/** A bordered box in a lesson's side column. */
export const LESSON_PANEL: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

/** A card in a lesson's panel, edged with the theme's strong border. */
export const LESSON_CARD: CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid var(--netlab-border-strong)',
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

/**
 * The mark before a prediction option's label. Before the reveal the chosen
 * option shows "✓ " (chosen). After it, the chosen option shows "✗ " when it
 * was wrong and the right one shows "✓ ", as the concept check marks them.
 * `answer` is the right option, or the list of them when more than one is
 * right; it may be unknown until the reveal.
 */
export function predictionMark<T>(
  id: T,
  guess: T | null | undefined,
  answer: T | readonly T[] | undefined,
  revealed: boolean,
): string {
  if (!revealed) return guess === id ? '✓ ' : '';
  const right = Array.isArray(answer) ? (answer as readonly T[]).includes(id) : answer === id;
  if (right) return '✓ ';
  return guess === id ? '✗ ' : '';
}
