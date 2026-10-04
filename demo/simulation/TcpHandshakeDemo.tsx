import type { CSSProperties } from 'react';
import { useT } from '../localeContext';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { StepControls } from '../../src/components/simulation/StepControls';
import { tcpHandshake } from '../../src/scenarios';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { TcpSegment } from '../../src/types/packets';
import type { PacketTrace, SimulationStatus } from '../../src/types/simulation';
import type { TcpState } from '../../src/types/tcp';
import { readDemoEmbedParams } from '../embedParams';

const TOPOLOGY = tcpHandshake.topology;

export const TCP_HANDSHAKE_DEMO_TOPOLOGY = TOPOLOGY;

/**
 * The client and server states as of the step the learner is on.
 *
 * Traces before the current one have fully happened; traces after it have not
 * happened yet. Within the current trace a segment counts as sent once its
 * first hop is revealed, and as received only once its DELIVER hop is — so
 * stepping through the ARP hops of the SYN does not yet change the server.
 * A trace that has played through (status `done`) counts in full.
 */
export function deriveNodeStates(
  traces: PacketTrace[],
  currentTraceId: string | null,
  currentStep: number,
  status: SimulationStatus,
  hasActiveConnection: boolean,
): { client: TcpState; server: TcpState } {
  if (traces.length === 0) {
    return hasActiveConnection
      ? { client: 'ESTABLISHED', server: 'ESTABLISHED' }
      : { client: 'CLOSED', server: 'LISTEN' };
  }

  // A teardown is recorded on its own (the handshake traces are cleared first),
  // so it starts from an open connection.
  const states: { client: TcpState; server: TcpState } =
    traces[0]?.label === 'TCP FIN'
      ? { client: 'ESTABLISHED', server: 'ESTABLISHED' }
      : { client: 'CLOSED', server: 'LISTEN' };

  const found = currentTraceId ? traces.findIndex((t) => t.packetId === currentTraceId) : -1;
  const currentIndex = found >= 0 ? found : traces.length - 1;

  traces.slice(0, currentIndex + 1).forEach((trace, index) => {
    const revealedUpTo =
      index < currentIndex || status === 'done' ? Number.POSITIVE_INFINITY : currentStep;
    if (revealedUpTo < 0) return;
    const deliverIndex = trace.hops.findIndex((hop) => hop.event === 'deliver');
    const delivered = deliverIndex >= 0 && revealedUpTo >= deliverIndex;

    switch (trace.label) {
      case 'TCP SYN':
        states.client = 'SYN_SENT';
        if (delivered) states.server = 'SYN_RECEIVED';
        break;
      case 'TCP SYN-ACK':
        // RFC 9293: the client is ESTABLISHED as soon as the SYN-ACK arrives;
        // the server waits for the final ACK.
        if (delivered) states.client = 'ESTABLISHED';
        break;
      case 'TCP ACK':
        if (!delivered) break;
        if (states.server === 'SYN_RECEIVED') {
          states.server = 'ESTABLISHED';
        } else if (states.client === 'FIN_WAIT_1') {
          states.client = 'FIN_WAIT_2';
        } else if (states.server === 'LAST_ACK') {
          states.server = 'CLOSED';
        }
        break;
      case 'TCP FIN':
        if (trace.srcNodeId === 'client-1') {
          states.client = 'FIN_WAIT_1';
          if (delivered) states.server = 'CLOSE_WAIT';
        } else {
          states.server = 'LAST_ACK';
          if (delivered) states.client = 'TIME_WAIT';
        }
        break;
      default:
        break;
    }
  });

  return states;
}

/** The three handshake segments, in the order they are sent. */
export type HandshakeSegment = 'syn' | 'syn-ack' | 'ack';

const HANDSHAKE_LABELS: Readonly<Record<string, HandshakeSegment>> = {
  'TCP SYN': 'syn',
  'TCP SYN-ACK': 'syn-ack',
  'TCP ACK': 'ack',
};

