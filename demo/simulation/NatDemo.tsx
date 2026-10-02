import { useT } from '../localeContext';
import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { NatTableViewer } from '../../src/components/simulation/NatTableViewer';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
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

function ActionButton({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      {...(testId !== undefined ? { 'data-testid': testId } : {})}
      onClick={onClick}
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        color: 'var(--netlab-text-primary)',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '8px 10px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
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
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--netlab-text-primary)',
            }}
          >
            <strong>{t('How NAT works', 'NAT のしくみ')}</strong>
            <div>
              {t(
                'Machines inside a home or office use private addresses such as 192.168.1.10, which the internet cannot deliver to. On the way out, the edge router rewrites the sender to its own global address, 203.0.113.1, and on the way back it puts the private address back.',
                '家や会社の中の機器は、192.168.1.10 のようなプライベートアドレスを使っています。これはインターネットでは届けられません。出口のルータは、外へ出るパケットの送り主を自分のグローバルアドレス（203.0.113.1）に書き換え、返事が戻ってきたら元のプライベートアドレスに戻します。',
              )}
            </div>
            <div style={{ marginTop: 6, color: 'var(--netlab-text-secondary)' }}>
              {t(
                'Send from Client A, then from Client B with the buttons below (each sends at once): the table shows both sharing the one global address, told apart by port number — a port number is like a room number at the same street address.',
                '下のボタンで Client A と Client B の両方から送ってみましょう（押すとすぐ送られます）。変換表で、2 台が同じグローバルアドレスを共有し、ポート番号で区別されているのが分かります。ポート番号は、同じ住所の中の部屋番号のようなものです。',
              )}
            </div>
            <div
              data-testid="nat-port-allocation-note"
              style={{ marginTop: 6, color: 'var(--netlab-text-secondary)' }}
            >
              {t(
                "This NAT allocates public ports in order starting at 1024; many real NATs, such as Linux MASQUERADE or Cisco PAT, keep the client's own port when it is free. It starts at 1024 because ports 0 to 1023 are the well-known range reserved for standard services; where real NATs start differs: Linux picks from 1024 to 65535 by default when it cannot keep the client's port, and many devices use a higher configured range.",
                'この NAT は外側のポート番号を 1024 から順に割り当てます。実際の NAT の多く（Linux の MASQUERADE や Cisco の PAT など）は、空いていればクライアントのポート番号をそのまま使います。1024 から始めるのは、0〜1023 が標準的なサービス用に予約されたウェルノウンポートだからです。実際の NAT がどこから割り当て始めるかは実装によって異なり、Linux はクライアントのポート番号をそのまま使えないとき既定で 1024〜65535 から選び、多くの機器はもっと大きい番号の範囲を設定して使います。',
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ActionButton
              testId="nat-send-client-a"
              label={t('Client A -> Internet (SNAT)', 'Client A -> インターネット (SNAT)')}
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
              label={t('Client B -> Internet (SNAT)', 'Client B -> インターネット (SNAT)')}
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
              label={t(
                'Internet -> Client A (DNAT 8080)',
                'インターネット -> Client A (DNAT 8080)',
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

          <div style={{ flex: 1, minHeight: 170 }}>
            <NatTableViewer />
          </div>

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
      desc="Inspect SNAT, DNAT port forwarding, and the live NAT table on an edge router"
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
        <SimulationProvider>
          <NatDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
