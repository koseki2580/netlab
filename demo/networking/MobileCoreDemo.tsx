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
  GNBS,
  SESSION,
  changed,
  handover,
  innerSizes,
  type Field,
  type GnbId,
  type OuterFamily,
  type Session,
} from './mobileCore';

type Size = 'full' | 'udp-only' | 'no-extension' | 'all';
const SIZES: readonly Size[] = ['full', 'udp-only', 'all', 'no-extension'];
type Move = 'everything' | 'ip' | 'anchor' | 'tunnel';
const MOVES: readonly Move[] = ['everything', 'tunnel', 'ip', 'anchor'];
const MOVE_FIELDS: Record<Move, readonly Field[]> = {
  everything: ['ueIp', 'anchor', 'downlink'],
  ip: ['ueIp', 'downlink'],
  anchor: ['anchor', 'downlink'],
  tunnel: ['downlink'],
};
const FIELDS: readonly Field[] = ['ueIp', 'anchor', 'downlink', 'uplink'];
const TRANSPORT_MTU = 1500;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const num: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const sameFields = (a: readonly Field[], b: readonly Field[]) =>
  a.length === b.length && a.every((field) => b.includes(field));

/** UE, two gNBs, the UPF and the internet; the N3 tunnel runs from the serving gNB. */
function CoreDiagram({ serving }: { serving: GnbId }) {
  const t = useT();
  const gnbY = { gnb1: 30, gnb2: 90 } as const;
  const text = { fontSize: 13, fill: 'var(--netlab-text-primary)' } as const;
  return (
    <svg
      viewBox="0 0 400 120"
      style={{ width: '100%', maxWidth: 560, display: 'block' }}
      role="img"
      aria-label={t('UE, gNBs, UPF and the internet', 'UE、gNB、UPF、インターネット')}
    >
      <line
        x1={44}
        y1={60}
        x2={120}
        y2={gnbY[serving]}
        stroke="var(--netlab-border-strong)"
        strokeDasharray="4 3"
      />
      <line
        x1={170}
        y1={gnbY[serving]}
        x2={260}
        y2={60}
        stroke="var(--netlab-accent-cyan)"
        strokeWidth={3}
      />
      <line x1={300} y1={60} x2={345} y2={60} stroke="var(--netlab-border-strong)" />
      <text x={24} y={64} textAnchor="middle" {...text}>
        UE
      </text>
      {(Object.keys(GNBS) as GnbId[]).map((id) => (
        <g key={id}>
          <rect
            x={120}
            y={gnbY[id] - 13}
            width={50}
            height={24}
            rx={4}
            fill="var(--netlab-bg-elevated)"
            stroke={id === serving ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border-strong)'}
          />
          <text x={145} y={gnbY[id] + 4} textAnchor="middle" {...text}>
            {GNBS[id].node}
          </text>
        </g>
      ))}
      <rect
        x={260}
        y={47}
        width={40}
        height={24}
        rx={4}
        fill="var(--netlab-bg-elevated)"
        stroke="var(--netlab-border-strong)"
      />
      <text x={280} y={64} textAnchor="middle" {...text}>
        UPF
      </text>
      <text x={215} y={56} textAnchor="middle" {...text}>
        N3
      </text>
      <text x={322} y={54} textAnchor="middle" {...text}>
        N6
      </text>
      <text x={372} y={64} textAnchor="middle" {...text}>
        {t('Net', '外部')}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function MobileCoreLesson() {
  const t = useT();
  const [size, setSize] = useState<Size | null>(null);
  const [sizeShown, setSizeShown] = useState(false);
  const [move, setMove] = useState<Move | null>(null);
  const [moveShown, setMoveShown] = useState(false);
  const [outer, setOuter] = useState<OuterFamily>('ipv4');
  const [container, setContainer] = useState(true);
  const [transportMtu, setTransportMtu] = useState(TRANSPORT_MTU);
  const [serving, setServing] = useState<GnbId>('gnb2');

  const asked = innerSizes(TRANSPORT_MTU, 'ipv4', true);
  const bare = innerSizes(TRANSPORT_MTU, 'ipv4', false);
  const udpOnly = TRANSPORT_MTU - asked.overhead.outerIp - asked.overhead.udp;
  const sizeValues: Record<Size, { mtu: number; mss: number }> = {
    full: { mtu: asked.innerMtu, mss: asked.tcpMss },
    'no-extension': { mtu: bare.innerMtu, mss: bare.tcpMss },
    'udp-only': { mtu: udpOnly, mss: udpOnly - 40 },
    all: { mtu: TRANSPORT_MTU, mss: TRANSPORT_MTU - 40 },
  };
  const sizeName = (answer: Size) =>
    t(
      `Inner MTU ${sizeValues[answer].mtu}, MSS ${sizeValues[answer].mss}`,
      `内側の MTU ${sizeValues[answer].mtu}、MSS ${sizeValues[answer].mss}`,
    );
  const custom = innerSizes(transportMtu, outer, container);
  const o = asked.overhead;

  const after = handover(SESSION, 'gnb2');
  const moved = changed(SESSION, after);
  const moveTruth = MOVES.find((answer) => sameFields(MOVE_FIELDS[answer], moved));
  const moveName = (answer: Move) =>
    ({
      everything: t(
        'A new IP address, from a new anchor UPF',
        '新しいアンカー UPF から新しい IP アドレス',
      ),
      ip: t('A new IP address, same anchor UPF', 'アンカー UPF は同じで、IP アドレスは新しく'),
      anchor: t('Same IP; gNB2 becomes the anchor', 'IP は同じで、gNB2 がアンカーになる'),
      tunnel: t(
        'Same IP and anchor; the N3 tunnel moves',
        'IP もアンカーも同じで、N3 トンネルが移る',
      ),
    })[answer];
  const fieldName = (field: Field) =>
    ({
      ueIp: t('UE’s IP address', 'UE の IP アドレス'),
      anchor: t('PDU session anchor', 'PDU セッションのアンカー'),
      downlink: t('N3 downlink: UPF sends to', 'N3 下り：UPF の送り先'),
      uplink: t('N3 uplink: gNB sends to', 'N3 上り：gNB の送り先'),
    })[field];
  const fieldValue = (session: Session, field: Field) => {
    if (field === 'ueIp') return session.ueIp;
    if (field === 'anchor') return session.anchor;
    const end = session[field];
    return `${end.node} ${end.address} TEID ${end.teid}`;
  };
  const now = handover(SESSION, serving);
  const nowChanged = changed(SESSION, now);

  const verdict = (right: boolean) =>
    right
      ? t('As you predicted. ', '予想どおりです。')
      : t('Not what you predicted. ', '予想とちがいました。');

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
        <div style={LESSON_LABEL}>{t('The 5G user plane', '5G のユーザプレーン')}</div>
        <CoreDiagram serving={moveShown ? serving : 'gnb1'} />
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            'A phone (the UE) has a PDU session: an IP address and a path to the internet. Its packets go over the radio to a base station (gNB), which puts each one inside a GTP-U tunnel to the UPF over the N3 interface. The UPF takes the packet out of the tunnel and sends it to the internet (N6). The UPF that the UE’s IP address is reached through is the PDU session anchor (3GPP TS 23.501).',
            'スマートフォン（UE）は PDU セッションを持っています。IP アドレスと、インターネットへの道です。パケットは無線で基地局（gNB）へ届き、gNB はそれを GTP-U のトンネルに入れて N3 インターフェース経由で UPF へ送ります。UPF はトンネルからパケットを取り出してインターネット（N6）へ送ります。UE の IP アドレスへ届く入口になる UPF が、PDU セッションのアンカーです（3GPP TS 23.501）。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="mc-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The N3 transport network has an MTU of ${TRANSPORT_MTU} bytes and runs over IPv4. Each of the UE’s packets is wrapped in an outer IPv4 header, a UDP header, and a GTP-U header that carries a PDU Session Container (the extension header that holds the packet’s QoS flow ID). The UE’s TCP runs over IPv4. How large can the UE’s packets be without the N3 packet being fragmented, and what TCP MSS fits?`,
            `N3 のトランスポート網は MTU ${TRANSPORT_MTU} バイトで、IPv4 で動いています。UE のパケットはそれぞれ、外側の IPv4 ヘッダ、UDP ヘッダ、そして PDU Session Container（そのパケットの QoS フロー ID を入れる拡張ヘッダ）付きの GTP-U ヘッダで包まれます。UE の TCP は IPv4 の上で動きます。N3 のパケットが断片化されずに済む UE のパケットの最大サイズ（内側の MTU）と、それに合う TCP の MSS はいくつ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {SIZES.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={size === answer}
              data-testid={`mc-guess-${answer}`}
              disabled={sizeShown}
              onClick={() => setSize(answer)}
              style={{ ...lessonChoice(size === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, size, 'full', sizeShown)}
              {sizeName(answer)}
            </button>
          ))}
        </div>
        {sizeShown ? (
          <p
            data-testid="mc-reveal"
            data-right={String(size === 'full')}
            data-mtu={asked.innerMtu}
            data-mss={asked.tcpMss}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>{verdict(size === 'full')}</strong>
            {t(
              `Inner MTU ${asked.innerMtu}, MSS ${asked.tcpMss}. The tunnel costs ${o.total} bytes: IPv4 ${o.outerIp}, UDP ${o.udp}, the GTP-U mandatory header ${o.gtpMandatory}, then ${o.gtpOptional} bytes of optional fields that appear whenever an extension header does (sequence number, N-PDU number, next extension type), and the PDU Session Container itself, ${o.pduSessionContainer} bytes at its smallest. ${TRANSPORT_MTU} − ${o.total} = ${asked.innerMtu}, and the MSS is that minus 20 for the inner IPv4 header and 20 for TCP.`,
              `内側の MTU は ${asked.innerMtu}、MSS は ${asked.tcpMss} です。トンネルには ${o.total} バイトかかります。IPv4 が ${o.outerIp}、UDP が ${o.udp}、GTP-U の必須ヘッダが ${o.gtpMandatory}、拡張ヘッダがあれば必ず付くオプション部分（シーケンス番号、N-PDU 番号、次の拡張ヘッダの種類）が ${o.gtpOptional}、そして PDU Session Container 自体が最小で ${o.pduSessionContainer} バイトです。${TRANSPORT_MTU} − ${o.total} = ${asked.innerMtu} で、MSS はそこから内側の IPv4 ヘッダ 20 と TCP ヘッダ 20 を引いた値です。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="mc-reveal-button"
            disabled={!size}
            style={{ ...(size ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setSizeShown(true)}
          >
            {size
              ? t('Count the headers', 'ヘッダを数える')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {sizeShown ? (
        <div style={LESSON_CARD} data-testid="mc-headers">
          <div style={LESSON_LABEL}>{t('Change the transport', 'トランスポートを変える')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <div
              role="tablist"
              aria-label={t('Outer IP', '外側の IP')}
              style={{ display: 'flex', gap: 6 }}
            >
              {(['ipv4', 'ipv6'] as const).map((family) => (
                <button
                  key={family}
                  type="button"
                  role="tab"
                  aria-selected={outer === family}
                  data-testid={`mc-outer-${family}`}
                  onClick={() => setOuter(family)}
                  style={lessonChoice(outer === family)}
                >
                  {family === 'ipv4' ? t('Outer IPv4', '外側 IPv4') : t('Outer IPv6', '外側 IPv6')}
                </button>
              ))}
            </div>
            <div
              role="tablist"
              aria-label={t('Extension header', '拡張ヘッダ')}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
            >
              {([true, false] as const).map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  role="tab"
                  aria-selected={container === on}
                  data-testid={`mc-container-${on ? 'on' : 'off'}`}
                  onClick={() => setContainer(on)}
                  style={lessonChoice(container === on)}
                >
                  {on
                    ? t('With PDU Session Container', 'PDU Session Container あり')
                    : t('Bare GTP-U header', 'GTP-U 必須ヘッダのみ')}
                </button>
              ))}
            </div>
          </div>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            {t('Transport MTU', 'トランスポートの MTU')}
            <input
              type="range"
              min={1400}
              max={1600}
              step={4}
              value={transportMtu}
              data-testid="mc-mtu"
              onChange={(event) => setTransportMtu(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{transportMtu}</span>
          </label>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('Outer IP header', '外側の IP ヘッダ')}</td>
                  <td style={num}>{custom.overhead.outerIp}</td>
                </tr>
                <tr>
                  <td style={cell}>UDP</td>
                  <td style={num}>{custom.overhead.udp}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('GTP-U mandatory header', 'GTP-U 必須ヘッダ')}</td>
                  <td style={num}>{custom.overhead.gtpMandatory}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('GTP-U optional fields', 'GTP-U オプション部分')}</td>
                  <td style={num}>{custom.overhead.gtpOptional}</td>
                </tr>
                <tr>
                  <td style={cell}>PDU Session Container</td>
                  <td style={num}>{custom.overhead.pduSessionContainer}</td>
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: 700 }}>
                    {t('Tunnel overhead', 'トンネルのオーバーヘッド')}
                  </td>
                  <td style={{ ...num, fontWeight: 700 }}>{custom.overhead.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p
            data-testid="mc-result"
            data-overhead={custom.overhead.total}
            data-mtu={custom.innerMtu}
            data-mss={custom.tcpMss}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `Inner MTU ${custom.innerMtu}, TCP MSS ${custom.tcpMss}.`,
              `内側の MTU ${custom.innerMtu}、TCP の MSS ${custom.tcpMss}。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Sizes are in bytes, from 3GPP TS 29.281 (GTP-U) and TS 38.415 (the container’s contents); the container is counted at its smallest, with no optional fields. On N3 it is carried, because it holds the QoS flow ID. Operators often run the transport with a larger MTU so that the UE can keep 1500, or set the UE’s MTU lower; which they do is a network design choice, not a standard. IPsec or VLAN tags on the transport would cost more.',
              'サイズはバイトで、3GPP TS 29.281（GTP-U）と TS 38.415（コンテナの中身）によります。コンテナはオプション項目なしの最小サイズで数えています。N3 では QoS フロー ID を運ぶためにコンテナが付きます。事業者はトランスポートの MTU を大きくして UE が 1500 を使えるようにしたり、UE の MTU を小さく設定したりします。どちらにするかは網の設計の選択で、標準が決めるものではありません。トランスポートに IPsec や VLAN タグがあれば、さらにかかります。',
            )}
          </p>
        </div>
      ) : null}

      {sizeShown ? (
        <div style={LESSON_CARD} data-testid="mc-handover">
          <div style={LESSON_LABEL}>{t('Handover', 'ハンドオーバー')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `The UE is downloading a file over TCP from ${SESSION.ueIp} through gNB1. It moves out of gNB1’s cell into gNB2’s, and the network hands it over (an Xn handover; both gNBs reach the same UPF). What happens to the UE’s session?`,
              `UE は gNB1 経由で、${SESSION.ueIp} から TCP でファイルをダウンロードしています。UE が gNB1 のセルから gNB2 のセルへ移り、網がハンドオーバーします（Xn ハンドオーバーで、どちらの gNB も同じ UPF につながっています）。UE のセッションはどうなる？`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6 }}
          >
            {MOVES.map((answer) => (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={move === answer}
                data-testid={`mc-ho-guess-${answer}`}
                disabled={moveShown}
                onClick={() => setMove(answer)}
                style={{ ...lessonChoice(move === answer), textAlign: 'left' }}
              >
                {predictionMark(answer, move, moveTruth, moveShown)}
                {moveName(answer)}
              </button>
            ))}
          </div>
          {moveShown ? (
            <p
              data-testid="mc-ho-reveal"
              data-right={String(move === moveTruth)}
              data-changed={moved.join(' ')}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>{verdict(move === moveTruth)}</strong>
              {t(
                `The UE keeps ${after.ueIp} and ${after.anchor} stays its anchor. Only the downlink end of the N3 tunnel moves: gNB2 gives the core its own address (${after.downlink.address}) and a tunnel ID (TEID ${after.downlink.teid}), and the SMF tells the UPF to send there. The internet still reaches ${after.ueIp} through ${after.anchor}, so the TCP connection never sees the move. The mobility is hidden inside the core, below IP, unlike MPTCP or QUIC migration, where the endpoints themselves handle a new address.`,
                `UE は ${after.ueIp} のままで、${after.anchor} がアンカーのままです。動くのは N3 トンネルの下り側の端だけです。gNB2 が自分のアドレス（${after.downlink.address}）とトンネル ID（TEID ${after.downlink.teid}）をコアに渡し、SMF が UPF にそこへ送るよう指示します。インターネットからは今までどおり ${after.anchor} 経由で ${after.ueIp} に届くので、TCP の接続は移動に気づきません。移動はコアの中、IP より下で隠されます。端末同士が新しいアドレスを扱う MPTCP や QUIC のマイグレーションとはちがいます。`,
              )}
            </p>
          ) : (
            <button
              type="button"
              data-testid="mc-ho-reveal-button"
              disabled={!move}
              style={{ ...(move ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
              onClick={() => setMoveShown(true)}
            >
              {move
                ? t('Hand over', 'ハンドオーバーする')
                : t('Predict first', '先に予想を選んでください')}
            </button>
          )}
        </div>
      ) : null}

      {moveShown ? (
        <div style={LESSON_CARD} data-testid="mc-session">
          <div style={LESSON_LABEL}>{t('The session, before and after', 'セッションの前後')}</div>
          <div
            role="tablist"
            aria-label={t('Serving gNB', '接続中の gNB')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {(Object.keys(GNBS) as GnbId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={serving === id}
                data-testid={`mc-serving-${id}`}
                onClick={() => setServing(id)}
                style={lessonChoice(serving === id)}
              >
                {t(`Now on ${GNBS[id].node}`, `今は ${GNBS[id].node}`)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell} />
                  <th style={cell}>{t('On gNB1 (start)', 'gNB1（最初）')}</th>
                  <th style={cell}>{t('Now', '今')}</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field) => (
                  <tr
                    key={field}
                    data-testid={`mc-row-${field}`}
                    data-changed={String(nowChanged.includes(field))}
                  >
                    <td style={cell}>{fieldName(field)}</td>
                    <td style={num}>{fieldValue(SESSION, field)}</td>
                    <td
                      style={{
                        ...num,
                        fontWeight: nowChanged.includes(field) ? 700 : 400,
                        color: nowChanged.includes(field)
                          ? 'var(--netlab-accent-cyan)'
                          : 'var(--netlab-text-primary)',
                      }}
                    >
                      {fieldValue(now, field)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: one UPF is both the N3 end and the anchor, and the session is in SSC mode 1, which keeps its anchor. A move far enough can add an intermediate UPF between the gNB and the anchor, still without changing the IP; SSC modes 2 and 3 let the network move the anchor, and then the IP does change. Addresses and TEIDs are made up for the lesson.',
              '簡略化しています。1 台の UPF が N3 の終点とアンカーを兼ね、セッションはアンカーを保つ SSC モード 1 としました。遠くへ移ると gNB とアンカーの間に中間の UPF が入ることがありますが、それでも IP は変わりません。SSC モード 2 と 3 では網がアンカーを移すことができ、そのときは IP が変わります。アドレスと TEID はこのレッスン用の架空の値です。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function MobileCoreDemo() {
  return (
    <DemoShell
      title="5G core: the user plane"
      desc="How a phone's packets are tunnelled from the base station to the UPF, and what a handover does to the session"
    >
      <MobileCoreLesson />
    </DemoShell>
  );
}
