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
  LESSON_PATH,
  MESSAGES,
  ONE_WAY_MS,
  RECOVERY_MS,
  RFC_DEFAULTS,
  SPACING_MS,
  defaultFailoverParams,
  delayed,
  deliver,
  failover,
  type Failover,
  type MessageId,
} from './sctp';

type FailoverAnswer = 'one' | 'five' | 'thirty-one' | 'sixty-three';
const FAILOVER_ANSWERS: readonly FailoverAnswer[] = ['one', 'five', 'thirty-one', 'sixty-three'];
const FAILOVER_MS: Record<FailoverAnswer, number> = {
  one: 1000,
  five: 5000,
  'thirty-one': 31_000,
  'sixty-three': 63_000,
};

type HolAnswer = 'a1-only' | 'stream1' | 'all';
const HOL_ANSWERS: readonly HolAnswer[] = ['a1-only', 'stream1', 'all'];
const HOL_SETS: Record<HolAnswer, readonly MessageId[]> = {
  'a1-only': ['A1'],
  stream1: ['A1', 'A2', 'A3'],
  all: ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'],
};

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/** Which answer a failover time matches, if any. */
function failoverAnswerOf(ms: number): FailoverAnswer | undefined {
  return FAILOVER_ANSWERS.find((answer) => FAILOVER_MS[answer] === ms);
}

const CHART_W = 400;
const X0 = 16;
const X1 = CHART_W - 16;

