import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { useViewport } from '../../src/utils/useViewport';
import {
  DEFAULT_LOST,
  FAR_RTT_MS,
  LINK_BPS,
  MAX_SHIFT,
  MAX_UNSCALED_WINDOW,
  RTTS_MS,
  WINDOW_SEGMENTS,
  cumulativeAck,
  maxSackBlocks,
  recovery,
  sackBlocks,
  scaledWindow,
  throughputBps,
  transfer,
} from './tcpOptions';

type RateAnswer = 'link' | 'hundreds' | 'tens' | 'few';
const RATE_ANSWERS: readonly RateAnswer[] = ['link', 'hundreds', 'tens', 'few'];
type SackAnswer = 'one' | 'three' | 'timeout';
const SACK_ANSWERS: readonly SackAnswer[] = ['one', 'three', 'timeout'];

/** Segments the learner may drop; the last three always arrive, so fast retransmit starts. */
const DROPPABLE = WINDOW_SEGMENTS - 3;
const BLOCK_LIMIT = maxSackBlocks(false);

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

function rate(bps: number): string {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbit/s`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbit/s`;
  return `${(bps / 1e3).toFixed(0)} kbit/s`;
}
const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(2)} MB`;

/** Which answer a throughput matches. */
function rateAnswerOf(bps: number): RateAnswer {
  if (bps >= 0.9 * LINK_BPS) return 'link';
  if (bps >= 100e6) return 'hundreds';
  return bps >= 10e6 ? 'tens' : 'few';
}

function sackAnswerOf(roundTrips: number): SackAnswer {
  if (roundTrips === 1) return 'one';
  return roundTrips === 3 ? 'three' : 'timeout';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function TcpOptionsLesson() {
  const t = useT();
  const { isNarrow } = useViewport();
  const [guess, setGuess] = useState<RateAnswer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rttMs, setRttMs] = useState(FAR_RTT_MS);
  const [stripped, setStripped] = useState(false);
  const [sackGuess, setSackGuess] = useState<SackAnswer | null>(null);
  const [sackRevealed, setSackRevealed] = useState(false);
  const [lost, setLost] = useState<readonly number[]>(DEFAULT_LOST);

  const asked = transfer(LINK_BPS, FAR_RTT_MS, { offered: false, stripped: false });
  const askedScaled = transfer(LINK_BPS, FAR_RTT_MS, { offered: true, stripped: false });
  const rateTruth = rateAnswerOf(asked.throughputBps);
  const explored = transfer(LINK_BPS, rttMs, { offered: true, stripped });

  const asked2 = recovery(DEFAULT_LOST, false);
  const sackTruth = sackAnswerOf(asked2.roundTrips);
  const sorted = [...lost].sort((a, b) => a - b);
  const ack = cumulativeAck(WINDOW_SEGMENTS, sorted);
  const blocks = sackBlocks(WINDOW_SEGMENTS, sorted, BLOCK_LIMIT);
  const allBlocks = sackBlocks(WINDOW_SEGMENTS, sorted, WINDOW_SEGMENTS);
  const newReno = recovery(sorted, false);
  const withSack = recovery(sorted, true);

  const rateName = (answer: RateAnswer) =>
    ({
      link: t('About 1 Gbit/s: the link speed', '約 1 Gbit/s（回線の速さそのもの）'),
      hundreds: t('A few hundred Mbit/s', '数百 Mbit/s'),
      tens: t('About 35 Mbit/s', '約 35 Mbit/s'),
      few: t('About 3.5 Mbit/s', '約 3.5 Mbit/s'),
    })[answer];
  const sackName = (answer: SackAnswer) =>
    ({
      one: t('1 round trip', '1 往復'),
      three: t('3 round trips', '3 往復'),
      timeout: t('It waits for the retransmission timer', '再送タイマーが切れるのを待つことになる'),
    })[answer];
  const toggleLost = (seg: number) =>
    setLost((current) =>
      current.includes(seg) ? current.filter((s) => s !== seg) : [...current, seg],
    );

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
        <div style={LESSON_LABEL}>{t('A long, fast path', '長くて速い経路')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A TCP sender may have only one receive window of data in flight; then it must wait for ACKs before sending more. On a short path the ACKs come back at once. On a long one they take a whole round trip. The window scale and SACK options, agreed in the SYN and SYN-ACK, decide how well TCP copes with that.',
            'TCP の送り手が ACK を待たずに送れるのは、受信ウィンドウ 1 つ分のデータまでです。それを送ったら、ACK が返るまで次を送れません。近い相手なら ACK はすぐ戻りますが、遠い相手では 1 往復かかります。SYN と SYN-ACK で取り決めるウィンドウスケールと SACK のオプションが、これにどこまで対応できるかを決めます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="tcpo-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `You download a large file from a server ${FAR_RTT_MS} ms away (round trip). The path is 1 Gbit/s all the way, nothing else uses it, and nothing is lost. Neither the SYN nor the SYN-ACK carries the window scale option. What is the fastest the download can go?`,
            `往復 ${FAR_RTT_MS} ms 離れたサーバーから大きなファイルをダウンロードします。経路は端から端まで 1 Gbit/s で、ほかに使う通信はなく、パケットも失われません。SYN にも SYN-ACK にもウィンドウスケールのオプションは入っていません。ダウンロードはいちばん速くてどれくらい？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {RATE_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`tcpo-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left', minHeight: 44 }}
            >
              {guess === answer ? '✓ ' : ''}
              {rateName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="tcpo-reveal"
            data-right={String(guess === rateTruth)}
            data-throughput={Math.round(asked.throughputBps)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === rateTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${rate(asked.throughputBps)}. The window field in the TCP header is 16 bits, so without scaling the window is at most ${MAX_UNSCALED_WINDOW.toLocaleString('en')} bytes. The sender sends that, then waits ${FAR_RTT_MS} ms for the ACKs: ${MAX_UNSCALED_WINDOW.toLocaleString('en')} × 8 bits ÷ ${FAR_RTT_MS / 1000} s = ${rate(asked.throughputBps)}, ${(asked.utilisation * 100).toFixed(2)} % of the link. To keep 1 Gbit/s flowing for ${FAR_RTT_MS} ms, ${megabytes(asked.bdpBytes)} must be in flight (the bandwidth-delay product). Window scale ${askedScaled.shiftNeeded} allows ${scaledWindow(askedScaled.shiftNeeded ?? 0).toLocaleString('en')} bytes, enough to fill the link.`,
              `${rate(asked.throughputBps)} です。TCP ヘッダのウィンドウ欄は 16 ビットなので、スケールなしのウィンドウは最大 ${MAX_UNSCALED_WINDOW.toLocaleString('ja')} バイトです。送り手はそれだけ送ると、ACK が戻るまで ${FAR_RTT_MS} ms 待ちます。${MAX_UNSCALED_WINDOW.toLocaleString('ja')} × 8 ビット ÷ ${FAR_RTT_MS / 1000} 秒 = ${rate(asked.throughputBps)} で、回線の ${(asked.utilisation * 100).toFixed(2)} % しか使えません。1 Gbit/s を ${FAR_RTT_MS} ms 流し続けるには、${megabytes(asked.bdpBytes)} が送信中である必要があります（帯域幅遅延積、BDP）。ウィンドウスケール ${askedScaled.shiftNeeded} なら ${scaledWindow(askedScaled.shiftNeeded ?? 0).toLocaleString('ja')} バイトまで広げられ、回線を使い切れます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="tcpo-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Work out the limit', '上限を計算する')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="tcpo-table">
          <div style={LESSON_LABEL}>{t('Window / round trip', 'ウィンドウ ÷ 往復時間')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Round trip', '往復時間')}</th>
                  <th style={cell}>{t('Most without scaling', 'スケールなしの上限')}</th>
                  <th style={cell}>{t('BDP at 1 Gbit/s', '1 Gbit/s の BDP')}</th>
                  <th style={cell}>{t('Shift needed', '必要なシフト')}</th>
                </tr>
              </thead>
              <tbody>
                {RTTS_MS.map((rtt) => {
                  const row = transfer(LINK_BPS, rtt, { offered: true, stripped: false });
                  const unscaled = throughputBps(MAX_UNSCALED_WINDOW, rtt);
                  return (
                    <tr
                      key={rtt}
                      data-testid={`tcpo-row-${rtt}`}
                      data-throughput={Math.round(unscaled)}
                      data-shift={row.shiftNeeded ?? ''}
                    >
                      <td style={mono}>{`${rtt} ms`}</td>
                      <td style={mono}>{rate(unscaled)}</td>
                      <td style={mono}>{megabytes(row.bdpBytes)}</td>
                      <td style={mono}>{row.shiftNeeded}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `The shift is the smallest one with ${MAX_UNSCALED_WINDOW.toLocaleString('en')} << shift ≥ BDP. RFC 7323 allows up to ${MAX_SHIFT}, about ${(scaledWindow(MAX_SHIFT) / 1e9).toFixed(2)} GB. Each end announces its own shift in its SYN; the window field in the SYN itself is never scaled.`,
              `シフトは「${MAX_UNSCALED_WINDOW.toLocaleString('ja')} << シフト ≥ BDP」となる最小の値です。RFC 7323 では最大 ${MAX_SHIFT}、約 ${(scaledWindow(MAX_SHIFT) / 1e9).toFixed(2)} GB まで広げられます。シフトは両端がそれぞれ自分の SYN で知らせます。SYN そのもののウィンドウ欄はスケールされません。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="tcpo-explore">
          <div style={LESSON_LABEL}>{t('Try another path', 'ほかの経路で試す')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Round trip', '往復時間')}
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={rttMs}
              data-testid="tcpo-rtt"
              onChange={(event) => setRttMs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${rttMs} ms`}</span>
          </label>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {[false, true].map((value) => (
              <button
                key={String(value)}
                type="button"
                role="tab"
                aria-selected={stripped === value}
                data-testid={`tcpo-strip-${value ? 'on' : 'off'}`}
                onClick={() => setStripped(value)}
                style={{ ...lessonChoice(stripped === value), minHeight: 44 }}
              >
                {stripped === value ? '✓ ' : ''}
                {value
                  ? t('A middlebox strips the option', '途中の機器がオプションを消す')
                  : t('Both ends offer window scaling', '両端がウィンドウスケールを示す')}
              </button>
            ))}
          </div>
          <p
            data-testid="tcpo-path"
            data-bdp={Math.round(explored.bdpBytes)}
            data-shift={explored.shiftNeeded ?? ''}
            data-throughput={Math.round(explored.throughputBps)}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {stripped
              ? t(
                  `BDP ${megabytes(explored.bdpBytes)}, but scaling is off: window ${explored.windowBytes.toLocaleString('en')} bytes, ${rate(explored.throughputBps)} (${(explored.utilisation * 100).toFixed(1)} % of the link).`,
                  `BDP は ${megabytes(explored.bdpBytes)} ですが、スケールは使われません。ウィンドウ ${explored.windowBytes.toLocaleString('ja')} バイトで ${rate(explored.throughputBps)}（回線の ${(explored.utilisation * 100).toFixed(1)} %）です。`,
                )
              : t(
                  `BDP ${megabytes(explored.bdpBytes)}; shift ${explored.shiftNeeded} gives a window of ${explored.windowBytes.toLocaleString('en')} bytes: ${rate(explored.throughputBps)} (${(explored.utilisation * 100).toFixed(1)} % of the link).`,
                  `BDP は ${megabytes(explored.bdpBytes)}。シフト ${explored.shiftNeeded} でウィンドウは ${explored.windowBytes.toLocaleString('ja')} バイトになり、${rate(explored.throughputBps)}（回線の ${(explored.utilisation * 100).toFixed(1)} %）です。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Window scaling counts only if both ends send the option: the client in its SYN, the server in its SYN-ACK, and the server may send it only if the SYN had it. A firewall or load balancer that removes unknown options from the SYN therefore turns scaling off for the whole connection, and nothing warns you: the transfer just runs slowly on long paths. The receiver must also have the buffer memory to offer a window that large.',
              'ウィンドウスケールは、両端がオプションを送ったときだけ有効です。クライアントは SYN で、サーバーは SYN-ACK で送り、サーバーは SYN に入っていたときだけ送れます。そのため、知らないオプションを SYN から消してしまうファイアウォールやロードバランサーがあると、その接続全体でスケールが使われません。警告は何も出ず、遠い相手との転送がただ遅くなります。また、受信側にもそれだけのウィンドウを示せるバッファのメモリが必要です。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="tcpo-sack">
          <div style={LESSON_LABEL}>
            {t('Several losses in one window', '1 つのウィンドウで複数の損失')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `With a large window, one burst of loss can hit several segments at once. The sender sends segments 1–${WINDOW_SEGMENTS}; the ones marked × are lost. The ACKs for the segments after the first loss are duplicates, so fast retransmit starts.`,
              `ウィンドウが大きいと、1 回の損失のかたまりで複数のセグメントが失われることがあります。送り手はセグメント 1〜${WINDOW_SEGMENTS} を送り、× の付いたものが失われました。最初の損失より後のセグメントに対する ACK は重複 ACK になるので、高速再送が始まります。`,
            )}
          </p>
          {sackRevealed ? (
            <p data-testid="tcpo-seg-hint" style={{ margin: '0 0 8px', fontWeight: 700 }}>
              {t(
                'Click a segment to lose it or get it back.',
                'セグメントを押すと、失う・届くを切り替えられます。',
              )}
            </p>
          ) : null}
          <div
            role="group"
            aria-label={t('Segments of the window', 'ウィンドウのセグメント')}
            style={{
              display: 'grid',
              // Ten per row on wide screens; on narrow ones each box keeps a 44 px target and
              // the 20 segments wrap onto more rows.
              gridTemplateColumns: isNarrow
                ? 'repeat(auto-fill, minmax(44px, 1fr))'
                : 'repeat(10, minmax(0, 1fr))',
              gap: 4,
            }}
          >
            {Array.from({ length: WINDOW_SEGMENTS }, (_, index) => index + 1).map((seg) => {
              const isLost = sorted.includes(seg);
              return (
                <button
                  key={seg}
                  type="button"
                  aria-pressed={isLost}
                  aria-label={t(
                    `Segment ${seg}${isLost ? ', lost' : ''}`,
                    `セグメント ${seg}${isLost ? '（失われた）' : ''}`,
                  )}
                  data-testid={`tcpo-seg-${seg}`}
                  data-lost={String(isLost)}
                  disabled={!sackRevealed || seg > DROPPABLE}
                  onClick={() => toggleLost(seg)}
                  style={{
                    minHeight: 44,
                    minWidth: isNarrow ? 44 : 0,
                    padding: 0,
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    // Longhands only (no shorthand mixed in), so React updates them cleanly;
                    // the thicker bottom edge makes each box read as a pressable button.
                    borderStyle: 'solid',
                    borderWidth: '1px 1px 3px',
                    borderColor: isLost
                      ? 'var(--netlab-accent-red)'
                      : 'var(--netlab-border-strong)',
                    background: isLost ? 'var(--netlab-bg-surface)' : 'var(--netlab-bg-panel)',
                    color: isLost ? 'var(--netlab-accent-red)' : 'var(--netlab-text-primary)',
                    cursor: sackRevealed && seg <= DROPPABLE ? 'pointer' : 'default',
                  }}
                >
                  {isLost ? `×${seg}` : seg}
                </button>
              );
            })}
          </div>

          <p style={{ margin: '12px 0 8px', lineHeight: 1.7 }}>
            {t(
              `Segments ${DEFAULT_LOST.join(', ')} are lost, and this connection did not agree on SACK, so each ACK says only “the next segment I expect is …”. From the first retransmission until every hole is filled, how many round trips does recovery take?`,
              `セグメント ${DEFAULT_LOST.join('、')} が失われ、この接続では SACK を取り決めていません。だから ACK が伝えるのは「次に欲しいのは…番です」だけです。最初の再送からすべての穴が埋まるまで、回復に何往復かかる？`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6 }}
          >
            {SACK_ANSWERS.map((answer) => (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={sackGuess === answer}
                data-testid={`tcpo-sack-guess-${answer}`}
                disabled={sackRevealed}
                onClick={() => setSackGuess(answer)}
                style={{ ...lessonChoice(sackGuess === answer), textAlign: 'left', minHeight: 44 }}
              >
                {sackGuess === answer ? '✓ ' : ''}
                {sackName(answer)}
              </button>
            ))}
          </div>
          {sackRevealed ? (
            <p
              data-testid="tcpo-sack-reveal"
              data-right={String(sackGuess === sackTruth)}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {sackGuess === sackTruth
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `${asked2.roundTrips} round trips (${asked2.roundTrips * FAR_RTT_MS} ms at ${FAR_RTT_MS} ms). The duplicate ACKs trigger fast retransmit of segment ${asked2.perRound[0]?.join(', ')}, but they cannot say what else is missing. Only when the ACK for that retransmission comes back, a round trip later, does the sender see the next hole (a “partial ACK”), and so on: one lost segment per round trip (NewReno). The retransmission timer is not needed. With SACK, the ACKs also list the blocks the receiver holds, so the sender learns every hole at once.`,
                `${asked2.roundTrips} 往復（往復 ${FAR_RTT_MS} ms なら ${asked2.roundTrips * FAR_RTT_MS} ms）です。重複 ACK でセグメント ${asked2.perRound[0]?.join('、')} は高速再送されますが、ほかに何が欠けているかは ACK からわかりません。その再送への ACK が 1 往復後に戻って初めて、次の穴が見えます（「部分 ACK」）。これを繰り返すので、1 往復で直せる損失は 1 セグメントだけです（NewReno）。再送タイマーを待つ必要はありません。SACK があれば、ACK に受信側が持っているブロックも載るので、送り手はすべての穴を一度に知ることができます。`,
              )}
            </p>
          ) : (
            <button
              type="button"
              data-testid="tcpo-sack-reveal-button"
              disabled={!sackGuess}
              style={{
                ...LESSON_TEAL_BUTTON,
                marginTop: 8,
                opacity: sackGuess ? 1 : 0.5,
              }}
              onClick={() => setSackRevealed(true)}
            >
              {sackGuess
                ? t('Replay the recovery', '回復を再現する')
                : t('Predict first', '先に予想を選んでください')}
            </button>
          )}
        </div>
      ) : null}

      {sackRevealed ? (
        <div style={LESSON_CARD} data-testid="tcpo-sack-result">
          <div style={LESSON_LABEL}>
            {t('What the receiver’s ACK says', '受信側の ACK が伝えること')}
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Click segments 1–${DROPPABLE} above to lose or deliver them (the last three always arrive here, so fast retransmit starts).`,
              `上のセグメント 1〜${DROPPABLE} を押すと、失われる／届くを切り替えられます（ここでは最後の 3 つは必ず届くので、高速再送が始まります）。`,
            )}
          </p>
          <p
            data-testid="tcpo-ack"
            data-ack={ack}
            style={{ margin: '0 0 8px', fontFamily: 'monospace', fontWeight: 700 }}
          >
            {`ACK ${ack}${blocks.length ? `, SACK ${blocks.map((b) => `[${b.left}, ${b.right})`).join(' ')}` : ''}`}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('SACK block', 'SACK ブロック')}</th>
                  <th style={cell}>{t('Left edge', '左端')}</th>
                  <th style={cell}>{t('Right edge', '右端')}</th>
                  <th style={cell}>{t('Segments held', '受け取ったセグメント')}</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block, index) => (
                  <tr
                    key={block.left}
                    data-testid={`tcpo-block-${index + 1}`}
                    data-left={block.left}
                    data-right={block.right}
                  >
                    <td style={mono}>{index + 1}</td>
                    <td style={mono}>{block.left}</td>
                    <td style={mono}>{block.right}</td>
                    <td style={mono}>{`${block.left}–${block.right - 1}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `The right edge is the segment just after the block, as in the real option (which uses byte sequence numbers). The newest block comes first. The 40 bytes of TCP options hold at most ${maxSackBlocks(false)} blocks, or ${maxSackBlocks(true)} next to the timestamps option.${allBlocks.length > blocks.length ? ` Here ${allBlocks.length} blocks would be needed, so the oldest are left out; the sender still keeps what earlier ACKs told it.` : ''}`,
              `右端はブロックの直後のセグメントです。実際のオプションでも同じ決まりで、番号はバイト単位のシーケンス番号です。いちばん新しいブロックが先頭に来ます。TCP オプションの 40 バイトに入るのは最大 ${maxSackBlocks(false)} ブロック、タイムスタンプオプションと一緒なら ${maxSackBlocks(true)} ブロックです。${allBlocks.length > blocks.length ? `ここでは ${allBlocks.length} ブロック必要なので古いものは省かれますが、送り手はそれまでの ACK で知ったことを覚えています。` : ''}`,
            )}
          </p>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell} />
                  <th style={cell}>{t('Round trips', '往復')}</th>
                  <th style={cell}>{t(`At ${FAR_RTT_MS} ms`, `往復 ${FAR_RTT_MS} ms で`)}</th>
                  <th style={cell}>{t('Resent per round trip', '往復ごとの再送')}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['newreno', t('Without SACK (NewReno)', 'SACK なし（NewReno）'), newReno],
                    ['sack', t('With SACK', 'SACK あり'), withSack],
                  ] as const
                ).map(([id, name, result]) => (
                  <tr key={id} data-testid={`tcpo-recovery-${id}`} data-rounds={result.roundTrips}>
                    <td style={cell}>{name}</td>
                    <td style={mono}>{result.roundTrips}</td>
                    <td style={mono}>{`${result.roundTrips * FAR_RTT_MS} ms`}</td>
                    <td style={mono}>
                      {result.perRound.map((round) => `[${round.join(', ')}]`).join(' ') || '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: segments are numbered instead of using byte sequence numbers, the congestion window is taken as large enough to resend every hole at once, and the retransmissions themselves are not lost. SACK, like window scaling, is used only if both ends send “SACK permitted” in the SYN and SYN-ACK.',
              '簡略化しています。番号はバイトのシーケンス番号ではなくセグメントの番号で、輻輳ウィンドウはすべての穴を一度に再送できるだけ大きいものとし、再送したセグメントは失われないものとしています。SACK もウィンドウスケールと同じく、両端が SYN と SYN-ACK で「SACK permitted」を送ったときだけ使われます。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function TcpOptionsDemo() {
  return (
    <DemoShell
      title="TCP window scaling and SACK"
      desc="How two TCP options decide the speed of a long, fast path"
    >
      <TcpOptionsLesson />
    </DemoShell>
  );
}
