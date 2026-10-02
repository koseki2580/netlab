import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { buildFragmentedEchoTopology } from '../../src/scenarios/fragmented-echo';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import { useViewport } from '../../src/utils/useViewport';
import DemoShell from '../DemoShell';
import { readDemoEmbedParams } from '../embedParams';
import { useT } from '../localeContext';

const PING_PAYLOAD_BYTES = 1200;
const ICMP_HEADER_BYTES = 8;
const IP_HEADER_BYTES = 20;

/**
 * The sum behind the fragment count: what has to be carried, how much one
 * fragment holds at this MTU, and how many that makes. `mtu` and `fragments`
 * come from the trace; when the sum does not reproduce the trace's count —
 * or nothing was fragmented — there is nothing honest to show, so it is null.
 */
export function fragmentWorking(
  dataBytes: number,
  mtu: number | undefined,
  fragments: number,
  t: (en: string, ja: string) => string,
): string | null {
  if (mtu === undefined || fragments === 0) return null;
  const total = dataBytes + ICMP_HEADER_BYTES;
  // Fragment offsets count in 8-byte units, so every fragment but the last
  // carries a multiple of 8 bytes.
  const perFragment = Math.floor((mtu - IP_HEADER_BYTES) / 8) * 8;
  if (perFragment <= 0) return null;
  const full = Math.floor(total / perFragment);
  const rest = total - full * perFragment;
  if (full + (rest > 0 ? 1 : 0) !== fragments) return null;
  const sum = `${total} = ${full} × ${perFragment}${rest > 0 ? ` + ${rest}` : ''}`;
  return t(
    `${total} bytes to carry (${dataBytes} data + ${ICMP_HEADER_BYTES} ICMP header); each fragment carries ${perFragment} (MTU ${mtu} − ${IP_HEADER_BYTES} IP header, rounded down to a multiple of 8); ${sum}, so ${fragments} fragments`,
    `運ぶのは ${total} バイト (データ ${dataBytes} + ICMP ヘッダ ${ICMP_HEADER_BYTES})。断片 1 つが運べるのは ${perFragment} バイト (MTU ${mtu} − IP ヘッダ ${IP_HEADER_BYTES} を 8 の倍数に切り捨て)。${sum} なので、断片は ${fragments} 個`,
  );
}

// The slider runs from 300 in 8-byte steps, so it can hold 604 but not the
// scenario's 600: opening at 600 put the thumb on 604 while the label said 600.
const TUNNEL_MTU_MIN = 300;
const TUNNEL_MTU_STEP = 8;
const LESSON_DEFAULT_TUNNEL_MTU = 604;

// On a narrow screen the canvas sits above the panel at this height: tall
// enough to show the four devices, short enough to leave the ping button on
// the first screen.
const NARROW_CANVAS_HEIGHT = 280;

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

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  display: 'flex',
  flexDirection: 'column',
};

/**
 * The lesson's side panel. Beside the canvas it can be dragged wider; stacked
 * under the canvas on a narrow viewport it simply takes the full width.
 */
function LessonPanel({ stacked, children }: { stacked: boolean; children: React.ReactNode }) {
  if (stacked) return <div style={{ ...PANEL_STYLE, width: '100%' }}>{children}</div>;
  return (
    <ResizableSidebar defaultWidth={460} maxWidth={760} style={PANEL_STYLE}>
      {children}
    </ResizableSidebar>
  );
}

function buildPingPacket(topology: NetworkTopology, df: boolean): InFlightPacket | null {
  const srcNode = topology.nodes.find((node) => node.id === 'host-a');
  const dstNode = topology.nodes.find((node) => node.id === 'host-b');
  const srcIp = srcNode?.data.ip;
  const dstIp = dstNode?.data.ip;
  const srcMac = srcNode?.data.mac;

  if (
    !srcNode ||
    !dstNode ||
    typeof srcIp !== 'string' ||
    typeof dstIp !== 'string' ||
    typeof srcMac !== 'string'
  ) {
    return null;
  }

  return {
    id: `mtu-frag-${Date.now()}`,
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
    currentDeviceId: srcNode.id,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac,
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 1,
        flags: { df, mf: false },
        payload: {
          layer: 'L4',
          type: 8,
          code: 0,
          checksum: 0,
          identifier: 1,
          sequenceNumber: 1,
          data: 'x'.repeat(PING_PAYLOAD_BYTES),
        },
      },
    },
  };
}