/** The failed primary's timeouts as consecutive bars, each as long as its RTO. */
function TimeoutBar({ result }: { result: Failover }) {
  const t = useT();
  const secs = (ms: number) => Number((ms / 1000).toFixed(1));
  const x = (ms: number) => X0 + (ms / result.failoverMs) * (X1 - X0);
  return (
    <svg
      data-testid="sctp-timeout-bar"
      viewBox={`0 0 ${CHART_W} 76`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        `${result.timeouts.length} timeouts on the primary; failover after ${secs(result.failoverMs)} s`,
        `プライマリで ${result.timeouts.length} 回タイムアウト。${secs(result.failoverMs)} 秒後に切り替え`,
      )}
    >
      {result.timeouts.map((timeout, index) => {
        const from = x(timeout.atMs - timeout.rtoMs);
        const width = x(timeout.atMs) - from;
        return (
          <g key={timeout.n}>
            <rect
              x={from}
              y={14}
              width={Math.max(width, 1)}
              height={26}
              fill={index % 2 === 0 ? 'var(--netlab-accent-cyan)' : 'var(--netlab-accent-orange)'}
              stroke="var(--netlab-bg-primary)"
            />
            {width >= 34 ? (
              <text
                x={from + width / 2}
                y={32}
                textAnchor="middle"
                fontSize={12}
                fill="var(--netlab-bg-primary)"
              >
                {t(`${secs(timeout.rtoMs)} s`, `${secs(timeout.rtoMs)} 秒`)}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={X0} y={60} fontSize={12} fill="var(--netlab-text-secondary)">
        {t('0 s: primary fails', '0 秒：プライマリ障害')}
      </text>
      <text x={X1} y={60} textAnchor="end" fontSize={12} fill="var(--netlab-accent-red)">
        {t(`${secs(result.failoverMs)} s: failover`, `${secs(result.failoverMs)} 秒：切り替え`)}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function SctpLesson() {
  const t = useT();
  const [guess, setGuess] = useState<FailoverAnswer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pathMaxRetrans, setPathMaxRetrans] = useState<number>(RFC_DEFAULTS.pathMaxRetrans);
  const [rtoMinMs, setRtoMinMs] = useState<number>(RFC_DEFAULTS.rtoMinMs);
  const [holGuess, setHolGuess] = useState<HolAnswer | null>(null);
  const [holRevealed, setHolRevealed] = useState(false);
  const [lost, setLost] = useState<MessageId>('A1');

  const asked = failover(defaultFailoverParams());
  const truth = failoverAnswerOf(asked.failoverMs);
  const tuned = failover({ ...defaultFailoverParams(), pathMaxRetrans, rtoMinMs });
  const askedDelayed = delayed('sctp', 'A1');
  const holTruth = HOL_ANSWERS.find((answer) => sameSet(HOL_SETS[answer], askedDelayed));
  const tcpDelayedAsked = delayed('tcp', 'A1');
  const sctpRows = deliver('sctp', lost);
  const tcpRows = deliver('tcp', lost);

  const secs = (ms: number) => Number((ms / 1000).toFixed(1));
  const en = (ms: number) => (ms >= 1000 ? `${secs(ms)} s` : `${ms} ms`);
  const ja = (ms: number) => (ms >= 1000 ? `${secs(ms)} 秒` : `${ms} ms`);

  const failoverName = (answer: FailoverAnswer) =>
    ({
      one: t('About 1 s', '約 1 秒'),
      five: t('About 5 s', '約 5 秒'),
      'thirty-one': t('About 31 s', '約 31 秒'),
      'sixty-three': t('About 63 s', '約 63 秒'),
    })[answer];
  const holName = (answer: HolAnswer) =>
    ({
      'a1-only': t('Only A1', 'A1 だけ'),
      stream1: t('A1, A2 and A3', 'A1、A2、A3'),
      all: t('All six messages', '6 つのメッセージすべて'),
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
          {t('One association, two paths', '1 つのアソシエーション、2 本の経路')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'SCTP (RFC 9260) is a transport protocol used, for example, for telephone-network signalling. One SCTP connection, an association, can join hosts that each have two addresses. Host A sends to B’s first address over the primary path; B’s second address, over another network, is the secondary path. The same association can also carry several independent streams of messages.',
            'SCTP（RFC 9260）は、たとえば電話網のシグナリングで使われるトランスポートプロトコルです。SCTP の 1 本の接続（アソシエーション）は、それぞれアドレスを 2 つ持つホスト同士を結べます。ホスト A は B の 1 つめのアドレスへプライマリ経路で送り、別のネットワークを通る B の 2 つめのアドレスはセカンダリ経路になります。同じアソシエーションで、独立したメッセージのストリームを複数運ぶこともできます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="sctp-predict">
        <div style={LESSON_LABEL}>
          {t('Predict first: the primary path fails', 'まず予想：プライマリ経路の障害')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The primary path fails just after A sends data on it; the secondary still works. The round trip is ${LESSON_PATH.srttMs} ms, so A’s retransmission timer (RTO) starts at RTO.Min, ${en(RFC_DEFAULTS.rtoMinMs)}. Each time the timer runs out, A counts one error on the primary and doubles the RTO, up to RTO.Max (${en(RFC_DEFAULTS.rtoMaxMs)}). A keeps sending on the primary until its error count exceeds Path.Max.Retrans = ${RFC_DEFAULTS.pathMaxRetrans}; then it marks the primary inactive and moves to the secondary. These are the RFC defaults. How long after the failure does A move to the secondary?`,
            `A がプライマリ経路でデータを送った直後に、その経路が切れました。セカンダリ経路は生きています。往復時間は ${LESSON_PATH.srttMs} ms なので、A の再送タイマー（RTO）は RTO.Min の ${ja(RFC_DEFAULTS.rtoMinMs)} から始まります。タイマーが切れるたびに、A はプライマリのエラーを 1 つ数えて RTO を 2 倍にします（上限は RTO.Max の ${ja(RFC_DEFAULTS.rtoMaxMs)}）。A はエラーの数が Path.Max.Retrans = ${RFC_DEFAULTS.pathMaxRetrans} を超えるまでプライマリで送り続け、超えたらプライマリを使用不可とみなしてセカンダリへ移ります。どれも RFC の初期値です。障害から何秒後に A はセカンダリへ移る？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {FAILOVER_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`sctp-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, guess, truth, revealed)}
              {failoverName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="sctp-reveal"
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
              `${en(asked.failoverMs)}. “Exceeds ${RFC_DEFAULTS.pathMaxRetrans}” means the ${asked.timeouts.length}th timeout, and each one waits twice as long as the last: ${asked.timeouts.map((x) => secs(x.rtoMs)).join(' + ')} = ${secs(asked.failoverMs)} s. Doubling protects a congested path from a flood of retransmissions, but it makes the defaults slow to give up on a dead one.`,
              `${ja(asked.failoverMs)}です。「${RFC_DEFAULTS.pathMaxRetrans} を超える」のは ${asked.timeouts.length} 回めのタイムアウトで、しかも 1 回ごとに待ち時間が前の 2 倍になります。${asked.timeouts.map((x) => secs(x.rtoMs)).join(' + ')} = ${secs(asked.failoverMs)} 秒です。2 倍にするのは混雑した経路に再送を浴びせないためですが、そのせいで初期値のままだと、死んだ経路をなかなかあきらめません。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="sctp-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Fail the primary', 'プライマリを切る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="sctp-timeouts">
          <div style={LESSON_LABEL}>
            {t('Timeouts on the primary', 'プライマリでのタイムアウト')}
          </div>
          <TimeoutBar result={tuned} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Timeout', 'タイムアウト')}</th>
                  <th style={cell}>RTO</th>
                  <th style={cell}>{t('After the failure', '障害から')}</th>
                  <th style={cell}>{t('Error count', 'エラー数')}</th>
                </tr>
              </thead>
              <tbody>
                {tuned.timeouts.map((timeout) => (
                  <tr
                    key={timeout.n}
                    data-testid={`sctp-timeout-${timeout.n}`}
                    data-at={timeout.atMs}
                  >
                    <td style={mono}>{`#${timeout.n}`}</td>
                    <td style={mono}>{t(en(timeout.rtoMs), ja(timeout.rtoMs))}</td>
                    <td style={mono}>{t(en(timeout.atMs), ja(timeout.atMs))}</td>
                    <td style={mono}>
                      {timeout.n > pathMaxRetrans
                        ? t(
                            `${timeout.n} > ${pathMaxRetrans}: inactive`,
                            `${timeout.n} > ${pathMaxRetrans}：使用不可`,
                          )
                        : String(timeout.n)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              Path.Max.Retrans
              <input
                type="range"
                min={1}
                max={10}
                value={pathMaxRetrans}
                data-testid="sctp-pmr"
                onChange={(event) => setPathMaxRetrans(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{pathMaxRetrans}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              RTO.Min
              <input
                type="range"
                min={100}
                max={1000}
                step={100}
                value={rtoMinMs}
                data-testid="sctp-rto-min"
                onChange={(event) => setRtoMinMs(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{t(en(rtoMinMs), ja(rtoMinMs))}</span>
            </label>
          </div>
          <p
            data-testid="sctp-failover"
            data-failover-ms={tuned.failoverMs}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `A moves to the secondary ${en(tuned.failoverMs)} after the failure.`,
              `A は障害の ${ja(tuned.failoverMs)}後にセカンダリへ移ります。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `Operators who need fast failover, such as for signalling, often lower Path.Max.Retrans and RTO.Min; set them too low and a short burst of loss makes a healthy path look dead. An idle path, such as the secondary here, is watched with HEARTBEAT chunks, sent about every HB.interval (${en(RFC_DEFAULTS.hbIntervalMs)} by default) plus one RTO; each HEARTBEAT not answered within an RTO also counts as an error. So A knows whether the secondary is usable before it needs it.`,
              `シグナリングのように素早い切り替えが必要な運用では、Path.Max.Retrans と RTO.Min を下げることがよくあります。下げすぎると、短い間のパケットロスだけで正常な経路を死んだとみなしてしまいます。ここでのセカンダリのように使っていない経路は、HEARTBEAT チャンクで見張ります。HEARTBEAT はおよそ HB.interval（初期値 ${ja(RFC_DEFAULTS.hbIntervalMs)}）+ RTO ごとに送られ、RTO のうちに応答がなければ、それもエラーとして数えます。だから A は、セカンダリが使えるかどうかを必要になる前から知っています。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: timer jitter and send time are ignored. RFC 9260 also says a chunk that timed out SHOULD be retransmitted to another active address, so some data can get through on the secondary sooner; the primary is still used for new data until it is marked inactive.',
              '簡略化：タイマーのゆらぎと送信にかかる時間は無視しています。RFC 9260 では、タイムアウトしたチャンクは別の使用可能なアドレスへ再送すべき（SHOULD）とされているので、一部のデータはもっと早くセカンダリで届くことがあります。それでも新しいデータは、使用不可とみなすまでプライマリへ送られます。',
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD} data-testid="sctp-hol-predict">
        <div style={LESSON_LABEL}>
          {t('Predict: a loss on one stream', '予想：1 つのストリームでのロス')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Now both paths are fine. A sends six messages on two streams of one association, ${SPACING_MS} ms apart, in this order: A1 (stream 1), B1 (stream 2), A2, B2, A3, B3. Each stream is ordered, the default: B hands a stream’s messages to the application in the order they were sent. Each message takes ${ONE_WAY_MS} ms to arrive. A1 is lost, and its retransmission arrives ${RECOVERY_MS} ms later than A1 would have. Which messages does B hand to the application late?`,
            `今度は両方の経路とも正常です。A は 1 つのアソシエーションの 2 つのストリームで、6 つのメッセージを ${SPACING_MS} ms 間隔で次の順に送ります：A1（ストリーム 1）、B1（ストリーム 2）、A2、B2、A3、B3。各ストリームは順序あり（初期設定）で、B はストリームごとに送られた順でアプリケーションへ渡します。届くまでは各 ${ONE_WAY_MS} ms です。A1 が失われ、その再送は本来より ${RECOVERY_MS} ms 遅れて届きます。B がアプリケーションへ渡すのが遅れるのはどれ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {HOL_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={holGuess === answer}
              data-testid={`sctp-hol-guess-${answer}`}
              disabled={holRevealed}
              onClick={() => setHolGuess(answer)}
              style={{ ...lessonChoice(holGuess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, holGuess, holTruth, holRevealed)}
              {holName(answer)}
            </button>
          ))}
        </div>
        {holRevealed ? (
          <p
            data-testid="sctp-hol-reveal"
            data-right={String(holGuess === holTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {holGuess === holTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${askedDelayed.join(', ')}. Order is kept only within a stream, so A2 and A3 wait for A1, but stream 2 does not: B1, B2 and B3 are handed over the moment they arrive. Over one TCP connection every byte is in one order, so the same loss holds back ${tcpDelayedAsked.length} messages: ${tcpDelayedAsked.join(', ')}. That is head-of-line blocking.`,
              `${askedDelayed.join('、')} です。順序はストリームの中だけで守られるので、A2 と A3 は A1 を待ちますが、ストリーム 2 は待ちません。B1、B2、B3 は届いたらすぐに渡されます。1 本の TCP 接続ではすべてのバイトが 1 つの順序に並ぶので、同じロスで ${tcpDelayedAsked.length} 個のメッセージ（${tcpDelayedAsked.join('、')}）が止まります。これが head-of-line ブロッキングです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="sctp-hol-reveal-button"
            disabled={!holGuess}
            style={{
              ...(holGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setHolRevealed(true)}
          >
            {holGuess
              ? t('Send the messages', 'メッセージを送る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {holRevealed ? (
        <div style={LESSON_CARD} data-testid="sctp-hol-table">
          <div style={LESSON_LABEL}>
            {t('Lose a different message', '別のメッセージを失わせる')}
          </div>
          <div
            role="radiogroup"
            aria-label={t('Lost message', '失うメッセージ')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {MESSAGES.map((message) => (
              <button
                key={message.id}
                type="button"
                role="radio"
                aria-checked={lost === message.id}
                data-testid={`sctp-lose-${message.id}`}
                onClick={() => setLost(message.id)}
                style={lessonChoice(lost === message.id)}
              >
                {lost === message.id ? '✓ ' : ''}
                {message.id}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Message', 'メッセージ')}</th>
                  <th style={cell}>{t('Arrives', '到着')}</th>
                  <th style={cell}>{t('SCTP: handed over', 'SCTP：渡す時刻')}</th>
                  <th style={cell}>{t('One TCP connection', 'TCP 1 本')}</th>
                </tr>
              </thead>
              <tbody>
                {sctpRows.map((row, index) => {
                  const tcp = tcpRows[index]!;
                  const late = (ms: number) => (ms > 0 ? t(` (+${ms} ms)`, `（+${ms} ms）`) : '');
                  return (
                    <tr
                      key={row.id}
                      data-testid={`sctp-msg-${row.id}`}
                      data-sctp-delay={row.delayMs}
                      data-tcp-delay={tcp.delayMs}
                    >
                      <td style={mono}>
                        {t(
                          `${row.id} (stream ${row.stream})`,
                          `${row.id}（ストリーム ${row.stream}）`,
                        )}
                      </td>
                      <td style={mono}>{`${row.arrivesMs} ms`}</td>
                      <td
                        style={{
                          ...mono,
                          color: row.delayMs > 0 ? 'var(--netlab-accent-red)' : undefined,
                        }}
                      >
                        {`${row.deliveredMs} ms${late(row.delayMs)}`}
                      </td>
                      <td
                        style={{
                          ...mono,
                          color: tcp.delayMs > 0 ? 'var(--netlab-accent-red)' : undefined,
                        }}
                      >
                        {`${tcp.deliveredMs} ms${late(tcp.delayMs)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'A message can also be sent unordered (the U flag), and then it is handed over as soon as it arrives, even within its stream. HTTP/3 over QUIC uses the same idea, independent streams, to avoid the head-of-line blocking of HTTP/2 over TCP.',
              'メッセージは順序なし（U フラグ）でも送れ、その場合はストリームの中でも届いたらすぐに渡されます。QUIC 上の HTTP/3 も同じ考え方（独立したストリーム）で、TCP 上の HTTP/2 の head-of-line ブロッキングを避けています。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: one loss only, a fixed ${ONE_WAY_MS} ms delivery, a fixed ${RECOVERY_MS} ms to recover the loss, and no window limits.`,
              `簡略化：ロスは 1 回だけ、届くまでは常に ${ONE_WAY_MS} ms、ロスの回復は常に ${RECOVERY_MS} ms、ウィンドウによる制限はなしとしています。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SctpDemo() {
  return (
    <DemoShell
      title="SCTP multihoming and streams"
      desc="An SCTP association over two paths and several streams: when a path fails, and when a message is lost"
    >
      <SctpLesson />
    </DemoShell>
  );
}
