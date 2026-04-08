import { useEffect } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import DemoShell from '../DemoShell';
import { STEP_SIM_TOPOLOGY, buildStepSimPacket } from './stepSimShared';

function TraceInspectorDemoInner() {
  const { topology } = useNetlabContext();
  const { sendPacket, state } = useSimulation();

  useEffect(() => {
    if (state.status !== 'idle') return;
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
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              style={{
                flex: 1,
                minHeight: 0,
                background: 'var(--netlab-bg-panel)',
                border: '1px solid var(--netlab-border-subtle)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <PacketTimeline />
            </div>

            <div style={{ flex: 2, minHeight: 0 }}>
              <HopInspector />
            </div>
          </div>

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
