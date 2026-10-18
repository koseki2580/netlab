import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useGalleryLocale, useT } from '../localeContext';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import {
  LessonCanvas,
  LessonPanel,
  LessonPinned,
  LessonSplit,
  LessonStepBar,
  usePhoneTopology,
} from '../components/LessonPanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { en } from '../../src/i18n/locales/en';
import { ja } from '../../src/i18n/locales/ja';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { useViewport } from '../../src/utils/useViewport';
import type { InFlightPacket } from '../../src/types/packets';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { NAT_DEMO_TOPOLOGY } from './natDemoTopology';
import { readDemoEmbedParams } from '../embedParams';

export { NAT_DEMO_TOPOLOGY };

function makePacket(
  id: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
  /** The reply to a SYN is a SYN-ACK; everything else here opens a connection. */
  reply = false,
): InFlightPacket {
  return {
    id,
    srcNodeId,
    dstNodeId,
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: reply, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: reply ? '' : 'GET / HTTP/1.1' },
        },
      },
    },
  };
}

/**
 * The address rewrite is said on the diagram, but only as "sender A → B":
 * what happened, not what it is for. A learner who had watched it answered
 * "NAT makes it faster". This lesson's bubbles lead with the purpose.
 */
const BUBBLE_WORDS = {
  en: {
    'simulation.packetStory.natSource':
      'Everyone at home shares one address: sender {{from}} → {{to}}',
    'simulation.packetStory.natDestination':
      'Passed on to the machine inside: destination {{from}} → {{to}}',
  },
  ja: {
    'simulation.packetStory.natSource': '家のみんなで 1 つの住所を共有：送り主 {{from}} → {{to}}',
    'simulation.packetStory.natDestination': '中の機器へ渡すために書き換え：宛先 {{from}} → {{to}}',
  },
} as const;

