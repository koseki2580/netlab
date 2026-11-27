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
  LONG_POLL_HOLD_S,
  METHODS,
  ONE_WAY_MS,
  PAYLOAD_BYTES,
  REQUESTS,
  REQUEST_HEADER_BYTES,
  RESPONSE_HEADER_BYTES,
  START,
  WINDOW_S,
  cost,
  eventsIn,
  frameHeaderBytes,
  isIdempotent,
  retry,
  type Method,
  type ShopRequest,
  type ShopState,
} from './websocket';
import { FRAME_SIZES, POLL_RANGE_S, websocketChallenges } from './websocketChallenges';

const ASKED_EVERY_S = 10;
const ASKED_POLL_S = 5;

type Answer = 'all-half' | 'events-full' | 'all-full' | 'events-none';
const ANSWERS: readonly Answer[] = ['all-half', 'events-full', 'all-full', 'events-none'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const delay = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`);

/** The request count and wait (before the response travels) each answer claims. */
function claimed(answer: Answer): { readonly requests: number; readonly waitMs: number } {
  const polls = Math.floor(WINDOW_S / ASKED_POLL_S);
  const events = eventsIn(ASKED_EVERY_S);
  return {
    'all-half': { requests: polls, waitMs: (ASKED_POLL_S * 1000) / 2 },
    'events-full': { requests: events, waitMs: ASKED_POLL_S * 1000 },
    'all-full': { requests: polls, waitMs: ASKED_POLL_S * 1000 },
    'events-none': { requests: events, waitMs: 0 },
  }[answer];
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function WebSocketLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [everyS, setEveryS] = useState(ASKED_EVERY_S);
  const [pollS, setPollS] = useState(ASKED_POLL_S);
  const [frameSize, setFrameSize] = useState(FRAME_SIZES[0]!);
  const [fromClient, setFromClient] = useState(false);
  const [retryGuess, setRetryGuess] = useState<Partial<Record<ShopRequest['id'], boolean>>>({});
  const [retryRevealed, setRetryRevealed] = useState(false);

  const asked = cost('short', ASKED_EVERY_S, ASKED_POLL_S);
  const truth = ANSWERS.find((answer) => {
    const claim = claimed(answer);
    return claim.requests === asked.requests && claim.waitMs === asked.averageDelayMs - ONE_WAY_MS;
  });
  const askedLong = cost('long', ASKED_EVERY_S, ASKED_POLL_S);
  const askedWs = cost('websocket', ASKED_EVERY_S, ASKED_POLL_S);
  const answerName = (answer: Answer) => {
    const { requests, waitMs } = claimed(answer);
    return waitMs === 0
      ? t(`${requests} requests; almost no wait`, `リクエスト ${requests} 回、待ちはほぼなし`)
      : t(
          `${requests} requests; about ${waitMs / 1000} s wait`,
          `リクエスト ${requests} 回、待ちは約 ${waitMs / 1000} 秒`,
        );
  };
  const methodName = (method: Method) =>
    ({
      short: t(`Short polling every ${pollS} s`, `${pollS} 秒ごとのショートポーリング`),
      long: t('Long polling', 'ロングポーリング'),
      websocket: 'WebSocket',
    })[method];

  const postTwice = retry(REQUESTS.find((r) => r.id === 'post-order')!).twice.orders;
  const allGuessed = REQUESTS.every((r) => retryGuess[r.id] !== undefined);
  const retryRight = REQUESTS.every((r) => retryGuess[r.id] === isIdempotent(r.method));
  const stateText = (request: ShopRequest, state: ShopState) =>
    ({
      'get-feed': t('nothing changes', '何も変わらない'),
      'put-name': `name = ${state.name}`,
      'delete-item': `cart = [${state.cart.join(', ')}]`,
      'post-order': t(`${state.orders} order(s)`, `注文 ${state.orders} 件`),
      'patch-points': `points = ${state.points}`,
    })[request.id];

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
        <div style={LESSON_LABEL}>{t('News from the server', 'サーバーからの知らせ')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A chat server gets a new message about every ${ASKED_EVERY_S} s, at moments nobody can predict: ${eventsIn(ASKED_EVERY_S)} in a minute. In plain HTTP only the client can start an exchange, so the browser has to come and ask. Three ways to do it: short polling (ask every few seconds), long polling (ask, and the server holds the answer until there is news), and a WebSocket (one connection both sides can send on).`,
            `チャットサーバーには、だいたい ${ASKED_EVERY_S} 秒に 1 件、いつ来るか予測できないタイミングで新しいメッセージが届きます。1 分で ${eventsIn(ASKED_EVERY_S)} 件です。ふつうの HTTP ではやりとりを始められるのはクライアントだけなので、ブラウザが聞きに行く必要があります。方法は 3 つあります。ショートポーリング（数秒ごとに聞く）、ロングポーリング（聞いたら、知らせが来るまでサーバーが返事を保留する）、WebSocket（どちらからでも送れる 1 本の接続）です。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ws-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The browser uses short polling every ${ASKED_POLL_S} s. Over the minute, how many requests does it send, and how long does a new message wait at the server, on average, before a request picks it up?`,
            `ブラウザは ${ASKED_POLL_S} 秒ごとのショートポーリングを使います。1 分間に送るリクエストは何回で、新しいメッセージはリクエストに拾われるまでサーバーで平均どれくらい待つ？`,
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
              data-testid={`ws-guess-${answer}`}
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
            data-testid="ws-reveal"
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
              `${asked.requests} requests, and a wait of ${delay(asked.averageDelayMs - ONE_WAY_MS)} on average. The browser asks every ${ASKED_POLL_S} s whether or not there is news, so most answers are empty; a message arrives at a random moment and waits for the next request, half an interval on average. Long polling needs only ${askedLong.requests} requests and delivers in ${delay(askedLong.averageDelayMs)}; a WebSocket needs one handshake and ${askedWs.bytes.toLocaleString('en')} bytes in all, against ${asked.bytes.toLocaleString('en')} for short polling.`,
              `リクエストは ${asked.requests} 回、待ちは平均 ${delay(asked.averageDelayMs - ONE_WAY_MS)} です。ブラウザは知らせがあってもなくても ${ASKED_POLL_S} 秒ごとに聞くので、ほとんどの返事は空です。メッセージはでたらめな瞬間に届き、次のリクエストを待つので、平均すると間隔の半分待ちます。ロングポーリングならリクエストは ${askedLong.requests} 回で、${delay(askedLong.averageDelayMs)} で届きます。WebSocket はハンドシェイク 1 回で、全部で ${askedWs.bytes.toLocaleString('ja')} バイト、ショートポーリングは ${asked.bytes.toLocaleString('ja')} バイトです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ws-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run the minute', '1 分間を走らせる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ws-results">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('A message every', 'メッセージの間隔')}
              <input
                type="range"
                min={1}
                max={60}
                value={everyS}
                data-testid="ws-every"
                onChange={(event) => setEveryS(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${everyS} s`}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Poll every', 'ポーリング間隔')}
              <input
                type="range"
                min={POLL_RANGE_S.min}
                max={POLL_RANGE_S.max}
                value={pollS}
                data-testid="ws-poll"
                onChange={(event) => setPollS(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${pollS} s`}</span>
            </label>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t(`In ${WINDOW_S} s`, `${WINDOW_S} 秒間で`)}</th>
                  <th style={cell}>{t('Requests', 'リクエスト')}</th>
                  <th style={cell}>{t('Bytes', 'バイト数')}</th>
                  <th style={cell}>{t('Average delay', '平均の遅れ')}</th>
                </tr>
              </thead>
              <tbody>
                {METHODS.map((method) => {
                  const result = cost(method, everyS, pollS);
                  return (
                    <tr
                      key={method}
                      data-testid={`ws-row-${method}`}
                      data-requests={result.requests}
                      data-bytes={result.bytes}
                      data-delay={result.averageDelayMs}
                    >
                      <td style={cell}>{methodName(method)}</td>
                      <td style={mono}>{result.requests}</td>
                      <td style={mono}>{result.bytes.toLocaleString('en')}</td>
                      <td style={mono}>{delay(result.averageDelayMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Assumptions: a request’s headers are ${REQUEST_HEADER_BYTES} bytes and a response’s ${RESPONSE_HEADER_BYTES} (small, no cookies), each message is ${PAYLOAD_BYTES} bytes, the server is ${ONE_WAY_MS} ms away, and the long-poll server answers empty after ${LONG_POLL_HOLD_S} s (an application setting). Only HTTP and WebSocket bytes are counted, over one reused connection; TCP, IP and TLS overhead and WebSocket pings are left out.`,
              `仮定：リクエストのヘッダーは ${REQUEST_HEADER_BYTES} バイト、レスポンスは ${RESPONSE_HEADER_BYTES} バイト（小さめ、Cookie なし）、メッセージは 1 件 ${PAYLOAD_BYTES} バイト、サーバーまで片道 ${ONE_WAY_MS} ms、ロングポーリングのサーバーは ${LONG_POLL_HOLD_S} 秒で空の返事を返す（アプリの設定）ものとしました。数えたのは使い回す 1 本の接続の上の HTTP と WebSocket のバイトだけで、TCP・IP・TLS のオーバーヘッドと WebSocket の ping は入れていません。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ws-frames">
          <div style={LESSON_LABEL}>{t('A WebSocket frame', 'WebSocket のフレーム')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'The connection starts as an HTTP/1.1 GET with “Upgrade: websocket”; the server answers 101 Switching Protocols, and from then on both sides send frames (RFC 6455). A frame’s header holds the length in 7 bits, or 16 or 64 more; frames from the client are also masked with a 4-byte key, so that proxies on the way cannot be tricked into treating them as HTTP.',
              '接続は「Upgrade: websocket」付きの HTTP/1.1 の GET で始まり、サーバーが 101 Switching Protocols と答えると、そこから先は両方がフレームを送ります（RFC 6455）。フレームのヘッダーは長さを 7 ビット、または追加の 16 か 64 ビットで表します。クライアントから送るフレームはさらに 4 バイトの鍵でマスクされます。悪意のあるページが、途中のプロキシにフレームを HTTP のリクエストと誤解させられないようにするためです。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Payload', 'ペイロード')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {FRAME_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="tab"
                aria-selected={frameSize === size}
                data-testid={`ws-size-${size}`}
                onClick={() => setFrameSize(size)}
                style={lessonChoice(frameSize === size)}
              >
                {`${frameSize === size ? '✓ ' : ''}${size.toLocaleString('en')} B`}
              </button>
            ))}
          </div>
          <div
            role="tablist"
            aria-label={t('Direction', '向き')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}
          >
            {[false, true].map((client) => (
              <button
                key={String(client)}
                type="button"
                role="tab"
                aria-selected={fromClient === client}
                data-testid={`ws-from-${client ? 'client' : 'server'}`}
                onClick={() => setFromClient(client)}
                style={lessonChoice(fromClient === client)}
              >
                {(fromClient === client ? '✓ ' : '') +
                  (client
                    ? t('Client → server', 'クライアント → サーバー')
                    : t('Server → client', 'サーバー → クライアント'))}
              </button>
            ))}
          </div>
          <p
            data-testid="ws-header"
            data-bytes={frameHeaderBytes(frameSize, fromClient)}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `Header: ${frameHeaderBytes(frameSize, fromClient)} bytes before ${frameSize.toLocaleString('en')} bytes of payload.`,
              `ヘッダーは ${frameHeaderBytes(frameSize, fromClient)} バイト、その後にペイロードが ${frameSize.toLocaleString('ja')} バイト。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <LessonChallenges
          lessonId="websocket"
          challenges={websocketChallenges({ everyS, pollS, frameSize, fromClient })}
        />
      ) : null}

      <div style={LESSON_CARD} data-testid="idem-predict">
        <div style={LESSON_LABEL}>{t('When the connection drops', '接続が切れたとき')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'A client sends each request below, and the connection drops before any response comes back. The client cannot tell whether the server received it. Predict for each: may the client send it again automatically, without asking the user?',
            'クライアントが下のリクエストをそれぞれ送り、応答が返る前に接続が切れました。サーバーが受け取ったかどうか、クライアントにはわかりません。それぞれについて予想してください。利用者に聞かずに自動で送り直してよい？',
          )}
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {REQUESTS.map((request) => {
            const right = isIdempotent(request.method);
            const outcome = retry(request);
            return (
              <div
                key={request.id}
                data-testid={`idem-row-${request.id}`}
                data-same={retryRevealed ? String(outcome.sameAfterRetry) : undefined}
                style={{ borderTop: '1px solid var(--netlab-border)', paddingTop: 6 }}
              >
                <code
                  style={{ display: 'block', fontFamily: 'monospace', overflowWrap: 'anywhere' }}
                >
                  {`${request.method} ${request.target}${request.body ? ` ${request.body}` : ''}`}
                </code>
                <div
                  role="radiogroup"
                  aria-label={`${request.method} ${request.target}`}
                  style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}
                >
                  {[true, false].map((yes) => (
                    <button
                      key={String(yes)}
                      type="button"
                      role="radio"
                      aria-checked={retryGuess[request.id] === yes}
                      data-testid={`idem-guess-${request.id}-${yes ? 'yes' : 'no'}`}
                      disabled={retryRevealed}
                      onClick={() => setRetryGuess((old) => ({ ...old, [request.id]: yes }))}
                      style={lessonChoice(retryGuess[request.id] === yes)}
                    >
                      {predictionMark(yes, retryGuess[request.id], right, retryRevealed)}
                      {yes ? t('Resend', '送り直してよい') : t('Do not resend', '送り直さない')}
                    </button>
                  ))}
                </div>
                {retryRevealed ? (
                  <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                    {t(
                      `Arrived once: ${stateText(request, outcome.once)}. Arrived twice: ${stateText(request, outcome.twice)}. ${outcome.sameAfterRetry ? 'Same result, so a retry is harmless.' : 'Different: a retry would apply it twice.'}`,
                      `1 回届いた場合：${stateText(request, outcome.once)}。2 回届いた場合：${stateText(request, outcome.twice)}。${outcome.sameAfterRetry ? '結果は同じなので、送り直しても害はありません。' : '結果がちがいます。送り直すと 2 回適用されます。'}`,
                    )}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        {retryRevealed ? (
          <p
            data-testid="idem-reveal"
            data-right={String(retryRight)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {retryRight
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `RFC 9110 (§9.2.2) calls GET, HEAD, OPTIONS, TRACE, PUT and DELETE idempotent: sending one twice leaves the server as sending it once would, so a client may resend it after a dropped connection. POST and PATCH are not: here a retried POST makes ${postTwice} orders, and a retried PATCH adds the points twice. A client should not resend them automatically unless it knows the request was never applied, which is why APIs often accept an idempotency key with a POST (an IETF draft).`,
              `RFC 9110（§9.2.2）は GET・HEAD・OPTIONS・TRACE・PUT・DELETE を冪等としています。2 回送っても 1 回送ったのと同じ状態になるので、接続が切れたあと送り直してかまいません。POST と PATCH は冪等ではありません。ここでは送り直した POST で注文が ${postTwice} 件になり、PATCH ではポイントが 2 回加算されます。リクエストが適用されなかったと確かめられない限り、自動で送り直すべきではありません。そのため API は POST に冪等キーを付けられるようにしていることがよくあります（IETF のドラフト）。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="idem-reveal-button"
            disabled={!allGuessed}
            style={{
              ...(allGuessed ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setRetryRevealed(true)}
          >
            {allGuessed
              ? t('Deliver each one twice', 'それぞれ 2 回届けてみる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            `The server starts with name = ${START.name}, cart = [${START.cart.join(', ')}], ${START.orders} orders and points = ${START.points}.`,
            `サーバーの最初の状態は name = ${START.name}、cart = [${START.cart.join(', ')}]、注文 ${START.orders} 件、points = ${START.points} です。`,
          )}
        </p>
      </div>
    </div>
  );
}

export default function WebSocketDemo() {
  return (
    <DemoShell
      title="Polling, long polling and WebSocket"
      desc="Getting news from a server to a browser, what each way costs, and which requests are safe to resend"
    >
      <WebSocketLesson />
    </DemoShell>
  );
}
