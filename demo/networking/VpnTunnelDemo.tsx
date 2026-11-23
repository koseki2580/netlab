import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  DESTINATIONS,
  INNER_DST,
  INNER_SRC,
  IPSEC_POLICIES,
  METHODS,
  SITE_A_PUBLIC,
  SITE_B_PUBLIC,
  WG_PEERS,
  WG_ROUTE,
  WIREGUARD_PORT,
  ipsecDecision,
  observerView,
  wireguardDecision,
  wrap,
  type IpsecAction,
  type Method,
  type ObserverView,
  type SegmentId,
  type WireguardAction,
} from './vpnTunnel';

type Answer = 'everything' | 'inner-addresses' | 'outer-only' | 'nothing';
const ANSWERS: readonly Answer[] = ['everything', 'inner-addresses', 'outer-only', 'nothing'];
const PATH_MTUS = [1500, 1492] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer an observer's view matches. */
function answerOf(view: ObserverView): Answer {
  if (view.data) return 'everything';
  if (view.innerAddresses) return 'inner-addresses';
  return view.publicAddresses ? 'outer-only' : 'nothing';
}

const ipsecKey = (decision: IpsecAction) =>
  decision.action === 'protect' ? `protect-${decision.peer}` : 'bypass';
const wgKey = (decision: WireguardAction) =>
  decision.action === 'peer' ? `peer-${decision.peer}` : decision.action;

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function VpnTunnelLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [inner, setInner] = useState(1500);
  const [pathMtu, setPathMtu] = useState<(typeof PATH_MTUS)[number]>(1500);
  const [shown, setShown] = useState<Method>('ipsec');
  const [dest, setDest] = useState<(typeof DESTINATIONS)[number]>(DESTINATIONS[0]);
  const asked = observerView('ipsec');
  const truth = answerOf(asked);
  const yes = t('yes', 'はい');
  const no = t('no', 'いいえ');

  const methodName = (method: Method) =>
    ({
      none: t('No tunnel', 'トンネルなし'),
      gre: t('GRE', 'GRE'),
      ipsec: t('IPsec ESP (tunnel mode)', 'IPsec ESP（トンネルモード）'),
      wireguard: t('WireGuard', 'WireGuard'),
    })[method];
  const answerName = (answer: Answer) =>
    ({
      everything: t(
        'Everything: the addresses, the ports and the HTTP request',
        'すべて：アドレスもポートも HTTP のリクエストも',
      ),
      'inner-addresses': t(
        `The office addresses (${INNER_SRC} → ${INNER_DST}), but not the ports or the data`,
        `オフィス内のアドレス（${INNER_SRC} → ${INNER_DST}）までは読めるが、ポートとデータは読めない`,
      ),
      'outer-only': t(
        'Only the two gateways’ public addresses and the tunnel’s own header',
        '2 台のゲートウェイのグローバルアドレスと、トンネル自身のヘッダーだけ',
      ),
      nothing: t(
        'Nothing at all, not even which two addresses are talking',
        '何も読めない（どのアドレス同士の通信かさえ）',
      ),
    })[answer];
  const segmentName = (id: SegmentId) =>
    ({
      'outer-ip': t('Outer IPv4', '外側 IPv4'),
      gre: t('GRE', 'GRE'),
      esp: t('ESP header', 'ESP ヘッダー'),
      iv: t('IV', 'IV'),
      udp: t('UDP', 'UDP'),
      wg: t('WireGuard header', 'WireGuard ヘッダー'),
      'inner-ip': t('Inner IPv4', '内側 IPv4'),
      tcp: t('TCP', 'TCP'),
      data: t('Data', 'データ'),
      'esp-trailer': t('Padding + ESP trailer', 'パディング + ESP トレーラ'),
      'wg-pad': t('Padding', 'パディング'),
      icv: t('ICV', 'ICV'),
      tag: t('Auth tag', '認証タグ'),
    })[id];
  const ipsecText = (decision: IpsecAction) =>
    decision.action === 'protect'
      ? t(`Encrypted, sent to site ${decision.peer}`, `暗号化して拠点 ${decision.peer} へ`)
      : t(
          'No selector matches: leaves unencrypted, by the ordinary routing table',
          '一致するセレクタなし：通常のルーティングで暗号化されずに出ていく',
        );
  const wgText = (decision: WireguardAction) =>
    ({
      peer: t(
        `Encrypted, sent to site ${decision.action === 'peer' ? decision.peer : ''}`,
        `暗号化して拠点 ${decision.action === 'peer' ? decision.peer : ''} へ`,
      ),
      'no-peer': t(
        'Routed into wg0, but no peer’s AllowedIPs contain it: dropped, nothing is sent',
        'wg0 に入るが、どのピアの AllowedIPs にも含まれない：破棄され、何も送られない',
      ),
      'not-tunnelled': t(
        `Outside ${WG_ROUTE}: not routed into wg0, goes to the internet as usual`,
        `${WG_ROUTE} の外：wg0 には入らず、いつもどおりインターネットへ`,
      ),
    })[decision.action];

  const wrapped = wrap(shown, inner, pathMtu);
  const ipsecNow = ipsecDecision(INNER_SRC, dest);
  const wgNow = wireguardDecision(dest);

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
        <div style={LESSON_LABEL}>
          {t('Two offices, one internet', '2 つのオフィスとインターネット')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `Site A (10.1.0.0/16) and site B (10.2.0.0/16) use private addresses. Each has a gateway with one public address: ${SITE_A_PUBLIC} and ${SITE_B_PUBLIC}. A PC at ${INNER_SRC} asks the server ${INNER_DST} for a file over plain HTTP. The internet does not route private addresses, so the gateways wrap each packet in an outer header between their public addresses. The GRE lesson showed one way to wrap. GRE carries the packet but does not protect it.`,
            `拠点 A（10.1.0.0/16）と拠点 B（10.2.0.0/16）はプライベートアドレスを使っています。それぞれのゲートウェイにはグローバルアドレスが 1 つずつあり、${SITE_A_PUBLIC} と ${SITE_B_PUBLIC} です。${INNER_SRC} の PC が、サーバー ${INNER_DST} に平文の HTTP でファイルを要求します。インターネットはプライベートアドレスをルーティングしないので、ゲートウェイは各パケットを、グローバルアドレス同士の外側ヘッダーで包みます。包み方の 1 つは GRE のレッスンで見ました。GRE はパケットを運びますが、守りはしません。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="vpn-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The gateways now use IPsec: ESP in tunnel mode. Someone on the internet between them captures the packet. What can they read?',
            'ゲートウェイは IPsec（トンネルモードの ESP）を使うようになりました。2 台の間のインターネット上で、誰かがこのパケットをキャプチャします。何が読める？',
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
              data-testid={`vpn-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, guess, truth, revealed)}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="vpn-reveal"
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
              `${answerName(truth)}. In tunnel mode ESP encrypts the whole inner packet, its IPv4 header included, so ${INNER_SRC} → ${INNER_DST}, the ports and the request are all ciphertext. What stays readable is what routers need: the outer header (${SITE_A_PUBLIC} → ${SITE_B_PUBLIC}, protocol 50) and the ESP header, whose SPI tells site B which keys to use and whose sequence number stops replays. An integrity check value (ICV) at the end lets B detect any change made on the way. The observer can still see the packet’s size and timing.`,
              `${answerName(truth)}です。トンネルモードの ESP は、内側の IPv4 ヘッダーも含めて内側のパケット全体を暗号化します。だから ${INNER_SRC} → ${INNER_DST} も、ポートも、リクエストもすべて暗号文です。読めるまま残るのは、ルータが必要とするものだけです。外側ヘッダー（${SITE_A_PUBLIC} → ${SITE_B_PUBLIC}、プロトコル番号 50）と ESP ヘッダーで、ESP ヘッダーの SPI は拠点 B にどの鍵を使うかを伝え、シーケンス番号はリプレイを防ぎます。末尾の ICV（完全性チェック値）で、B は途中で書き換えられたことに気づけます。それでも、パケットの大きさと送られたタイミングは見えます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="vpn-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Capture the packet', 'パケットをキャプチャする')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="vpn-capture">
          <div style={LESSON_LABEL}>
            {t('What the observer captures', '観測者がキャプチャしたもの')}
          </div>
          <div
            role="tablist"
            aria-label={t('Method', '方式')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {METHODS.map((method) => (
              <button
                key={method}
                type="button"
                role="tab"
                aria-selected={shown === method}
                data-testid={`vpn-method-${method}`}
                onClick={() => setShown(method)}
                style={lessonChoice(shown === method)}
              >
                {shown === method ? '✓ ' : ''}
                {methodName(method)}
              </button>
            ))}
          </div>
          <div
            data-testid="vpn-segments"
            data-method={shown}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}
          >
            {wrapped.segments.map((segment) => (
              <div
                key={segment.id}
                data-testid={`vpn-segment-${segment.id}`}
                data-readable={String(segment.readable)}
                style={{
                  border: segment.readable
                    ? '1px solid var(--netlab-accent-orange)'
                    : '1px dashed var(--netlab-accent-green)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 12,
                  minWidth: 0,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{ fontWeight: 700 }}
                >{`${segmentName(segment.id)} · ${segment.bytes} B`}</div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    color: segment.readable
                      ? 'var(--netlab-text-primary)'
                      : 'var(--netlab-text-muted)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {segment.readable ? segment.shows : t('encrypted', '暗号化')}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {shown === 'none'
              ? t(
                  'Without a tunnel the packet still carries 10.2.0.20 as its destination. Internet routers have no route to private addresses, so it is dropped at the first provider, after being readable to anyone on the way.',
                  'トンネルがなければ、宛先は 10.2.0.20 のままです。インターネットのルータはプライベートアドレスへの経路を持たないので、最初の事業者で捨てられます。それまでの間は誰にでも読めます。',
                )
              : shown === 'gre'
                ? t(
                    'GRE gets the packet across, but every inner field is readable, and someone on the path could change the request without B noticing.',
                    'GRE でパケットは届きますが、内側のフィールドはすべて読めます。途中の誰かがリクエストを書き換えても、B は気づけません。',
                  )
                : shown === 'wireguard'
                  ? t(
                      `WireGuard sends over UDP (port ${WIREGUARD_PORT} by convention). Its header carries the receiver index, which tells B which session’s keys to use, and a counter against replays; the inner packet is encrypted with ChaCha20 and protected by a Poly1305 tag.`,
                      `WireGuard は UDP（慣例でポート ${WIREGUARD_PORT}）で送ります。ヘッダーには、B がどのセッションの鍵を使うかを示す受信者インデックスと、リプレイを防ぐカウンタが入ります。内側のパケットは ChaCha20 で暗号化され、Poly1305 のタグで守られます。`,
                    )
                  : t(
                      'The IV is sent in the clear (the cipher needs it but it reveals nothing); the padding and the trailer, which names the inner protocol, are encrypted.',
                      'IV は平文で送られます（暗号に必要ですが、何も明かしません）。パディングと、内側のプロトコルを示すトレーラは暗号化されます。',
                    )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="vpn-size">
          <div style={LESSON_LABEL}>{t('What the wrapping costs', '包むためのコスト')}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Inner packet', '内側のパケット')}
              <input
                type="range"
                min={40}
                max={1500}
                value={inner}
                data-testid="vpn-inner"
                onChange={(event) => setInner(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${inner} B`}</span>
            </label>
            <div
              role="tablist"
              aria-label={t('Path MTU', '経路 MTU')}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <span>{t('Path MTU', '経路 MTU')}</span>
              {PATH_MTUS.map((mtu) => (
                <button
                  key={mtu}
                  type="button"
                  role="tab"
                  aria-selected={pathMtu === mtu}
                  data-testid={`vpn-mtu-${mtu}`}
                  onClick={() => setPathMtu(mtu)}
                  style={{ ...lessonChoice(pathMtu === mtu), minHeight: 44 }}
                >
                  {pathMtu === mtu ? '✓ ' : ''}
                  {mtu === 1500 ? '1500' : t('1492 (PPPoE)', '1492（PPPoE）')}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Method', '方式')}</th>
                  <th style={cell}>{t('Added bytes', '追加バイト')}</th>
                  <th style={cell}>{t('On the wire', '送られる大きさ')}</th>
                  <th style={cell}>{t('Fits the path?', '経路に収まる？')}</th>
                  <th style={cell}>{t('Largest inner packet', '内側の最大')}</th>
                  <th style={cell}>{t('Inner addresses readable?', '内側アドレスが読める？')}</th>
                </tr>
              </thead>
              <tbody>
                {METHODS.filter((method) => method !== 'none').map((method) => {
                  const row = wrap(method, inner, pathMtu);
                  const view = observerView(method);
                  return (
                    <tr
                      key={method}
                      data-testid={`vpn-row-${method}`}
                      data-overhead={row.overhead}
                      data-outer={row.outer}
                      data-max={row.maxInner}
                      data-fits={String(row.fits)}
                    >
                      <td style={cell}>{methodName(method)}</td>
                      <td style={mono}>
                        {row.padding > 0
                          ? t(
                              `${row.overhead} (${row.padding} padding)`,
                              `${row.overhead}（うちパディング ${row.padding}）`,
                            )
                          : String(row.overhead)}
                      </td>
                      <td style={mono}>{`${row.outer} B`}</td>
                      <td style={mono}>{row.fits ? yes : no}</td>
                      <td style={mono}>{`${row.maxInner} B`}</td>
                      <td style={mono}>{view.innerAddresses ? yes : no}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'A full-size 1500-byte packet from the office LAN does not fit once wrapped. So the tunnel interface is given a smaller MTU (the “largest inner packet” column), and gateways usually also lower the TCP MSS of connections through the tunnel, so hosts send packets that fit. Otherwise packets are fragmented or, with DF set, dropped with an ICMP “too big” that firewalls sometimes block.',
              'オフィスの LAN から来る 1500 バイトのフルサイズのパケットは、包むと収まりません。そこでトンネルのインターフェースには小さな MTU（「内側の最大」の列）を設定し、ゲートウェイはトンネルを通る TCP の MSS も下げて（MSS クランプ）、ホストが収まる大きさで送るようにするのが普通です。そうしないと、パケットはフラグメント化されるか、DF が立っていれば破棄されて ICMP の「大きすぎる」が返ります。その ICMP はファイアウォールで止められていることがあります。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="vpn-policy">
          <div style={LESSON_LABEL}>
            {t('Which traffic goes into the tunnel?', 'どの通信がトンネルに入る？')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Site A also has a tunnel to site C. IPsec decides by policy: traffic selectors (a “crypto ACL”) say which source and destination ranges are protected by which tunnel. WireGuard decides by routing: a route sends traffic into the wg0 interface, and wg0 picks the peer whose AllowedIPs contain the destination (cryptokey routing).',
              '拠点 A は拠点 C へのトンネルも持っています。IPsec はポリシーで決めます。トラフィックセレクタ（「暗号 ACL」）が、どの送信元・宛先の範囲をどのトンネルで守るかを決めます。WireGuard はルーティングで決めます。経路が通信を wg0 インターフェースへ送り、wg0 は宛先を AllowedIPs に含むピアを選びます（暗号鍵ルーティング）。',
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {IPSEC_POLICIES.map((policy) => (
                  <tr key={policy.peer}>
                    <td style={cell}>{t('IPsec selector', 'IPsec セレクタ')}</td>
                    <td style={mono}>{`${policy.local} → ${policy.remote}`}</td>
                    <td style={mono}>{t(`site ${policy.peer}`, `拠点 ${policy.peer}`)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={cell}>{t('WireGuard route', 'WireGuard の経路')}</td>
                  <td style={mono}>{`${WG_ROUTE} → wg0`}</td>
                  <td style={cell} />
                </tr>
                {WG_PEERS.map((peer) => (
                  <tr key={peer.peer}>
                    <td style={cell}>{t('WireGuard AllowedIPs', 'WireGuard の AllowedIPs')}</td>
                    <td style={mono}>{peer.allowedIps}</td>
                    <td style={mono}>{t(`site ${peer.peer}`, `拠点 ${peer.peer}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            role="tablist"
            aria-label={t('Destination', '宛先')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}
          >
            {DESTINATIONS.map((ip) => (
              <button
                key={ip}
                type="button"
                role="tab"
                aria-selected={dest === ip}
                data-testid={`vpn-dest-${ip}`}
                onClick={() => setDest(ip)}
                style={lessonChoice(dest === ip)}
              >
                {dest === ip ? '✓ ' : ''}
                {ip}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table
              data-testid="vpn-decision"
              data-ipsec={ipsecKey(ipsecNow)}
              data-wg={wgKey(wgNow)}
              style={{ borderCollapse: 'collapse' }}
            >
              <tbody>
                <tr>
                  <td style={mono}>{`${INNER_SRC} → ${dest}`}</td>
                  <td style={cell} />
                </tr>
                <tr>
                  <td style={cell}>IPsec</td>
                  <td style={cell}>{ipsecText(ipsecNow)}</td>
                </tr>
                <tr>
                  <td style={cell}>WireGuard</td>
                  <td style={cell}>{wgText(wgNow)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'A range left out of the IPsec selectors (here a new office, 10.4.0.0/16) usually fails open: on most gateways (crypto-map ACLs, Linux XFRM) unmatched traffic is routed in the clear, although RFC 4301 says a complete policy should discard it. In WireGuard the same mistake fails closed: nothing is sent. AllowedIPs also work in the other direction: a packet decrypted from peer B is accepted only if its source address is in B’s AllowedIPs; IPsec likewise checks arriving packets against the selectors.',
              'IPsec のセレクタに入れ忘れた範囲（ここでは新しいオフィス 10.4.0.0/16）は、たいてい「開いたまま」失敗します。多くのゲートウェイ（crypto map の ACL や Linux の XFRM）は一致しない通信を暗号化せずにルーティングするからです。ただし RFC 4301 は、完全なポリシーならそれを破棄すべきだとしています。WireGuard で同じ間違いをすると「閉じたまま」失敗し、何も送られません。AllowedIPs は逆方向にも効きます。ピア B から届いて復号したパケットは、送信元アドレスが B の AllowedIPs に含まれるときだけ受け入れられます。IPsec も同じように、届いたパケットをセレクタと照らし合わせます。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD}>
          <div style={LESSON_LABEL}>
            {t('Keys, and what is simplified', '鍵と、簡略化したこと')}
          </div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {t(
              'Before ESP can be used, the two gateways run IKEv2 (RFC 7296): they authenticate each other, agree on the algorithms and derive the keys, and renew them from time to time. WireGuard has no negotiation: its cryptography is fixed (a Noise-based handshake, ChaCha20-Poly1305), and each peer is identified by its public key. The overhead numbers here assume an IPv4 outer header, ESP with AES-GCM (8-byte IV, 16-byte ICV) and no NAT traversal; other ciphers, an IPv6 outer header or ESP in UDP behind NAT change them. wg-quick’s default MTU of 1420 leaves room for an IPv6 outer header.',
              'ESP を使う前に、2 台のゲートウェイは IKEv2（RFC 7296）を実行します。互いを認証し、アルゴリズムを合意し、鍵を作り、ときどき更新します。WireGuard には交渉がありません。暗号は固定（Noise ベースのハンドシェイクと ChaCha20-Poly1305）で、各ピアは公開鍵で識別されます。ここでのオーバーヘッドの数字は、外側が IPv4、ESP は AES-GCM（IV 8 バイト、ICV 16 バイト）、NAT 越えなしと仮定しています。ほかの暗号、外側が IPv6、NAT の内側での UDP カプセル化 ESP では数字が変わります。wg-quick の既定の MTU 1420 は、外側が IPv6 の場合の余裕を見た値です。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function VpnTunnelDemo() {
  return (
    <DemoShell
      title="Site-to-site VPNs: IPsec and WireGuard"
      desc="Joining two offices over the internet: what an observer on the way sees, what wrapping costs in bytes, and which traffic it carries"
    >
      <VpnTunnelLesson />
    </DemoShell>
  );
}
