import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  ACCESSES,
  CONCENTRATORS,
  ETHERNET_MTU,
  PPPOE_HEADER_BYTES,
  PPP_PROTOCOL_BYTES,
  RETRIES,
  accessSummary,
  discovery,
  linkMtu,
  mssFor,
  pppSession,
  transfer,
  type Access,
  type PacketKind,
  type PppMessage,
  type Transfer,
  type WirePacket,
} from './pppoe';

type Answer = 'loads' | 'slower' | 'stalls' | 'error';
const ANSWERS: readonly Answer[] = ['loads', 'slower', 'error', 'stalls'];

const SESSION_ID = 0x2a17;
const ASSIGNED = '203.0.113.45';
const ASKED = { clamp: false, icmpFiltered: true, responseBytes: 10_000 } as const;
const BULK_BYTES = 1_000_000;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };
const hex = (value: number, digits = 4) => `0x${value.toString(16).padStart(digits, '0')}`;

/** What the browser's user sees for a transfer. */
function answerOf(run: Transfer): Answer {
  const handshake = run.packets.filter((p) => p.kind === 'syn' || p.kind === 'syn-ack');
  if (handshake.some((p) => p.fate !== 'delivered')) return 'error';
  if (!run.completed) return 'stalls';
  return run.extraRoundTrips > 0 ? 'slower' : 'loads';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function PppoeLesson() {
  const t = useT();
  const [chosen, setChosen] = useState(0);
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [clamp, setClamp] = useState(false);
  const [icmpFiltered, setIcmpFiltered] = useState(true);
  const [responseBytes, setResponseBytes] = useState<number>(ASKED.responseBytes);

  const pppoeMtu = linkMtu('pppoe');
  const steps = discovery(CONCENTRATORS, chosen, SESSION_ID);
  const session = pppSession(SESSION_ID, ASSIGNED);
  const asked = transfer(ASKED);
  const truth = answerOf(asked);
  const askedData = asked.packets.filter((p) => p.kind === 'data');
  const askedDropped = askedData.filter((p) => p.fate === 'dropped');
  const askedResendsDropped = asked.packets.filter(
    (p) => p.kind === 'resend' && p.fate === 'dropped',
  );
  const clamped = transfer({ ...ASKED, clamp: true });
  const run = transfer({ clamp, icmpFiltered, responseBytes });
  const outcome = answerOf(run);
  const runResendsDropped = run.packets.filter(
    (p) => p.kind === 'resend' && p.fate === 'dropped',
  ).length;

  const answerName = (answer: Answer) =>
    ({
      loads: t('The page loads normally', 'ふつうに表示される'),
      slower: t('The page loads, only a little later', '表示されるが、少し遅れる'),
      stalls: t('The page starts to load, then hangs', '読み込みが始まるが、そこで止まる'),
      error: t('An error at once: the site cannot be reached', 'すぐに「接続できません」と出る'),
    })[answer];
  const kindName = (kind: PacketKind) =>
    ({
      syn: 'SYN',
      'syn-ack': 'SYN-ACK',
      ack: 'ACK',
      request: t('Request (GET)', 'リクエスト（GET）'),
      data: t('Data', 'データ'),
      resend: t('Resend', '再送'),
      icmp: t('ICMP “fragmentation needed”', 'ICMP「分割が必要」'),
    })[kind];
  const fromName = (from: WirePacket['from']) =>
    ({
      browser: t('Browser', 'ブラウザ'),
      server: t('Server', 'サーバ'),
      router: t('Provider router', '事業者側ルータ'),
    })[from];
  const fateName = (packet: WirePacket) => {
    if (packet.fate === 'filtered') return t('Filtered on the way', '途中で捨てられる');
    if (packet.fate === 'dropped')
      return t(`Too big for ${pppoeMtu}: dropped`, `${pppoeMtu} に収まらず破棄`);
    return t('Delivered', '届く');
  };
  const messageName = (message: PppMessage) =>
    ({
      'configure-request': 'Configure-Request',
      'configure-ack': 'Configure-Ack',
      'configure-nak': 'Configure-Nak',
      challenge: 'Challenge',
      response: 'Response',
      success: 'Success',
    })[message];
  const accessName = (access: Access) =>
    ({
      pppoe: 'PPPoE',
      ipoe: t('IPoE (native IPv4 over Ethernet)', 'IPoE（イーサネット上でそのまま IPv4）'),
      'ipv4-over-ipv6': t(
        'IPv4 carried over IPv6 (e.g. DS-Lite, MAP-E)',
        'IPv6 の上で運ぶ IPv4（DS-Lite、MAP-E など）',
      ),
    })[access];
  const outcomeName = (answer: Answer) =>
    ({
      loads: t('The page loads.', 'ページが表示されます。'),
      slower: t(
        'The page loads after one extra round trip.',
        '1 往復ぶん遅れてページが表示されます。',
      ),
      stalls: t('The page hangs.', 'ページが止まったままです。'),
      error: t('The connection fails.', '接続できません。'),
    })[answer];

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={{ ...LESSON_LABEL, textTransform: 'none' }}>
          {t('Getting online over PPPoE', 'PPPoE でインターネットへ')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Many home and office routers reach their provider with PPPoE (RFC 2516): PPP, the protocol of dial-up days, carried inside Ethernet frames. Before any IP packet can go out, the router has to find a provider’s access concentrator (often called a BRAS) and open a session with it.',
            '家庭やオフィスのルータの多くは、PPPoE（RFC 2516）でプロバイダにつながります。ダイヤルアップ時代の PPP を、イーサネットのフレームに入れて運ぶ方式です。IP パケットを送る前に、ルータはプロバイダのアクセスコンセントレータ（BRAS と呼ばれることが多い）を見つけて、セッションを開く必要があります。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="pppoe-discovery">
        <div style={LESSON_LABEL}>
          {t(
            'Part 1: discovery, then the PPP session',
            'Part 1：ディスカバリー、そして PPP セッション',
          )}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'Two access concentrators answer. Pick the one the router uses:',
            '2 台のアクセスコンセントレータが応答します。ルータが使う方を選んでください。',
          )}
        </p>
        <div
          role="tablist"
          aria-label={t('Access concentrator', 'アクセスコンセントレータ')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {CONCENTRATORS.map((ac, index) => (
            <button
              key={ac.name}
              type="button"
              role="tab"
              aria-selected={chosen === index}
              data-testid={`pppoe-ac-${index}`}
              onClick={() => setChosen(index)}
              style={{ ...lessonChoice(chosen === index), minHeight: 44 }}
            >
              {chosen === index ? '✓ ' : ''}
              {ac.name}
            </button>
          ))}
        </div>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Packet', 'パケット')}</th>
                <th style={cell}>{t('From → to', '送信元 → 宛先')}</th>
                <th style={cell}>EtherType</th>
                <th style={cell}>{t('Session ID', 'セッション ID')}</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, index) => (
                <tr
                  key={`${step.code}-${index}`}
                  data-testid={`pppoe-disc-${index}`}
                  data-code={step.code}
                  data-dst={step.dst}
                  data-session={step.sessionId}
                >
                  <td style={mono}>{`${step.code} (${hex(step.codeValue, 2)})`}</td>
                  <td style={mono}>
                    {`${step.src} → ${step.broadcast ? t('broadcast', 'ブロードキャスト') : step.dst}`}
                    {step.ac ? ` (${step.ac})` : ''}
                  </td>
                  <td style={mono}>{hex(step.ethertype)}</td>
                  <td style={mono}>{hex(step.sessionId)}</td>
                </tr>
              ))}
              {session.map((packet, index) => (
                <tr key={`ppp-${index}`} data-testid={`pppoe-ppp-${index}`}>
                  <td style={mono}>{`${packet.protocol} ${messageName(packet.message)}`}</td>
                  <td style={mono}>
                    {packet.from === 'router'
                      ? t('Router → AC', 'ルータ → AC')
                      : t('AC → router', 'AC → ルータ')}
                    {packet.mru ? ` MRU ${packet.mru}` : ''}
                    {packet.address ? ` IP ${packet.address}` : ''}
                  </td>
                  <td style={mono}>{hex(packet.ethertype)}</td>
                  <td style={mono}>{hex(packet.sessionId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            `The PADI is broadcast because the router does not yet know who serves it; every access concentrator willing to serve it answers with a unicast PADO, and the router sends its PADR to the one it picked. That one’s PADS carries the session ID (${hex(SESSION_ID)}) that every later frame repeats. Then PPP runs inside the session: LCP agrees how big a packet may be (MRU ${pppoeMtu}), CHAP checks the router’s user name and password, and IPCP hands out the address: the router asks for 0.0.0.0, is told “use ${ASSIGNED}” in a Configure-Nak, and asks again for that address.`,
            `PADI がブロードキャストなのは、ルータがまだ相手を知らないからです。受け付けるアクセスコンセントレータはすべてユニキャストの PADO で答え、ルータは選んだ 1 台に PADR を送ります。その 1 台が返す PADS にセッション ID（${hex(SESSION_ID)}）が入っていて、以後のフレームはすべてこの ID を付けます。そのあとセッションの中で PPP が動きます。LCP がパケットの大きさの上限（MRU ${pppoeMtu}）を決め、CHAP がルータのユーザー名とパスワードを確かめ、IPCP がアドレスを渡します。ルータは 0.0.0.0 を求め、Configure-Nak で「${ASSIGNED} を使って」と言われ、そのアドレスで求め直します。`,
          )}
        </p>
        <p
          data-testid="pppoe-overhead"
          data-overhead={PPPOE_HEADER_BYTES + PPP_PROTOCOL_BYTES}
          data-mtu={pppoeMtu}
          style={{ margin: '8px 0 0', lineHeight: 1.7, fontWeight: 700 }}
        >
          {t(
            `Every session frame carries a ${PPPOE_HEADER_BYTES}-byte PPPoE header and a ${PPP_PROTOCOL_BYTES}-byte PPP protocol field inside the ${ETHERNET_MTU}-byte Ethernet payload, so the IP packet may be at most ${ETHERNET_MTU} − ${PPPOE_HEADER_BYTES + PPP_PROTOCOL_BYTES} = ${pppoeMtu} bytes.`,
            `セッションのフレームはどれも、${ETHERNET_MTU} バイトのイーサネットのペイロードの中に ${PPPOE_HEADER_BYTES} バイトの PPPoE ヘッダと ${PPP_PROTOCOL_BYTES} バイトの PPP プロトコル番号を持ちます。だから IP パケットは最大 ${ETHERNET_MTU} − ${PPPOE_HEADER_BYTES + PPP_PROTOCOL_BYTES} = ${pppoeMtu} バイトです。`,
          )}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Simplified: discovery tags (service name, AC cookie) and LCP options other than the MRU are left out, and the access concentrator’s own IPCP request is not shown. Providers can also hand out DNS servers through IPCP.',
            '簡略化しています。ディスカバリーのタグ（サービス名、AC Cookie など）や MRU 以外の LCP オプションは省き、アクセスコンセントレータ側の IPCP の要求も載せていません。プロバイダは IPCP で DNS サーバを渡すこともできます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="pppoe-predict">
        <div style={LESSON_LABEL}>{t('Part 2: predict first', 'Part 2：まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A PC behind this router, on an ordinary ${ETHERNET_MTU}-byte Ethernet LAN, opens a web page of ${ASKED.responseBytes.toLocaleString('en')} bytes. The server sits on a ${ETHERNET_MTU}-byte network too and sets DF (“don’t fragment”) on every packet, as servers do for path MTU discovery. A firewall near the server drops all ICMP. The home router does nothing special. What does the user see?`,
            `このルータの内側、ふつうの ${ETHERNET_MTU} バイトのイーサネット LAN にいる PC が、${ASKED.responseBytes.toLocaleString('ja')} バイトの Web ページを開きます。サーバも ${ETHERNET_MTU} バイトのネットワークにいて、経路 MTU 探索のためにすべてのパケットに DF（分割禁止）を立てています。サーバの近くのファイアウォールは ICMP をすべて捨てます。家のルータは特別なことは何もしていません。利用者には何が見える？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`pppoe-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="pppoe-reveal"
            data-right={String(guess === truth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `It starts, then hangs. The handshake and the ${asked.packets.find((p) => p.kind === 'request')!.ipBytes}-byte request are small and pass. The PC announced MSS ${asked.announcedMss} (its own ${ETHERNET_MTU}-byte LAN), so the server answers in ${asked.firstSegment + 40}-byte packets. They do not fit the ${pppoeMtu}-byte PPPoE link: of the first ${askedData.length}, ${askedDropped.length} are dropped. The provider’s router reports it with ICMP “fragmentation needed”, but the firewall throws that away, so the server never learns, and its ${askedResendsDropped.length} resends are the same size and are dropped too (${asked.dropped} in all). The browser holds ${asked.receivedBytes.toLocaleString('en')} bytes from the small last packet but can use ${asked.inOrderBytes} of them, because everything before them is missing. This is a PMTUD black hole.`,
              `始まって、そこで止まります。ハンドシェイクと ${asked.packets.find((p) => p.kind === 'request')!.ipBytes} バイトのリクエストは小さいので通ります。PC は自分の ${ETHERNET_MTU} バイトの LAN に合わせて MSS ${asked.announcedMss} を伝えたので、サーバは ${asked.firstSegment + 40} バイトのパケットで返します。これは ${pppoeMtu} バイトの PPPoE リンクに収まらず、最初の ${askedData.length} 個のうち ${askedDropped.length} 個が捨てられます。事業者側のルータは ICMP「分割が必要」で知らせますが、ファイアウォールがそれを捨てるので、サーバは気づきません。同じ大きさで再送した ${askedResendsDropped.length} 個も捨てられます（計 ${asked.dropped} 個）。ブラウザは最後の小さなパケットの ${asked.receivedBytes.toLocaleString('ja')} バイトを受け取っていますが、その前がすべて欠けているので、使えるのは ${asked.inOrderBytes} バイトです。これが PMTUD ブラックホールです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="pppoe-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Follow the packets', 'パケットを追う')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="pppoe-fix">
          <div style={LESSON_LABEL}>{t('The fix: MSS clamping', '対策：MSS クランプ')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `The home router sees every SYN pass. With MSS clamping it rewrites the MSS option in them to at most ${pppoeMtu} − 40 = ${mssFor(pppoeMtu)}. The server then sees MSS ${clamped.serverSeesMss} and sends ${clamped.firstSegment + 40}-byte packets, which fit: ${clamped.dropped} dropped, and no ICMP is needed at all. It only helps TCP; UDP traffic such as QUIC chooses its own sizes.`,
              `家のルータはすべての SYN が通るのを見ています。MSS クランプを使うと、その MSS オプションを最大 ${pppoeMtu} − 40 = ${mssFor(pppoeMtu)} に書き換えます。するとサーバには MSS ${clamped.serverSeesMss} が見え、${clamped.firstSegment + 40} バイトのパケットで送るので収まります。捨てられるのは ${clamped.dropped} 個で、ICMP もまったく要りません。効くのは TCP だけです。QUIC など UDP の通信は自分で大きさを決めます。`,
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              role="switch"
              aria-checked={clamp}
              data-testid="pppoe-clamp"
              onClick={() => setClamp((on) => !on)}
              style={{ ...lessonChoice(clamp), minHeight: 44 }}
            >
              {clamp ? '✓ ' : ''}
              {t('Router clamps MSS', 'ルータが MSS をクランプ')}
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={icmpFiltered}
              data-testid="pppoe-icmp"
              onClick={() => setIcmpFiltered((on) => !on)}
              style={{ ...lessonChoice(icmpFiltered), minHeight: 44 }}
            >
              {icmpFiltered ? '✓ ' : ''}
              {t('Firewall drops ICMP', 'ファイアウォールが ICMP を捨てる')}
            </button>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {t('Page size', 'ページの大きさ')}
              <input
                type="range"
                min={500}
                max={20_000}
                step={500}
                value={responseBytes}
                data-testid="pppoe-size"
                onChange={(event) => setResponseBytes(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span
                style={{ fontFamily: 'monospace' }}
              >{`${responseBytes.toLocaleString('en')} B`}</span>
            </label>
          </div>
          <p
            data-testid="pppoe-result"
            data-outcome={outcome}
            data-completed={String(run.completed)}
            data-mss={run.serverSeesMss}
            data-dropped={run.dropped}
            data-inorder={run.inOrderBytes}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {outcomeName(outcome)}{' '}
            {t(
              `Server sees MSS ${run.serverSeesMss}; ${run.dropped} packets dropped${runResendsDropped > 0 ? ` (${runResendsDropped} of them resends)` : ''}; ${run.inOrderBytes.toLocaleString('en')} of ${responseBytes.toLocaleString('en')} bytes usable.`,
              `サーバに見える MSS は ${run.serverSeesMss}、捨てられたパケットは ${run.dropped} 個${runResendsDropped > 0 ? `（うち再送 ${runResendsDropped} 個）` : ''}、使えるのは ${responseBytes.toLocaleString('ja')} バイト中 ${run.inOrderBytes.toLocaleString('ja')} バイトです。`,
            )}
          </p>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Packet', 'パケット')}</th>
                  <th style={cell}>{t('From', '送信元')}</th>
                  <th style={cell}>{t('IP size', 'IP の大きさ')}</th>
                  <th style={cell}>{t('What happens', 'どうなるか')}</th>
                </tr>
              </thead>
              <tbody>
                {run.packets.map((packet, index) => (
                  <tr
                    key={index}
                    data-testid={`pppoe-packet-${index}`}
                    data-kind={packet.kind}
                    data-bytes={packet.ipBytes}
                    data-fate={packet.fate}
                  >
                    <td style={mono}>
                      {kindName(packet.kind)}
                      {packet.mss ? ` MSS ${packet.mss}` : ''}
                    </td>
                    <td style={mono}>{fromName(packet.from)}</td>
                    <td style={mono}>{`${packet.ipBytes} B`}</td>
                    <td
                      style={{
                        ...mono,
                        color:
                          packet.fate === 'delivered'
                            ? 'var(--netlab-text-primary)'
                            : 'var(--netlab-accent-red)',
                      }}
                    >
                      {fateName(packet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Turn the firewall off and the page loads even without clamping: the ICMP reaches the server, which resends the lost data in smaller packets, one round trip later. Make the page small and it loads even through the black hole: that is why small pages, logins and chat work while big pages, file downloads and some HTTPS sites hang.',
              'ファイアウォールをやめると、クランプなしでも表示されます。ICMP がサーバに届き、サーバは失われたデータを小さなパケットで 1 往復遅れて再送するからです。ページを小さくすると、ブラックホールがあっても表示されます。小さなページやログイン、チャットは使えるのに、大きなページやダウンロード、一部の HTTPS サイトだけが止まるのはこのためです。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: IPv4 and TCP headers are 20 bytes each (SYNs add a 4-byte MSS option), the server sends the whole page at once, and the black-hole case stops after ${RETRIES} resends; real TCP keeps trying for minutes, and some systems eventually probe smaller sizes on their own (RFC 4821).`,
              `簡略化しています。IPv4 と TCP のヘッダはそれぞれ 20 バイト（SYN には 4 バイトの MSS オプション）、サーバはページ全体を一度に送り、ブラックホールの場合は ${RETRIES} 回の再送で打ち切っています。実際の TCP は何分も再送を続け、やがて自分で小さい大きさを試す（RFC 4821）OS もあります。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="pppoe-ipoe">
          <div style={{ ...LESSON_LABEL, textTransform: 'none' }}>
            {t('Part 3: IPoE', 'Part 3：IPoE')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'With IPoE the router does not dial at all: IP packets go straight into Ethernet frames and the address comes from DHCP (or, for IPv6, router advertisements and DHCPv6). There is no PPP header, so where the provider’s access network carries full-size frames the link MTU stays 1500. Many IPoE services in Japan are IPv6 first and carry IPv4 inside IPv6, which costs a 40-byte IPv6 header instead.',
              'IPoE ではルータはダイヤルしません。IP パケットはそのままイーサネットのフレームに入り、アドレスは DHCP（IPv6 ならルータ広告と DHCPv6）で受け取ります。PPP のヘッダがないので、事業者のアクセス網がフルサイズのフレームを運べるなら、リンクの MTU は 1500 のままです。日本の IPoE の多くは IPv6 が主で、IPv4 は IPv6 の中に入れて運ぶため、代わりに 40 バイトの IPv6 ヘッダがかかります。',
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Access', '接続方式')}</th>
                  <th style={cell}>{t('Overhead', 'オーバーヘッド')}</th>
                  <th style={cell}>{t('IPv4 MTU', 'IPv4 の MTU')}</th>
                  <th style={cell}>MSS</th>
                  <th style={cell}>{t('Packets for 1 MB', '1 MB に要るパケット')}</th>
                </tr>
              </thead>
              <tbody>
                {ACCESSES.map((access) => {
                  const s = accessSummary(access, BULK_BYTES);
                  return (
                    <tr
                      key={access}
                      data-testid={`pppoe-access-${access}`}
                      data-mtu={s.mtu}
                      data-mss={s.mss}
                      data-packets={s.packets}
                    >
                      <td style={cell}>{accessName(access)}</td>
                      <td style={mono}>{`${s.overhead} B`}</td>
                      <td style={mono}>{s.mtu}</td>
                      <td style={mono}>{`${s.mss} (${s.efficiency}%)`}</td>
                      <td style={mono}>{s.packets.toLocaleString('en')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `The percentage is the TCP payload in each ${ETHERNET_MTU}-byte Ethernet payload. Eight bytes per packet matter far less for speed than for the black hole: what breaks pages is the smaller MTU, not the overhead. Some PPPoE providers support RFC 4638, which uses slightly larger Ethernet frames so that PPPoE can carry 1500-byte packets too.`,
              `% は ${ETHERNET_MTU} バイトのイーサネットのペイロードのうち TCP のデータが占める割合です。1 パケット 8 バイトの差は、速さよりもブラックホールで効いてきます。ページを壊すのはオーバーヘッドそのものではなく、小さくなった MTU です。RFC 4638 に対応した PPPoE のプロバイダでは、少し大きいイーサネットのフレームを使い、PPPoE でも 1500 バイトのパケットを運べます。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function PppoeDemo() {
  return (
    <DemoShell
      title="PPPoE, MTU 1492 and MSS clamping"
      desc="How a home router opens a PPPoE session, what the smaller MTU does to a page download, and how IPoE compares"
    >
      <PppoeLesson />
    </DemoShell>
  );
}
