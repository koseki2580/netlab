import { Suspense, lazy, useMemo, useState } from 'react';
import { LazyPanelBoundary } from '../../components/LazyPanelBoundary';
import { useI18n } from '../../i18n/useI18n';
import type { GraphEngineProps } from './types';

/**
 * maxGraph engine, loaded on demand.
 *
 * The lazy boundary is not decoration: maxGraph is ~112 kB gzip in a realistic
 * editor build, and it must never enter the root chunk. Consumers that never
 * mount this engine pay nothing for it.
 */
export function MaxGraphEngine({
  importInner = () => import('./MaxGraphEngineInner'),
  ...props
}: GraphEngineProps & {
  /** Seam for tests to simulate a failing chunk; never set by consumers. */
  importInner?: () => Promise<{ default: (p: GraphEngineProps) => React.ReactNode }>;
}) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const Inner = useMemo(() => {
    void attempt;
    return lazy(importInner);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a retry must mint a new lazy
  }, [attempt]);

  return (
    <LazyPanelBoundary
      onRetry={() => setAttempt((value) => value + 1)}
      heading={t('editor.load.canvasHeading')}
      body={t('editor.load.canvasBody')}
      retryLabel={t('editor.load.retry')}
    >
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    </LazyPanelBoundary>
  );
}
