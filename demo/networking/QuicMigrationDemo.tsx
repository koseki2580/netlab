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
  MOBILE,
  MOBILE_RTT_MS,
  PATH_CHANGES,
  SETUPS,
  TRANSPORTS,
  WIFI,
  WIFI_RTT_MS,
  arrive,
  endpointText,
  interruption,
  mayUseZeroRtt,
  timeToFirstByte,
  type PathChange,
  type Setup,
  type Step,
  type Transport,
} from './quicMigration';

type Answer = 'both-continue' | 'tcp-breaks' | 'quic-breaks' | 'both-break';
const ANSWERS: readonly Answer[] = ['both-continue', 'tcp-breaks', 'quic-breaks', 'both-break'];
const METHODS = ['GET', 'POST'] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

function answerOf(tcpSurvives: boolean, quicSurvives: boolean): Answer {
  if (tcpSurvives && quicSurvives) return 'both-continue';
  if (quicSurvives) return 'tcp-breaks';
  return tcpSurvives ? 'quic-breaks' : 'both-break';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function QuicMigrationLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rttMs, setRttMs] = useState(60);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('GET');
  const tcp = interruption('tcp', 'new-network');
  const quic = interruption('quic', 'new-network');
  const truth = answerOf(tcp.survives, quic.survives);

  const answerName = (answer: Answer) =>
    ({
      'both-continue': t('Both downloads carry on', 'どちらのダウンロードも続く'),
      'tcp-breaks': t(
        'TCP has to start a new connection; QUIC carries on',
        'TCP は接続を張り直す。QUIC は続く',
      ),
      'quic-breaks': t(
        'QUIC has to start a new connection; TCP carries on',
        'QUIC は接続を張り直す。TCP は続く',
      ),
      'both-break': t('Both have to start new connections', 'どちらも接続を張り直す'),
    })[answer];
  const changeName = (change: PathChange) =>
    ({
      'new-network': t(
        `Wi-Fi → mobile data (address and port change, RTT ${MOBILE_RTT_MS} ms)`,
        `Wi-Fi → モバイル通信（アドレスもポートも変わる、RTT ${MOBILE_RTT_MS} ms）`,
      ),
      'port-only': t(
        `The NAT forgot the mapping (only the port changes, RTT ${WIFI_RTT_MS} ms)`,
        `NAT が対応表を忘れた（ポートだけ変わる、RTT ${WIFI_RTT_MS} ms）`,
      ),
      none: t('No change', '変化なし'),
    })[change];
  const stepName = (step: Step) =>
    ({
      rst: t('RST from the server', 'サーバーからの RST'),
      'tcp-handshake': t('TCP handshake', 'TCP ハンドシェイク'),
      'tls-handshake': t('TLS 1.3 handshake', 'TLS 1.3 ハンドシェイク'),
      request: t('request again', 'リクエストし直し'),
      'path-validation': t(
        'path validation (PATH_CHALLENGE / PATH_RESPONSE)',
        '経路の確認（PATH_CHALLENGE / PATH_RESPONSE）',
      ),
    })[step];
  const transportName = (transport: Transport) => (transport === 'tcp' ? 'TCP + TLS' : 'QUIC');
  const setupName = (setup: Setup) =>
    ({
      'tcp-tls': t('TCP + TLS 1.3, new', 'TCP + TLS 1.3、初回'),
      'tcp-tls-0rtt': t('TCP + TLS 1.3, resumed with 0-RTT', 'TCP + TLS 1.3、0-RTT で再開'),
      quic: t('QUIC, new (1-RTT)', 'QUIC、初回（1-RTT）'),
      'quic-0rtt': t('QUIC, resumed with 0-RTT', 'QUIC、0-RTT で再開'),
    })[setup];
  const breakdown = (steps: ReturnType<typeof interruption>['steps']) =>
    steps.map((s) => `${stepName(s.step)} ${s.ms} ms`).join(' + ');
  const worstFirstByte = Math.max(
    ...SETUPS.map((s) => timeToFirstByte(s, rttMs, method).firstByteMs),
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
        <div style={LESSON_LABEL}>{t('Walking out of Wi-Fi', 'Wi-Fi の外へ')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A phone is downloading two large files from the same server: one over TCP + TLS (HTTP/2), one over QUIC (HTTP/3). Its owner walks out of the house, the Wi-Fi fades and the phone switches to mobile data. The server used to see the phone as ${endpointText(WIFI)}; from now on the phone’s packets arrive from ${endpointText(MOBILE)}.`,
            `スマートフォンが同じサーバーから大きなファイルを 2 つダウンロードしています。1 つは TCP + TLS（HTTP/2）、もう 1 つは QUIC（HTTP/3）です。持ち主が家を出ると Wi-Fi が弱まり、スマートフォンはモバイル通信に切り替わります。サーバーから見たスマートフォンはこれまで ${endpointText(WIFI)} でしたが、ここからはパケットが ${endpointText(MOBILE)} から届きます。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="qm-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t('What happens to the two downloads?', '2 つのダウンロードはどうなる？')}
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
              data-testid={`qm-guess-${answer}`}
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
            data-testid="qm-reveal"
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
              `${answerName(truth)}. The server finds a TCP connection by its 4-tuple — both addresses and both ports — and no connection has the new one, so the phone must open a new connection: ${breakdown(tcp.steps)} = ${tcp.totalMs} ms before data flows again, and the download resumes only if the server supports range requests. A QUIC packet carries a connection ID, which the server looks up instead; it is still the same connection, so the server only checks that the new path really reaches the phone: ${breakdown(quic.steps)} = ${quic.totalMs} ms.`,
              `${answerName(truth)}。サーバーは TCP の接続を 4 つ組（双方のアドレスとポート）で探しますが、新しい 4 つ組の接続はないので、スマートフォンは接続を張り直します。${breakdown(tcp.steps)} = ${tcp.totalMs} ms たってやっとデータが流れ、続きから受け取れるのはサーバーが Range リクエストに対応しているときだけです。QUIC のパケットにはコネクション ID が入っていて、サーバーはそれで接続を探します。同じ接続のままなので、新しい経路が本当にスマートフォンに届くかを確かめるだけです。${breakdown(quic.steps)} = ${quic.totalMs} ms です。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="qm-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See what the server looks up', 'サーバーが探すものを見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="qm-lookup">
          <div style={LESSON_LABEL}>{t('What the server looks up', 'サーバーが探すもの')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}></th>
                  <th style={cell}>{t('The server holds', 'サーバーが持っているもの')}</th>
                  <th style={cell}>{t('The packet carries', 'パケットに入っているもの')}</th>
                  <th style={cell}>{t('Found?', '見つかる？')}</th>
                </tr>
              </thead>
              <tbody>
                {TRANSPORTS.map((transport) => {
                  const arrival = arrive(transport, 'new-network');
                  return (
                    <tr
                      key={transport}
                      data-testid={`qm-lookup-${transport}`}
                      data-matched={String(arrival.matched)}
                    >
                      <td style={mono}>{transportName(transport)}</td>
                      <td style={mono}>{arrival.knownKey}</td>
                      <td style={mono}>{arrival.arrivingKey}</td>
                      <td style={mono}>{arrival.matched ? t('yes', 'はい') : t('no', 'いいえ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'The server handed the phone several spare connection IDs in advance. When the phone moves to a new network it switches to an unused one, so someone watching both networks cannot tell that the two paths are the same phone. A load balancer in front of the server must route by the connection ID too, not by the address.',
              'サーバーは前もって予備のコネクション ID をいくつかスマートフォンに渡しています。新しいネットワークに移るとき、スマートフォンはまだ使っていない ID に切り替えます。両方のネットワークを見ている人が、2 つの経路が同じスマートフォンだと結び付けられないようにするためです。サーバーの前のロードバランサーも、アドレスではなくコネクション ID で振り分ける必要があります。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="qm-table">
          <div style={LESSON_LABEL}>{t('Time lost by each change', '変化ごとに失う時間')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Change', '変化')}</th>
                  <th style={cell}>{t('Connection', '接続')}</th>
                  <th style={cell}>{t('Same connection?', '同じ接続のまま？')}</th>
                  <th style={cell}>{t('Until data flows', 'データが流れるまで')}</th>
                  <th style={cell}>{t('Slow start again?', 'もう一度スロースタート？')}</th>
                </tr>
              </thead>
              <tbody>
                {PATH_CHANGES.filter((change) => change !== 'none').flatMap((change) =>
                  TRANSPORTS.map((transport) => {
                    const lost = interruption(transport, change);
                    return (
                      <tr
                        key={`${transport}-${change}`}
                        data-testid={`qm-row-${transport}-${change}`}
                        data-ms={lost.totalMs}
                        data-survives={String(lost.survives)}
                      >
                        <td style={cell}>{changeName(change)}</td>
                        <td style={mono}>{transportName(transport)}</td>
                        <td style={mono}>
                          {lost.survives ? t('yes', 'はい') : t('no, reopened', 'いいえ、張り直し')}
                        </td>
                        <td style={mono}>{`${lost.totalMs} ms`}</td>
                        <td style={mono}>
                          {lost.slowStartAgain ? t('yes', 'はい') : t('no', 'いいえ')}
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'The NAT case: after a few idle minutes, the router in front of the phone forgets which port it gave the phone, and the phone’s next packet leaves from a new port. The phone cannot see this. A TCP server answers the unknown 4-tuple with an RST, and only then does the phone reconnect.',
              'NAT の場合：数分通信がないと、スマートフォンの前のルーターが割り当てたポートを忘れ、次のパケットは新しいポートから出ていきます。スマートフォンにはこれが見えません。TCP のサーバーは知らない 4 つ組に RST を返し、そこで初めてスマートフォンが接続し直します。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: each exchange takes exactly one round trip, the phone’s OS reports the network change at once (an app that waits for a timeout instead loses that time too), and TCP reconnects with a full TLS 1.3 handshake. Until the new path is validated, a QUIC server may send only three times what it has received from the new address, so this lesson counts that round trip as lost. QUIC restarts its congestion window on a new network, but not when only the port changed (RFC 9000).',
              '簡略化しています。やり取りはどれもちょうど 1 往復、スマートフォンの OS はネットワークの変化をすぐにアプリへ知らせる（タイムアウトを待つアプリなら、その時間も失います）、TCP は TLS 1.3 のハンドシェイクを最初からやり直す、としました。新しい経路を確認できるまで、QUIC のサーバーはその新しいアドレスから受け取った量の 3 倍までしか送れないので、このレッスンではその 1 往復を失う時間に数えています。QUIC は新しいネットワークでは輻輳ウィンドウを最初からやり直しますが、ポートだけが変わったときはやり直しません（RFC 9000）。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="qm-setup">
          <div style={LESSON_LABEL}>
            {t('Round trips before the first byte', '最初の 1 バイトまでの往復')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Opening a connection also costs round trips. TCP needs its own handshake before TLS can start; QUIC carries the TLS 1.3 handshake in its first packets. When the phone has talked to this server before, it can keep a resumption ticket and send the request in its very first flight: 0-RTT.',
              '接続を開くのにも往復がかかります。TCP は TLS を始める前に自分のハンドシェイクが必要です。QUIC は最初のパケットに TLS 1.3 のハンドシェイクを入れて運びます。前にこのサーバーとやり取りしたことがあれば、スマートフォンは再開用のチケットを持っておき、最初の送信にリクエストを入れられます。これが 0-RTT です。',
            )}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              RTT
              <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={rttMs}
                data-testid="qm-rtt"
                onChange={(event) => setRttMs(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${rttMs} ms`}</span>
            </label>
            <div
              role="tablist"
              aria-label={t('Request method', 'リクエストのメソッド')}
              style={{ display: 'flex', gap: 6 }}
            >
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={method === m}
                  data-testid={`qm-method-${m}`}
                  onClick={() => setMethod(m)}
                  style={{ ...lessonChoice(method === m), minHeight: 44 }}
                >
                  {method === m ? '✓ ' : ''}
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {SETUPS.map((setup) => {
              const first = timeToFirstByte(setup, rttMs, method);
              return (
                <div
                  key={setup}
                  data-testid={`qm-ttfb-${setup}`}
                  data-ms={first.firstByteMs}
                  data-before={first.roundTripsBeforeRequest}
                >
                  <div style={{ fontSize: 13 }}>
                    {setupName(setup)}
                    <span style={{ fontFamily: 'monospace', marginLeft: 6 }}>
                      {t(
                        `request after ${first.requestLeavesMs} ms, first byte at ${first.firstByteMs} ms`,
                        `リクエスト送信 ${first.requestLeavesMs} ms、最初の 1 バイト ${first.firstByteMs} ms`,
                      )}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      height: 10,
                      borderRadius: 4,
                      background: 'var(--netlab-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(first.firstByteMs / worstFirstByte) * 100}%`,
                        background: 'var(--netlab-accent-cyan)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p
            data-testid="qm-method-note"
            data-zero-rtt={String(mayUseZeroRtt(method))}
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {mayUseZeroRtt(method)
              ? t(
                  `${method} has no side effects, so it may go out as 0-RTT data.`,
                  `${method} は副作用がないので、0-RTT のデータとして送れます。`,
                )
              : t(
                  `${method} can change something on the server, so the client waits for the handshake and 0-RTT gives no gain.`,
                  `${method} はサーバー側で何かを変えうるので、クライアントはハンドシェイクを待ちます。0-RTT の得はありません。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              '0-RTT data is sent before the handshake proves the connection is fresh, so an attacker who copies it can send it to the server again (a replay). That is why only requests that are safe to repeat, like a GET, should use it (RFC 8446, RFC 9001). The server may also refuse 0-RTT; the client then sends the request again after the handshake. Simplified: no DNS, no server think time, and the response starts exactly one round trip after the request leaves.',
              '0-RTT のデータは、接続が新しいものだとハンドシェイクで確かめる前に送られます。そのためコピーした攻撃者がもう一度サーバーへ送れます（リプレイ）。だから GET のように繰り返しても問題ないリクエストだけに使うべきです（RFC 8446、RFC 9001）。サーバーが 0-RTT を断ることもあり、そのときクライアントはハンドシェイクのあとでリクエストを送り直します。簡略化しています。DNS もサーバーの処理時間もなく、応答はリクエストを送ってちょうど 1 往復後に始まるものとしました。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function QuicMigrationDemo() {
  return (
    <DemoShell
      title="QUIC connection migration and 0-RTT"
      desc="A phone changes networks in the middle of two downloads; then, how many round trips a connection costs before the first byte"
    >
      <QuicMigrationLesson />
    </DemoShell>
  );
}