/**
 * Which handshake segment is being shown, and so which telephone phrase is
 * being "said" on the diagram — or null when nothing has been sent yet, or
 * the recorded exchange is a teardown (whose ACKs are not "right, let us talk").
 */
export function shownHandshakeSegment(
  traces: PacketTrace[],
  currentTraceId: string | null,
  currentStep: number,
  status: SimulationStatus,
): HandshakeSegment | null {
  if (traces[0]?.label !== 'TCP SYN') return null;
  const trace = traces.find((candidate) => candidate.packetId === currentTraceId);
  if (!trace) return null;
  if (currentStep < 0 && status !== 'done') return null;
  return HANDSHAKE_LABELS[trace.label ?? ''] ?? null;
}

function formatFlags(segment: TcpSegment): string {
  return (
    Object.entries(segment.flags)
      .filter(([, enabled]) => enabled)
      .map(([flag]) => flag.toUpperCase())
      .join(', ') || 'NONE'
  );
}

function readSelectedSegment(
  selectedPacket: ReturnType<typeof useSimulation>['state']['selectedPacket'],
) {
  if (!selectedPacket) {
    return null;
  }

  const transport = selectedPacket.frame.payload.payload;
  if (!('seq' in transport)) {
    return null;
  }

  return {
    src: `${selectedPacket.frame.payload.srcIp}:${transport.srcPort}`,
    dst: `${selectedPacket.frame.payload.dstIp}:${transport.dstPort}`,
    seq: transport.seq,
    ack: transport.ack,
    flags: formatFlags(transport),
  };
}

function stateAccent(state: TcpState): string {
  if (state === 'ESTABLISHED') return 'var(--netlab-accent-green)';
  if (state === 'TIME_WAIT') return 'var(--netlab-accent-orange)';
  if (state === 'CLOSED') return 'var(--netlab-text-secondary)';
  return 'var(--netlab-accent-cyan)';
}

function useStateMeaning(): (state: TcpState) => string {
  const t = useT();
  return (state) => {
    switch (state) {
      case 'CLOSED':
        return t('no connection', '接続なし');
      case 'LISTEN':
        return t('waiting for a "hello" (SYN)', '相手の「もしもし」（SYN）を待っている');
      case 'SYN_SENT':
        return t(
          'said "hello" (SYN), waiting for the reply',
          '「もしもし」（SYN）を送り、返事を待っている',
        );
      case 'SYN_RECEIVED':
        return t(
          'heard the "hello", waiting for the last reply (ACK)',
          '「もしもし」を受け取り、最後の返事（ACK）を待っている',
        );
      case 'ESTABLISHED':
        return t('connected: data can flow', '接続完了：データを送れる');
      case 'FIN_WAIT_1':
        return t('sent a FIN, waiting for its ACK', 'FIN を送り、その ACK を待っている');
      case 'FIN_WAIT_2':
        return t(
          'FIN acknowledged, waiting for the other FIN',
          'FIN が届いた。相手の FIN を待っている',
        );
      case 'CLOSE_WAIT':
        return t('the other side closed; about to close too', '相手が切断した。こちらも切断する');
      case 'LAST_ACK':
        return t('sent its FIN, waiting for the last ACK', 'FIN を送り、最後の ACK を待っている');
      case 'TIME_WAIT':
        return t(
          'closed; waits a moment for stray packets',
          '切断済み。遅れて届くパケットに備えて少し待つ',
        );
      default:
        return '';
    }
  };
}

/** The telephone phrase each handshake segment stands for. */
function useHandshakePhrase(): (segment: HandshakeSegment) => string {
  const t = useT();
  return (segment) => {
    switch (segment) {
      case 'syn':
        return t('"Hello?"', '「もしもし」');
      case 'syn-ack':
        return t('"Yes, I hear you"', '「はい、聞こえます」');
      default:
        return t('"Right, let us talk"', '「では話します」');
    }
  };
}

const SEGMENT_NAME: Readonly<Record<HandshakeSegment, string>> = {
  syn: 'SYN',
  'syn-ack': 'SYN-ACK',
  ack: 'ACK',
};

