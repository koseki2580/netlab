import { useMemo, useState } from 'react';
import { getSnapshotAt } from '../../sandbox/snapshots/getSnapshotAt';
import type { NamedSnapshot } from '../../sandbox/snapshots/types';
import { toEngine } from '../../sandbox/SimulationSnapshot';
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

export function BeforeAfterView({
  snapshotPair,
}: {
  readonly snapshotPair?: {
    readonly left: NamedSnapshot;
    readonly right: NamedSnapshot;
  };
} = {}) {
  const sandbox = useSandbox();
  const [viewport, setViewport] = useState<NetlabViewport>({ x: 0, y: 0, zoom: 1 });
  const leftSnapshot = snapshotPair
    ? getSnapshotAt(sandbox.engine.root, sandbox.session, snapshotPair.left.editIndex)
    : null;
  const rightSnapshot = snapshotPair
    ? getSnapshotAt(sandbox.engine.root, sandbox.session, snapshotPair.right.editIndex)
    : null;
  const leftEngine = useMemo(() => (leftSnapshot ? toEngine(leftSnapshot) : null), [leftSnapshot]);
  const rightEngine = useMemo(
    () => (rightSnapshot ? toEngine(rightSnapshot) : null),
    [rightSnapshot],
  );
  const baseline = sandbox.engine.baseline;
  const baselineValue = useMemo(() => (baseline ? simulationValueFor(baseline) : null), [baseline]);
  const whatIfValue = useMemo(() => simulationValueFor(sandbox.engine.whatIf), [sandbox.engine]);
  const leftValue = useMemo(
    () => (leftEngine ? simulationValueFor(leftEngine) : null),
    [leftEngine],
  );
  const rightValue = useMemo(
    () => (rightEngine ? simulationValueFor(rightEngine) : null),
    [rightEngine],
  );

  if (snapshotPair) {
    if (!leftValue || !rightValue) {
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
        <SimulationContext.Provider value={leftValue}>
          <section
            aria-label={`Snapshot ${snapshotPair.left.name}`}
            style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
          >
            <NetlabCanvas viewport={viewport} onViewportChange={setViewport} />
          </section>
        </SimulationContext.Provider>
        <SimulationContext.Provider value={rightValue}>
          <section
            aria-label={`Snapshot ${snapshotPair.right.name}`}
            style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
          >
            <NetlabCanvas viewport={viewport} onViewportChange={setViewport} />
          </section>
        </SimulationContext.Provider>
      </div>
    );
  }

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
