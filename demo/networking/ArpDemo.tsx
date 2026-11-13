import { useGalleryLocale, useT } from '../localeContext';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import {
  LessonCanvas,
  LessonNote,
  LessonPanel,
  LessonPinned,
  LessonSplit,
  LessonStepBar,
  usePhoneTopology,
  type PhonePositions,
} from '../components/LessonPanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { PacketViewerPanel } from '../../src/components/simulation/PacketViewer';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { StepControls } from '../../src/components/simulation/StepControls';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { en } from '../../src/i18n/locales/en';
import { ja } from '../../src/i18n/locales/ja';
import { basicArp } from '../../src/scenarios';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { useViewport } from '../../src/utils/useViewport';
import { readDemoEmbedParams } from '../embedParams';
import { ARP_LOCAL, arpSceneFromSearch, type ArpScene } from './arpScenes';
import { arpLearnedAt, arpTablesAtStep, shownStep } from '../components/stateAtStep';
import { LESSON_CARD, LESSON_LABEL } from '../components/lessonStyles';

const CARD_STYLE: CSSProperties = { ...LESSON_CARD, border: '1px solid var(--netlab-bg-surface)' };

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

/** The trace on screen, and the step it is at (-1: before the first, or after Reset). */
function useArpStep() {
  const { state } = useSimulation();
  const { trace, step } = shownStep(state, { fallBackToLast: true });
  return { trace, step, finalTables: state.nodeArpTables ?? {} };
}

