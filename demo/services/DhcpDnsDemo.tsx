import { useState, type CSSProperties } from 'react';
import type { DhcpLeaseState } from '../../src/types/services';
import { useT } from '../localeContext';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { StepControls } from '../../src/components/simulation/StepControls';
import { useViewport } from '../../src/utils/useViewport';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'dhcp-client',
      type: 'client',
      position: { x: 120, y: 160 },
      data: {
        label: 'DHCP Client',
        role: 'client',
        layerId: 'l7',
        dhcpClient: { enabled: true },
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 360, y: 220 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:10:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:10:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:10:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '00:00:00:10:00:03' },
        ],
      },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 600, y: 80 },
      data: {
        label: 'DHCP Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.1',
        dhcpServer: {
          leasePool: '192.168.1.100/30',
          subnetMask: '255.255.255.0',
          defaultGateway: '192.168.1.1',
          dnsServer: '192.168.1.53',
          leaseTime: 86400,
        },
      },
    },
    {
      id: 'dns-server',
      type: 'server',
      position: { x: 600, y: 220 },
      data: {
        label: 'DNS Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.53',
        dnsServer: {
          zones: [{ name: 'web.example.com', address: '192.168.1.10' }],
        },
      },
    },
    {
      id: 'web-server',
      type: 'server',
      position: { x: 600, y: 360 },
      data: {
        label: 'Web Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'dhcp-client', target: 'switch-1', targetHandle: 'p0' },
    { id: 'e2', source: 'switch-1', target: 'dhcp-server', sourceHandle: 'p1' },
    { id: 'e3', source: 'switch-1', target: 'dns-server', sourceHandle: 'p2' },
    { id: 'e4', source: 'switch-1', target: 'web-server', sourceHandle: 'p3' },
  ],
  areas: [],
  routeTables: new Map(),
};

export const DHCP_DNS_DEMO_TOPOLOGY = TOPOLOGY;

function buildHttpPacket(runtimeIp: string | null): InFlightPacket {
  return {
    id: `http-web-fetch-${Date.now()}`,
    srcNodeId: 'dhcp-client',
    dstNodeId: 'web-server',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: runtimeIp ?? '0.0.0.0',
        dstIp: '192.168.1.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 49152,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: {
            syn: false,
            ack: false,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: {
            layer: 'L7',
            httpVersion: 'HTTP/1.1',
            method: 'GET',
            url: 'http://web.example.com/api',
            headers: { host: 'web.example.com' },
          },
        },
      },
    },
    currentDeviceId: 'dhcp-client',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

const CARD_STYLE: CSSProperties = {
  background: 'color-mix(in srgb, var(--netlab-bg-primary) 92%, transparent)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
  lineHeight: 1.7,
  color: 'var(--netlab-text-primary)',
};

const ROLE_STYLE: CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 6 };

/** The step to press now is filled; the other one is an outline. */
function stepButtonStyle(emphasised: boolean, disabled: boolean): CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 6,
    border: emphasised ? '1px solid transparent' : '1px solid var(--netlab-border)',
    background: emphasised ? 'var(--netlab-accent-blue)' : 'var(--netlab-bg-surface)',
    color: emphasised ? '#fff' : 'var(--netlab-text-primary)',
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    marginBottom: 6,
  };
}

