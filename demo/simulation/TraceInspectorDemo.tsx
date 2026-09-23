import { useEffect, useRef } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import DemoShell from '../DemoShell';
import { STEP_SIM_TOPOLOGY, buildStepSimPacket } from './stepSimShared';
import { TraceInspectorColumn } from './TraceInspectorColumn';

function TraceInspectorDemoInner() {
  const { topology } = useNetlabContext();
  const { sendPacket, state } = useSimulation();

  // Once per visit: the effect runs twice in development, and a second
  // identical trace put two flows the learner never sent into the list.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || state.status !== 'idle') return;
    sent.current = true;
    const packet = buildStepSimPacket(topology);
    if (!packet) return;
    void sendPacket(packet);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>

      <ResizableSidebar
        defaultWidth={420}
        maxWidth={700}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <TraceInspectorColumn />

          <SimulationControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function TraceInspectorDemo() {
  return (
    <DemoShell
      title="Trace Inspector"
      desc="Inspect the full packet trace, per-hop routing decisions, and terminal drop reasons"
    >
      <NetlabProvider topology={STEP_SIM_TOPOLOGY}>
        <SimulationProvider>
          <TraceInspectorDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
