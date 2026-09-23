import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { useSimulation } from '../../src/simulation/SimulationContext';

/**
 * Summary, timeline and hop details, with the room going to whichever has
 * something to show. The timeline had a 39px window over its hops while the
 * hop details below held ~400px of "no hop selected"; now the details panel is
 * as tall as its one line until a hop is chosen, and only then shares the
 * column.
 */
export function TraceInspectorColumn() {
  const { state } = useSimulation();
  const hopChosen = state.selectedHop !== null;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
      }}
    >
      <TraceSummary />

      <div
        data-testid="lesson-trace-timeline"
        style={{
          flex: '1 1 0',
          minHeight: 200,
          background: 'var(--netlab-bg-panel)',
          border: '1px solid var(--netlab-border-subtle)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <PacketTimeline />
      </div>

      <div
        data-testid="lesson-hop-details"
        style={hopChosen ? { flex: '1 1 0', minHeight: 200 } : { flex: '0 0 auto' }}
      >
        <HopInspector />
      </div>
    </div>
  );
}
