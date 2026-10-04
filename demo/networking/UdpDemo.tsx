import { useT } from '../localeContext';
import { useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const DEFAULT_PORT = 7777;
const DEFAULT_PAYLOAD = 'hello';

const CARD_STYLE: CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid #1f2937',
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

const BUTTON_STYLE: CSSProperties = {
  // A label is one unit: 「UDP を送る → ポート 7777」 broke after 「ポ」.
  whiteSpace: 'nowrap',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #0f766e',
  background: '#115e59',
  color: '#ecfeff',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
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

// The second send is a harmless experiment. Painted red it read as "danger"
// and a learner did not dare press it.
const SECONDARY_BUTTON_STYLE: CSSProperties = {
  whiteSpace: 'nowrap',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--netlab-border)',
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  cursor: 'pointer',
  fontSize: 13,
};

const INPUT_STYLE: CSSProperties = {
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-border)',
  borderRadius: 6,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '6px 8px',
  width: 120,
};

function buildTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 70, y: 220 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:0a',
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 310, y: 220 },
        data: {
          label: 'SW1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'fa0/1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
            { id: 'fa0/2', name: 'fa0/2', macAddress: '00:00:00:01:00:02' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 550, y: 220 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.0.20',
          mac: '02:00:00:00:00:0b',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
      { id: 'e2', source: 'switch-1', target: 'server-1', type: 'smoothstep' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

const TOPOLOGY = buildTopology();

const IP_HEADER_BYTES = 20;
const UDP_HEADER_BYTES = 8;
/** The usual Ethernet MTU: the largest IP packet one link carries in one piece. */
const ETHERNET_MTU = 1500;

/** What a UDP send of this many payload bytes amounts to, in bytes and pieces. */
export function describeUdpSize(payloadBytes: number): {
  udpBytes: number;
  ipBytes: number;
  overEthernetMtu: boolean;
  /** Payload bytes per IPv4 fragment on a 1500-byte link, when it must split. */
  realFragments: number[];
} {
  const udpBytes = payloadBytes + UDP_HEADER_BYTES;
  const ipBytes = udpBytes + IP_HEADER_BYTES;
  const overEthernetMtu = ipBytes > ETHERNET_MTU;
  // A fragment carries a multiple of 8 data bytes, except the last one.
  const perFragment = Math.floor((ETHERNET_MTU - IP_HEADER_BYTES) / 8) * 8;
  const realFragments: number[] = [];
  if (overEthernetMtu) {
    for (let left = udpBytes; left > 0; left -= perFragment) {
      realFragments.push(Math.min(left, perFragment));
    }
  }
  return { udpBytes, ipBytes, overEthernetMtu, realFragments };
}

/** How many pieces the recorded trace actually carried the datagram in. */
export function recordedPieces(trace: PacketTrace): number {
  return trace.hops.reduce((max, hop) => Math.max(max, hop.fragmentCount ?? 1), 1);
}

export default function UdpDemo() {
  return (
    <DemoShell
      title="UDP Datagram"
      desc="Send one UDP message: it goes at once, with no greeting and no check that it arrived. Compare with TCP."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <UdpDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

function UdpDemoInner() {
  const t = useT();
  const { topology } = useNetlabContext();
  const { engine, sendPacket, state, isRecomputing } = useSimulation();
  const [port, setPort] = useState(DEFAULT_PORT);
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [sentPayloadBytes, setSentPayloadBytes] = useState<number | null>(null);

  const activeTrace = state.currentTraceId
    ? (state.traces.find((t) => t.packetId === state.currentTraceId) ?? null)
    : null;

  const sendUdp = async (payloadText: string) => {
    const srcNode = topology.nodes.find((n) => n.id === 'client-1');
    const dstNode = topology.nodes.find((n) => n.id === 'server-1');
    if (!srcNode || !dstNode) return;
    const srcIp = typeof srcNode.data.ip === 'string' ? srcNode.data.ip : '';
    const dstIp = typeof dstNode.data.ip === 'string' ? dstNode.data.ip : '';
    const srcMac = typeof srcNode.data.mac === 'string' ? srcNode.data.mac : undefined;
    const dstMac = typeof dstNode.data.mac === 'string' ? dstNode.data.mac : undefined;

    const packet = buildUdpPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp,
      dstIp,
      srcPort: 49200,
      dstPort: port,
      payload: { layer: 'raw', data: payloadText },
      ...(srcMac !== undefined ? { srcMac } : {}),
      ...(dstMac !== undefined ? { dstMac } : {}),
    });

    setSentPayloadBytes(new TextEncoder().encode(payloadText).length);
    engine.reset();
    await sendPacket(packet);
  };

  const sendLargePayload = () => sendUdp('X'.repeat(4000));
  const sendSmallPayload = () => sendUdp(payload);

  return (
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />}>
        <LessonNote
          data-testid="lesson-brief"
          data-canvas-overlay=""
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
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ color: 'var(--netlab-text-secondary)', fontWeight: 700 }}>
            {t('How UDP works', 'UDP のしくみ')}
          </div>
          <div data-testid="lesson-lead" style={LEAD_STYLE}>
            {t(
              'TCP is a phone call; UDP is a postcard. Nobody checks that a postcard arrived.',
              'TCP は電話、UDP ははがき。はがきは、届いたかどうかを確かめません。',
            )}
          </div>
          <div style={DETAIL_STYLE}>
            {t(
              'UDP sends one message straight away, with no greeting first (TCP\'s "hello?"). It does not check that the message arrived, and does not send it again if it is lost. That is less work, so it is quick.',
              'UDP は、送る前のあいさつ（TCP の「もしもし」）をしません。いきなり 1 通送ります。届いたかも確かめず、なくなっても送り直しません。そのぶん手間が少なく、速く送れます。',
            )}
          </div>
          {/* The contrast with TCP as a picture of its own: learners who read
              "no handshake" in a sentence kept "handshake" and lost the "no". */}
          <div
            data-testid="udp-compare"
            style={{
              ...DETAIL_STYLE,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr 1fr',
              gap: '2px 10px',
              marginTop: 8,
            }}
          >
            <span />
            <strong>{t('TCP (phone call)', 'TCP（電話）')}</strong>
            <strong>{t('UDP (postcard)', 'UDP（はがき）')}</strong>
            <span>{t('Greeting first', '送る前のあいさつ')}</span>
            <span>{t('Yes, 3 messages', 'する（3 回）')}</span>
            <strong>{t('None', 'しない')}</strong>
            <span>{t('Checks arrival', '届いたかの確認')}</span>
            <span>{t('Yes', 'する')}</span>
            <strong>{t('None', 'しない')}</strong>
          </div>
        </LessonNote>
      </LessonCanvas>

      <LessonPanel
        defaultWidth={400}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
        }}
      >
        {/* Padded, and each card may shrink: without either, the cards ran
            under the right edge of the screen and their borders were cut. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 12,
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>{t('UDP CONTROLS', 'UDP の操作')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--netlab-text-secondary)',
                  fontSize: 12,
                }}
              >
                {t('Port (which door at the server):', 'ポート（相手の窓口の番号）:')}
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  style={INPUT_STYLE}
                />
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--netlab-text-secondary)',
                  fontSize: 12,
                }}
              >
                {t('Payload (what to send):', '中身（送る文字）:')}
                <input
                  type="text"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  style={{ ...INPUT_STYLE, width: 180 }}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  data-testid="demo-primary-action"
                  onClick={sendSmallPayload}
                  disabled={isRecomputing}
                  style={BUTTON_STYLE}
                >
                  {t(`Send UDP → port ${port}`, `UDP を送る → ポート ${port}`)}
                </button>
                <button
                  onClick={sendLargePayload}
                  disabled={isRecomputing}
                  data-testid="udp-send-large"
                  style={SECONDARY_BUTTON_STYLE}
                >
                  {t('Send Large (4000 B)', '大きく送る（4000 バイト）')}
                </button>
              </div>
              <div
                data-testid="udp-large-hint"
                style={{ ...DETAIL_STYLE, color: 'var(--netlab-text-secondary)' }}
              >
                {t(
                  '"Send Large" is safe to press: nothing breaks. A packet has a size limit on each link, the MTU (usually 1500 bytes). The large send is bigger than that; what happens to it is shown below after you send.',
                  '「大きく送る」は、試しに押して大丈夫です。何も壊れません。パケットの大きさには上限（MTU。ふつう 1500 バイト）があります。それより大きいデータを送るとどうなるかを、送ったあと下に表示します。',
                )}
              </div>
            </div>
          </div>

          {/* The main idea first — it went without a greeting and without a
              check — and the byte sum after it. */}
          {activeTrace && (
            <div
              data-testid="udp-sent-result"
              style={{
                ...CARD_STYLE,
                ...DETAIL_STYLE,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--netlab-accent-green)',
              }}
            >
              {t(
                'Sent straight away, with no greeting: this one message is the whole exchange. UDP did not check that it arrived, and if it had been lost UDP would do nothing: no resend.',
                'あいさつなしで、いきなり送りました。通信はこの 1 通だけです。UDP は、届いたかどうかを確かめていません。もし途中でなくなっても、何もしません（送り直しません）。',
              )}
            </div>
          )}

          {activeTrace && sentPayloadBytes !== null && (
            <UdpSizeResult payloadBytes={sentPayloadBytes} pieces={recordedPieces(activeTrace)} />
          )}

          {activeTrace && (
            <>
              {/* Each panel carries its own heading; an outer label repeated it. */}
              <TraceSummary />
              <div
                data-testid="lesson-trace-timeline"
                style={{
                  border: '1px solid var(--netlab-border-subtle)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <PacketTimeline />
              </div>
              <HopInspector />
            </>
          )}
        </div>
      </LessonPanel>
    </LessonSplit>
  );
}

