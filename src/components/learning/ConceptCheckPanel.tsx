import { Suspense, lazy } from 'react';
import type { createReviewStore } from '../../learning/review';

/**
 * Public entry for the Protocol Concept Checks. The implementation — the panel
 * body plus the large concept-check deck catalog and its i18n strings — is
 * lazy-loaded so none of it weighs down the root bundle for consumers that don't
 * render it. See ConceptCheckPanelInner for the actual panel + merged catalog.
 */
const ConceptCheckPanelInner = lazy(() => import('./ConceptCheckPanelInner'));

export function ConceptCheckPanel(
  props: {
    reviewStore?: ReturnType<typeof createReviewStore>;
  } = {},
) {
  return (
    <Suspense fallback={null}>
      <ConceptCheckPanelInner {...props} />
    </Suspense>
  );
}
