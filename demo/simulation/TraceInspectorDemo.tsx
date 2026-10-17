import { useEffect, useRef } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { STEP_SIM_TOPOLOGY, buildStepSimPacket } from './stepSimShared';
import { TraceInspectorColumn } from './TraceInspectorColumn';

function TraceInspectorDemoInner() {
  const { topology } = useNetlabContext();
  const { sendPacket, state } = useSimulation();
  const t = useT();

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
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />}>
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
              'Read what changes in one packet at each hop, and what does not.',
              '1 つのパケットの、ホップごとに変わるところと変わらないところを見ます。',
            )}
          </div>
          <div data-testid="trace-ttl-brief">
            {t(
              'TTL: the Client sends it with 64, and each router takes 1 off as it forwards. Each timeline row shows the TTL as the packet reached that device: 64 at R-1, 63 at R-2, 62 at R-3, 61 at the Server.',
              'TTL：Client は 64 で送り、ルータは転送するたびに 1 減らします。タイムラインの各行は、その機器に着いたときの TTL です。R-1 で 64、R-2 で 63、R-3 で 62、Server で 61 です。',
            )}
          </div>
          <div data-testid="trace-mac-brief">
            {t(
              'MAC addresses are rewritten for every link: each router puts its own as the sender. The IP addresses, 10.0.0.10 to 203.0.113.10, stay the same from end to end.',
              'MAC アドレスはリンクごとに書き換わり、各ルータが自分の MAC を送り元にします。IP アドレス（10.0.0.10 から 203.0.113.10）は、最初から最後まで変わりません。',
            )}
          </div>
          <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
            {t(
              'The same network and packet as Step-by-Step, which showed R-1 choosing a route. Press a row of the timeline on the right to open that hop.',
              '「1ホップずつ進める」と同じネットワークとパケットです。あちらは R-1 の経路の選び方を見ました。右のタイムラインの行を押すと、そのホップの詳細が開きます。',
            )}
          </div>
        </LessonNote>
      </LessonCanvas>

      <LessonPanel
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
      </LessonPanel>
    </LessonSplit>
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
