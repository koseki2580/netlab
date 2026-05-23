import { useEffect } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { scenarioRegistry } from '../../src/scenarios';
import type { Scenario } from '../../src/scenarios/types';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { useCompareTimeline } from './CompareShell';

export interface ComparePaneProps {
  scenarioId: string;
  /** Stable key used to register this pane's hop count with the shared timeline. */
  side: string;
}

/**
 * M4 — one side of a compare view: a scenario rendered in its own provider tree,
 * auto-probed once so the timeline has a trace, and driven by the shared playhead.
 */
export function ComparePane({ scenarioId, side }: ComparePaneProps) {
  const scenario = scenarioRegistry.get(scenarioId);
  if (!scenario) {
    return (
      <div
        data-testid={`compare-pane-${side}`}
        style={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--netlab-text-muted)',
        }}
      >
        unknown scenario: {scenarioId}
      </div>
    );
  }
  return (
    <div
      data-testid={`compare-pane-${side}`}
      style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
    >
      <NetlabProvider topology={scenario.topology}>
        <SimulationProvider>
          <ComparePaneInner scenario={scenario} side={side} />
        </SimulationProvider>
      </NetlabProvider>
    </div>
  );
}

function resolveProbeIp(scenario: Scenario): { from: string; dstIp: string } | null {
  const flow = scenario.sampleFlows?.[0];
  if (!flow) return null;
  const dst = scenario.topology.nodes.find((node) => node.id === flow.to);
  const dstIp = dst?.data.ip;
  if (!dstIp) return null;
  return { from: flow.from, dstIp };
}

function ComparePaneInner({ scenario, side }: { scenario: Scenario; side: string }) {
  const { engine, state } = useSimulation();
  const timeline = useCompareTimeline();

  // Probe once so the pane has a trace to scrub.
  useEffect(() => {
    const probe = resolveProbeIp(scenario);
    if (!probe) return;
    void engine.ping(probe.from, probe.dstIp);
  }, [engine, scenario]);

  const trace = state.traces[state.traces.length - 1] ?? null;
  const total = trace?.hops.length ?? 0;

  // Report this pane's length so the shared scrub spans the longer trace.
  useEffect(() => {
    timeline.registerTotal(side, total);
  }, [timeline, side, total]);

  // Drive this pane's playhead from the shared step (clamped to its own length).
  useEffect(() => {
    if (total === 0) return;
    engine.selectHop(Math.max(0, Math.min(total - 1, timeline.step)));
  }, [engine, total, timeline.step]);

  const converged = trace?.status === 'delivered';
  const dropped = trace?.status === 'dropped';

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid var(--netlab-border)',
          background: 'var(--netlab-bg-surface)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          color: 'var(--netlab-text-primary)',
        }}
      >
        <strong>{scenario.metadata.title}</strong>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {scenario.metadata.protocols.slice(0, 1).map((protocol) => (
            <span key={protocol} style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
              {protocol}
            </span>
          ))}
          <span
            data-testid={`compare-converged-${side}`}
            title={converged ? 'delivered' : dropped ? 'dropped' : 'in flight'}
            style={{
              color: converged
                ? 'var(--netlab-accent-green)'
                : dropped
                  ? 'var(--netlab-accent-red)'
                  : 'var(--netlab-text-muted)',
            }}
          >
            {converged ? '✓' : dropped ? '▼' : '⏳'}
          </span>
        </span>
      </header>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <NetlabCanvas />
      </div>
    </>
  );
}