function NatBubbleWords({ children }: { children: ReactNode }) {
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

function ActionButton({
  label,
  onClick,
  testId,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      // Filled, like every other lesson's send button: as an outline these
      // did not look like something to press.
      style={{
        background: '#115e59',
        border: '1px solid #0f766e',
        borderRadius: 8,
        color: '#ecfeff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontSize: 14,
        fontWeight: 700,
        padding: '10px 12px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
  );
}

// An address and its port are one thing to read: 「203.0.113.1:1 / 024」 broke
// in the middle of the number on a phone.
const ADDRESS: CSSProperties = { whiteSpace: 'nowrap', fontFamily: 'monospace' };

/**
 * The router's translation table, in the words the lesson's text uses
 * (private / global), with the formal names in brackets. On a narrow screen
 * each translation is a short list instead of a row, so no address is cut.
 */
function NatSharingTable() {
  const t = useT();
  const { isNarrow } = useViewport();
  const { state } = useSimulation();
  const entries = state.natTables.flatMap((table) => table.entries);

  const columns = [
    {
      head: t('Private (inside local)', 'プライベート（内部ローカル）'),
      hint: t('address inside the home', '家の中での住所'),
    },
    {
      head: t('Global (inside global)', 'グローバル（内部グローバル）'),
      hint: t('address seen from outside', '外から見える住所'),
    },
    { head: t('Other side', '相手'), hint: t('who it talks to', '通信の相手') },
    { head: t('Direction', '向き'), hint: '' },
  ];
  const direction = (type: string) =>
    type === 'snat' ? t('out (SNAT)', '中→外（SNAT）') : t('in (DNAT)', '外→中（DNAT）');
  const grid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, auto)) auto',
    gap: '4px 12px',
    alignItems: 'start',
  };

  return (
    <div
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: 12,
        color: 'var(--netlab-text-primary)',
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontWeight: 700, color: 'var(--netlab-text-secondary)', marginBottom: 6 }}>
        {t(
          'Translation table (what the router R-Edge remembers)',
          '変換表（ルータ R-Edge が覚えている対応）',
        )}
      </div>
      {entries.length === 0 ? (
        <div data-testid="nat-table-empty" style={{ color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Nothing yet. Press a button above and a line appears here.',
            'まだ空です。上のボタンを押すと、ここに 1 行増えます。',
          )}
        </div>
      ) : isNarrow ? (
        <div data-testid="nat-table-grid" style={{ display: 'grid', gap: 8 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '2px 10px',
                paddingTop: 8,
                borderTop: '1px solid var(--netlab-border-subtle)',
              }}
            >
              <span style={{ color: 'var(--netlab-text-secondary)' }}>{columns[0]!.head}</span>
              <span data-testid="nat-inside-local" style={ADDRESS}>
                {`${entry.insideLocalIp}:${entry.insideLocalPort}`}
              </span>
              <span style={{ color: 'var(--netlab-text-secondary)' }}>{columns[1]!.head}</span>
              <span data-testid="nat-inside-global" style={{ ...ADDRESS, fontWeight: 700 }}>
                {`${entry.insideGlobalIp}:${entry.insideGlobalPort}`}
              </span>
              <span style={{ color: 'var(--netlab-text-secondary)' }}>{columns[2]!.head}</span>
              <span data-testid="nat-outside-peer" style={ADDRESS}>
                {`${entry.outsidePeerIp}:${entry.outsidePeerPort}`}
              </span>
              <span style={{ color: 'var(--netlab-text-secondary)' }}>{columns[3]!.head}</span>
              <span>{direction(entry.type)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div data-testid="nat-table-grid" style={grid}>
          {columns.map((column) => (
            <span key={column.head} style={{ color: 'var(--netlab-text-secondary)' }}>
              <strong>{column.head}</strong>
              {column.hint ? <div style={{ fontSize: 11 }}>{column.hint}</div> : null}
            </span>
          ))}
          {entries.map((entry) => (
            <Fragment key={entry.id}>
              <span data-testid="nat-inside-local" style={ADDRESS}>
                {`${entry.insideLocalIp}:${entry.insideLocalPort}`}
              </span>
              <span data-testid="nat-inside-global" style={{ ...ADDRESS, fontWeight: 700 }}>
                {`${entry.insideGlobalIp}:${entry.insideGlobalPort}`}
              </span>
              <span data-testid="nat-outside-peer" style={ADDRESS}>
                {`${entry.outsidePeerIp}:${entry.outsidePeerPort}`}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>{direction(entry.type)}</span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/** What the table now shows, said in one line with the purpose first. */
function NatResult() {
  const t = useT();
  const { state } = useSimulation();
  const outbound = state.natTables
    .flatMap((table) => table.entries)
    .filter((entry) => entry.type === 'snat');
  const first = outbound[0];
  if (!first) return null;
  const machines = new Set(outbound.map((entry) => entry.insideLocalIp)).size;
  const ports = outbound.map((entry) => entry.insideGlobalPort).join(t(' and ', ' と '));

  return (
    <div
      data-testid="nat-result"
      data-machines={machines}
      style={{
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1.6,
        color: 'var(--netlab-accent-green)',
      }}
    >
      {machines > 1
        ? t(
            `${machines} machines at home are sharing one address, ${first.insideGlobalIp}. The server outside sees both as coming from ${first.insideGlobalIp}; the router tells them apart by port number (${ports}).`,
            `家の ${machines} 台が、1 つの住所 ${first.insideGlobalIp} を共有しています。外のサーバには、どちらも ${first.insideGlobalIp} から来たように見えます。ルータはポート番号（${ports}）で見分けます。`,
          )
        : t(
            `Everyone at home shares one address: from outside, ${first.insideLocalIp} is seen as ${first.insideGlobalIp}. Send from the other client too: it gets the same address.`,
            `家のみんなで 1 つの住所を共有します。${first.insideLocalIp} は、外からは ${first.insideGlobalIp} に見えます。もう 1 台からも送ると、同じ住所になります。`,
          )}
    </div>
  );
}

/** Which machine at home has each private address. */
const HOME_NODE: Readonly<Record<string, { id: string; label: string }>> = {
  '192.168.1.10': { id: 'client-1', label: 'Client A' },
  '192.168.1.20': { id: 'client-2', label: 'Client B' },
};

/**
 * The rows of a send the lesson is about. The router's address lookup (ARP)
 * is the ARP lesson's subject and comes up again on every send here, where it
 * buried the two rows that rewrite an address.
 */
export function isNatLessonRow(item: PacketHop | PacketTrace): boolean {
  return !('event' in item) || (item.event !== 'arp-request' && item.event !== 'arp-reply');
}

/** The way back, said in words once a reply has been sent. */
function NatReplyResult() {
  const t = useT();
  const { state } = useSimulation();
  const trace = state.traces[state.traces.length - 1];
  if (!trace?.packetId.startsWith('nat-reply') || trace.status !== 'delivered') return null;
  const back = trace.hops.find((hop) => hop.natTranslation)?.natTranslation;
  if (!back) return null;
  const home = HOME_NODE[back.postDstIp]?.label ?? back.postDstIp;

  return (
    <div
      data-testid="nat-reply-result"
      style={{
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1.6,
        color: 'var(--netlab-accent-green)',
      }}
    >
      {t(
        `The reply came back addressed to ${back.preDstIp}:${back.preDstPort}. The router looked in its table, put the destination back to ${back.postDstIp}:${back.postDstPort}, and handed it to ${home}.`,
        `返事は ${back.preDstIp}:${back.preDstPort} あてに戻ってきました。ルータは変換表を見て、宛先を ${back.postDstIp}:${back.postDstPort} に戻し、${home} に渡しました。`,
      )}
    </div>
  );
}

function NatDemoInner() {
  const t = useT();
  const { sendPacket, state } = useSimulation();
  // The reply answers the send made last, the way a server answers whoever just spoke to it.
  const outbound = state.natTables
    .flatMap((table) => table.entries)
    .filter((entry) => entry.type === 'snat')
    .sort((a, b) => a.lastSeenAt - b.lastSeenAt);
  const lastOut = outbound[outbound.length - 1];
  const replyTo = lastOut ? HOME_NODE[lastOut.insideLocalIp] : undefined;

  return (
    <LessonSplit pinned>
      <LessonCanvas canvas={<NetlabCanvas />} />
      <LessonStepBar step={false} />

      <LessonPanel
        defaultWidth={500}
        maxWidth={760}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
          <div
            data-testid="lesson-brief"
            style={{
              background: 'var(--netlab-bg-panel)',
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--netlab-text-primary)',
            }}
          >
            <div style={{ color: 'var(--netlab-text-secondary)', fontWeight: 700 }}>
              {t('How NAT works', 'NAT のしくみ')}
            </div>
            <div
              data-testid="lesson-lead"
              style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, margin: '2px 0 6px' }}
            >
              {t(
                'NAT lets everyone at home share one address.',
                'NAT は、家のみんなで 1 つの住所を共有するしくみです。',
              )}
            </div>
            <div>
              {t(
                'Machines at home use addresses that only work inside (private addresses, such as 192.168.1.10). On the way out, the router at the exit rewrites the sender to its own address (the global address, 203.0.113.1). When the reply comes back, it puts the private address back. After a send, "Send the reply from Internet Host" shows that.',
                '家の中の機器は、中だけで通じる住所（プライベートアドレス。例：192.168.1.10）を使います。外へ出るとき、出口のルータが送り主を自分の住所（グローバルアドレス 203.0.113.1）に書き換えます。返事が戻ったら、元の住所に戻します。送ったあとに「Internet Host から返事を送る」を押すと、それが見られます。',
              )}
            </div>
            <div style={{ marginTop: 6 }}>
              {t(
                'Send from Client A, then from Client B, with the buttons below (each sends at once). Both get the same address and are told apart by port number.',
                '下のボタンで、Client A と Client B から送ってみましょう（押すとすぐ送られます）。2 台とも同じ住所になり、ポート番号で区別されます。',
              )}
            </div>
            {/* The course called a switch's socket a port; this is the other sense. */}
            <div data-testid="nat-port-gloss" style={{ marginTop: 6 }}>
              {t(
                'A port here is not a socket for a cable: it is the number of a window inside a machine.',
                'ここでいうポートは、ケーブルの差し込み口ではなく、機器の中の窓口の番号です。',
              )}
            </div>
            <div
              data-testid="nat-port-allocation-note"
              style={{ marginTop: 6, color: 'var(--netlab-text-secondary)' }}
            >
              {t(
                'This NAT allocates public ports in order starting at 1024.',
                'この画面の NAT は、外側のポート番号を 1024 から順に割り当てます。',
              )}
              <details data-testid="lesson-more" style={{ marginTop: 4 }}>
                <summary style={{ cursor: 'pointer' }}>
                  {t('More detail (on real devices)', 'もっと詳しく（実際の機器では）')}
                </summary>
                <div style={{ marginTop: 4 }}>
                  {t(
                    "Many real NATs, such as Linux MASQUERADE or Cisco PAT, keep the client's own port when it is free. It starts at 1024 because ports 0 to 1023 are the well-known range reserved for standard services; where real NATs start differs: Linux picks from 1024 to 65535 by default when it cannot keep the client's port, and many devices use a higher configured range.",
                    '実際の NAT の多く（Linux の MASQUERADE や Cisco の PAT など）は、空いていればクライアントのポート番号をそのまま使います。1024 から始めるのは、0〜1023 が標準的なサービス用に予約されたウェルノウンポートだからです。実際の NAT がどこから割り当て始めるかは実装によって異なり、Linux はクライアントのポート番号をそのまま使えないとき既定で 1024〜65535 から選び、多くの機器はもっと大きい番号の範囲を設定して使います。',
                  )}
                </div>
              </details>
            </div>
          </div>
          <LessonPinned>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ActionButton
                testId="nat-send-client-a"
                label={t('▶ Send out from Client A', '▶ Client A から外へ送る')}
                onClick={() => {
                  void sendPacket(
                    makePacket(
                      `nat-snat-${Date.now()}`,
                      'client-1',
                      'server-1',
                      '192.168.1.10',
                      '198.51.100.10',
                      54321,
                      80,
                    ),
                  );
                }}
              />
              <ActionButton
                testId="nat-send-client-b"
                label={t('▶ Send out from Client B', '▶ Client B から外へ送る')}
                onClick={() => {
                  void sendPacket(
                    makePacket(
                      `nat-snat-b-${Date.now()}`,
                      'client-2',
                      'server-1',
                      '192.168.1.20',
                      '198.51.100.10',
                      54322,
                      80,
                    ),
                  );
                }}
              />
              <ActionButton
                testId="nat-send-reply"
                disabled={!lastOut || !replyTo}
                label={
                  replyTo
                    ? t(
                        `▶ Send the reply from Internet Host (to ${replyTo.label})`,
                        `▶ Internet Host から返事を送る（${replyTo.label} あて）`,
                      )
                    : t('▶ Send the reply from Internet Host', '▶ Internet Host から返事を送る')
                }
                onClick={() => {
                  if (!lastOut || !replyTo) return;
                  // Addressed to what the server saw: the shared address and
                  // the port the router chose, never the address at home.
                  void sendPacket(
                    makePacket(
                      `nat-reply-${Date.now()}`,
                      'server-1',
                      replyTo.id,
                      lastOut.outsidePeerIp,
                      lastOut.insideGlobalIp,
                      lastOut.outsidePeerPort,
                      lastOut.insideGlobalPort,
                      true,
                    ),
                  );
                }}
              />
              <ActionButton
                testId="nat-send-inbound"
                label={t(
                  '▶ Send in from outside to Client A (port 8080)',
                  '▶ 外から Client A へ送る（ポート 8080）',
                )}
                onClick={() => {
                  void sendPacket(
                    makePacket(
                      `nat-dnat-${Date.now()}`,
                      'server-1',
                      'client-1',
                      '198.51.100.10',
                      '203.0.113.1',
                      55000,
                      8080,
                    ),
                  );
                }}
              />
            </div>
          </LessonPinned>
          {/* A packet from outside reaching an address that "only works
              inside" needs its reason said. */}
          <div
            data-testid="nat-inbound-note"
            style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--netlab-text-secondary)' }}
          >
            {t(
              '"From outside to Client A" arrives because this router was told in advance: "what comes to port 8080 goes to port 80 of Client A". Without that rule it would be thrown away.',
              '「外から Client A へ送る」が届くのは、このルータに前もって「ポート 8080 に来たものは Client A のポート 80 へ渡す」と決めてあるからです。この決まりがなければ捨てられます。',
            )}
          </div>

          <NatResult />
          <NatReplyResult />

          <NatSharingTable />

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
            <PacketTimeline filter={isNatLessonRow} />
          </div>
          <div
            data-testid="nat-arp-note"
            style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--netlab-text-secondary)' }}
          >
            {t(
              'This list leaves out the ARP rows, so its numbers skip. A real device remembers an ARP answer for a few minutes and does not ask on every send.',
              'この一覧では ARP の行を省いています。だから番号が飛びます。本物の機器は ARP の答えを数分のあいだ覚えていて、送るたびには聞きません。',
            )}
          </div>

          <div style={{ flex: 2, minHeight: 0 }}>
            <HopInspector />
          </div>
        </div>

        <div
          data-testid="nat-controls-note"
          style={{
            padding: '6px 12px',
            fontSize: 11,
            lineHeight: 1.5,
            color: 'var(--netlab-text-secondary)',
            borderTop: '1px solid var(--netlab-bg-surface)',
          }}
        >
          {t(
            'The controls below replay the last send one step at a time (▶ play, → one step). ⟳ reset also empties the NAT table, so use it only to start over.',
            '下の操作で、最後に送ったパケットを 1 ステップずつ見直せます（▶ 再生、→ 1 ステップ）。⟳ リセットは NAT の変換表も空にするので、最初からやり直すときだけ使います。',
          )}
        </div>
        {/* No generic send here: it resets the engine, which empties the NAT
            table, so the sharing the lesson's own buttons built up vanished. */}
        <SimulationControls showSend={false} />
      </LessonPanel>
    </LessonSplit>
  );
}

export default function NatDemo() {
  const params = new URLSearchParams(window.location.search);
  const sandboxIntroId = params.get('intro') ?? null;
  const tutorialId = sandboxIntroId ? null : (params.get('tutorial') ?? null);
  const sandboxEnabled = params.get('sandbox') === '1';
  const { embedded, embedMode, parentOrigin } = readDemoEmbedParams();
  const tutorialProps = tutorialId ? { tutorialId } : {};

  const phone = usePhoneTopology(NAT_DEMO_TOPOLOGY);
  return (
    <DemoShell
      title="NAT / PAT"
      desc="Two machines at home share one outside address: watch the router rewrite the sender and keep a table."
      embedded={embedded}
    >
      <NetlabProvider
        key={phone.layout}
        topology={phone.topology}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled ? { sandboxControlMode: 'sandbox-owns' as const } : {})}
        {...(embedMode !== undefined ? { embedMode } : {})}
        {...(parentOrigin !== undefined ? { parentOrigin } : {})}
        {...(sandboxEnabled && sandboxIntroId ? { sandboxIntroId } : {})}
        {...tutorialProps}
      >
        <NatBubbleWords>
          <SimulationProvider>
            <NatDemoInner />
          </SimulationProvider>
        </NatBubbleWords>
      </NetlabProvider>
    </DemoShell>
  );
}
