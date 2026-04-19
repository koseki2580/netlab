import { useEffect } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { StepControls } from '../../src/components/simulation/StepControls';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import DemoShell from '../DemoShell';
import { STEP_SIM_TOPOLOGY, buildStepSimPacket } from './stepSimShared';

// ── Inner component that auto-sends a packet on mount ────────────────────────

function StepSimDemoInner() {
  const { sendPacket, state } = useSimulation();
  const { topology } = useNetlabContext();

  useEffect(() => {
    if (state.status !== 'idle') return;
    const packet = buildStepSimPacket(topology);
    if (!packet) return;
    void sendPacket(packet);
  }, []); // run once on mount

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Canvas area */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>
        <NetlabCanvas />
      </div>
      {/* Step controls side panel */}
      <ResizableSidebar
        defaultWidth={480}
        maxWidth={700}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
            <StepControls />
          </div>
          <PacketStructureViewer />
        </div>
      </ResizableSidebar>
    </div>
  );
}

// ── Main demo export ─────────────────────────────────────────────────────────

export default function StepSimDemo() {
  return (
    <DemoShell
      title="Step-by-Step Simulation"
      desc="Trace routing decisions hop by hop — see LPM in action"
    >
      <NetlabProvider topology={STEP_SIM_TOPOLOGY}>
        <SimulationProvider>
          <StepSimDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
