import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useGalleryLocale, useT } from '../localeContext';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { en } from '../../src/i18n/locales/en';
import { ja } from '../../src/i18n/locales/ja';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { useViewport } from '../../src/utils/useViewport';
import type { InFlightPacket } from '../../src/types/packets';
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
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
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
}: {
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      // Filled, like every other lesson's send button: as an outline these
      // did not look like something to press.
      style={{
        background: '#115e59',
        border: '1px solid #0f766e',
        borderRadius: 8,
        color: '#ecfeff',
        cursor: 'pointer',
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

function NatDemoInner() {
  const t = useT();
  const { sendPacket } = useSimulation();

  return (
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />} />

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
                'Machines at home use addresses that only work inside (private addresses, such as 192.168.1.10). On the way out, the router at the exit rewrites the sender to its own address (the global address, 203.0.113.1). When the reply comes back, it puts the private address back.',
                '家の中の機器は、中だけで通じる住所（プライベートアドレス。例：192.168.1.10）を使います。外へ出るとき、出口のルータが送り主を自分の住所（グローバルアドレス 203.0.113.1）に書き換えます。返事が戻ったら、元の住所に戻します。',
              )}
            </div>
            <div style={{ marginTop: 6 }}>
              {t(
                'Send from Client A, then from Client B, with the buttons below (each sends at once). Both get the same address and are told apart by port number: a port number is like a room number at one street address.',
                '下のボタンで、Client A と Client B から送ってみましょう（押すとすぐ送られます）。2 台とも同じ住所になり、ポート番号で区別されます。ポート番号は、同じ住所の中の部屋番号のようなものです。',
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

          <NatResult />

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
            <PacketTimeline />
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
            'The controls below replay the last send hop by hop (▶ play, → one step). ⟳ reset also empties the NAT table, so use it only to start over.',
            '下の操作で、最後に送ったパケットを1ホップずつ見直せます（▶ 再生、→ 1ステップ）。⟳ リセットは NAT の変換表も空にするので、最初からやり直すときだけ使います。',
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

  return (
    <DemoShell
      title="NAT / PAT"
      desc="Two machines at home share one outside address: watch the router rewrite the sender and keep a table."
      embedded={embedded}
    >
      <NetlabProvider
        topology={NAT_DEMO_TOPOLOGY}
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
