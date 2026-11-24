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
  ASKED_PATH_MTU,
  BASE_PLPMTU,
  HEADER_BYTES,
  LINK_MTU,
  MAX_PLPMTU,
  MAX_PROBES,
  SEARCH_STEP,
  classic,
  search,
  searchByteByByte,
  type Search,
} from './plpmtud';

/** REQ-440 — the lesson page. Every size and count shown is computed by plpmtud.ts. */

type Answer = 'binary' | 'ptb' | 'bytewise' | 'stuck';
const ANSWERS: readonly Answer[] = ['ptb', 'binary', 'stuck', 'bytewise'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** What each option claims: how many sizes are tried, and where the sender ends up. */
function claims(
  pathMtu: number,
): Record<Answer, { readonly sizes: number; readonly ends: number }> {
  const binary = search(pathMtu);
  const bytewise = searchByteByByte(pathMtu);
  const withIcmp = classic(pathMtu, true);
  return {
    binary: { sizes: binary.probes.length, ends: binary.plpmtu },
    ptb: { sizes: withIcmp.sizes.length, ends: withIcmp.sizes[withIcmp.sizes.length - 1]! },
    bytewise: { sizes: bytewise.probes.length, ends: bytewise.plpmtu },
    stuck: { sizes: 0, ends: BASE_PLPMTU },
  };
}

const CHART_W = 360;
const CHART_H = 140;
const Y_MIN = 1200;
const Y_MAX = 1460;

/** Each probe as a bar: its size, and whether it came back. */
function ProbeChart({ result }: { result: Search }) {
  const t = useT();
  const y = (size: number) => CHART_H - ((size - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H;
  const slot = CHART_W / Math.max(result.probes.length, 6);
  const fitY = y(result.largestFitting);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid="plpmtud-chart"
        viewBox={`-48 -8 ${CHART_W + 56} ${CHART_H + 44}`}
        style={{ width: '100%', minWidth: 320, maxWidth: 560 }}
        role="img"
        aria-label={t(
          `${result.probes.length} probes: ${result.probes.map((probe) => `${probe.size} ${probe.acked ? 'acknowledged' : 'lost'}`).join(', ')}. Largest that fits: ${result.largestFitting}.`,
          `プローブ ${result.probes.length} 回：${result.probes.map((probe) => `${probe.size} ${probe.acked ? '確認' : '消失'}`).join('、')}。通る最大は ${result.largestFitting}。`,
        )}
      >
        {[1200, 1300, 1400].map((size) => (
          <g key={size}>
            <line x1={0} x2={CHART_W} y1={y(size)} y2={y(size)} stroke="var(--netlab-border)" />
            <text
              x={-6}
              y={y(size) + 4}
              textAnchor="end"
              fontSize={12}
              fill="var(--netlab-text-secondary)"
            >
              {size}
            </text>
          </g>
        ))}
        {result.probes.map((probe, index) => (
          <g key={`${probe.size}-${index}`}>
            <rect
              x={index * slot + slot * 0.2}
              y={y(probe.size)}
              width={slot * 0.6}
              height={CHART_H - y(probe.size)}
              fill={probe.acked ? 'var(--netlab-accent-cyan)' : 'transparent'}
              stroke={probe.acked ? 'var(--netlab-accent-cyan)' : 'var(--netlab-accent-red)'}
              strokeWidth={2}
              strokeDasharray={probe.acked ? undefined : '4 3'}
            />
            <text
              x={index * slot + slot / 2}
              y={CHART_H + 16}
              textAnchor="middle"
              fontSize={12}
              fill={probe.acked ? 'var(--netlab-text-primary)' : 'var(--netlab-accent-red)'}
            >
              {`${probe.acked ? '✓' : '✗'}${index + 1}`}
            </text>
          </g>
        ))}
        <line
          x1={0}
          x2={CHART_W}
          y1={fitY}
          y2={fitY}
          stroke="var(--netlab-accent-orange)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <text
          x={CHART_W}
          y={fitY - 4}
          textAnchor="end"
          fontSize={12}
          fill="var(--netlab-accent-orange)"
        >
          {t(`fits: ${result.largestFitting}`, `通る最大：${result.largestFitting}`)}
        </text>
        <text
          x={CHART_W / 2}
          y={CHART_H + 34}
          textAnchor="middle"
          fontSize={12}
          fill="var(--netlab-text-secondary)"
        >
          {t('probe number →', 'プローブの順番 →')}
        </text>
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function PlpmtudLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pathMtu, setPathMtu] = useState(ASKED_PATH_MTU);

  const asked = search(ASKED_PATH_MTU);
  const options = claims(ASKED_PATH_MTU);
  const truth = ANSWERS.find(
    (id) => options[id].sizes === asked.probes.length && options[id].ends === asked.plpmtu,
  );
  const result = search(pathMtu);
  const slow = searchByteByByte(pathMtu);
  const withIcmp = classic(pathMtu, true);
  const blackHole = classic(pathMtu, false);
  const lost = asked.probes.filter((probe) => !probe.acked).length;

  const answerName = (answer: Answer) => {
    const { sizes, ends } = options[answer];
    return {
      binary: t(
        `${sizes} probe sizes; it settles at ${ends} bytes`,
        `プローブ ${sizes} サイズ。${ends} バイトに落ち着く`,
      ),
      ptb: t(
        `${sizes} sizes; it learns exactly ${ends} bytes`,
        `${sizes} サイズ。ちょうど ${ends} バイトを知る`,
      ),
      bytewise: t(
        `${sizes} probe sizes; it settles at ${ends} bytes`,
        `プローブ ${sizes} サイズ。${ends} バイトに落ち着く`,
      ),
      stuck: t(
        `It stays at ${ends} bytes: with no ICMP it never learns more`,
        `${ends} バイトのまま。ICMP がなければそれ以上は知りようがない`,
      ),
    }[answer];
  };

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
        <div style={LESSON_LABEL}>{t('When ICMP is filtered', 'ICMP が捨てられるとき')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A QUIC client on ${LINK_MTU}-byte Ethernet talks to a server over IPv6. Somewhere on the way a tunnel carries only ${ASKED_PATH_MTU}-byte packets. Classic Path MTU Discovery sends full-size packets and waits for the router in front of the tunnel to answer “Packet Too Big” (ICMPv6) with its MTU. Here a firewall drops every ICMP message, so that answer never arrives.`,
            `${LINK_MTU} バイトの Ethernet につながった QUIC のクライアントが、IPv6 でサーバと通信します。途中のトンネルは ${ASKED_PATH_MTU} バイトまでのパケットしか運べません。従来の経路 MTU 探索（PMTUD）は最大サイズのパケットを送り、トンネル手前のルータが MTU を添えて「Packet Too Big」（ICMPv6）を返すのを待ちます。ここではファイアウォールが ICMP をすべて捨てるので、その返事は届きません。`,
          )}
        </p>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            `So the client probes instead (DPLPMTUD, RFC 8899): it sends padded packets of a chosen size and sees whether they are acknowledged. Sizes here are QUIC datagram sizes, the UDP payload; ${HEADER_BYTES} bytes of IPv6 and UDP headers come on top. It starts from ${BASE_PLPMTU} bytes, which every QUIC path must carry.`,
            `そこでクライアントは探りを入れます（DPLPMTUD、RFC 8899）。決めたサイズに詰め物をしたパケットを送り、確認応答が返るかを見ます。ここでのサイズは QUIC のデータグラムサイズ、つまり UDP のペイロードで、その上に IPv6 と UDP のヘッダ ${HEADER_BYTES} バイトが付きます。出発点は、どの QUIC の経路も運べなければならない ${BASE_PLPMTU} バイトです。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="plpmtud-rule">
        <div style={LESSON_LABEL}>{t('This lesson’s search', 'このレッスンの探し方')}</div>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>
            {t(
              `Probe the largest size the link allows, ${MAX_PLPMTU} bytes. If it is acknowledged, stop.`,
              `まずリンクが許す最大の ${MAX_PLPMTU} バイトを試します。確認応答が返れば終わりです。`,
            )}
          </li>
          <li>
            {t(
              `Otherwise keep “good” (largest size acknowledged, starting at ${BASE_PLPMTU}) and “bad” (smallest size lost). Probe good + ⌊(bad − good) / 2⌋; raise good if it is acknowledged, lower bad if it is lost.`,
              `だめなら「良」（確認できた最大、初めは ${BASE_PLPMTU}）と「不可」（失われた最小）を覚えておき、良 + ⌊(不可 − 良) / 2⌋ を試します。確認できれば良を上げ、失われれば不可を下げます。`,
            )}
          </li>
          <li>
            {t(
              `Stop when bad − good ≤ ${SEARCH_STEP}. The result is good.`,
              `不可 − 良 ≤ ${SEARCH_STEP} になったら終わりで、結果は良です。`,
            )}
          </li>
        </ol>
      </div>

      <div style={LESSON_CARD} data-testid="plpmtud-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The path carries ${ASKED_PATH_MTU}-byte packets and ICMP is filtered. How many probe sizes does the client try, and where does it settle?`,
            `経路は ${ASKED_PATH_MTU} バイトのパケットまで運べ、ICMP は捨てられます。クライアントはいくつのサイズを試し、どこに落ち着く？`,
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
              data-testid={`plpmtud-guess-${answer}`}
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
            data-testid="plpmtud-reveal"
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
              `${asked.probes.length} probe sizes, settling at ${asked.plpmtu} bytes. A ${ASKED_PATH_MTU}-byte path fits ${asked.largestFitting} bytes of UDP payload (${ASKED_PATH_MTU} − ${HEADER_BYTES}). No ICMP is needed: a probe that is acknowledged proves its size, one that is never acknowledged rules it out. Halving the gap each time reaches ${SEARCH_STEP} bytes in a few steps, and the search stops there, ${asked.largestFitting - asked.plpmtu} bytes short of the exact size. Learning “exactly ${asked.largestFitting}” in two packets needs the Packet Too Big that the firewall drops.`,
              `プローブ ${asked.probes.length} サイズで、${asked.plpmtu} バイトに落ち着きます。${ASKED_PATH_MTU} バイトの経路に通る UDP ペイロードは ${asked.largestFitting} バイト（${ASKED_PATH_MTU} − ${HEADER_BYTES}）です。ICMP は要りません。確認応答が返ったプローブはそのサイズが通ることを、いつまでも返らないプローブは通らないことを示すからです。差を毎回半分にすると数回で ${SEARCH_STEP} バイト以内になり、探索はそこで止まるので、ちょうどのサイズより ${asked.largestFitting - asked.plpmtu} バイト小さくなります。2 つのパケットで「ちょうど ${asked.largestFitting}」と知るには、ファイアウォールが捨てている Packet Too Big が必要です。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="plpmtud-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run the probes', 'プローブを送る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="plpmtud-probes">
          <div style={LESSON_LABEL}>{t('The probes', 'プローブ')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Hidden path MTU', '隠れた経路 MTU')}
            <input
              type="range"
              min={1280}
              max={LINK_MTU}
              step={4}
              value={pathMtu}
              data-testid="plpmtud-path-mtu"
              onChange={(event) => setPathMtu(Number(event.target.value))}
              style={{ minHeight: 44, flex: 1, minWidth: 140 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${pathMtu} B`}</span>
          </label>
          <p
            data-testid="plpmtud-result"
            data-probes={result.probes.length}
            data-plpmtu={result.plpmtu}
            data-datagrams={result.datagrams}
            style={{ margin: '8px 0', fontWeight: 700 }}
          >
            {t(
              `${result.probes.length} probe sizes, ${result.datagrams} probe packets sent; settles at ${result.plpmtu} bytes (${result.largestFitting} would fit).`,
              `プローブ ${result.probes.length} サイズ、送ったプローブは ${result.datagrams} 個。${result.plpmtu} バイトに落ち着きます（通る最大は ${result.largestFitting}）。`,
            )}
          </p>
          <ProbeChart result={result} />
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>#</th>
                  <th style={cell}>{t('Datagram', 'データグラム')}</th>
                  <th style={cell}>{t('IPv6 packet', 'IPv6 パケット')}</th>
                  <th style={cell}>{t('Result', '結果')}</th>
                  <th style={cell}>{t('Sent', '送信数')}</th>
                </tr>
              </thead>
              <tbody>
                {result.probes.map((probe, index) => (
                  <tr
                    key={`${probe.size}-${index}`}
                    data-testid={`plpmtud-probe-${index + 1}`}
                    data-size={probe.size}
                    data-acked={String(probe.acked)}
                  >
                    <td style={mono}>{index + 1}</td>
                    <td style={mono}>{`${probe.size} B`}</td>
                    <td style={mono}>{`${probe.size + HEADER_BYTES} B`}</td>
                    <td style={cell}>
                      {probe.acked
                        ? t('✓ acknowledged', '✓ 確認応答あり')
                        : t('✗ lost', '✗ 失われた')}
                    </td>
                    <td style={mono}>{probe.sent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `A size counts as lost only after ${MAX_PROBES} probes of it go unacknowledged (MAX_PROBES, RFC 8899’s default), which is why the ${lost} lost sizes in the ${ASKED_PATH_MTU}-byte case cost ${lost * MAX_PROBES} packets. In QUIC a probe can be just PING and PADDING frames, and losing one is not taken as congestion (RFC 9000 §14.4). Real waits between probes are long — RFC 8899’s PROBE_TIMER is at least 1 s — so this lesson counts probes, not time.`,
              `あるサイズを「通らない」と判断するのは、そのサイズのプローブが ${MAX_PROBES} 回続けて確認されなかったときです（RFC 8899 の MAX_PROBES の既定値）。だから ${ASKED_PATH_MTU} バイトの例では、失われた ${lost} サイズで ${lost * MAX_PROBES} 個のパケットを使います。QUIC ではプローブを PING と PADDING のフレームだけにでき、それが失われても輻輳とはみなしません（RFC 9000 §14.4）。実際のプローブの間隔は長く、RFC 8899 の PROBE_TIMER は 1 秒以上なので、このレッスンでは時間ではなく回数を数えています。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="plpmtud-compare">
          <div style={LESSON_LABEL}>
            {t(`Four ways, on a ${pathMtu}-byte path`, `${pathMtu} バイトの経路で 4 つのやり方`)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Method', 'やり方')}</th>
                  <th style={cell}>{t('Sizes tried', '試すサイズ')}</th>
                  <th style={cell}>{t('Ends at', '結果')}</th>
                </tr>
              </thead>
              <tbody>
                <tr data-testid="plpmtud-row-classic-icmp">
                  <td style={cell}>
                    {t('Classic PMTUD, ICMP arrives', '従来の PMTUD・ICMP が届く')}
                  </td>
                  <td style={mono}>{withIcmp.sizes.length}</td>
                  <td style={mono}>{`${withIcmp.sizes[withIcmp.sizes.length - 1]} B`}</td>
                </tr>
                <tr
                  data-testid="plpmtud-row-classic-blocked"
                  data-delivers={String(blackHole.delivers)}
                >
                  <td style={cell}>
                    {t('Classic PMTUD, ICMP filtered', '従来の PMTUD・ICMP が捨てられる')}
                  </td>
                  <td style={mono}>
                    {blackHole.delivers
                      ? blackHole.sizes.length
                      : t(
                          `${blackHole.sizes.length}, resent`,
                          `${blackHole.sizes.length}（再送のみ）`,
                        )}
                  </td>
                  <td style={cell}>
                    {blackHole.delivers
                      ? `${blackHole.sizes[0]} B`
                      : t(
                          'Black hole: full-size packets are lost again and again',
                          'ブラックホール：大きなパケットが失われ続ける',
                        )}
                  </td>
                </tr>
                <tr data-testid="plpmtud-row-binary">
                  <td style={cell}>{t('DPLPMTUD, this search', 'DPLPMTUD・この探し方')}</td>
                  <td style={mono}>{result.probes.length}</td>
                  <td style={mono}>{`${result.plpmtu} B`}</td>
                </tr>
                <tr data-testid="plpmtud-row-bytewise" data-probes={slow.probes.length}>
                  <td style={cell}>
                    {t('DPLPMTUD, one byte at a time', 'DPLPMTUD・1 バイトずつ')}
                  </td>
                  <td style={mono}>{slow.probes.length}</td>
                  <td style={mono}>{`${slow.plpmtu} B`}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: the path never changes and probes are lost only for being too big. RFC 8899 does not fix the probe sizes — it suggests steps that gain the most, for example from a table of common MTUs — so the halving with an ${SEARCH_STEP}-byte stop is this lesson’s choice. It recommends a BASE_PLPMTU of ${BASE_PLPMTU} bytes for IPv4 and, for IPv6, puts the minimum at whatever makes a 1280-byte packet; QUIC uses ${BASE_PLPMTU} for both (RFC 9000 §14.3). A sender may still use a validated Packet Too Big as a hint. If acknowledged full-size packets later start to vanish, DPLPMTUD treats it as a black hole and drops back to the base size.`,
              `簡略化しています。経路は変わらず、プローブが失われるのは大きすぎるときだけとしました。RFC 8899 はプローブのサイズを決めておらず、よくある MTU の表などから効率よく増やせる刻みを選ぶよう勧めています。半分ずつ狭めて ${SEARCH_STEP} バイトで止めるのはこのレッスンの選択です。RFC 8899 は IPv4 の BASE_PLPMTU として ${BASE_PLPMTU} バイトを勧め、IPv6 では 1280 バイトのパケットになる大きさを最小としています。QUIC はどちらも ${BASE_PLPMTU} です（RFC 9000 §14.3）。正当性を確かめた Packet Too Big をヒントとして使うこともできます。一度通っていた大きさのパケットがあとで消えはじめたら、DPLPMTUD はブラックホールとみなして基準のサイズに戻ります。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function PlpmtudDemo() {
  return (
    <DemoShell
      title="PLPMTUD: probing for the path MTU"
      desc="Finding how big a packet the path carries when the ICMP that classic PMTUD waits for never arrives"
    >
      <PlpmtudLesson />
    </DemoShell>
  );
}