/** Who says each handshake segment. */
const SEGMENT_SPEAKER: Readonly<Record<HandshakeSegment, 'client' | 'server'>> = {
  syn: 'client',
  'syn-ack': 'server',
  ack: 'client',
};

const HANDSHAKE_ORDER: readonly HandshakeSegment[] = ['syn', 'syn-ack', 'ack'];
const CIRCLED = ['①', '②', '③'];

function StateBadge({
  label,
  state,
  place,
  testId,
}: {
  label: string;
  state: TcpState;
  place: CSSProperties;
  testId: string;
}) {
  const accent = stateAccent(state);
  const meaning = useStateMeaning();

  return (
    <LessonNote
      data-testid={testId}
      style={{
        position: 'absolute',
        ...place,
        padding: '8px 10px',
        borderRadius: 10,
        border: `1px solid ${accent}55`,
        // The panel's own colour rather than a fixed near-black: the text on
        // it is themed, so a dark box left it unreadable on a light page.
        background: 'color-mix(in srgb, var(--netlab-bg-panel) 92%, transparent)',
        color: 'var(--netlab-text-primary)',
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: '0 8px 24px color-mix(in srgb, var(--netlab-bg-primary) 35%, transparent)',
        pointerEvents: 'none',
        minWidth: 124,
        maxWidth: 220,
      }}
    >
      <div style={{ color: 'var(--netlab-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div
        data-testid={`${testId}-code`}
        style={{ color: accent, fontWeight: 'bold', fontFamily: 'monospace' }}
      >
        {state}
      </div>
      <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 2 }}>{meaning(state)}</div>
    </LessonNote>
  );
}

const PANEL_CARD: CSSProperties = {
  padding: 16,
  border: '1px solid var(--netlab-bg-surface)',
  borderRadius: 10,
  background: 'var(--netlab-bg-primary)',
};

const PANEL_LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--netlab-text-secondary)',
  marginBottom: 6,
};

/**
 * The connection as of the step being shown — the same two states the badges
 * on the diagram carry.
 *
 * This card used to show the engine's finished connection, so pressing
 * "connect" read ESTABLISHED here while the diagram still read CLOSED: the
 * handshake looked over before the learner had watched any of it.
 */
function ConnectionStateCard({
  nodeStates,
  started,
}: {
  nodeStates: { client: TcpState; server: TcpState };
  started: boolean;
}) {
  const t = useT();
  const meaning = useStateMeaning();
  const rows: [string, string, TcpState][] = [
    ['tcp-panel-client-state', 'Client', nodeStates.client],
    ['tcp-panel-server-state', 'Server', nodeStates.server],
  ];

  return (
    <div data-testid="tcp-connection-state" style={PANEL_CARD}>
      <div style={PANEL_LABEL}>{t('The connection right now', 'いまの接続の状態')}</div>
      <div style={{ display: 'grid', gap: 6, fontSize: 13, lineHeight: 1.5 }}>
        {rows.map(([testId, name, state]) => (
          <div key={testId}>
            {name}:{' '}
            <strong
              data-testid={testId}
              style={{ color: stateAccent(state), fontFamily: 'monospace' }}
            >
              {state}
            </strong>
            <span style={{ color: 'var(--netlab-text-secondary)' }}> — {meaning(state)}</span>
          </div>
        ))}
      </div>
      <div
        data-testid="tcp-connection-note"
        style={{ color: 'var(--netlab-text-secondary)', fontSize: 12, marginTop: 8 }}
      >
        {started
          ? t(
              'The same as the badges on the diagram: the state up to the step you are looking at.',
              '図の上の表示と同じです。いま見ているところまでの状態を示します。',
            )
          : t(
              'Nothing has been sent yet. Press "Start a connection".',
              'まだ何も送っていません。「接続を始める」を押してください。',
            )}
      </div>
    </div>
  );
}

