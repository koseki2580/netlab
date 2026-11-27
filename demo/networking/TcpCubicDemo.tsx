import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import { LessonChallenges } from '../components/LessonChallenges';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  BETA_CUBIC,
  C_CUBIC,
  FLIGHT,
  MIN_RTO_MS,
  PACKET_BYTES,
  WC_DEL_ACK_MS,
  cubicK,
  cubicRecovery,
  curves,
  renoRecovery,
  tailLoss,
  windowPackets,
} from './tcpCubic';
import { tcpCubicChallenges } from './tcpCubicChallenges';

type RenoAnswer = 'seconds' | 'minute' | 'ten-minutes' | 'hour';
const RENO_ANSWERS: readonly RenoAnswer[] = ['seconds', 'minute', 'ten-minutes', 'hour'];
type TailAnswer = 'one-rtt' | 'few-rtts' | 'second' | 'never';
const TAIL_ANSWERS: readonly TailAnswer[] = ['one-rtt', 'few-rtts', 'second', 'never'];

const ASKED_BPS = 10e9;
const ASKED_RTT_MS = 100;
const ASKED_SRTT_MS = 50;
const ASKED_LOST = 2;
const SPEEDS: readonly number[] = [100e6, 1e9, 10e9];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const speedName = (bps: number) => (bps >= 1e9 ? `${bps / 1e9} Gb/s` : `${bps / 1e6} Mb/s`);
const packets = (n: number) => Math.round(n).toLocaleString('en');

/** A recovery time, in the unit that reads best. */
function duration(seconds: number, t: (en: string, ja: string) => string): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 120) return t(`${seconds.toFixed(1)} s`, `${seconds.toFixed(1)} 秒`);
  return t(`${Math.round(seconds / 60)} min`, `${Math.round(seconds / 60)} 分`);
}

function renoAnswerOf(seconds: number): RenoAnswer {
  if (seconds < 10) return 'seconds';
  if (seconds < 300) return 'minute';
  return seconds < 1800 ? 'ten-minutes' : 'hour';
}

function tailAnswerOf(ms: number, srttMs: number): TailAnswer {
  if (ms <= 1.5 * srttMs) return 'one-rtt';
  return ms < 500 ? 'few-rtts' : 'second';
}

const CHART_W = 360;
const CHART_H = 140;

