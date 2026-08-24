import { Suspense, lazy, useMemo, useState } from 'react';
import { LazyPanelBoundary } from '../LazyPanelBoundary';
import type { SimulatorCanvasProps } from './canvasEngine';

/**
 * The simulator's graph engine, loaded on demand.
 *
 * The lazy boundary is not decoration: maxGraph is ~112 kB gzip, and drawing it
 * into whatever chunk holds the simulation context makes every consumer of that
 * context pay for the engine whether or not they ever show a canvas. The editor
 * engine is split the same way, so both share one downloaded copy.
 */
export function SimulatorMaxGraph({
  importInner = () => import('./SimulatorMaxGraphInner'),
  ...props
}: SimulatorCanvasProps & {
  /** Seam for tests to simulate a failing chunk; never set by consumers. */
  importInner?: () => Promise<{ default: (p: SimulatorCanvasProps) => React.ReactNode }>;
}) {
  const [attempt, setAttempt] = useState(0);
  const Inner = useMemo(() => {
    void attempt;
    return lazy(importInner);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a retry must mint a new lazy
  }, [attempt]);

  return (
    <LazyPanelBoundary
      onRetry={() => setAttempt((value) => value + 1)}
      heading="Canvas could not be loaded"
      body="The code for the diagram engine failed to download. Check your connection and try again."
      retryLabel="Retry"
    >
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    </LazyPanelBoundary>
  );
}
