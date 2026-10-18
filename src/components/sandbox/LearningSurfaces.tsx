import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { LazyPanelBoundary } from '../LazyPanelBoundary';

const importInner = () => import('./LearningSurfacesInner');
// One shared lazy for the first attempt, so re-opening a surface after the chunk
// has loaded renders synchronously instead of suspending again.
const InitialInner = lazy(importInner);

/**
 * Lazy boundary around the learning surfaces (sandbox, intro, assessment,
 * tutorial, embed). Their UI only renders when a learning prop is set, so
 * `SimulationProvider` must not carry it statically: splitting it out halves
 * the simulation context's eagerly loaded graph (646 kB → 290 kB raw).
 *
 * The fallback is `null`: the children are composed *inside* the sandbox and
 * tutorial providers, so they wait for the chunk rather than mount once
 * without those contexts and remount with them. A failed chunk degrades to the
 * shared in-place retry panel; retry mints a fresh `lazy()` because React
 * caches a rejected one permanently.
 */
export function LearningSurfaces({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const Inner = useMemo(() => (attempt === 0 ? InitialInner : lazy(importInner)), [attempt]);

  return (
    <LazyPanelBoundary
      onRetry={() => setAttempt((value) => value + 1)}
      heading={t('simulation.learningSurfaceLoad.heading')}
      body={t('simulation.learningSurfaceLoad.body')}
      retryLabel={t('simulation.learningSurfaceLoad.retry')}
    >
      <Suspense fallback={null}>
        <Inner>{children}</Inner>
      </Suspense>
    </LazyPanelBoundary>
  );
}