/** Both windows from the loss to 2·K, as lines. */
function WindowChart({ wMax, rttMs }: { wMax: number; rttMs: number }) {
  const t = useT();
  const untilS = 2 * cubicK(wMax);
  const top = 1.25 * wMax;
  const points = curves(wMax, rttMs, untilS);
  const x = (s: number) => (s / untilS) * CHART_W;
  const y = (w: number) => CHART_H - (Math.min(w, top) / top) * CHART_H;
  const line = (pick: 'reno' | 'cubic') =>
    points.map((p) => `${x(p.t).toFixed(1)},${y(p[pick]).toFixed(1)}`).join(' ');
  const last = points[points.length - 1]!;
  return (
    <svg
      data-testid="cubic-chart"
      data-until={untilS.toFixed(1)}
      viewBox={`-64 -10 ${CHART_W + 120} ${CHART_H + 44}`}
      style={{ width: '100%', minWidth: 360, maxWidth: 560 }}
      role="img"
      aria-label={t(
        `Window over ${untilS.toFixed(0)} s after the loss: CUBIC returns to ${packets(wMax)} packets, Reno reaches ${packets(last.reno)}`,
        `損失後 ${untilS.toFixed(0)} 秒間のウィンドウ：CUBIC は ${packets(wMax)} パケットに戻り、Reno は ${packets(last.reno)} パケット`,
      )}
    >
      {[0, wMax / 2, wMax].map((w) => (
        <g key={w}>
          <line
            x1={0}
            x2={CHART_W}
            y1={y(w)}
            y2={y(w)}
            stroke="var(--netlab-border)"
            strokeDasharray={w === wMax ? '4 3' : undefined}
          />
          <text
            x={-6}
            y={y(w) + 4}
            textAnchor="end"
            fontSize={12}
            fill="var(--netlab-text-secondary)"
          >
            {packets(w)}
          </text>
        </g>
      ))}
      <polyline
        points={line('reno')}
        fill="none"
        stroke="var(--netlab-accent-orange)"
        strokeWidth={2}
      />
      <polyline
        points={line('cubic')}
        fill="none"
        stroke="var(--netlab-accent-cyan)"
        strokeWidth={2}
      />
      <text x={CHART_W + 6} y={y(last.reno) + 4} fontSize={12} fill="var(--netlab-accent-orange)">
        Reno
      </text>
      <text x={CHART_W + 6} y={y(last.cubic) + 4} fontSize={12} fill="var(--netlab-accent-cyan)">
        CUBIC
      </text>
      <text x={0} y={CHART_H + 18} fontSize={12} fill="var(--netlab-text-secondary)">
        0 s
      </text>
      <text
        x={x(untilS / 2)}
        y={CHART_H + 18}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {`K = ${(untilS / 2).toFixed(1)} s`}
      </text>
      <text
        x={CHART_W}
        y={CHART_H + 18}
        textAnchor="end"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {`${untilS.toFixed(1)} s`}
      </text>
      <text
        x={CHART_W / 2}
        y={CHART_H + 36}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {t('time since the loss →', '損失からの時間 →')}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function TcpCubicLesson() {
  const t = useT();
  const [guess, setGuess] = useState<RenoAnswer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [bps, setBps] = useState(ASKED_BPS);
  const [rttMs, setRttMs] = useState(ASKED_RTT_MS);
  const [tailGuess, setTailGuess] = useState<TailAnswer | null>(null);
  const [tailRevealed, setTailRevealed] = useState(false);
  const [srttMs, setSrttMs] = useState(ASKED_SRTT_MS);
  const [lost, setLost] = useState(ASKED_LOST);

  const askedW = windowPackets(ASKED_BPS, ASKED_RTT_MS);
  const askedReno = renoRecovery(askedW, ASKED_RTT_MS);
  const askedCubic = cubicRecovery(askedW, ASKED_RTT_MS);
  const truth = renoAnswerOf(askedReno.seconds);
  const w = windowPackets(bps, rttMs);
  const reno = renoRecovery(w, rttMs);
  const cubic = cubicRecovery(w, rttMs);

  const askedTail = tailLoss(ASKED_SRTT_MS, ASKED_LOST);
  const tailTruth = tailAnswerOf(askedTail.tlp.firstResendMs, ASKED_SRTT_MS);
  const tail = tailLoss(srttMs, lost);

  const renoName = (answer: RenoAnswer) =>
    ({
      seconds: t('A few seconds', '数秒'),
      minute: t('About a minute', '1 分くらい'),
      'ten-minutes': t('About ten minutes', '10 分くらい'),
      hour: t('More than an hour', '1 時間以上'),
    })[answer];
  const tailName = (answer: TailAnswer) =>
    ({
      'one-rtt': t('After about one round trip (~50 ms)', '約 1 往復後（50 ms ほど）'),
      'few-rtts': t('After a few round trips (100–300 ms)', '数往復後（100〜300 ms）'),
      second: t('After about a second', '1 秒ほど後'),
      never: t(
        'Never on its own: it needs three duplicate ACKs',
        '自分からは送らない（重複 ACK 3 つが必要）',
      ),
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
        <div style={LESSON_LABEL}>
          {t('One loss on a fast, long path', '速くて遠い経路での 1 回の損失')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A server sends to a client over a ${speedName(ASKED_BPS)} path with a ${ASKED_RTT_MS} ms round trip. To keep it full, ${packets(askedW)} packets of ${PACKET_BYTES} bytes must be in flight. The connection has reached that window when a single packet is lost. The sender cuts its window, then grows it again.`,
            `サーバーが ${speedName(ASKED_BPS)}、往復 ${ASKED_RTT_MS} ms の経路でクライアントへ送っています。この経路を埋めるには、${PACKET_BYTES} バイトのパケットを ${packets(askedW)} 個送りっぱなしにしておく必要があります。接続がそのウィンドウに達したところで、パケットが 1 つだけ失われました。送り手はウィンドウを縮め、また広げていきます。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="cubic-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The sender uses Reno, the classic congestion control (RFC 5681). How long until its window is back where it was?',
            '送り手は昔ながらの輻輳制御 Reno（RFC 5681）を使います。ウィンドウが元の大きさに戻るまで、どれくらいかかる？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {RENO_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`cubic-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, guess, truth, revealed)}
              {renoName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="cubic-reveal"
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
              `${duration(askedReno.seconds, t)}. Reno halves its window to ${packets(askedReno.after)} packets and adds just one packet per ${ASKED_RTT_MS} ms round trip, so it needs ${packets(askedW - askedReno.after)} round trips. CUBIC (RFC 9438), the default in Linux, Windows and macOS, cuts only to ${BETA_CUBIC * 100}% (${packets(askedCubic.after)}) and grows along a cubic curve of time since the loss: it is back after ${duration(askedCubic.seconds, t)}.`,
              `${duration(askedReno.seconds, t)} です。Reno はウィンドウを半分の ${packets(askedReno.after)} パケットにし、${ASKED_RTT_MS} ms の 1 往復ごとに 1 パケットしか増やさないので、${packets(askedW - askedReno.after)} 往復かかります。Linux・Windows・macOS の標準である CUBIC（RFC 9438）は ${BETA_CUBIC * 100}%（${packets(askedCubic.after)}）までしか減らさず、損失からの時間の 3 次関数でウィンドウを広げるので、${duration(askedCubic.seconds, t)} で戻ります。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="cubic-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run Reno and CUBIC', 'Reno と CUBIC を走らせる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="cubic-results">
          <div style={LESSON_LABEL}>{t('Change the path', '経路を変えてみる')}</div>
          <div
            role="tablist"
            aria-label={t('Bandwidth', '帯域')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                role="tab"
                aria-selected={bps === speed}
                data-testid={`cubic-speed-${speed}`}
                onClick={() => setBps(speed)}
                style={lessonChoice(bps === speed)}
              >
                {`${bps === speed ? '✓ ' : ''}${speedName(speed)}`}
              </button>
            ))}
          </div>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            {t('Round trip', '往復時間')}
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={rttMs}
              data-testid="cubic-rtt"
              onChange={(event) => setRttMs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${rttMs} ms`}</span>
          </label>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell} />
                  <th style={cell}>{t('Window before', '損失前')}</th>
                  <th style={cell}>{t('Right after', '直後')}</th>
                  <th style={cell}>{t('Back after', '戻るまで')}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['reno', 'Reno', reno],
                    ['cubic', 'CUBIC', cubic],
                  ] as const
                ).map(([id, name, result]) => (
                  <tr
                    key={id}
                    data-testid={`cubic-row-${id}`}
                    data-ms={Math.round(result.seconds * 1000)}
                  >
                    <td style={cell}>{name}</td>
                    <td style={mono}>{packets(result.wMax)}</td>
                    <td style={mono}>{packets(result.after)}</td>
                    <td style={mono}>{duration(result.seconds, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <WindowChart wMax={w} rttMs={rttMs} />
          </div>
          <p style={{ margin: '4px 0 0', lineHeight: 1.7 }}>
            {t(
              `CUBIC’s window is W(t) = ${C_CUBIC}·(t − K)³ + W_max, with K = ∛(W_max·(1 − ${BETA_CUBIC})/${C_CUBIC}) seconds. It rises fast just after the loss, slows as it nears the old window, then probes beyond it. Because t is clock time, not round trips, a longer round trip does not slow its cubic curve. On a small, short path its Reno-friendly estimate W_est takes over instead. RFC 9438 designs it to give about the throughput a Reno flow would get: it starts from 70% rather than 50%, but climbs back a little more slowly, so in the table Reno can be back first.`,
              `CUBIC のウィンドウは W(t) = ${C_CUBIC}·(t − K)³ + W_max、K = ∛(W_max·(1 − ${BETA_CUBIC})/${C_CUBIC}) 秒です。損失の直後は速く増え、元のウィンドウに近づくと緩やかになり、そのあと先を探りに行きます。t は往復の回数ではなく時計の時間なので、往復時間が長くても 3 次曲線は遅くなりません。小さく短い経路では、代わりに Reno 相当の見積もり（W_est）が上回ります。RFC 9438 はこれを、Reno の流れとほぼ同じスループットになるように決めています。70% から始まる代わりに戻る速さは少し遅いので、表では Reno のほうが先に戻ることもあります。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: one flow, one loss, windows in whole ${PACKET_BYTES}-byte packets, no slow start and no fast convergence. BBR takes another approach: it does not treat loss as the signal, but estimates the bottleneck bandwidth and round trip and paces to them; it is still an IETF draft.`,
              `簡略化しています。流れは 1 本、損失は 1 回、ウィンドウは ${PACKET_BYTES} バイトのパケット単位で数え、スロースタートや fast convergence は入れていません。BBR は別の考え方で、損失を合図にせず、ボトルネックの帯域と往復時間を見積もってその速さで送ります。BBR はまだ IETF のドラフトです。`,
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Losing the tail', '最後の部分の損失')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A server sends a ${FLIGHT}-segment response, the round trip (SRTT) is ${ASKED_SRTT_MS} ms, and the last ${ASKED_LOST} segments are lost. Fast retransmit needs duplicate ACKs, and those come only from segments that arrive after a hole. Here nothing comes after the holes.`,
            `サーバーが ${FLIGHT} セグメントの応答を送ります。往復時間（SRTT）は ${ASKED_SRTT_MS} ms で、最後の ${ASKED_LOST} セグメントが失われました。高速再送には重複 ACK が必要ですが、重複 ACK は穴より後に届いたセグメントからしか返りません。ここでは穴の後に何も届きません。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="tlp-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The sender uses RACK-TLP (RFC 8985). When does it first send lost data again, counted from the moment the response was sent?',
            '送り手は RACK-TLP（RFC 8985）を使います。失われたデータを最初に送り直すのは、応答を送ってからどれくらい後？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {TAIL_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={tailGuess === answer}
              data-testid={`tlp-guess-${answer}`}
              disabled={tailRevealed}
              onClick={() => setTailGuess(answer)}
              style={{ ...lessonChoice(tailGuess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, tailGuess, tailTruth, tailRevealed)}
              {tailName(answer)}
            </button>
          ))}
        </div>
        {tailRevealed ? (
          <p
            data-testid="tlp-reveal"
            data-right={String(tailGuess === tailTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {tailGuess === tailTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `After ${askedTail.tlp.firstResendMs} ms. The ACKs for the delivered segments arrive after one round trip (${ASKED_SRTT_MS} ms); then nothing more comes, and the probe timeout PTO = 2 × SRTT = ${askedTail.ptoMs} ms runs out. The sender resends its last segment as a probe. That probe’s SACK shows the other hole, and RACK resends it at once: all lost data is on its way by ${askedTail.tlp.allResentMs} ms. Without TLP the sender would wait for the retransmission timeout, at least ${MIN_RTO_MS / 1000} s by RFC 6298: first resend at ${askedTail.rtoOnly.firstResendMs} ms, starting again from a window of ${askedTail.rtoOnly.windowAfter} segment.`,
              `${askedTail.tlp.firstResendMs} ms 後です。届いたセグメントの ACK は 1 往復（${ASKED_SRTT_MS} ms）後に戻りますが、その後は何も来ず、プローブタイムアウト PTO = 2 × SRTT = ${askedTail.ptoMs} ms が切れます。送り手は最後のセグメントをプローブとして送り直します。そのプローブへの SACK でもう 1 つの穴がわかり、RACK がすぐ送り直すので、${askedTail.tlp.allResentMs} ms までに失われたデータはすべて送り直されます。TLP がなければ再送タイムアウトを待つことになり、RFC 6298 ではその最小値は ${MIN_RTO_MS / 1000} 秒です。最初の再送は ${askedTail.rtoOnly.firstResendMs} ms 後で、ウィンドウ ${askedTail.rtoOnly.windowAfter} セグメントからやり直します。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="tlp-reveal-button"
            disabled={!tailGuess}
            style={{
              ...(tailGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setTailRevealed(true)}
          >
            {tailGuess
              ? t('Lose the tail', '最後を失わせる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {tailRevealed ? (
        <div style={LESSON_CARD} data-testid="tlp-results">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              SRTT
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={srttMs}
                data-testid="tlp-srtt"
                onChange={(event) => setSrttMs(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${srttMs} ms`}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Lost at the end', '最後に失われる数')}
              <input
                type="range"
                min={1}
                max={5}
                value={lost}
                data-testid="tlp-lost"
                onChange={(event) => setLost(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{lost}</span>
            </label>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Timer', 'タイマー')}</th>
                  <th style={cell}>{t('First resend', '最初の再送')}</th>
                  <th style={cell}>{t('All resent', 'すべて再送')}</th>
                  <th style={cell}>{t('Window after', 'その後のウィンドウ')}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['tlp', `RACK-TLP (PTO ${tail.ptoMs} ms)`, tail.tlp],
                    ['rto', `RTO (${tail.rtoMs} ms)`, tail.rtoOnly],
                  ] as const
                ).map(([id, name, repair]) => (
                  <tr
                    key={id}
                    data-testid={`tlp-row-${id}`}
                    data-first={repair.firstResendMs}
                    data-all={repair.allResentMs}
                  >
                    <td style={mono}>{name}</td>
                    <td style={mono}>{`${repair.firstResendMs} ms`}</td>
                    <td style={mono}>{`${repair.allResentMs} ms`}</td>
                    <td style={mono}>{repair.windowAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `With one segment lost, only one is in flight when the timer is set, so the PTO adds ${WC_DEL_ACK_MS} ms in case the receiver is delaying its ACK. The PTO is never longer than the RTO, so on a long round trip both fire together: TLP helps most where the RTO’s 1 s floor is many round trips.`,
              `失われるのが 1 セグメントのときは、タイマーを仕掛けるときに送りっぱなしのセグメントが 1 つだけなので、受け手が ACK を遅らせている場合に備えて PTO に ${WC_DEL_ACK_MS} ms を足します。PTO は RTO を超えないので、往復時間が長いと両者は同時に切れます。TLP が最も効くのは、RTO の下限 1 秒が何往復分にもなる経路です。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: the ${FLIGHT} segments leave in one burst and the surviving ones are acknowledged together one SRTT later; RTTVAR is taken as SRTT/4. The window after fast recovery is CUBIC’s ${BETA_CUBIC} × ${FLIGHT}. Linux uses a 200 ms minimum RTO instead of 1 s; that is a vendor default, not the RFC’s value.`,
              `簡略化しています。${FLIGHT} セグメントは一度に送り出され、届いたものは 1 SRTT 後にまとめて ACK されるものとし、RTTVAR は SRTT/4 としました。高速リカバリ後のウィンドウは CUBIC の ${BETA_CUBIC} × ${FLIGHT} です。Linux は RTO の最小値に 1 秒ではなく 200 ms を使いますが、これは実装の初期値で、RFC の値ではありません。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed && tailRevealed && (
        <LessonChallenges
          lessonId="tcp-cubic"
          challenges={tcpCubicChallenges({ bps, rttMs, srttMs, lost })}
        />
      )}
    </div>
  );
}

export default function TcpCubicDemo() {
  return (
    <DemoShell
      title="CUBIC and RACK-TLP"
      desc="How a sender recovers from one loss on a fast, long path, and from losing the end of a response"
    >
      <TcpCubicLesson />
    </DemoShell>
  );
}