function ArpTablePanel() {
  const t = useT();
  const { topology } = useNetlabContext();
  const { trace, step, finalTables } = useArpStep();
  const tables = trace ? arpTablesAtStep(trace, finalTables, step) : {};
  const entries = Object.entries(tables);
  const labelOf = (nodeId: string) =>
    topology.nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;

  return (
    <div style={CARD_STYLE}>
      <div style={LESSON_LABEL}>
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
          {/* The engine runs the whole exchange at once; the table is rebuilt
              for the step on screen, so it fills up as the learner steps. */}
          <div
            data-testid="arp-table-note"
            style={{ ...DETAIL_STYLE, color: 'var(--netlab-text-secondary)' }}
          >
            {t(
              'This table follows the step on screen: it shows what each device knew at that step. Before the first step, and after Reset, it is empty.',
              'この表は、いま表示しているステップに合わせて変わります。そのステップで各機器が知っていた対応だけを表示します。最初のステップの前とリセットのあとは、空です。',
            )}
          </div>
          <div
            data-testid="arp-table-kept"
            style={{ ...DETAIL_STYLE, color: 'var(--netlab-text-primary)' }}
          >
            {t(
              'This table is what a real device keeps. Each line was learned from an answer, or from the question of a device that asked.',
              'この表が、本物の機器が覚えておく内容です。どの行も、答えを聞いて、または相手の質問から覚えたものです。',
            )}
          </div>
          {entries.map(([nodeId, table]) => (
            <div
              key={nodeId}
              data-testid={`arp-table-${nodeId}`}
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

/**
 * What the Router's table gained at the step on screen. The library's diff
 * table files an ARP frame's sender under the device the hop is recorded at,
 * so it showed the Router's own address and "+0" after the answer.
 */
function ArpDiffCard() {
  const t = useT();
  const { topology } = useNetlabContext();
  const { trace, step, finalTables } = useArpStep();
  const router = topology.nodes.find((n) => n.data.role === 'router');
  if (!trace || !router) return null;
  const table = arpTablesAtStep(trace, finalTables, step)[router.id] ?? {};
  const learned = arpLearnedAt(trace, step).filter((line) => line.nodeId === router.id);
  const name = router.data.label ?? router.id;
  return (
    <div data-testid="arp-change" style={CARD_STYLE}>
      <div style={LESSON_LABEL}>
        {t('ARP over time', 'ARP の変化')} · {name}
      </div>
      <div style={{ ...DETAIL_STYLE, fontFamily: 'monospace' }}>
        {step < 0
          ? t('Before the first step.', '最初のステップの前です。')
          : t(`At step ${step + 1}:`, `ステップ ${step + 1}：`)}{' '}
        {learned.length > 0
          ? learned.map((line) => (
              <span key={line.ip} style={{ color: 'var(--netlab-accent-green)' }}>
                {t(
                  `+${learned.length} — learned ${line.ip} → ${line.mac}`,
                  `+${learned.length} — ${line.ip} → ${line.mac} を覚えました`,
                )}
              </span>
            ))
          : t('nothing new.', '新しく覚えたものはありません。')}
      </div>
      <div style={{ ...DETAIL_STYLE, color: 'var(--netlab-text-secondary)' }}>
        {t(
          `${name} knows ${Object.keys(table).length} address(es) at this step.`,
          `このステップで ${name} が知っているアドレスは ${Object.keys(table).length} 個です。`,
        )}
      </div>
    </div>
  );
}

function ArpDemoInner({ scene, onScene }: { scene: ArpScene; onScene: (next: ArpScene) => void }) {
  const t = useT();
  const local = scene === 'local';
  const { engine, state } = useSimulation();
  const hasTrace = state.traces.length > 0;
  const hopChosen = state.selectedHop !== null;
  const { isNarrow } = useViewport();

  const sendPing = async () => {
    engine.clear();
    await engine.ping('client-1', local ? ARP_LOCAL.target : '203.0.113.10');
  };

  return (
    <LessonSplit pinned>
      <LessonCanvas
        canvas={
          <>
            <NetlabCanvas />
            {/* Over a phone-width canvas the packet-contents box took the room
                the diagram is fitted into, and the devices shrank to a
                thumbnail in what was left. There it is read in the panel. */}
            {!isNarrow && <SimulationOverlayDock showRouteTable={false} />}
          </>
        }
      >
        <LessonNote
          data-testid="lesson-brief"
          style={{
            // Along the bottom, left of the zoom controls: the row of devices
            // keeps the upper part of the canvas and is drawn full size. At the
            // top-left it covered the Client and the Router. `top: 'auto'`
            // keeps it read before the canvas on a phone.
            position: 'absolute',
            top: 'auto',
            bottom: 12,
            left: 12,
            right: 244,
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
              'The address (the IP address) is not enough to hand a packet over. A device that has never sent to a machine does not yet know that machine\'s own number, its MAC address. So it asks everyone, and only the owner answers "it\'s me" with its number.',
              '住所（IP アドレス）だけでは渡せません。初めて渡す相手は、その番号（MAC アドレス）をまだ知らないからです。だから全員に聞き、持ち主だけが「わたしです」と番号を答えます。',
            )}
          </div>
          {/* What this lesson's trace shows: every device asks before it hands on. */}
          {local ? (
            <div data-testid="arp-local-note" style={{ ...DETAIL_STYLE, marginTop: 6 }}>
              {t(
                'The Printer, 10.0.0.20, is on the Client’s own network (10.0.0). So the Client asks for the Printer itself, not for the Router, and the frame goes straight to the Printer’s MAC address. The Router plays no part.',
                'Printer（10.0.0.20）は、Client と同じネットワーク（10.0.0）にいます。だから Client は Router ではなく Printer そのものを聞きます。フレームは Printer の MAC アドレスへ直接届きます。Router は関わりません。',
              )}
            </div>
          ) : (
            <div data-testid="arp-who-asks" style={{ ...DETAIL_STYLE, marginTop: 6 }}>
              {t(
                'Each device asks for the next one it hands to. On the way out the Client asks for the Router, then the Router (the one in the middle) for the Server. On the way back nobody asks: each one asked learned the asker from its question.',
                '機器はそれぞれ、次に渡す相手を聞きます。行きは Client が Router を、次に Router（ルータ）が Server を聞きます。帰りはだれも聞きません。聞かれた側は、質問から相手を覚えているからです。',
              )}
            </div>
          )}
          {/* The tables start empty: no device knows another's number in advance. */}
          <div data-testid="arp-already-known" style={{ ...DETAIL_STYLE, marginTop: 6 }}>
            {t(
              'Nothing is known in advance: until a device has asked, it does not have the other’s number.',
              '前もって知っていることはありません。聞くまでは、相手の番号を持っていません。',
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
        {/* One column that may be narrower than its widest content: left to
            size itself, the column grew to the timeline's longest unbroken
            row and took every card past the edge of the screen. */}
        <div
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 12,
          }}
        >
          <LessonStepBar />
          <div style={CARD_STYLE}>
            <div style={LESSON_LABEL}>{t('Controls', '操作')}</div>
            <LessonPinned>
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
                {local
                  ? t('▶ Send from Client to Printer', '▶ Client から Printer へ送ってみる')
                  : t('▶ Send from Client to Server', '▶ Client から Server へ送ってみる')}
              </button>
            </LessonPinned>
            <div
              role="group"
              aria-label={t('Scene', '場面')}
              style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}
            >
              {(
                [
                  ['routed', t('Across a router', 'ルータの向こうへ')],
                  ['local', t('On the same network', '同じネットワークの中で')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`arp-scene-${value}`}
                  aria-pressed={scene === value}
                  onClick={() => onScene(value)}
                  style={{
                    minHeight: 44,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `2px solid ${scene === value ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
                    background: 'var(--netlab-bg-surface)',
                    color: 'var(--netlab-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              data-testid="arp-send-hint"
              style={{ ...DETAIL_STYLE, marginTop: 6, color: 'var(--netlab-text-secondary)' }}
            >
              {t(
                'It sends a ping: a short "are you there?" message, and the reply to it. Then press the ARP-REQ (question) and ARP-REP (answer) rows in the timeline: a speech bubble appears on the diagram.',
                '「届きますか？」と確かめる短い通信（ping）と、その返事を送ります。押したら、タイムラインの ARP-REQ（質問）と ARP-REP（答え）の行を押してみましょう。図に吹き出しが出ます。',
              )}
            </div>
            {/* Sending again shows the same question and answer, beside a
                sentence saying an answer is remembered. Said once, under the
                button that is pressed again. */}
            {hasTrace ? (
              <div
                data-testid="arp-remember-note"
                style={{ ...DETAIL_STYLE, marginTop: 6, color: 'var(--netlab-text-primary)' }}
              >
                {t(
                  'A real device remembers an ARP answer for a few minutes and does not ask again in that time. This lesson asks again on every send, so the question can be watched each time. What was learned is in "ARP tables" below.',
                  '本物の機器は、ARP の答えを数分のあいだ覚えていて、そのあいだは聞き直しません。このレッスンは、質問を毎回見られるように、送るたびに聞き直します。覚えた内容は、下の「ARP テーブル」に出ています。',
                )}
              </div>
            ) : null}
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
          {isNarrow && hasTrace && <PacketViewerPanel />}
          <ArpTablePanel />
          <ArpDiffCard />
          {hasTrace && (
            <div
              data-testid="lesson-hop-details"
              // The routing rows have fixed columns wider than a phone: they
              // scroll here, inside their own card, instead of widening the page.
              style={{ overflowX: 'auto', ...(hopChosen ? { height: 360 } : {}) }}
            >
              <HopInspector />
            </div>
          )}
        </div>
      </LessonPanel>
    </LessonSplit>
  );
}

/** The devices closer together on a phone, so the fit draws them (and their addresses) larger. */
const PHONE_POSITIONS: PhonePositions = {
  'client-1': { x: 0, y: 0 },
  'router-1': { x: 125, y: 0 },
  'server-1': { x: 250, y: 0 },
};

const LOCAL_PHONE_POSITIONS: PhonePositions = {
  'client-1': { x: 0, y: 0 },
  'printer-1': { x: 0, y: 120 },
  'switch-1': { x: 125, y: 60 },
  'router-1': { x: 250, y: 60 },
};

export default function ArpDemo() {
  const params = new URLSearchParams(window.location.search);
  const tutorialId = params.get('tutorial') ?? null;
  const sandboxEnabled = params.get('sandbox') === '1';
  const { embedded, embedMode, parentOrigin } = readDemoEmbedParams();
  const tutorialProps = tutorialId ? { tutorialId } : {};

  const search = useLocation().search;
  const [scene, setScene] = useState<ArpScene>(() => arpSceneFromSearch(search));
  const local = scene === 'local';
  const phone = usePhoneTopology(
    local ? ARP_LOCAL.topology : basicArp.topology,
    local ? LOCAL_PHONE_POSITIONS : PHONE_POSITIONS,
  );
  return (
    <DemoShell
      title="ARP Basics"
      desc="Watch ARP resolve the first-hop MAC before the first routed IPv4 packet can move."
      embedded={embedded}
    >
      <NetlabProvider
        key={`${scene}-${phone.layout}`}
        topology={phone.topology}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled ? { sandboxControlMode: 'sandbox-owns' as const } : {})}
        {...(embedMode !== undefined ? { embedMode } : {})}
        {...(parentOrigin !== undefined ? { parentOrigin } : {})}
        {...tutorialProps}
      >
        <ArpBubbleWords>
          <SimulationProvider>
            <ArpDemoInner scene={scene} onScene={setScene} />
          </SimulationProvider>
        </ArpBubbleWords>
      </NetlabProvider>
    </DemoShell>
  );
}
