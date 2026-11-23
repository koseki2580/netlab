import { Suspense, lazy, useMemo, useState } from 'react';
import { LazyPanelBoundary } from '../LazyPanelBoundary';
import { useI18n } from '../../i18n/useI18n';
import type { ConceptCheckPanelProps } from './ConceptCheckPanelInner';

/**
 * Public entry for the Protocol Concept Checks. The panel body is lazy-loaded,
 * and its strings load in chunks of their own, en and ja alike, only the chunks
 * a view needs (`conceptCatalog.ts`), so consumers that never render it pay
 * nothing for them. `deckId` starts straight in one deck; `reviewScope` limits
 * the review queue to some decks; `autoStartReview` opens straight in the review
 * when something is due; `endActions` adds actions to the end screen.
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
}: ConceptCheckPanelProps & {
  /** Seam for tests to simulate a failing chunk; never set by consumers. */
  importInner?: () => Promise<{ default: typeof import('./ConceptCheckPanelInner').default }>;
} = {}) {
  // The fallback copy lives in the BASE catalog, not the lazy concept one: when
  // the chunk is what failed, its strings failed with it.
  const { t } = useI18n();
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
    <LazyPanelBoundary
      onRetry={() => setAttempt((value) => value + 1)}
      heading={t('learning.drill.loadError.heading')}
      body={t('learning.drill.loadError.body')}
      retryLabel={t('learning.drill.loadError.retry')}
    >
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    </LazyPanelBoundary>
  );
}
