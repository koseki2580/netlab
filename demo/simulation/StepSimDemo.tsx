import { useEffect, useRef } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { StepControls } from '../../src/components/simulation/StepControls';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { useNetlabContext } from '../../src/components/NetlabContext';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { STEP_SIM_TOPOLOGY, buildStepSimPacket } from './stepSimShared';

// ── Inner component that auto-sends a packet on mount ────────────────────────

function StepSimDemoInner() {
  const { sendPacket, state } = useSimulation();
  const { topology } = useNetlabContext();
  const t = useT();

  // Once per visit: the effect runs twice in development, and the second run
  // put a second, identical packet in the list that nobody had sent.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || state.status !== 'idle') return;
    sent.current = true;
    const packet = buildStepSimPacket(topology);
    if (!packet) return;
    void sendPacket(packet);
  }, []); // run once on mount

  return (
    <LessonSplit style={{ height: '100%', minHeight: 0 }}>
      {/* Canvas area */}
      <LessonCanvas
        style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}
        canvas={<NetlabCanvas />}
      >
        <LessonNote
          data-testid="lesson-brief"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            maxWidth: 420,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--netlab-bg-primary) 90%, transparent)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: 'var(--netlab-text-primary)',
            fontSize: 13,
            lineHeight: 1.6,
            zIndex: 20,
          }}
        >
          <div data-testid="lesson-lead" style={{ fontSize: 15, fontWeight: 700 }}>
            {t(
              'A router picks the row of its route table with the longest prefix that matches.',
              'ルータは、宛先に一致する行のうち、プレフィックスがいちばん長い行を選びます。',
            )}
          </div>
          <div data-testid="step-lpm-brief">
            {t(
              'The Client sends one packet to the Server, 203.0.113.10. R-1 has two rows that match it: 203.0.113.0/24, and 0.0.0.0/0, the default route that matches every address. The longest prefix wins, so R-1 uses /24 (longest prefix match).',
              'Client が Server（203.0.113.10）へパケットを 1 つ送ります。R-1 には一致する行が 2 つあります。203.0.113.0/24 と、どんなアドレスにも一致するデフォルト経路 0.0.0.0/0 です。プレフィックスが長いほうが勝つので、R-1 は /24 を使います（最長一致）。',
            )}
          </div>
          <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
            {t(
              'Press Next Step until the packet is at R-1, and read its route table on the right. The next lesson, Trace Inspector, sends the same packet to read what changes in it from hop to hop.',
              '「次のステップ」をパケットが R-1 に着くまで押し、右の経路表を見ましょう。次のレッスン「通信の詳細を見る」では、同じパケットで、ホップごとに何が変わるかを見ます。',
            )}
          </div>
        </LessonNote>
      </LessonCanvas>
      {/* Step controls side panel */}
      <LessonPanel
        defaultWidth={480}
        maxWidth={700}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
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
      </LessonPanel>
    </LessonSplit>
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
