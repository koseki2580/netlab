import { Suspense, lazy, useMemo, useState } from 'react';
import type { createReviewStore } from '../../learning/review';
import { LazyPanelBoundary } from './LazyPanelBoundary';

/**
 * Public entry for the Protocol Concept Checks. The implementation — the panel
 * body plus the large concept-check deck catalog and its i18n strings — is
 * lazy-loaded so none of it weighs down the root bundle for consumers that don't
 * render it. See ConceptCheckPanelInner for the actual panel + merged catalog.
 *
 * The import is wrapped in an error boundary because this is a package export: a
 * chunk that fails to load (page left open across a deploy, dropped connection)
 * must degrade to an in-panel message, not throw into the consumer's app. Retry
 * re-creates the `lazy()` — React caches a rejected one for the component's life.
 */
export function ConceptCheckPanel({
  importInner = () => import('./ConceptCheckPanelInner'),
  ...props
}: {
  reviewStore?: ReturnType<typeof createReviewStore>;
  /** Seam for tests to simulate a failing chunk; never set by consumers. */
  importInner?: () => Promise<{ default: typeof import('./ConceptCheckPanelInner').default }>;
} = {}) {
  const [attempt, setAttempt] = useState(0);
  const Inner = useMemo(() => {
    // `attempt` is what this memo keys on: a retry must mint a NEW lazy, because
    // React caches the rejection on the old one for good. The import specifier
    // stays static so Vite can still split the chunk.
    void attempt;
    return lazy(importInner);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a retry must mint a new lazy
  }, [attempt]);

  return (
    <LazyPanelBoundary onRetry={() => setAttempt((value) => value + 1)}>
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    </LazyPanelBoundary>
  );
}