function DhcpDnsDemoInner() {
  const t = useT();
  const { isNarrow } = useViewport();
  const { engine, simulateDhcp, sendPacket } = useSimulation();
  // What each button did, said in words beside the buttons. The answer used to
  // be only in a device's details, which a learner had to know to open.
  const [lease, setLease] = useState<DhcpLeaseState | null>(null);
  const [resolved, setResolved] = useState<{ name: string; address: string } | null>(null);
  const hasAddress = Boolean(lease?.assignedIp);

  // Each run records its exchange as several traces and leaves the last one
  // selected. Start the step-through at the first message instead, so stepping
  // walks the whole exchange in order (the step control carries on from one
  // message to the next).
  const selectFirstTrace = () => {
    const first = engine.getState().traces[0];
    if (first) engine.selectTrace(first.packetId);
  };

  const handleRunDhcp = async () => {
    engine.clear();
    setResolved(null);
    await simulateDhcp('dhcp-client');
    setLease(engine.getDhcpLeaseState('dhcp-client'));
    selectFirstTrace();
  };

  const handleResolveAndFetch = async () => {
    engine.clearTraces();
    await sendPacket(buildHttpPacket(engine.getRuntimeNodeIp('dhcp-client')));
    const entry = engine.getDnsCache('dhcp-client')?.['web.example.com'];
    setResolved(entry ? { name: 'web.example.com', address: entry.address } : null);
    selectFirstTrace();
  };

  const leaseExtras = [
    lease?.defaultGateway
      ? t(
          `default gateway (the way out) ${lease.defaultGateway}`,
          `デフォルトゲートウェイ（外への出口）${lease.defaultGateway}`,
        )
      : null,
    lease?.dnsServerIp
      ? t(`DNS server ${lease.dnsServerIp}`, `DNS サーバ ${lease.dnsServerIp}`)
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />}>
        {/* Two services, two cards, in the order they are used. Sharing one
            heading and one box, learners filed "hands out addresses" under
            both names. */}
        <LessonNote
          data-canvas-overlay=""
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: 'calc(50% - 18px)',
            maxWidth: 440,
            zIndex: 20,
          }}
        >
          <div data-testid="lesson-brief" style={{ display: 'grid', gap: 8 }}>
            <div
              data-testid="lesson-lead"
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.6,
                color: 'var(--netlab-text-primary)',
              }}
            >
              {t(
                "First get an address (DHCP). Then find the other side's address from its name (DNS).",
                'まず住所をもらう（DHCP）。次に、名前から相手の住所を調べる（DNS）。',
              )}
            </div>
            <div data-testid="dhcp-card" style={CARD_STYLE}>
              <div style={ROLE_STYLE}>
                {t('① DHCP = the desk that hands out addresses', '① DHCP＝住所をくれる係')}
              </div>
              <button
                type="button"
                data-testid="dhcp-run"
                data-emphasised={hasAddress ? 'no' : 'yes'}
                onClick={() => void handleRunDhcp()}
                style={stepButtonStyle(!hasAddress, false)}
              >
                {t('▶ ① Get an address', '▶ ① 住所をもらう')}
              </button>
              <div>
                {t(
                  'A machine that has just been plugged in has no address (IP address) yet. It asks the network, and the DHCP server lends it one.',
                  'つないだばかりの機器には、まだ住所（IP アドレス）がありません。ネットワークに尋ねると、DHCP サーバが住所を貸してくれます。',
                )}
              </div>
              <div
                data-testid="dhcp-message-gloss"
                style={{ color: 'var(--netlab-text-secondary)' }}
              >
                {t(
                  'DISCOVER = "is there a DHCP server?" → OFFER = "you can have this address" → REQUEST = "I will take it" → ACK = "it is yours to use".',
                  'DISCOVER＝「DHCP サーバはいますか？」 → OFFER＝「このアドレスをどうぞ」 → REQUEST＝「それをください」 → ACK＝「どうぞ使ってください」。',
                )}
              </div>
              <div data-testid="dhcp-extras">
                {t(
                  'It also tells the machine its subnet mask (how far its own network reaches), its default gateway (the way out) and the DNS server to use.',
                  'サブネットマスク（どこまでが同じネットワークか）、デフォルトゲートウェイ（外への出口）、使う DNS サーバも一緒に教えてくれます。',
                )}
              </div>
              {hasAddress && lease ? (
                <div
                  data-testid="dhcp-result"
                  style={{ marginTop: 6, fontWeight: 700, color: 'var(--netlab-accent-green)' }}
                >
                  {t(
                    `The client was given the address ${lease.assignedIp}${leaseExtras.length > 0 ? ` (${leaseExtras.join('; ')})` : ''}.`,
                    `Client は住所 ${lease.assignedIp} をもらいました${leaseExtras.length > 0 ? `（${leaseExtras.join('、')}）` : ''}。`,
                  )}
                </div>
              ) : (
                // The canvas marks the client's link with ⚠ because the client
                // has no address yet ("Missing IP configuration"); the mark
                // goes once DHCP has run. Unexplained, it read as a fault.
                <div
                  data-testid="dhcp-warning-caption"
                  style={{ marginTop: 6, color: 'var(--netlab-accent-yellow)' }}
                >
                  {t(
                    'The ⚠ on the diagram means "DHCP Client has no address yet". Nothing is broken. It goes away when you press ①.',
                    '図の ⚠ は「DHCP Client にまだ住所がない」という印です。故障ではありません。① を押すと消えます。',
                  )}
                </div>
              )}
            </div>
          </div>
        </LessonNote>

        <LessonNote
          data-canvas-overlay=""
          // Beside the first card on a wide screen; on a narrow one, under the
          // diagram, so the diagram is on screen while step ① runs.
          style={
            isNarrow
              ? { bottom: 0 }
              : {
                  position: 'absolute',
                  top: 12,
                  left: 'calc(50% + 6px)',
                  width: 'calc(50% - 18px)',
                  maxWidth: 440,
                  zIndex: 20,
                }
          }
        >
          <div data-testid="dns-card" style={CARD_STYLE}>
            <div style={ROLE_STYLE}>
              {t(
                '② DNS = the phone book that turns a name into an address',
                '② DNS＝名前から住所を調べる電話帳',
              )}
            </div>
            <button
              type="button"
              data-testid="dns-run"
              data-emphasised={hasAddress ? 'yes' : 'no'}
              disabled={!hasAddress}
              onClick={() => void handleResolveAndFetch()}
              style={stepButtonStyle(hasAddress, !hasAddress)}
            >
              {t(
                '▶ ② Look up the name, then fetch the page',
                '▶ ② 名前で調べて、ページを取りに行く',
              )}
            </button>
            {!hasAddress ? (
              <div data-testid="dns-wait-hint" style={{ color: 'var(--netlab-text-secondary)' }}>
                {t(
                  'Press ① first: without an address the client cannot send.',
                  '先に ① を押してください。住所がないと送れません。',
                )}
              </div>
            ) : null}
            <div>
              {t(
                'People use names like web.example.com. A packet needs an address (IP address). DNS answers the question "what is the address of this name?". If DNS stops, a page still opens by its address but not by its name.',
                '人は web.example.com のような名前を使います。でも、パケットを送るには住所（IP アドレス）が要ります。DNS は「この名前の住所は？」に答えます。DNS が止まると、住所を直接入れれば開けますが、名前では開けません。',
              )}
            </div>
            {resolved ? (
              <div
                data-testid="dns-result"
                style={{ marginTop: 6, fontWeight: 700, color: 'var(--netlab-accent-green)' }}
              >
                {t(
                  `DNS answered: the address of ${resolved.name} is ${resolved.address}. The page was then fetched from that address.`,
                  `DNS が「${resolved.name} の住所は ${resolved.address}」と答えました。その住所からページを取得しました。`,
                )}
              </div>
            ) : null}
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--netlab-text-muted)' }}>
              {t(
                'Pressing a device on the diagram shows what it has been given so far.',
                '図の機器を押すと、その時点でもらっている設定が見られます。',
              )}
            </div>
          </div>
        </LessonNote>
      </LessonCanvas>

      <LessonPanel
        defaultWidth={360}
        maxWidth={700}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
        }}
      >
        <StepControls continueAcrossTraces />
      </LessonPanel>
    </LessonSplit>
  );
}

export default function DhcpDnsDemo() {
  return (
    <DemoShell
      title="DHCP & DNS"
      desc="Get an address with DHCP, then turn a name into an address with DNS, one message at a time."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <DhcpDnsDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
