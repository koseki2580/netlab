import { useRef, useState, type CSSProperties } from 'react';
import type { DhcpLeaseState } from '../../src/types/services';
import { useT } from '../localeContext';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
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
import { StepControls } from '../../src/components/simulation/StepControls';
import { useViewport } from '../../src/utils/useViewport';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { HttpMessage, InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import {
  buildAckPacket,
  buildSynAckPacket,
  buildSynPacket,
  generateISN,
} from '../../src/layers/l4-transport/tcpPacketBuilder';
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

const WEB_NAME = 'web.example.com';
const WEB_ADDRESS = '192.168.1.10';

interface HttpStep {
  readonly from: 'dhcp-client' | 'web-server';
  readonly clientIp: string;
  readonly clientPort: number;
  /** The numbers the handshake before it agreed on, so they read as its continuation. */
  readonly seq: number;
  readonly ack: number;
  readonly message: HttpMessage;
}

/** One HTTP message on the connection the handshake opened: the GET, or the answer to it. */
function buildHttpPacket(step: HttpStep): InFlightPacket {
  const outward = step.from === 'dhcp-client';
  return {
    id: `http-web-${outward ? 'fetch' : 'answer'}-${Date.now()}`,
    srcNodeId: step.from,
    dstNodeId: outward ? 'web-server' : 'dhcp-client',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: outward ? step.clientIp : WEB_ADDRESS,
        dstIp: outward ? WEB_ADDRESS : step.clientIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: outward ? step.clientPort : 80,
          dstPort: outward ? 80 : step.clientPort,
          seq: step.seq,
          ack: step.ack,
          flags: {
            syn: false,
            // Every segment after the handshake carries ACK.
            ack: true,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: step.message,
        },
      },
    },
    currentDeviceId: step.from,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

/**
 * What one press of ② ran, as the lesson tells it: look the name up, open a
 * connection, fetch the page. Worked out from the labels of the recorded
 * messages, so the summary can only say what the step control will show.
 */
export interface FetchStory {
  readonly lookedUp: boolean;
  readonly handshake: readonly string[];
  readonly asked: boolean;
  readonly answered: boolean;
}

export function fetchStory(labels: readonly (string | undefined)[]): FetchStory {
  const has = (label: string) => labels.includes(label);
  return {
    lookedUp: has('DNS QUERY') && has('DNS RESPONSE'),
    handshake: labels.filter(
      (label): label is string =>
        label === 'TCP SYN' || label === 'TCP SYN-ACK' || label === 'TCP ACK',
    ),
    asked: has('HTTP GET'),
    answered: has('HTTP 200'),
  };
}

/**
 * The address DHCP lent, drawn under the client where every other host shows
 * its own. The library draws a host's configured address, and this client has
 * none, so after ① the text said "it received 192.168.1.101" beside a box that
 * still showed nothing.
 */
export function leasedAddressCss(address: string): string {
  return (
    '[data-id="dhcp-client"] [data-testid="topology-node"]::after{' +
    `content:"${address.replace(/[^0-9.]/g, '')}";` +
    'position:absolute;top:100%;left:0;right:0;margin-top:3px;font-size:10px;' +
    'white-space:nowrap;color:var(--netlab-accent-green);}'
  );
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
  const { engine, state, simulateDhcp, simulateDns, sendPacket } = useSimulation();
  const story = fetchStory(state.traces.map((trace) => trace.label));
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

  // A client takes a fresh port for each connection it opens.
  const nextPort = useRef(49152);

  // The story in the order a real client lives it: look the name up, open a
  // connection (TCP's three messages), and only then ask for the page. The GET
  // used to follow the DNS answer directly, on the lesson after the one that
  // teaches that TCP data waits for the handshake.
  const handleResolveAndFetch = async () => {
    engine.clearTraces();
    const clientIp = engine.getRuntimeNodeIp('dhcp-client');
    if (!clientIp) return;
    const address = await simulateDns('dhcp-client', WEB_NAME);
    const entry = engine.getDnsCache('dhcp-client')?.[WEB_NAME];
    setResolved(entry ? { name: WEB_NAME, address: entry.address } : null);
    if (address) {
      const clientPort = nextPort.current;
      nextPort.current += 1;
      // The engine's own connect reads a device's configured address, and this
      // client's address came from DHCP, so the three messages are built and
      // sent here: the same packets, through the same network.
      const clientIsn = generateISN('dhcp-client', clientPort);
      const serverIsn = generateISN('web-server', 80);
      const outward = {
        srcNodeId: 'dhcp-client',
        dstNodeId: 'web-server',
        srcIp: clientIp,
        dstIp: address,
        srcPort: clientPort,
        dstPort: 80,
      };
      const back = {
        srcNodeId: 'web-server',
        dstNodeId: 'dhcp-client',
        srcIp: address,
        dstIp: clientIp,
        srcPort: 80,
        dstPort: clientPort,
      };
      await sendPacket(buildSynPacket({ ...outward, seq: clientIsn, ack: 0 }));
      await sendPacket(buildSynAckPacket({ ...back, seq: serverIsn, ack: clientIsn + 1 }));
      await sendPacket(buildAckPacket({ ...outward, seq: clientIsn + 1, ack: serverIsn + 1 }));
      await sendPacket(
        buildHttpPacket({
          from: 'dhcp-client',
          clientIp,
          clientPort,
          seq: clientIsn + 1,
          ack: serverIsn + 1,
          message: {
            layer: 'L7',
            httpVersion: 'HTTP/1.1',
            method: 'GET',
            url: `http://${WEB_NAME}/api`,
            headers: { host: WEB_NAME },
          },
        }),
      );
      await sendPacket(
        buildHttpPacket({
          from: 'web-server',
          clientIp,
          clientPort,
          seq: serverIsn + 1,
          ack: clientIsn + 1,
          message: {
            layer: 'L7',
            httpVersion: 'HTTP/1.1',
            statusCode: 200,
            reasonPhrase: 'OK',
            headers: { 'content-type': 'text/html' },
            body: '<h1>web.example.com</h1>',
          },
        }),
      );
    }
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
    <LessonSplit pinned>
      <LessonCanvas
        canvas={
          <>
            {lease?.assignedIp ? <style>{leasedAddressCss(lease.assignedIp)}</style> : null}
            <NetlabCanvas />
          </>
        }
      >
        <LessonStepBar continueAcrossTraces />
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
            {/* Three rows of devices leave the addresses on a phone-sized
                diagram about 6px high, so they are written out here. */}
            {isNarrow ? (
              <div
                data-testid="dhcp-dns-addresses"
                style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
              >
                {TOPOLOGY.nodes
                  .filter((node) => node.data.ip)
                  .map((node) => (
                    <div key={node.id}>
                      {node.data.label}: {node.data.ip}
                    </div>
                  ))}
                {lease?.assignedIp ? (
                  <div style={{ color: 'var(--netlab-accent-green)' }}>
                    DHCP Client: {lease.assignedIp}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div data-testid="dhcp-card" style={CARD_STYLE}>
              <div style={ROLE_STYLE}>
                {t('① DHCP = the desk that hands out addresses', '① DHCP＝住所をくれる係')}
              </div>
              <LessonPinned half>
                <button
                  type="button"
                  data-testid="dhcp-run"
                  data-emphasised={hasAddress ? 'no' : 'yes'}
                  onClick={() => void handleRunDhcp()}
                  style={stepButtonStyle(!hasAddress, false)}
                >
                  {t('▶ ① Get an address', '▶ ① 住所をもらう')}
                </button>
              </LessonPinned>
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
              {/* The TCP lesson has just taught "ACK" as its third message. */}
              <div data-testid="dhcp-ack-note" style={{ color: 'var(--netlab-text-secondary)' }}>
                {t(
                  'This ACK is DHCP\'s own message, not the ACK of TCP. Both are a reply that means "understood".',
                  'DHCP の ACK は、TCP の ACK とは別のものです。どちらも「了解」という意味の返事です。',
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
                  <div data-testid="dhcp-result-where" style={{ fontWeight: 400 }}>
                    {t(
                      'The diagram now shows it under DHCP Client, in green.',
                      '図の DHCP Client の下にも、緑の字で出ました。',
                    )}
                  </div>
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
            <LessonPinned half order={1}>
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
            </LessonPinned>
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
                {story.lookedUp
                  ? t(
                      `DNS answered: the address of ${resolved.name} is ${resolved.address}.`,
                      `DNS が「${resolved.name} の住所は ${resolved.address}」と答えました。`,
                    )
                  : t(
                      `The client still remembers that ${resolved.name} is ${resolved.address}, so this time it did not ask DNS.`,
                      `${resolved.name} の住所 ${resolved.address} は、さっき調べて覚えています。だから今回は DNS に聞きませんでした。`,
                    )}
              </div>
            ) : null}
            {/* What the press ran, in the order it ran: the name, the
                connection, the page. The handshake is the TCP lesson's, so it
                is one line here that opens. */}
            {resolved && story.asked ? (
              <ol
                data-testid="fetch-story"
                style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 4 }}
              >
                <li data-testid="fetch-story-lookup">
                  {story.lookedUp
                    ? t(
                        'Look up the name (DNS): the question (DNS QUERY) and its answer (DNS RESPONSE).',
                        '名前を調べる（DNS）：質問（DNS QUERY）と、その答え（DNS RESPONSE）。',
                      )
                    : t(
                        'Look up the name (DNS): not needed this time. The answer is remembered.',
                        '名前を調べる（DNS）：今回は不要です。答えを覚えています。',
                      )}
                </li>
                <li>
                  <details data-testid="fetch-handshake">
                    <summary data-testid="fetch-handshake-summary" style={{ cursor: 'pointer' }}>
                      {t(
                        `Open a TCP connection (${story.handshake.length} messages)`,
                        `TCP の接続（${story.handshake.length} 回のやり取り）`,
                      )}
                    </summary>
                    <div
                      data-testid="fetch-handshake-detail"
                      style={{ color: 'var(--netlab-text-secondary)' }}
                    >
                      {t(
                        'SYN = "Hello?" (Client → Web Server) → SYN-ACK = "Yes, I hear you" (Web Server → Client) → ACK = "Right, let us talk" (Client → Web Server). The same three messages as in the TCP lesson. Only after them does the client ask for the page.',
                        'SYN＝「もしもし」（Client → Web Server） → SYN-ACK＝「はい、聞こえます」（Web Server → Client） → ACK＝「では話します」（Client → Web Server）。TCP のレッスンと同じ 3 回です。ページを頼むのは、このあとです。',
                      )}
                    </div>
                  </details>
                </li>
                <li data-testid="fetch-story-page">
                  {story.answered
                    ? t(
                        'Fetch the page (HTTP): GET = "please send me this page" → 200 = "here it is", with the page inside.',
                        'ページを取りに行く（HTTP）：GET＝「このページをください」 → 200＝「どうぞ」。この返事にページが入っています。',
                      )
                    : t(
                        'Ask for the page (HTTP): GET = "please send me this page".',
                        'ページを頼む（HTTP）：GET＝「このページをください」。',
                      )}
                </li>
              </ol>
            ) : null}
            {resolved && story.asked ? (
              <div data-testid="fetch-story-steps" style={{ marginTop: 4 }}>
                {t(
                  `"Next step" walks these ${state.traces.length} messages one at a time.`,
                  `「次のステップ」で、この ${state.traces.length} 通を 1 通ずつ見られます。`,
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

/** The devices closer together on a phone, so the fit draws them (and their addresses) larger. */
const PHONE_POSITIONS: PhonePositions = {
  'dhcp-client': { x: 0, y: 104 },
  'switch-1': { x: 120, y: 104 },
  'dhcp-server': { x: 245, y: 0 },
  'dns-server': { x: 245, y: 104 },
  'web-server': { x: 245, y: 208 },
};

export default function DhcpDnsDemo() {
  const phone = usePhoneTopology(TOPOLOGY, PHONE_POSITIONS);
  return (
    <DemoShell
      title="DHCP & DNS"
      desc="Get an address with DHCP, then turn a name into an address with DNS, one message at a time."
    >
      <NetlabProvider key={phone.layout} topology={phone.topology}>
        <SimulationProvider>
          <DhcpDnsDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
