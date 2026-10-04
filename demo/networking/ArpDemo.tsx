import { useGalleryLocale, useT } from '../localeContext';
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StateDiffTable } from '../../src/components/simulation/StateDiffTable';
import { StepControls } from '../../src/components/simulation/StepControls';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { en } from '../../src/i18n/locales/en';
import { ja } from '../../src/i18n/locales/ja';
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

// The plain first line of the lesson: larger than everything around it, and
// in the reading face rather than the monospace the readouts use.
const LEAD_STYLE: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.6,
  margin: '2px 0 6px',
};

const DETAIL_STYLE: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.7,
};

/**
 * The speech bubbles on the diagram carried the question and the answer but
 * never the name of what was happening, so learners kept the picture and not
 * the word "ARP". This lesson names it in its own bubbles.
 */
const BUBBLE_WORDS = {
  en: {
    'simulation.packetStory.arpRequest': 'ARP question: who has this IP address? ({{ip}})',
    'simulation.packetStory.arpReply': "ARP answer: it's me (MAC {{mac}})",
  },
  ja: {
    'simulation.packetStory.arpRequest': 'ARP の質問：この IP アドレスの持ち主は？（{{ip}}）',
    'simulation.packetStory.arpReply': 'ARP の答え：わたしです（MAC {{mac}}）',
  },
} as const;

function ArpBubbleWords({ children }: { children: ReactNode }) {
  const locale = useGalleryLocale();
  const catalog = useMemo(
    () => (locale === 'ja' ? { ...ja, ...BUBBLE_WORDS.ja } : { ...en, ...BUBBLE_WORDS.en }),
    [locale],
  );
  return (
    <I18nProvider locale={locale} catalog={catalog}>
      {children}
    </I18nProvider>
  );
}

function ArpTablePanel() {
  const t = useT();
  const { state } = useSimulation();
  const { topology } = useNetlabContext();
  const entries = Object.entries(state.nodeArpTables ?? {});
  const labelOf = (nodeId: string) =>
    topology.nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;

  return (
    <div style={CARD_STYLE}>
      <div style={LABEL_STYLE}>
        {t('ARP tables (what each device learned)', 'ARP テーブル（各機器が覚えた対応）')}
      </div>
      {entries.length === 0 ? (
        <div
          data-testid="arp-table-empty"
          style={{ ...DETAIL_STYLE, color: 'var(--netlab-text-secondary)' }}
        >
          {t(
            'Press the button above. The pairs "IP address → MAC address" each device learned appear here.',
            '上のボタンを押すと、各機器が覚えた「IP アドレス → MAC アドレス」の対応がここに出ます。',
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {/* The engine runs the whole exchange when the button is pressed, so
              the table is already complete before the learner steps. Saying it
              fills up as they step would not match the screen. */}
          <div
            data-testid="arp-table-note"
            style={{ ...DETAIL_STYLE, color: 'var(--netlab-text-secondary)' }}
          >
            {t(
              'The whole exchange has already run, so this table shows the final result. To see at which step a line was learned, step through and read "ARP over time" below.',
              '通信は一度に最後まで行われるので、この表はもう結果を表示しています。どのステップで覚えたかは、ステップを進めながら下の「ARP の変化」で確かめられます。',
            )}
          </div>
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
                {labelOf(nodeId)}
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
    <LessonSplit>
      <LessonCanvas
        canvas={
          <>
            <NetlabCanvas />
            <SimulationOverlayDock showRouteTable={false} />
          </>
        }
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
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: 'var(--netlab-text-secondary)', fontWeight: 700 }}>
            {t('How ARP works', 'ARP のしくみ')}
          </div>
          <div data-testid="lesson-lead" style={LEAD_STYLE}>
            {t(
              'ARP finds the number (MAC address) of the machine to hand a packet to, by asking: "who has this address?"',
              'ARP（アープ）は、渡す相手の番号（MAC アドレス）を「この住所の持ち主は？」と聞いて調べるしくみです。',
            )}
          </div>
          <div data-testid="arp-brief-mac" style={DETAIL_STYLE}>
            {t(
              'The address (the IP address) is not enough to hand a packet over: before the first packet, the sender does not yet know the other machine\'s own number, its MAC address. So it asks everyone, and only the owner answers "it\'s me" with its number.',
              '住所（IP アドレス）だけでは渡せません。最初のパケットを送る前は、相手の番号（MAC アドレス）をまだ知らないからです。だから全員に聞き、持ち主だけが「わたしです」と番号を答えます。',
            )}
          </div>
          {/* What this lesson's trace shows: the Client never asks. The Router
              asks for the Server, and on the reply's way back for the Client. */}
          <div data-testid="arp-who-asks" style={{ ...DETAIL_STYLE, marginTop: 6 }}>
            {t(
              'In this lesson the one that asks is the Router: for the Server on the way out, and for the Client on the way back.',
              'このレッスンで聞くのは Router（ルータ）です。行きは Server を、帰りは Client を探して聞きます。',
            )}
          </div>
          <details data-testid="lesson-more" style={{ ...DETAIL_STYLE, marginTop: 6 }}>
            <summary style={{ cursor: 'pointer' }}>
              {t('A little more detail', 'もう少し詳しく')}
            </summary>
            <div style={{ marginTop: 4 }}>
              {t(
                'The question to everyone is sent to a special destination, ff:ff:ff:ff:ff:ff, which means "all of you". It never travels past a router. An answer is kept in a table (the ARP table), so the same question need not be asked again.',
                '全員あての質問は、ff:ff:ff:ff:ff:ff という特別な宛先（＝「みなさんへ」）に送ります。この質問はルータの先までは届きません。一度わかった番号は、次に聞かなくて済むように表（ARP テーブル）に覚えておきます。',
              )}
            </div>
          </details>
        </LessonNote>
      </LessonCanvas>

      <LessonPanel
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
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #0f766e',
                background: '#115e59',
                color: '#ecfeff',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {t('▶ Send from Client to Server', '▶ Client から Server へ送ってみる')}
            </button>
            <div
              data-testid="arp-send-hint"
              style={{ ...DETAIL_STYLE, marginTop: 6, color: 'var(--netlab-text-secondary)' }}
            >
              {t(
                'It sends a ping: a short "are you there?" message, and the reply to it. Then press the ARP-REQ (question) and ARP-REP (answer) rows in the timeline: a speech bubble appears on the diagram.',
                '「届きますか？」と確かめる短い通信（ping）と、その返事を送ります。押したら、タイムラインの ARP-REQ（質問）と ARP-REP（答え）の行を押してみましょう。図に吹き出しが出ます。',
              )}
            </div>
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
      </LessonPanel>
    </LessonSplit>
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
        <ArpBubbleWords>
          <SimulationProvider>
            <ArpDemoInner />
          </SimulationProvider>
        </ArpBubbleWords>
      </NetlabProvider>
    </DemoShell>
  );
}
