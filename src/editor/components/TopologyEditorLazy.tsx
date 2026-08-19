import { Suspense, lazy, useMemo, useState } from 'react';
import { LazyPanelBoundary } from '../../components/LazyPanelBoundary';
import type { TopologyEditorProps } from './TopologyEditor';

/**
 * Public entry for the topology editor. The editor body — canvas, palette,
 * sidebar and the graph engine behind them — is lazy-loaded, so a consumer that
 * imports netlab without rendering an editor does not carry it in the root
 * bundle. The export name and props are unchanged; only the loading is.
 *
 * Wrapped in the shared boundary because this is a package export: a chunk that
 * fails to load (page left open across a deploy, dropped connection) must show a
 * message here, not throw into the consumer's app. Retry re-creates the
 * `lazy()` — React caches a rejected one for the component's life.
 */
export function TopologyEditor({
  importInner = () => import('./TopologyEditor'),
  ...props
}: TopologyEditorProps & {
  /** Seam for tests to simulate a failing chunk; never set by consumers. */
  importInner?: () => Promise<{ TopologyEditor: (p: TopologyEditorProps) => React.ReactNode }>;
}) {
  const [attempt, setAttempt] = useState(0);
  const Inner = useMemo(() => {
    void attempt;
    return lazy(async () => ({ default: (await importInner()).TopologyEditor }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a retry must mint a new lazy
  }, [attempt]);

  return (
    <LazyPanelBoundary
      onRetry={() => setAttempt((value) => value + 1)}
      heading="Editor could not be loaded"
      body="The code for the topology editor failed to download. Check your connection and try again."
      retryLabel="Retry"
    >
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    </LazyPanelBoundary>
  );
}