function UdpSizeResult({ payloadBytes, pieces }: { payloadBytes: number; pieces: number }) {
  const t = useT();
  const size = describeUdpSize(payloadBytes);
  const real = size.realFragments;

  return (
    <div
      data-testid="udp-size-result"
      data-pieces={pieces}
      style={{ ...CARD_STYLE, ...DETAIL_STYLE, fontSize: 12 }}
    >
      <div style={LABEL_STYLE}>{t('HOW BIG IT WAS', '送ったものの大きさ')}</div>
      <div data-testid="udp-size-bytes">
        {t(
          `Data ${payloadBytes} B + UDP header 8 B + IP header 20 B = one IP packet of ${size.ipBytes} B`,
          `中身 ${payloadBytes} バイト ＋ UDP ヘッダ 8 バイト ＋ IP ヘッダ 20 バイト ＝ IP パケット ${size.ipBytes} バイト`,
        )}
      </div>
      <div data-testid="udp-size-pieces" style={{ fontWeight: 700, marginTop: 4 }}>
        {pieces > 1
          ? t(`Split into ${pieces} pieces on the way.`, `途中で ${pieces} 個に分割されました。`)
          : t(
              'Not split: it arrived as one packet (1 piece).',
              '分割なし：1 個のパケットのまま届きました。',
            )}
      </div>
      <div
        data-testid="udp-size-explanation"
        style={{ color: 'var(--netlab-text-secondary)', marginTop: 6 }}
      >
        {!size.overEthernetMtu
          ? t(
              `${size.ipBytes} B is within the usual 1500-byte MTU, so a real network also sends it in one piece.`,
              `${size.ipBytes} バイトはふつうの MTU（1500 バイト）以内なので、本物のネットワークでも 1 個のまま送られます。`,
            )
          : pieces > 1
            ? t(
                `${size.ipBytes} B is over the link's MTU, so the packet was cut into smaller IP fragments; the receiver puts them back together.`,
                `${size.ipBytes} バイトはリンクの MTU を超えているので、小さな IP フラグメントに切り分けられました。受け取った側で元に戻します。`,
              )
            : t(
                `${size.ipBytes} B is over the usual 1500-byte MTU. A real computer would split the ${size.udpBytes}-byte datagram into ${real.length} IP fragments of ${real.join(' + ')} bytes, and the server would put them back together. This simulation does not split it: here only a router splits packets, and this network has no router and no MTU set on its links. To watch splitting happen, open the "MTU & Fragmentation" lesson.`,
                `${size.ipBytes} バイトはふつうの MTU（1500 バイト）を超えています。本物のパソコンなら、${size.udpBytes} バイトの UDP データグラムを ${real.join(' ＋ ')} バイトの ${real.length} 個の IP フラグメントに分けて送り、サーバ側で元に戻します。このシミュレーションでは分割されません。ここでパケットを分割するのはルータだけで、この図にはルータがなく、リンクに MTU も設定していないためです。分割が実際に起きる様子は「MTU と分割」のレッスンで見られます。`,
              )}
      </div>
    </div>
  );
}
