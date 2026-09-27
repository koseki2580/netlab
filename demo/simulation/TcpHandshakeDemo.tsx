import { useT } from '../localeContext';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
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
        return t('waiting for a SYN', 'SYN を待っている');
      case 'SYN_SENT':
        return t('sent a SYN, waiting for the reply', 'SYN を送り、返事を待っている');
      case 'SYN_RECEIVED':
        return t(
          'got the SYN, waiting for the last ACK',
          'SYN を受け取り、最後の ACK を待っている',
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

function StateBadge({
  label,
  state,
  left,
  top,
  testId,
}: {
  label: string;
  state: TcpState;
  left: number;
  top: number;
  testId: string;
}) {
  const accent = stateAccent(state);
  const meaning = useStateMeaning();

  return (
    <div
      data-testid={testId}
      style={{
        position: 'absolute',
        left,
        top,
        padding: '8px 10px',
        borderRadius: 10,
        border: `1px solid ${accent}55`,
        // The panel's own colour rather than a fixed near-black: the text on
        // it is themed, so a dark box left it unreadable on a light page.
        background: 'color-mix(in srgb, var(--netlab-bg-panel) 92%, transparent)',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.4,
        boxShadow: '0 8px 24px color-mix(in srgb, var(--netlab-bg-primary) 35%, transparent)',
        pointerEvents: 'none',
        minWidth: 124,
        maxWidth: 220,
      }}
    >
      <div style={{ color: 'var(--netlab-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div data-testid={`${testId}-code`} style={{ color: accent, fontWeight: 'bold' }}>
        {state}
      </div>
      <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 2 }}>{meaning(state)}</div>
    </div>
  );
}

function SidebarPanel({
  traces,
  currentTraceId,
}: {
  traces: PacketTrace[];
  currentTraceId: string | null;
}) {
  const t = useT();
  const { engine, state } = useSimulation();
  const activeConnections = engine.getTcpConnections();
  const selected = readSelectedSegment(state.selectedPacket);
  const activeTrace = currentTraceId
    ? (traces.find((trace) => trace.packetId === currentTraceId) ?? null)
    : (traces[traces.length - 1] ?? null);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        border: '1px solid var(--netlab-bg-surface)',
        borderRadius: 10,
        background: 'var(--netlab-bg-primary)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--netlab-text-secondary)',
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t('ACTIVE TCP CONNECTIONS', '確立中の TCP 接続')}
        </div>
        {activeConnections.length > 0 && (
          <div
            data-testid="tcp-connection-note"
            style={{ color: 'var(--netlab-text-secondary)', fontSize: 11, marginBottom: 6 }}
          >
            {t(
              'This is the connection after the whole exchange. The state badges on the canvas follow the step you are on.',
              'これはやり取りをすべて終えた後の接続です。図の上の状態表示は、いま見ているステップに合わせて変わります。',
            )}
          </div>
        )}
        {activeConnections.length === 0 ? (
          <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
            {t('No active connections.', 'いま確立している接続はありません。')}
          </div>
        ) : (
          activeConnections.map((connection) => (
            <div
              key={connection.id}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--netlab-bg-primary)',
                border: '1px solid var(--netlab-bg-surface)',
                color: 'var(--netlab-text-primary)',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              <div
                style={{ color: 'var(--netlab-accent-green)', fontWeight: 'bold', marginBottom: 4 }}
              >
                {connection.state}
              </div>
              <div>
                {connection.srcIp}:{connection.srcPort} → {connection.dstIp}:{connection.dstPort}
              </div>
              <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
                localSeq={connection.localSeq} localAck={connection.localAck} remoteSeq=
                {connection.remoteSeq}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--netlab-text-secondary)',
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t('SELECTED SEGMENT', '選択中のセグメント')}
        </div>
        {selected ? (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--netlab-bg-primary)',
              border: '1px solid var(--netlab-bg-surface)',
              color: 'var(--netlab-text-primary)',
              fontSize: 12,
              fontFamily: 'monospace',
              display: 'grid',
              gap: 4,
            }}
          >
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
          <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
            {t(
              'Select a trace and step into a hop to inspect TCP header fields.',
              '通信を選んでホップを進めると、TCP ヘッダの値が見られます。',
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TcpHandshakeDemoInner() {
  const t = useT();
  const { engine, state } = useSimulation();
  const activeConnection = engine.getTcpConnections()[0] ?? null;
  const nodeStates = deriveNodeStates(
    state.traces,
    state.currentTraceId,
    state.currentStep,
    state.status,
    activeConnection !== null,
  );

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

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />

        <div
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
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeConnection ? 'var(--netlab-border)' : '#0f766e',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: activeConnection ? 'not-allowed' : 'pointer',
            }}
          >
            {t('Connect (TCP)', 'TCP で接続')}
          </button>
          <button
            type="button"
            disabled={activeConnection === null}
            onClick={() => void handleDisconnect()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--netlab-border)',
              background: activeConnection
                ? 'var(--netlab-bg-elevated)'
                : 'var(--netlab-bg-primary)',
              color: activeConnection
                ? 'var(--netlab-text-primary)'
                : 'var(--netlab-text-secondary)',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: activeConnection ? 'pointer' : 'not-allowed',
            }}
          >
            {t('Disconnect', '切断')}
          </button>
          <span
            style={{ color: 'var(--netlab-text-secondary)', fontFamily: 'monospace', fontSize: 11 }}
          >
            {t(
              'Use the trace selector on the right to step through SYN, SYN-ACK, ACK, and FIN exchanges.',
              '右の通信一覧から、SYN・SYN-ACK・ACK・FIN のやり取りを1つずつ追えます。',
            )}
          </span>
        </div>

        <div
          data-testid="tcp-teaching-flow"
          data-canvas-overlay=""
          style={{
            position: 'absolute',
            // Bottom-left, clear of both state badges. In the top-right it sat
            // on top of the Server State badge and hid it completely — on the
            // lesson whose whole subject is what those two states do.
            left: 16,
            bottom: 16,
            width: 320,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--netlab-bg-surface)',
            background: 'color-mix(in srgb, var(--netlab-bg-panel) 94%, transparent)',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
            zIndex: 20,
          }}
        >
          <div style={{ color: 'var(--netlab-accent-cyan)', fontWeight: 'bold', marginBottom: 6 }}>
            {t('TCP Teaching Flow', 'TCP のしくみ')}
          </div>
          <div data-testid="tcp-brief-purpose" style={{ marginBottom: 4 }}>
            {t(
              'Before sending any data, TCP makes a connection with three messages — like a phone call: "hello?", "yes, I hear you", "right, let us talk". The exchange also sets starting sequence numbers, so later a lost piece is noticed and sent again.',
              'TCP はデータを送る前に、3 回のやり取りで接続を作ります。電話の「もしもし」「はい、聞こえます」「では話します」のようなものです。このやり取りで番号（シーケンス番号）の数え始めも決めるので、あとで欠けたデータに気づいて送り直せます。',
            )}
          </div>
          <div>{t('Handshake', '接続')}: SYN → SYN-ACK → ACK</div>
          <div>{t('Teardown', '切断')}: FIN → ACK → FIN → ACK</div>
          <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 6 }}>
            {t(
              'State badges are derived from the recorded packet sequence so you can inspect historical handshake and teardown phases even after the engine finishes the exchange.',
              '状態の表示は記録されたパケットの並びから決めているので、やり取りが終わったあとでも接続と切断の各段階を見返せます。',
            )}
          </div>
          <div data-testid="tcp-state-follows-step" style={{ marginTop: 6 }}>
            {t(
              'The states follow the step you are on: a side changes only when a segment reaches it (its DELIVER hop). The client is ESTABLISHED as soon as the SYN-ACK arrives; the server only after the last ACK.',
              '状態は、いま見ているステップに合わせて変わります。セグメントが相手に届いた（DELIVER の）ときに、届いた側の状態が変わります。クライアントは SYN-ACK が届いた時点で ESTABLISHED（接続完了）、サーバは最後の ACK が届いてから ESTABLISHED です。',
            )}
          </div>
        </div>

        <StateBadge
          label={t('Client State', 'クライアントの状態')}
          state={nodeStates.client}
          left={24}
          top={100}
          testId="tcp-client-state"
        />
        <StateBadge
          label={t('Server State', 'サーバの状態')}
          state={nodeStates.server}
          left={602}
          top={100}
          testId="tcp-server-state"
        />
      </div>

      <ResizableSidebar
        defaultWidth={520}
        maxWidth={760}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
          <SidebarPanel traces={state.traces} currentTraceId={state.currentTraceId} />
          <StepControls continueAcrossTraces />
          <div
            style={{
              padding: 16,
              border: '1px solid var(--netlab-bg-surface)',
              borderRadius: 10,
              background: 'var(--netlab-bg-primary)',
            }}
          >
            <PacketStructureViewer />
          </div>
        </div>
      </ResizableSidebar>
    </div>
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