export default function MtuFragmentationDemo() {
  const [tunnelMtu, setTunnelMtu] = useState(LESSON_DEFAULT_TUNNEL_MTU);
  const topology = useMemo(() => buildFragmentedEchoTopology(tunnelMtu), [tunnelMtu]);
  const params = new URLSearchParams(window.location.search);
  const sandboxIntroId = params.get('intro') ?? null;
  const tutorialId = sandboxIntroId ? null : (params.get('tutorial') ?? null);
  const sandboxEnabled = params.get('sandbox') === '1';
  const { embedded, embedMode, parentOrigin } = readDemoEmbedParams();
  const tutorialProps = tutorialId ? { tutorialId } : {};

  return (
    <DemoShell
      title="MTU & IPv4 Fragmentation"
      desc="Watch a low-MTU routed hop fragment oversized IPv4 packets or return ICMP Fragmentation Needed."
      embedded={embedded}
    >
      <NetlabProvider
        topology={topology}
        sandboxEnabled={sandboxEnabled}
        {...(sandboxEnabled ? { sandboxControlMode: 'sandbox-owns' as const } : {})}
        {...(embedMode !== undefined ? { embedMode } : {})}
        {...(parentOrigin !== undefined ? { parentOrigin } : {})}
        {...(sandboxEnabled && sandboxIntroId ? { sandboxIntroId } : {})}
        {...tutorialProps}
      >
        <SimulationProvider>
          <FragmentationDemoInner tunnelMtu={tunnelMtu} onTunnelMtuChange={setTunnelMtu} />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

function FragmentationDemoInner({
  tunnelMtu,
  onTunnelMtuChange,
}: {
  tunnelMtu: number;
  onTunnelMtuChange: (value: number) => void;
}) {
  const t = useT();
  const { isNarrow } = useViewport();
  const { topology } = useNetlabContext();
  const { engine, sendPacket, state, isRecomputing } = useSimulation();
  const activeTrace = state.currentTraceId
    ? (state.traces.find((trace) => trace.packetId === state.currentTraceId) ?? null)
    : null;
  const fragmentHops = activeTrace?.hops.filter((hop) => hop.action === 'fragment') ?? [];
  const reassemblyHop =
    activeTrace?.hops.find((hop) => hop.action === 'reassembly-complete') ?? null;
  const fragNeededHop =
    activeTrace?.hops.find((hop) => hop.reason === 'fragmentation-needed') ?? null;
  const [dfEnabled, setDfEnabled] = useState(false);
  // The MTU is the one R1 fragmented to, read off the trace rather than the
  // slider: the slider can move after the ping was sent.
  const working = fragmentWorking(
    PING_PAYLOAD_BYTES,
    fragmentHops[0]?.nextHopMtu,
    fragmentHops.length,
    t,
  );

  const sendPing = async () => {
    const packet = buildPingPacket(topology, dfEnabled);
    if (!packet) return;
    engine.reset();
    await sendPacket(packet);
  };

  return (
    // Side by side on a wide screen. On a narrow one the panel alone is wider
    // than the screen, so the lesson becomes one scrolling column: what the
    // lesson is about, the canvas, then the panel.
    <div
      style={{
        display: 'flex',
        height: '100%',
        ...(isNarrow ? { flexDirection: 'column', overflowY: 'auto' } : {}),
      }}
    >
      <div
        style={
          isNarrow
            ? { display: 'flex', flexDirection: 'column-reverse', flexShrink: 0 }
            : { flex: 1, position: 'relative', minWidth: 0 }
        }
      >
        {isNarrow ? (
          <div style={{ height: NARROW_CANVAS_HEIGHT, position: 'relative' }}>
            <NetlabCanvas />
          </div>
        ) : (
          <NetlabCanvas />
        )}
        <div
          style={{
            ...(isNarrow
              ? { borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }
              : {
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  maxWidth: 360,
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }),
            padding: '10px 12px',
            background: 'color-mix(in srgb, var(--netlab-bg-primary) 90%, transparent)',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ color: 'var(--netlab-text-primary)', fontWeight: 700, marginBottom: 4 }}>
            {t('MTU & Fragmentation', 'MTU と分割')}
          </div>
          <div>
            {t(
              'Host A sends toward Host B across a low-MTU tunnel. R1 fragments on egress when DF is clear, or drops and emits ICMP Fragmentation Needed when DF is set.',
              'Host A は MTU の小さいトンネルを通って Host B へ送ります。DF が立っていなければ R1 は出口で分割し、DF が立っていれば破棄して ICMP Fragmentation Needed を返します。',
            )}
          </div>
          <div style={{ marginTop: 6, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `With the default ${LESSON_DEFAULT_TUNNEL_MTU}-byte tunnel MTU and a ${PING_PAYLOAD_BYTES}-byte ICMP data field, Netlab shows three IPv4 fragments because the ICMP header is part of the fragmented payload.`,
              `トンネル MTU が既定の ${LESSON_DEFAULT_TUNNEL_MTU} バイトで ICMP のデータ部が ${PING_PAYLOAD_BYTES} バイトのとき、ICMP ヘッダも分割されるペイロードに含まれるため、Netlab では IPv4 の断片が 3 つになります。`,
            )}
          </div>
        </div>
      </div>

      <LessonPanel stacked={isNarrow}>
        <div
          style={{
            padding: 12,
            display: 'grid',
            gap: 12,
            borderBottom: '1px solid var(--netlab-bg-surface)',
          }}
        >
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>{t('Controls', '操作')}</div>
            <label
              style={{
                display: 'grid',
                gap: 6,
                color: 'var(--netlab-text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              <span data-testid="mtu-tunnel-value">
                {t(`Tunnel MTU: ${tunnelMtu} bytes`, `トンネル MTU: ${tunnelMtu} バイト`)}
              </span>
              <input
                data-testid="mtu-tunnel-slider"
                type="range"
                min={TUNNEL_MTU_MIN}
                max={1500}
                step={TUNNEL_MTU_STEP}
                value={tunnelMtu}
                onChange={(event) => onTunnelMtuChange(Number.parseInt(event.target.value, 10))}
              />
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--netlab-text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                marginTop: 10,
                marginBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={dfEnabled}
                onChange={(event) => setDfEnabled(event.target.checked)}
              />
              {t('Set DF bit on ICMP echo from A', 'A からの ICMP エコーに DF ビットを立てる')}
            </label>
            <button
              type="button"
              data-testid="demo-primary-action"
              style={BUTTON_STYLE}
              disabled={isRecomputing}
              onClick={() => void sendPing()}
            >
              {t('ping A → B (1200-byte payload)', 'A から B へ ping (ペイロード 1200 バイト)')}
            </button>
          </div>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>{t('Trace Notes', 'トレースのメモ')}</div>
            <div
              data-testid="mtu-trace-notes"
              style={{
                color: 'var(--netlab-text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                display: 'grid',
                gap: 6,
              }}
            >
              {/* One `fragment` hop per fragment R1 emits, so this is the count of fragments. */}
              <div>
                {t(`Fragments: ${fragmentHops.length}`, `断片の数: ${fragmentHops.length}`)}
              </div>
              <div>
                {t('Reassembly:', '再組み立て:')}{' '}
                {reassemblyHop
                  ? t(
                      `complete (${reassemblyHop.fragmentCount ?? fragmentHops.length} fragments)`,
                      `完了 (断片 ${reassemblyHop.fragmentCount ?? fragmentHops.length} 個)`,
                    )
                  : fragmentHops.length === 0
                    ? t('not needed', '不要')
                    : t('not completed', '未完了')}
              </div>
              <div>
                {t('Frag-Needed ICMP:', 'Frag-Needed の ICMP:')}{' '}
                {fragNeededHop
                  ? t(
                      `yes (next-hop MTU ${fragNeededHop.nextHopMtu ?? 'unknown'})`,
                      `あり (次ホップの MTU ${fragNeededHop.nextHopMtu ?? '不明'})`,
                    )
                  : t('no', 'なし')}
              </div>
              {working ? (
                <div
                  data-testid="mtu-fragment-working"
                  style={{ color: 'var(--netlab-text-secondary)', lineHeight: 1.6 }}
                >
                  {working}
                </div>
              ) : null}
            </div>
          </div>
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>
              {t('Why You See Multiple Packets', 'パケットが複数に見える理由')}
            </div>
            <div
              style={{
                color: 'var(--netlab-text-secondary)',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {t(
                "R1's egress link to R2 has a finite MTU. With DF disabled, the packet is split into RFC 791 fragments. Host B reassembles them before the echo reaches the destination stack. With DF enabled, R1 keeps the packet intact and returns ICMP type 3 code 4 instead.",
                'R1 から R2 への出口のリンクには MTU の上限があります。DF が無効なら、パケットは RFC 791 に従った断片に分割されます。Host B は、エコーが宛先のプロトコルスタックに届く前に断片を再組み立てします。DF が有効なら、R1 はパケットを分割せず、代わりに ICMP type 3 code 4 を返します。',
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: 'auto minmax(220px, 0.9fr) minmax(220px, 1.1fr)',
          }}
        >
          <div style={{ padding: 12, borderBottom: '1px solid var(--netlab-bg-surface)' }}>
            <TraceSummary />
          </div>
          <div style={{ minHeight: 0, borderBottom: '1px solid var(--netlab-bg-surface)' }}>
            <PacketTimeline />
          </div>
          <div style={{ minHeight: 0 }}>
            <HopInspector />
          </div>
        </div>
      </LessonPanel>
    </div>
  );
}
