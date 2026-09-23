import { useT } from '../localeContext';
import { useMemo, type CSSProperties } from 'react';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StateDiffTable } from '../../src/components/simulation/StateDiffTable';
import { StepControls } from '../../src/components/simulation/StepControls';
import { basicArp } from '../../src/scenarios';
import { buildStepSnapshots } from '../../src/simulation/snapshots';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { readDemoEmbedParams } from '../embedParams';

const CARD_STYLE: CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid var(--netlab-bg-surface)',
  borderRadius: 10,
  padding: 12,
};

const LABEL_STYLE: CSSProperties = {
  color: 'var(--netlab-text-secondary)',
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  marginBottom: 8,
  textTransform: 'uppercase',
};

function ArpTablePanel() {
  const t = useT();
  const { state } = useSimulation();
  const entries = Object.entries(state.nodeArpTables ?? {});

  return (
    <div style={CARD_STYLE}>
      <div style={LABEL_STYLE}>{t('ARP Tables', 'ARP テーブル')}</div>
      {entries.length === 0 ? (
        <div
          style={{ color: 'var(--netlab-text-secondary)', fontFamily: 'monospace', fontSize: 12 }}
        >
          {t(
            'Send the first packet to populate the sender cache.',
            '最初のパケットを送ると、送信側のキャッシュに対応が記録されます。',
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {entries.map(([nodeId, table]) => (
            <div
              key={nodeId}
              style={{
                border: '1px solid var(--netlab-bg-surface)',
                borderRadius: 8,
                padding: 10,
                background: 'var(--netlab-bg-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--netlab-text-primary)',
              }}
            >
              <div style={{ color: 'var(--netlab-accent-cyan)', fontWeight: 700, marginBottom: 6 }}>
                {nodeId}
              </div>
              {Object.entries(table).length === 0 ? (
                <div style={{ color: 'var(--netlab-text-secondary)' }}>
                  {t('No learned entries.', 'まだ覚えた対応はありません。')}
                </div>
              ) : (
                Object.entries(table).map(([ip, mac]) => (
                  <div
                    key={ip}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span>{ip}</span>
                    <span style={{ color: 'var(--netlab-accent-yellow)' }}>{mac}</span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArpDiffCard() {
  const t = useT();
  const { state } = useSimulation();
  const { topology, routeTable } = useNetlabContext();
  const trace =
    state.traces.find((t) => t.packetId === state.currentTraceId) ??
    state.traces[state.traces.length - 1] ??
    null;
  const router = topology.nodes.find((n) => n.data.role === 'router');
  const snapshots = useMemo(
    () => (trace ? buildStepSnapshots(trace, routeTable) : null),
    [trace, routeTable],
  );
  if (!trace || !router || !snapshots) return null;
  const stepIndex = state.currentStep >= 0 ? state.currentStep : 0;
  return (
    <div style={CARD_STYLE}>
      <div style={LABEL_STYLE}>
        {t('ARP over time', 'ARP の変化')} · {router.data.label ?? router.id}
      </div>
      <StateDiffTable
        snapshots={snapshots}
        nodeId={router.id}
        stepIndex={stepIndex}
        tableKind="arp"
      />
    </div>
  );
}

function ArpDemoInner() {
  const t = useT();
  const { engine, state } = useSimulation();
  const hasTrace = state.traces.length > 0;
  const hopChosen = state.selectedHop !== null;

  const sendPing = async () => {
    engine.clear();
    await engine.ping('client-1', '203.0.113.10');
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
        <SimulationOverlayDock showRouteTable={false} />
        <div
          data-testid="lesson-brief"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            maxWidth: 360,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--netlab-bg-primary) 90%, transparent)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: 'var(--netlab-text-primary)', fontWeight: 700, marginBottom: 4 }}>
            {t('ARP Teaching Flow', 'ARP のしくみ')}
          </div>
          <div>
            {t(
              'The first IPv4 packet cannot leave the sender until it learns a first-hop MAC address.',
              '最初の IPv4 パケットは、次に渡す相手の MAC アドレスがわかるまで送り出せません。',
            )}
          </div>
          <div style={{ marginTop: 6, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Use the trace on the right to inspect the ARP request and reply before the routed packet continues.',
              '右のタイムラインで、パケットが先へ進む前に行われる ARP の要求と応答を確かめてください。',
            )}
          </div>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={460}
        maxWidth={760}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* The timeline comes first once a packet has run: it is what the lesson
            asks the learner to read. Panels with nothing to show yet stay out
            of the way instead of taking the top of the rail. */}
        <div style={{ padding: 12, display: 'grid', gap: 12 }}>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>{t('Controls', '操作')}</div>
            <button
              type="button"
              data-testid="demo-primary-action"
              onClick={() => void sendPing()}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #0f766e',
                background: '#115e59',
                color: '#ecfeff',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {t('ping client → server', 'client から server へ ping')}
            </button>
          </div>
          {hasTrace && (
            <div
              data-testid="lesson-trace-timeline"
              style={{
                height: 360,
                border: '1px solid var(--netlab-bg-surface)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <PacketTimeline />
            </div>
          )}
          {hasTrace && (
            <div style={CARD_STYLE}>
              {/* Ping starts the exchange; stepping replays it. */}
              <StepControls primary={false} />
            </div>
          )}
          <ArpTablePanel />
          <ArpDiffCard />
          {hasTrace && (
            <div data-testid="lesson-hop-details" style={hopChosen ? { height: 360 } : undefined}>
              <HopInspector />
            </div>
          )}
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function ArpDemo() {
  const params = new URLSearchParams(window.location.search);
  const tutorialId = params.get('tutorial') ?? null;
  const sandboxEnabled = params.get('sandbox') === '1';
  const { embedded, embedMode, parentOrigin } = readDemoEmbedParams();
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="ARP Basics"
      desc="Watch ARP resolve the first-hop MAC before the first routed IPv4 packet can move."
      embedded={embedded}
    >
      <NetlabProvider
        topology={basicArp.topology}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled ? { sandboxControlMode: 'sandbox-owns' as const } : {})}
        {...(embedMode !== undefined ? { embedMode } : {})}
        {...(parentOrigin !== undefined ? { parentOrigin } : {})}
        {...tutorialProps}
      >
        <SimulationProvider>
          <ArpDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
