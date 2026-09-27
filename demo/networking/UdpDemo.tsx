import { useT } from '../localeContext';
import { useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
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
      desc="Send a stateless UDP datagram — no handshake. Compare with TCP (which sets up a 3-way handshake first)."
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
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
        <div
          data-testid="lesson-brief"
          data-canvas-overlay=""
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
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ color: 'var(--netlab-text-primary)', fontWeight: 700, marginBottom: 4 }}>
            {t('UDP — Stateless Datagrams', 'UDP — 状態を持たないデータグラム')}
          </div>
          <div>
            {t(
              'UDP is stateless — no handshake. The client fires a single datagram toward the server. Compare with TCP (which sets up a 3-way handshake first). What UDP gives up for that speed: it never checks that the datagram arrived, and never resends one that is lost.',
              'UDP は状態を持たず、ハンドシェイクもありません。クライアントはデータグラムを1つサーバへ送るだけです。先に3ウェイハンドシェイクで接続を作る TCP と比べてみてください。その速さと引き換えに手放すもの：UDP は届いたかどうかを確かめず、失われても送り直しません。',
            )}
          </div>
        </div>
      </div>

      <ResizableSidebar defaultWidth={360}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>{t('UDP CONTROLS', 'UDP の操作')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--netlab-text-secondary)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              >
                {t('Port:', 'ポート:')}
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
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              >
                {t('Payload:', '中身:')}
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
                  style={{
                    ...BUTTON_STYLE,
                    background: '#7c2d12',
                    borderColor: '#9a3412',
                  }}
                >
                  {t('Send Large (4000 B)', '大きく送る（4000 バイト）')}
                </button>
              </div>
              <div
                data-testid="udp-large-hint"
                style={{ color: 'var(--netlab-text-secondary)', fontSize: 11, lineHeight: 1.5 }}
              >
                {t(
                  'A packet has a size limit on each link, the MTU — usually 1500 bytes on Ethernet. The large send is bigger than that; see below what happens to it.',
                  'パケットの大きさには、リンクごとに上限（MTU）があります。イーサネットではふつう 1500 バイトです。「大きく送る」はそれより大きいデータです。どうなるかは送ったあと下に表示されます。',
                )}
              </div>
            </div>
          </div>

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
      </ResizableSidebar>
    </div>
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
      style={{ ...CARD_STYLE, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}
    >
      <div style={LABEL_STYLE}>{t('WHAT WAS SENT', '送ったもの')}</div>
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
