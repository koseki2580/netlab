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
  BASE_DELAY_MS,
  BUFFER_CHOICES_MS,
  CALLEES,
  CALLEE_IDS,
  CALLER,
  CODECS,
  ETHERNET_BYTES,
  G114_MS,
  HEADER_BYTES,
  JITTER_MS,
  LOSS_TARGET_PCT,
  OFFERED,
  PACKET_TIMES_MS,
  SEND_INTERVAL_MS,
  bandwidth,
  bestBuffer,
  callSetup,
  jitterBuffer,
  lossFreeBufferMs,
  type CalleeId,
  type Codec,
  type SipMessage,
} from './voip';

type Answer = 'opus' | 'pcmu' | 'refused' | 'each-own';
const ANSWERS: readonly Answer[] = ['opus', 'pcmu', 'refused', 'each-own'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };
const pre: React.CSSProperties = {
  margin: 0,
  padding: 8,
  overflowX: 'auto',
  fontSize: 12,
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 6,
};

const CODEC_NAMES: Record<Codec, string> = {
  opus: 'Opus',
  pcmu: 'G.711 µ-law',
  g722: 'G.722',
};

const CHART_W = 400;
const CHART_H = 120;
const CHART_MAX_MS = 60;

/** The extra delay of each packet as a bar, with the buffer as a line. */
function JitterChart({ bufferMs }: { bufferMs: number }) {
  const t = useT();
  const late = new Set(jitterBuffer(bufferMs).late);
  const bar = CHART_W / JITTER_MS.length;
  const y = (ms: number) => CHART_H - (Math.min(ms, CHART_MAX_MS) / CHART_MAX_MS) * CHART_H;
  // Below about 380 px the 11-unit labels would shrink under 9 px, so the chart
  // keeps that width and scrolls sideways inside its card instead.
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid="voip-chart"
        viewBox={`-44 -8 ${CHART_W + 54} ${CHART_H + 28}`}
        style={{ width: '100%', maxWidth: 520, minWidth: 380 }}
        role="img"
        aria-label={t(
          `Extra delay of ${JITTER_MS.length} packets against a ${bufferMs} ms buffer: ${late.size} too late`,
          `${JITTER_MS.length} パケットの余分な遅延と ${bufferMs} ms のバッファ：${late.size} 個が間に合わない`,
        )}
      >
        {[0, 20, 40, 60].map((ms) => (
          <g key={ms}>
            <line x1={0} x2={CHART_W} y1={y(ms)} y2={y(ms)} stroke="var(--netlab-border)" />
            <text
              x={-6}
              y={y(ms) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--netlab-text-secondary)"
            >
              {`${ms} ms`}
            </text>
          </g>
        ))}
        {JITTER_MS.map((ms, i) => (
          <rect
            key={i}
            x={i * bar + 1}
            y={y(ms)}
            width={bar - 2}
            height={CHART_H - y(ms)}
            fill={late.has(i) ? 'var(--netlab-accent-red)' : 'var(--netlab-accent-cyan)'}
          />
        ))}
        <line
          x1={0}
          x2={CHART_W}
          y1={y(bufferMs)}
          y2={y(bufferMs)}
          stroke="var(--netlab-accent-orange)"
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        <text
          x={CHART_W / 2}
          y={CHART_H + 18}
          textAnchor="middle"
          fontSize={11}
          fill="var(--netlab-text-secondary)"
        >
          {t('packets 0 → 49', 'パケット 0 → 49')}
        </text>
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function VoipLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [callee, setCallee] = useState<CalleeId>('pcmu-only');
  const [packetMs, setPacketMs] = useState<number>(20);
  const [bufferGuess, setBufferGuess] = useState<number | null>(null);
  const [bufferRevealed, setBufferRevealed] = useState(false);
  const [bufferMs, setBufferMs] = useState(40);

  const asked = callSetup('pcmu-only');
  const truth: Answer =
    asked.chosen === 'opus' || asked.chosen === 'pcmu' ? asked.chosen : 'refused';
  const shown = callSetup(callee);
  const best = bestBuffer(BUFFER_CHOICES_MS);
  const bestPlayout = best === null ? null : jitterBuffer(best);
  const custom = jitterBuffer(bufferMs);
  const g711 = bandwidth('pcmu', 20);

  const answerName = (answer: Answer) =>
    ({
      opus: t('Opus, the caller’s first choice', 'Opus（発信側の第一希望）'),
      pcmu: t('G.711 µ-law', 'G.711 µ-law'),
      refused: t('None: the call is refused', 'なし（呼は拒否される）'),
      'each-own': t(
        'Each side sends with its own favourite codec',
        'それぞれが自分の好きなコーデックで送る',
      ),
    })[answer];
  const calleeName = (id: CalleeId) =>
    t(
      `Callee supports ${CALLEES[id].map((c) => CODEC_NAMES[c]).join(' + ')}`,
      `着信側の対応：${CALLEES[id].map((c) => CODEC_NAMES[c]).join(' + ')}`,
    );
  const arrow = (message: SipMessage) => (message.from === 'caller' ? '──▶' : '◀──');

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
        <div style={LESSON_LABEL}>{t('A phone call over IP', 'IP で電話をかける')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Two IP phones make a call in three layers. SIP (RFC 3261) sets the call up and tears it down. Inside the SIP messages, SDP describes the voice stream: which codecs a phone can use and on which address and UDP port it wants to receive. The caller sends an offer and the callee replies with an answer (the offer/answer model, RFC 3264). Then the voice itself travels as RTP packets (RFC 3550) straight between the two phones.',
            'IP 電話の通話は 3 つの層でできています。SIP（RFC 3261）が呼を張り、切ります。SIP メッセージの中には SDP が入っていて、音声ストリームの内容、つまり使えるコーデックと、受け取りたいアドレスと UDP ポートを伝えます。発信側がオファーを送り、着信側がアンサーを返します（オファー／アンサーモデル、RFC 3264）。そのあと音声そのものが RTP パケット（RFC 3550）として 2 台の電話の間を直接流れます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="voip-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The caller’s INVITE offers ${OFFERED.map((c) => CODEC_NAMES[c]).join(', then ')}, receiving on port ${CALLER.port}. The callee’s phone supports only ${CODEC_NAMES.pcmu}. Which codec does the call use?`,
            `発信側の INVITE は ${OFFERED.map((c) => CODEC_NAMES[c]).join('、次に ')} をオファーし、ポート ${CALLER.port} で受けると伝えます。着信側の電話は ${CODEC_NAMES.pcmu} にしか対応していません。通話で使われるコーデックはどれ？`,
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
              data-testid={`voip-guess-${answer}`}
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
            data-testid="voip-reveal"
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
              `${answerName(truth)}. The callee answers with only the offered codecs it can use, here ${asked.answered.map((c) => CODEC_NAMES[c]).join(', ')} (payload type ${asked.answered.map((c) => CODECS[c].payloadType).join(', ')}), so both phones send ${CODEC_NAMES[asked.chosen ?? 'pcmu']}. The caller’s order is only a preference. Only when no offered codec is left does the callee refuse the call, with 488 Not Acceptable Here.`,
              `${answerName(truth)} です。着信側は、オファーされたコーデックのうち自分が使えるものだけをアンサーに入れます。ここでは ${asked.answered.map((c) => CODEC_NAMES[c]).join('、')}（ペイロードタイプ ${asked.answered.map((c) => CODECS[c].payloadType).join('、')}）なので、両方の電話が ${CODEC_NAMES[asked.chosen ?? 'pcmu']} で送ります。発信側の並び順は希望にすぎません。オファーに使えるコーデックが 1 つもないときに限り、着信側は 488 Not Acceptable Here で呼を拒否します。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="voip-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Place the call', '発信する')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="voip-ladder">
          <div style={LESSON_LABEL}>{t('The SIP ladder', 'SIP のやりとり')}</div>
          <div
            role="tablist"
            aria-label={t('What the callee supports', '着信側の対応コーデック')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {CALLEE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={callee === id}
                data-testid={`voip-callee-${id}`}
                onClick={() => setCallee(id)}
                style={lessonChoice(callee === id)}
              >
                {callee === id ? '✓ ' : ''}
                {calleeName(id)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Caller', '発信側')}</th>
                  <th style={cell} />
                  <th style={cell}>{t('Callee', '着信側')}</th>
                  <th style={cell}>{t('Carries', '中身')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.ladder.map((message, i) => (
                  <tr key={i} data-testid={`voip-msg-${i}`} data-label={message.label}>
                    <td style={mono}>{message.from === 'caller' ? message.label : ''}</td>
                    <td style={mono}>{arrow(message)}</td>
                    <td style={mono}>{message.from === 'callee' ? message.label : ''}</td>
                    <td style={cell}>
                      {message.body === 'offer'
                        ? t('SDP offer', 'SDP オファー')
                        : message.body === 'answer'
                          ? t('SDP answer', 'SDP アンサー')
                          : '—'}
                    </td>
                  </tr>
                ))}
                {shown.rtp ? (
                  <tr>
                    <td style={mono}>RTP</td>
                    <td style={mono}>◀═▶</td>
                    <td style={mono}>RTP</td>
                    <td style={cell}>{t('The voice', '音声')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p
            data-testid="voip-chosen"
            data-codec={shown.chosen ?? 'none'}
            data-status={shown.status}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {shown.chosen
              ? t(
                  `Answered with ${shown.status}: the call uses ${CODEC_NAMES[shown.chosen]}.`,
                  `${shown.status} で応答し、通話は ${CODEC_NAMES[shown.chosen]} を使います。`,
                )
              : t(
                  `Refused with ${shown.status}: no offered codec is supported.`,
                  `${shown.status} で拒否されます。オファーされたコーデックに 1 つも対応していません。`,
                )}
          </p>
          {shown.rtp ? (
            <p
              data-testid="voip-rtp"
              data-caller-sends-to={shown.rtp.callerSendsTo}
              data-callee-sends-to={shown.rtp.calleeSendsTo}
              style={{ margin: '4px 0 0', lineHeight: 1.7 }}
            >
              {t(
                `The caller sends RTP to ${shown.rtp.callerSendsTo}, the address and port in the answer; the callee sends to ${shown.rtp.calleeSendsTo}, the ones in the offer.`,
                `発信側はアンサーにあるアドレスとポート ${shown.rtp.callerSendsTo} へ、着信側はオファーにある ${shown.rtp.calleeSendsTo} へ RTP を送ります。`,
              )}
            </p>
          ) : null}
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {t('Offer (in the INVITE)', 'オファー（INVITE の中）')}
              </div>
              <pre style={pre} data-testid="voip-offer-sdp">
                {shown.offerSdp.join('\n')}
              </pre>
            </div>
            {shown.answerSdp ? (
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  {t('Answer (in the 200 OK)', 'アンサー（200 OK の中）')}
                </div>
                <pre style={pre} data-testid="voip-answer-sdp">
                  {shown.answerSdp.join('\n')}
                </pre>
              </div>
            ) : null}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: the phones talk directly, with no SIP proxy, registrar or NAT, and the answer keeps the offer’s order. A real answerer may list the codecs in its own order of preference and may keep several. The ACK confirms the final response; hanging up later sends BYE.',
              '簡略化しています。電話どうしが直接やりとりし、SIP プロキシもレジストラも NAT もありません。また、アンサーはオファーの並び順のままとしました。実際の着信側は自分の希望順に並べたり、複数のコーデックを残したりできます。ACK は最終応答を受け取ったことを伝えます。切るときは BYE を送ります。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="voip-bandwidth">
          <div style={LESSON_LABEL}>{t('Bandwidth per call', '1 通話あたりの帯域')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Each RTP packet carries one slice of voice plus ${HEADER_BYTES} bytes of headers (IPv4 20 + UDP 8 + RTP 12). Pick how much voice goes in one packet.`,
              `RTP パケット 1 つには、音声のひと区切りに加えて ${HEADER_BYTES} バイトのヘッダ（IPv4 20 + UDP 8 + RTP 12）が付きます。1 パケットに何 ms 分の音声を入れるか選んでください。`,
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Voice per packet', '1 パケットの音声')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {PACKET_TIMES_MS.map((ms) => (
              <button
                key={ms}
                type="button"
                role="tab"
                aria-selected={packetMs === ms}
                data-testid={`voip-ptime-${ms}`}
                onClick={() => setPacketMs(ms)}
                style={lessonChoice(packetMs === ms)}
              >
                {packetMs === ms ? '✓ ' : ''}
                {`${ms} ms`}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Codec', 'コーデック')}</th>
                  <th style={cell}>{t('Voice', '音声')}</th>
                  <th style={cell}>{t('Bytes / packet', 'バイト／パケット')}</th>
                  <th style={cell}>{t('Packets / s', 'パケット／秒')}</th>
                  <th style={cell}>{t('On IP', 'IP 上')}</th>
                  <th style={cell}>{t('With Ethernet', 'Ethernet 込み')}</th>
                </tr>
              </thead>
              <tbody>
                {(['pcmu', 'opus'] as const).map((codec) => {
                  const bw = bandwidth(codec, packetMs);
                  return (
                    <tr
                      key={codec}
                      data-testid={`voip-bw-${codec}`}
                      data-ip-kbps={bw.ipKbps}
                      data-ethernet-kbps={bw.ethernetKbps}
                    >
                      <td style={cell}>{CODEC_NAMES[codec]}</td>
                      <td style={mono}>{`${CODECS[codec].bitrateBps / 1000} kbit/s`}</td>
                      <td style={mono}>{`${bw.payloadBytes} + ${HEADER_BYTES}`}</td>
                      <td style={mono}>{bw.packetsPerSecond}</td>
                      <td style={mono}>{`${bw.ipKbps} kbit/s`}</td>
                      <td style={mono}>{`${bw.ethernetKbps} kbit/s`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Each direction; a call needs this both ways. G.711 at 20 ms: ${g711.payloadBytes} bytes of voice, ${g711.packetsPerSecond} packets a second, ${g711.ipKbps} kbit/s on IP for a ${CODECS.pcmu.bitrateBps / 1000} kbit/s codec. “With Ethernet” adds the ${ETHERNET_BYTES}-byte header and FCS but not the preamble or gap. Opus is shown at a fixed ${CODECS.opus.bitrateBps / 1000} kbit/s; in practice it varies its rate (RFC 6716 allows 6 to 510 kbit/s) and sounds better than G.711 at half the rate. Shorter packets mean lower delay but more headers.`,
              `片方向の値で、通話には両方向に必要です。G.711 を 20 ms で送ると、音声は ${g711.payloadBytes} バイト、毎秒 ${g711.packetsPerSecond} パケットで、${CODECS.pcmu.bitrateBps / 1000} kbit/s のコーデックが IP 上では ${g711.ipKbps} kbit/s になります。「Ethernet 込み」は ${ETHERNET_BYTES} バイトのヘッダと FCS を足したもので、プリアンブルとフレーム間ギャップは含みません。Opus はここでは ${CODECS.opus.bitrateBps / 1000} kbit/s 固定としました。実際にはレートを変えながら送り（RFC 6716 では 6〜510 kbit/s）、G.711 の半分のレートでもより良い音質になります。パケットを短くすると遅延は減りますが、ヘッダが増えます。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="voip-buffer-predict">
          <div style={LESSON_LABEL}>{t('The jitter buffer', 'ジッタバッファ')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `The phone sends a packet every ${SEND_INTERVAL_MS} ms, but each one meets a different delay on the way (jitter). The receiver therefore waits D ms after the first packet before it starts playing, then plays one packet every ${SEND_INTERVAL_MS} ms. A packet that arrives after its turn is useless and counts as lost. Of D = ${BUFFER_CHOICES_MS.join(', ')} ms, which keeps loss under ${LOSS_TARGET_PCT} % with the least delay?`,
              `電話は ${SEND_INTERVAL_MS} ms ごとにパケットを送りますが、途中で受ける遅延はパケットごとに違います（ジッタ）。そこで受信側は最初のパケットが届いてから D ms 待って再生を始め、そのあと ${SEND_INTERVAL_MS} ms ごとに 1 パケットずつ再生します。自分の番に間に合わなかったパケットは使えず、失われたのと同じです。D = ${BUFFER_CHOICES_MS.join('、')} ms のうち、損失を ${LOSS_TARGET_PCT} % 未満に抑えつつ遅延がいちばん小さいのはどれ？`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {BUFFER_CHOICES_MS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={bufferGuess === d}
                data-testid={`voip-buffer-guess-${d}`}
                disabled={bufferRevealed}
                onClick={() => setBufferGuess(d)}
                style={lessonChoice(bufferGuess === d)}
              >
                {predictionMark(d, bufferGuess, best, bufferRevealed)}
                {`${d} ms`}
              </button>
            ))}
          </div>
          {bufferRevealed && bestPlayout ? (
            <p
              data-testid="voip-buffer-reveal"
              data-right={String(bufferGuess === best)}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {bufferGuess === best
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `${best} ms: it loses ${bestPlayout.lossPct} % and the voice reaches the ear ${bestPlayout.mouthToEarMs} ms after it was spoken. A smaller buffer plays a packet before the slowest ones arrive; a larger one loses nothing more but only adds delay. Here the worst packet is ${lossFreeBufferMs()} ms late, so any buffer from ${lossFreeBufferMs()} ms loses nothing.`,
                `${best} ms です。損失は ${bestPlayout.lossPct} % で、話した声が ${bestPlayout.mouthToEarMs} ms 後に耳に届きます。これより小さいバッファでは遅いパケットが届く前にその番が来てしまい、大きいバッファでは損失は減らずに遅延だけが増えます。ここでいちばん遅いパケットは ${lossFreeBufferMs()} ms 遅れるので、${lossFreeBufferMs()} ms 以上のバッファなら何も失いません。`,
              )}
            </p>
          ) : (
            <button
              type="button"
              data-testid="voip-buffer-reveal-button"
              disabled={bufferGuess === null}
              style={{
                ...(bufferGuess === null ? LESSON_TEAL_BUTTON_DISABLED : LESSON_TEAL_BUTTON),
                marginTop: 8,
                display: 'block',
              }}
              onClick={() => setBufferRevealed(true)}
            >
              {bufferGuess === null
                ? t('Predict first', '先に予想を選んでください')
                : t('Play the 50 packets', '50 パケットを再生する')}
            </button>
          )}
        </div>
      ) : null}

      {revealed && bufferRevealed ? (
        <div style={LESSON_CARD} data-testid="voip-buffer-results">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Buffer D', 'バッファ D')}</th>
                  <th style={cell}>{t('Too late', '間に合わない')}</th>
                  <th style={cell}>{t('Loss', '損失')}</th>
                  <th style={cell}>{t('Mouth to ear', '口から耳まで')}</th>
                </tr>
              </thead>
              <tbody>
                {BUFFER_CHOICES_MS.map((d) => {
                  const playout = jitterBuffer(d);
                  return (
                    <tr
                      key={d}
                      data-testid={`voip-buffer-row-${d}`}
                      data-loss={playout.lossPct}
                      data-delay={playout.mouthToEarMs}
                    >
                      <td style={mono}>{`${d} ms`}</td>
                      <td style={mono}>{`${playout.late.length} / ${JITTER_MS.length}`}</td>
                      <td style={mono}>{`${playout.lossPct} %`}</td>
                      <td style={mono}>{`${playout.mouthToEarMs} ms`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            {t('Buffer D', 'バッファ D')}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={bufferMs}
              data-testid="voip-buffer-slider"
              onChange={(event) => setBufferMs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${bufferMs} ms`}</span>
          </label>
          <p
            data-testid="voip-buffer-custom"
            data-loss={custom.lossPct}
            data-delay={custom.mouthToEarMs}
            data-late={custom.late.length}
            style={{ margin: '4px 0 8px', fontWeight: 700 }}
          >
            {t(
              `${custom.late.length} packets too late (${custom.lossPct} %); mouth to ear ${custom.mouthToEarMs} ms${custom.mouthToEarMs > G114_MS ? `, over the ${G114_MS} ms guideline` : ''}.`,
              `${custom.late.length} パケットが間に合わず（${custom.lossPct} %）、口から耳まで ${custom.mouthToEarMs} ms${custom.mouthToEarMs > G114_MS ? `（目安の ${G114_MS} ms を超えています）` : ''}。`,
            )}
          </p>
          <JitterChart bufferMs={bufferMs} />
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Each bar is how much later than ${BASE_DELAY_MS} ms a packet arrived; red bars are above the dashed buffer line and miss their turn. Mouth to ear here is ${SEND_INTERVAL_MS} ms to fill a packet + ${BASE_DELAY_MS} ms on the network + D; real phones add codec and processing time. ITU-T G.114 suggests keeping one-way delay under about ${G114_MS} ms. Simplified: the jitter is a fixed list of 50 values, the buffer size is fixed, and a lost packet is just silence. Real phones adapt the buffer during the call and hide a lost packet by stretching the sound around it.`,
              `各バーは、パケットが ${BASE_DELAY_MS} ms よりどれだけ遅れて届いたかを表します。赤いバーは点線のバッファを超えていて、自分の番に間に合いません。ここでの口から耳までの時間は、パケットに音声をためる ${SEND_INTERVAL_MS} ms + ネットワークの ${BASE_DELAY_MS} ms + D です。実際の電話ではコーデックや処理の時間が加わります。ITU-T G.114 は片方向の遅延を約 ${G114_MS} ms 以下に抑えることを勧めています。簡略化しています。ジッタは決まった 50 個の値で、バッファの大きさは固定、失われたパケットは無音になるだけとしました。実際の電話は通話中にバッファの大きさを調整し、失われたパケットは前後の音を引き伸ばして目立たなくします。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function VoipDemo() {
  return (
    <DemoShell
      title="Voice over IP: SIP, RTP and jitter"
      desc="How SIP and SDP set up a call, what RTP costs per call, and how a jitter buffer trades delay for loss"
    >
      <VoipLesson />
    </DemoShell>
  );
}