/** Sequence numbers, header fields and the bytes: for a second look, closed at first. */
function MoreDetail() {
  const t = useT();
  const { engine, state } = useSimulation();
  const connections = engine.getTcpConnections();
  const selected = readSelectedSegment(state.selectedPacket);
  const activeTrace = state.traces.find((trace) => trace.packetId === state.currentTraceId);

  return (
    <details data-testid="tcp-more-detail" style={PANEL_CARD}>
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
        {t('A little more detail (numbers and bytes)', 'もう少し詳しく（番号とバイト列）')}
      </summary>
      <div style={{ display: 'grid', gap: 12, marginTop: 10, fontSize: 12, lineHeight: 1.6 }}>
        <div>
          {t(
            'A sequence number is the running number TCP puts on the data it sends. The handshake also fixes where each side starts counting, so a lost piece is noticed later and sent again. The starting number is different for every connection.',
            'シーケンス番号は、TCP が送るデータに付ける通し番号です。接続のやり取りで、数え始めの番号も決めます。だから、あとで欠けたデータに気づいて送り直せます。数え始めの番号は接続のたびに変わります。',
          )}
        </div>
        {connections.map((connection) => (
          <div key={connection.id} style={{ fontFamily: 'monospace' }}>
            <div>
              {connection.srcIp}:{connection.srcPort} → {connection.dstIp}:{connection.dstPort}
            </div>
            <div style={{ color: 'var(--netlab-text-secondary)' }}>
              localSeq={connection.localSeq} localAck={connection.localAck} remoteSeq=
              {connection.remoteSeq}
            </div>
          </div>
        ))}
        <div>
          <div style={PANEL_LABEL}>{t('Selected segment', '選択中のセグメント')}</div>
          {selected ? (
            <div style={{ fontFamily: 'monospace', display: 'grid', gap: 4 }}>
              <div style={{ color: 'var(--netlab-accent-cyan)', fontWeight: 'bold' }}>
                {activeTrace?.label ?? 'TCP'}
              </div>
              <div>
                {selected.src} → {selected.dst}
              </div>
              <div>Flags: {selected.flags}</div>
              <div>SEQ: {selected.seq}</div>
              <div>ACK: {selected.ack}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--netlab-text-secondary)' }}>
              {t(
                'Step into an exchange to read its TCP header fields here.',
                '通信のステップを進めると、TCP ヘッダの値がここに出ます。',
              )}
            </div>
          )}
        </div>
        <PacketStructureViewer />
      </div>
    </details>
  );
}

