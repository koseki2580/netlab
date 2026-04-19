/**
 * E2E test helper — exposes simulation traces on `window.__NETLAB_TRACE__`
 * so Playwright specs can read them without touching the DOM.
 *
 * Rendered only when `import.meta.env.MODE === 'test'`.
 */
import { useEffect } from 'react';
import { useOptionalSimulation } from '../src/simulation/SimulationContext';

declare global {
  interface Window {
    __NETLAB_TRACE__?: {
      traces: unknown[];
      lastStatus: string | null;
    };
  }
}

export function E2eTraceHook() {
  const simCtx = useOptionalSimulation();
  useEffect(() => {
    if (simCtx) {
      window.__NETLAB_TRACE__ = {
        traces: simCtx.state.traces,
        lastStatus: simCtx.state.status,
      };
    }
  }, [simCtx?.state.traces, simCtx?.state.status, simCtx]);
  return null;
}
