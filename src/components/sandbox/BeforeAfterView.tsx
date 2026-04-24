import { useMemo, useState } from 'react';
import { useSandbox } from '../../sandbox/useSandbox';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import type { SimulationEngine } from '../../simulation/SimulationEngine';
import type { InFlightPacket } from '../../types/packets';
import { NetlabCanvas, type NetlabViewport } from '../NetlabCanvas';

function simulationValueFor(engine: SimulationEngine): SimulationContextValue {
  return {
    engine,
    state: engine.getState(),
    sendPacket: (packet: InFlightPacket) => engine.send(packet),
    simulateDhcp: (clientNodeId: string) => engine.simulateDhcp(clientNodeId),
    simulateDns: (clientNodeId: string, hostname: string) =>
      engine.simulateDns(clientNodeId, hostname),
    getDhcpLeaseState: (nodeId: string) => engine.getDhcpLeaseState(nodeId),
    getDnsCache: (nodeId: string) => engine.getDnsCache(nodeId),
    exportPcap: (traceId?: string) => engine.exportPcap(traceId),
    animationSpeed: engine.getPlayInterval(),
    setAnimationSpeed: (ms: number) => engine.setPlayInterval(ms),
    isRecomputing: false,
  };
}

export function BeforeAfterView() {
  const sandbox = useSandbox();
  const [viewport, setViewport] = useState<NetlabViewport>({ x: 0, y: 0, zoom: 1 });
  const baseline = sandbox.engine.baseline;
  const baselineValue = useMemo(() => (baseline ? simulationValueFor(baseline) : null), [baseline]);
  const whatIfValue = useMemo(() => simulationValueFor(sandbox.engine.whatIf), [sandbox.engine]);

  if (sandbox.mode !== 'beta' || !baselineValue) {
    return null;
  }

  return (
    <div
      data-testid="before-after-view"
      style={{
        display: 'flex',
        gap: 8,
        height: '100%',
        minHeight: 0,
        background: 'var(--netlab-bg-primary)',
      }}
    >
      <SimulationContext.Provider value={baselineValue}>
        <section
          aria-label="Baseline simulation"
          style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
        >
          <NetlabCanvas viewport={viewport} onViewportChange={setViewport} />
        </section>
      </SimulationContext.Provider>
      <SimulationContext.Provider value={whatIfValue}>
        <section
          aria-label="What-if simulation"
          style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
        >
          <NetlabCanvas viewport={viewport} onViewportChange={setViewport} />
        </section>
      </SimulationContext.Provider>
    </div>
  );
}