function TcpHandshakeDemoInner() {
  const t = useT();
  const { engine, state } = useSimulation();
  const phrase = useHandshakePhrase();
  const activeConnection = engine.getTcpConnections()[0] ?? null;
  const nodeStates = deriveNodeStates(
    state.traces,
    state.currentTraceId,
    state.currentStep,
    state.status,
    activeConnection !== null,
  );
  const shown = shownHandshakeSegment(
    state.traces,
    state.currentTraceId,
    state.currentStep,
    state.status,
  );
  const handshakeRecorded = state.traces[0]?.label === 'TCP SYN';

  // Start the step-through at the first segment, so the learner watches the
  // exchange from its beginning instead of landing on the last one.
  const selectFirstTrace = () => {
    const first = engine.getState().traces[0];
    if (first) engine.selectTrace(first.packetId);
  };

  const handleConnect = async () => {
    engine.clear();
    await engine.tcpConnect('client-1', 'server-1', 12345, 80);
    selectFirstTrace();
  };

  const handleDisconnect = async () => {
    const connection = engine.getTcpConnections()[0];
    if (!connection) {
      return;
    }

    engine.clearTraces();
    await engine.tcpDisconnect(connection.id);
    selectFirstTrace();
  };

  // One press shows one whole segment travel. Stepping it by hand takes five
  // presses a segment, most of them the router's address lookup, and learners
  // gave up before the SYN-ACK ever moved.
  const playSegment = (index: number) => {
    const trace = engine.getState().traces[index];
    if (!trace) return;
    engine.selectTrace(trace.packetId);
    engine.step();
    engine.play(450);
  };

  return (
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />}>
        <LessonNote
          data-canvas-overlay=""
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            zIndex: 20,
          }}
        >
          <button
            type="button"
            data-testid="tcp-connect"
            disabled={activeConnection !== null}
            onClick={() => void handleConnect()}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeConnection ? 'var(--netlab-border)' : '#0f766e',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: activeConnection ? 'not-allowed' : 'pointer',
            }}
          >
            {t('▶ Start a connection (TCP)', '▶ 接続を始める（TCP）')}
          </button>
          <button
            type="button"
            disabled={activeConnection === null}
            onClick={() => void handleDisconnect()}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--netlab-border)',
              background: activeConnection
                ? 'var(--netlab-bg-elevated)'
                : 'var(--netlab-bg-primary)',
              color: activeConnection
                ? 'var(--netlab-text-primary)'
                : 'var(--netlab-text-secondary)',
              fontSize: 14,
              cursor: activeConnection ? 'pointer' : 'not-allowed',
            }}
          >
            {t('Disconnect', '切断する')}
          </button>
          <span
            data-testid="tcp-next-hint"
            style={{ color: 'var(--netlab-text-secondary)', fontSize: 13 }}
          >
            {!handshakeRecorded && state.traces.length > 0
              ? t(
                  '"Next Step" walks the closing exchange.',
                  '「次のステップ」で、切断のやり取りを 1 つずつ見られます。',
                )
              : handshakeRecorded
                ? t('Now press ①, ②, ③ below, in order.', '次に、下の ①②③ を順に押します。')
                : t('Press this first.', 'まずこれを押します。')}
          </span>
        </LessonNote>

        <LessonNote
          data-testid="tcp-teaching-flow"
          data-canvas-overlay=""
          style={{
            position: 'absolute',
            // Bottom-left, clear of both state badges. In the top-right it sat
            // on top of the Server State badge and hid it completely — on the
            // lesson whose whole subject is what those two states do.
            left: 16,
            bottom: 16,
            width: 360,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--netlab-bg-surface)',
            background: 'color-mix(in srgb, var(--netlab-bg-panel) 94%, transparent)',
            color: 'var(--netlab-text-primary)',
            fontSize: 13,
            lineHeight: 1.6,
            zIndex: 20,
          }}
        >
          <div style={{ color: 'var(--netlab-accent-cyan)', fontWeight: 'bold' }}>
            {t('How TCP works', 'TCP のしくみ')}
          </div>
          <div
            data-testid="lesson-lead"
            style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, margin: '2px 0 6px' }}
          >
            {t(
              'TCP checks "hello, can you hear me?" before it sends anything.',
              'TCP は、話す前に「もしもし」と確かめ合ってから送ります。',
            )}
          </div>
          <div data-testid="tcp-brief-purpose">
            {t(
              'The check takes three messages, like starting a phone call. Press one to watch it travel.',
              '確かめ合いは 3 回です。電話のかけ始めと同じです。押すと、その通信が動きます。',
            )}
          </div>
          {/* The three segments tied to the telephone phrases, in place — and
              each is the button that plays that segment. */}
          <div
            data-testid="tcp-handshake-gloss"
            style={{ display: 'grid', gap: 4, margin: '6px 0' }}
          >
            {HANDSHAKE_ORDER.map((segment, index) => {
              const active = shown === segment;
              return (
                <button
                  key={segment}
                  type="button"
                  data-testid={`tcp-jump-${index + 1}`}
                  aria-pressed={active}
                  disabled={!handshakeRecorded}
                  onClick={() => playSegment(index)}
                  style={{
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `2px solid ${active ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
                    background: 'var(--netlab-bg-surface)',
                    color: 'var(--netlab-text-primary)',
                    fontSize: 14,
                    fontWeight: active ? 700 : 400,
                    cursor: handshakeRecorded ? 'pointer' : 'not-allowed',
                  }}
                >
                  {CIRCLED[index]} {SEGMENT_NAME[segment]}＝{phrase(segment)}
                  <span style={{ color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
                    {' '}
                    {SEGMENT_SPEAKER[segment] === 'client' ? 'Client → Server' : 'Server → Client'}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            data-testid="tcp-state-follows-step"
            style={{ color: 'var(--netlab-text-secondary)' }}
          >
            {t(
              'The state shown at each end is the state up to the step you are looking at. An end changes only when a message reaches it.',
              '両端の「状態」は、いま見ているところまでの結果です。通信が届いた側だけが変わります。',
            )}
          </div>
          <details data-testid="lesson-more" style={{ marginTop: 6 }}>
            <summary style={{ cursor: 'pointer' }}>
              {t('A little more detail', 'もう少し詳しく')}
            </summary>
            <div style={{ marginTop: 4, color: 'var(--netlab-text-secondary)' }}>
              {t(
                'The Client is ESTABLISHED (connected) as soon as the SYN-ACK reaches it; the Server only once the last ACK arrives. Closing takes four messages: FIN → ACK → FIN → ACK. "Next Step" walks one hop at a time, including the router\'s address lookup (ARP) before each message.',
                'Client は SYN-ACK が届いた時点で ESTABLISHED（接続完了）になります。Server は最後の ACK が届いてからです。切断は 4 回のやり取りです：FIN → ACK → FIN → ACK。「次のステップ」は 1 ホップずつ進みます。各通信の前に、ルータが相手を探す ARP も入ります。',
              )}
            </div>
          </details>
        </LessonNote>

        {/* The telephone phrase, said on the diagram between the two ends
            while that segment is the one being shown. */}
        {shown ? (
          <LessonNote
            data-testid="tcp-speech"
            data-segment={shown}
            data-speaker={SEGMENT_SPEAKER[shown]}
            style={{
              position: 'absolute',
              top: 60,
              left: 256,
              right: 256,
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid var(--netlab-accent-cyan)',
              background: 'color-mix(in srgb, var(--netlab-bg-panel) 92%, transparent)',
              color: 'var(--netlab-text-primary)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>{phrase(shown)}</div>
            <div style={{ fontSize: 12, color: 'var(--netlab-text-secondary)' }}>
              {SEGMENT_NAME[shown]}:{' '}
              {SEGMENT_SPEAKER[shown] === 'client' ? 'Client → Server' : 'Server → Client'}
            </div>
          </LessonNote>
        ) : null}

        <StateBadge
          label={t('Client State', 'クライアントの状態')}
          state={nodeStates.client}
          place={{ left: 24, top: 60 }}
          testId="tcp-client-state"
        />
        <StateBadge
          label={t('Server State', 'サーバの状態')}
          state={nodeStates.server}
          place={{ right: 24, top: 60 }}
          testId="tcp-server-state"
        />
      </LessonCanvas>

      <LessonPanel
        defaultWidth={520}
        maxWidth={760}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
          <ConnectionStateCard nodeStates={nodeStates} started={state.traces.length > 0} />
          <StepControls continueAcrossTraces />
          <MoreDetail />
        </div>
      </LessonPanel>
    </LessonSplit>
  );
}

export default function TcpHandshakeDemo() {
  const params = new URLSearchParams(window.location.search);
  const sandboxIntroId = params.get('intro') ?? null;
  const tutorialId = sandboxIntroId ? null : (params.get('tutorial') ?? null);
  const sandboxEnabled = params.get('sandbox') === '1';
  const { embedded, embedMode, parentOrigin } = readDemoEmbedParams();
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="TCP Handshake"
      desc="Inspect a 3-way handshake and 4-step teardown across a routed path, with state badges, active connections, and packet-byte detail."
      embedded={embedded}
    >
      <NetlabProvider
        topology={TOPOLOGY}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled ? { sandboxControlMode: 'sandbox-owns' as const } : {})}
        {...(embedMode !== undefined ? { embedMode } : {})}
        {...(parentOrigin !== undefined ? { parentOrigin } : {})}
        {...(sandboxEnabled && sandboxIntroId ? { sandboxIntroId } : {})}
        {...tutorialProps}
      >
        <SimulationProvider>
          <TcpHandshakeDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
