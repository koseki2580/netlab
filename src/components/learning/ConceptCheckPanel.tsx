import { Suspense, lazy, useMemo, useState } from 'react';
import type { createReviewStore } from '../../learning/review';
import { LazyPanelBoundary } from './LazyPanelBoundary';

/**
 * Public entry for the Protocol Concept Checks. The panel body and its large
 * en+ja concept-check catalogs are lazy-loaded, so consumers that never render it
 * pay nothing for the strings. See ConceptCheckPanelInner for the merged catalog.
 *
 * The deck DATA is not lazy: `src/index.ts` re-exports `CONCEPT_DECKS` (and
 * `decksByLayer`/`getDeck`) at value level, so it lands in the statically-imported
 * drillKit chunk — 85 kB of that chunk's 92 kB, measured on dist/. That is the
 * price of the decks being a public export; the `ui:drill-kit` size budget watches
 * it, since the root budget is far too loose to notice the catalog growing.
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
