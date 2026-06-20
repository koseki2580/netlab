import { useEffect, useRef, type RefObject } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useOptionalProgress } from '../../progress';

/**
 * Shared building blocks for the active-recall drill panels (subnetting,
 * routing-decision, …). Keeps the panels consistent and DRY, and centralizes
 * the accessibility behavior — focus management and feedback announcement — so
 * every drill gets it for free.
 */

export const drillCardStyle: React.CSSProperties = {
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-learning-surface-border)',
  borderRadius: 'var(--netlab-radius-lg)',
  boxShadow: 'var(--netlab-learning-surface-shadow)',
  padding: 24,
  maxWidth: 560,
  margin: '0 auto',
  display: 'grid',
  gap: 16,
};

export function pillButton(accent: string): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 'var(--netlab-radius-pill)',
    border: `1px solid color-mix(in srgb, ${accent} 40%, var(--netlab-learning-surface-border))`,
    background: `color-mix(in srgb, ${accent} 14%, var(--netlab-bg-surface))`,
    color: 'var(--netlab-text-primary)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  };
}

export const drillInputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 'var(--netlab-radius-sm)',
  border: '1px solid var(--netlab-learning-surface-border)',
  background: 'var(--netlab-bg-primary)',
  color: 'var(--netlab-text-primary)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 15,
};

/** Learning-surface page wrapper for a drill. */
export function DrillFrame({
  idPrefix,
  children,
}: {
  idPrefix: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={idPrefix}
      style={{
        background: 'var(--netlab-learning-surface-bg)',
        // Own the scroll: in a fixed-height host slot (the demo shell clips
        // overflow) `height:100%` constrains the frame and `overflowY:auto`
        // lets a tall drill scroll instead of clipping its prompt/answers off
        // the bottom. In an auto-height embed `height:100%` resolves to auto, so
        // the frame just grows with its content (no scrollbar).
        height: '100%',
        overflowY: 'auto',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Collapsible "what you're practicing" primer so a beginner can learn the
 * concept before being tested on it — teach-then-test, not cold-test.
 */
export function ConceptCallout({
  idPrefix,
  title,
  children,
}: {
  idPrefix: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details
      data-testid={`${idPrefix}-concept`}
      style={{
        border: '1px solid var(--netlab-learning-surface-border)',
        borderRadius: 'var(--netlab-radius-md)',
        padding: '8px 12px',
        background: 'color-mix(in srgb, var(--netlab-accent-blue) 6%, var(--netlab-bg-surface))',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          color: 'var(--netlab-text-primary)',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {title}
      </summary>
      <div
        style={{
          marginTop: 8,
          color: 'var(--netlab-text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </details>
  );
}

export interface DrillResult {
  readonly correct: boolean;
  readonly expected: string;
  readonly explanation: string;
}

/** The pass/fail feedback block, announced to assistive tech via `role=status`. */
export function DrillFeedback({
  idPrefix,
  result,
}: {
  idPrefix: string;
  result: DrillResult | null;
}) {
  const { t } = useI18n();
  return (
    <div
      data-testid={`${idPrefix}-feedback`}
      role="status"
      aria-live="polite"
      style={{ minHeight: 44 }}
    >
      {result && (
        <div
          data-testid={`${idPrefix}-${result.correct ? 'correct' : 'incorrect'}`}
          style={{
            borderRadius: 'var(--netlab-radius-md)',
            padding: '10px 12px',
            background: `color-mix(in srgb, ${
              result.correct ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-red)'
            } 12%, var(--netlab-bg-surface))`,
            color: 'var(--netlab-text-primary)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <strong>
            {result.correct
              ? t('learning.drill.correct')
              : t('learning.drill.incorrect', { expected: result.expected })}
          </strong>
          <div style={{ marginTop: 4, color: 'var(--netlab-text-secondary)' }}>
            {result.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Focus the returned input ref whenever `key` changes (a new question) — but
 * NOT on initial mount, so a screen-reader user first lands on the heading and
 * concept primer rather than being dropped straight into the input. Because
 * each drill's question prompt is the input's `<label>`, moving focus on a
 * change also makes a screen reader announce the new question.
 */
export function useQuestionFocus<T extends HTMLElement>(key: unknown): RefObject<T> {
  const ref = useRef<T>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    ref.current?.focus();
  }, [key]);
  return ref;
}

/**
 * Focus the returned ref when `active` becomes true — used to move focus to the
 * results heading when a session ends, so a keyboard/SR user isn't stranded at
 * `<body>` when the question view unmounts. The target should have `tabIndex={-1}`.
 */
export function useFocusWhen<T extends HTMLElement>(active: boolean): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}

/**
 * Record a `drill` completion in learner progress when a session finishes, so
 * drills show up alongside tutorials/assessments in the progress panel and
 * learning map. Uses `useOptionalProgress()`, so without a provider or
 * learnerId it is a no-op. Records once per completed session and re-arms on
 * restart (when `done` flips back to false).
 */
export function useDrillCompletion(
  id: string,
  label: string,
  done: boolean,
  passed: number,
  total: number,
): void {
  const progress = useOptionalProgress();
  const recorded = useRef(false);
  useEffect(() => {
    if (!done) {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;
    progress.recordCompletion({ kind: 'drill', id, label, score: { passed, total } });
  }, [done, id, label, passed, progress, total]);
}
