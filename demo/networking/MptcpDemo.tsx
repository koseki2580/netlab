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
  BOTTLENECK,
  FILE_MB,
  LTE,
  PATHS,
  WIFI,
  bottleneckShares,
  download,
  failover,
  schedule,
  windowKb,
  type Failover,
} from './mptcp';

type Answer = 'breaks' | 'slower' | 'same' | 'waits';
const ANSWERS: readonly Answer[] = ['breaks', 'waits', 'slower', 'same'];
const ASKED_LOSS_S = 4;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer a failover outcome matches. */
function answerOf(outcome: Failover): Answer {
  if (!outcome.finished) return 'breaks';
  return outcome.mbpsAfter < outcome.mbpsBefore ? 'slower' : 'same';
}

const CHART_W = 360;
const CHART_H = 120;
const CHART_MAX_S = 20;

/** MB received over time, for TCP over Wi-Fi and for MPTCP, with the moment Wi-Fi is lost. */
function ProgressChart({ lossAtS, stripped }: { lossAtS: number; stripped: boolean }) {
  const t = useT();
  const x = (s: number) => (Math.min(s, CHART_MAX_S) / CHART_MAX_S) * CHART_W;
  const y = (mb: number) => CHART_H - (mb / FILE_MB) * CHART_H;
  const line = (outcome: Failover) => {
    const lostAt = outcome.finishSeconds !== null && outcome.afterLossSeconds === null;
    const points: [number, number][] = [[0, 0]];
    if (lostAt) points.push([outcome.finishSeconds!, FILE_MB]);
    else {
      points.push([lossAtS, outcome.mbAtLoss]);
      if (outcome.finishSeconds !== null) points.push([outcome.finishSeconds, FILE_MB]);
    }
    return points;
  };
  const tcp = failover('tcp', lossAtS);
  const mptcp = failover('mptcp', lossAtS, !stripped);
  const series = [
    { id: 'tcp', outcome: tcp, colour: 'var(--netlab-accent-orange)', dash: '5 4' },
    { id: 'mptcp', outcome: mptcp, colour: 'var(--netlab-accent-cyan)', dash: undefined },
  ];
  return (
    <svg
      data-testid="mptcp-chart"
      viewBox={`-48 -10 ${CHART_W + 60} ${CHART_H + 34}`}
      style={{ width: '100%', maxWidth: 520 }}
      role="img"
      aria-label={t(
        `MB received over time; Wi-Fi is lost at ${lossAtS} s`,
        `受信した MB の推移。${lossAtS} 秒で Wi-Fi が切れます`,
      )}
    >
      {[0, 25, 50].map((mb) => (
        <g key={mb}>
          <line x1={0} x2={CHART_W} y1={y(mb)} y2={y(mb)} stroke="var(--netlab-border)" />
          <text
            x={-6}
            y={y(mb) + 4}
            textAnchor="end"
            fontSize={11}
            fill="var(--netlab-text-secondary)"
          >
            {`${mb} MB`}
          </text>
        </g>
      ))}
      <line
        x1={x(lossAtS)}
        x2={x(lossAtS)}
        y1={0}
        y2={CHART_H}
        stroke="var(--netlab-text-secondary)"
        strokeDasharray="2 3"
      />
      <text x={x(lossAtS) + 4} y={10} fontSize={11} fill="var(--netlab-text-secondary)">
        {t('Wi-Fi lost', 'Wi-Fi 切断')}
      </text>
      {series.map(({ id, outcome, colour, dash }) => {
        const points = line(outcome);
        const last = points[points.length - 1]!;
        return (
          <g key={id}>
            <polyline
              points={points.map(([s, mb]) => `${x(s).toFixed(1)},${y(mb).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={colour}
              strokeWidth={2}
              strokeDasharray={dash}
            />
            {!outcome.finished ? (
              <text
                x={x(last[0])}
                y={y(last[1]) + 4}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fill={colour}
              >
                ×
              </text>
            ) : null}
          </g>
        );
      })}
      <text
        x={CHART_W / 2}
        y={CHART_H + 20}
        textAnchor="middle"
        fontSize={11}
        fill="var(--netlab-text-secondary)"
      >
        {t('seconds → (0–20 s)', '秒 →（0〜20 秒）')}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function MptcpLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lossAtS, setLossAtS] = useState(ASKED_LOSS_S);
  const [stripped, setStripped] = useState(false);
  const [subflows, setSubflows] = useState(2);
  const [coupled, setCoupled] = useState(false);

  const asked = failover('mptcp', ASKED_LOSS_S);
  const truth = answerOf(asked);
  const wifiOnly = download([WIFI]);
  const lteOnly = download([LTE]);
  const both = download(PATHS);
  const small = schedule(64);
  const burst = schedule(200);
  const tcpNow = failover('tcp', lossAtS);
  const mptcpNow = failover('mptcp', lossAtS, !stripped);
  const shares = bottleneckShares(subflows, coupled);

  const answerName = (answer: Answer) =>
    ({
      breaks: t(
        'It fails: the app has to start again on a new connection',
        '失敗する。アプリは新しい接続でやり直す',
      ),
      waits: t('It pauses until Wi-Fi comes back', 'Wi-Fi が戻るまで止まる'),
      same: t('It carries on at the same speed', '同じ速さのまま続く'),
      slower: t('It carries on, more slowly', '遅くなるが、そのまま続く'),
    })[answer];

  const outcomeText = (outcome: Failover) =>
    !outcome.finished
      ? t(
          `Breaks at ${lossAtS} s with ${outcome.mbAtLoss} MB`,
          `${lossAtS} 秒で切断（${outcome.mbAtLoss} MB 受信済み）`,
        )
      : outcome.afterLossSeconds === null
        ? t(
            `Done at ${outcome.finishSeconds} s, before Wi-Fi was lost`,
            `Wi-Fi が切れる前の ${outcome.finishSeconds} 秒で完了`,
          )
        : t(
            `Done at ${outcome.finishSeconds} s (${outcome.afterLossSeconds} s over LTE alone)`,
            `${outcome.finishSeconds} 秒で完了（LTE だけで ${outcome.afterLossSeconds} 秒）`,
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
        <div style={LESSON_LABEL}>{t('One connection, two paths', '1 つの接続、2 つの経路')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A phone has Wi-Fi (${WIFI.mbps} Mbit/s, ${WIFI.rttMs} ms round trip) and LTE (${LTE.mbps} Mbit/s, ${LTE.rttMs} ms). It downloads a ${FILE_MB} MB file. A TCP connection is tied to one address pair, so it uses one of them. Multipath TCP (MPTCP, RFC 8684) is one connection made of several TCP subflows: here one over Wi-Fi and one over LTE. To the app it is still a single connection.`,
            `スマートフォンには Wi-Fi（${WIFI.mbps} Mbit/s、往復 ${WIFI.rttMs} ms）と LTE（${LTE.mbps} Mbit/s、往復 ${LTE.rttMs} ms）があります。${FILE_MB} MB のファイルをダウンロードします。TCP の接続は 1 組のアドレスに結び付いているので、どちらか一方しか使いません。Multipath TCP（MPTCP、RFC 8684）は、複数の TCP サブフローを束ねた 1 つの接続です。ここでは Wi-Fi に 1 本、LTE に 1 本です。アプリから見れば、1 つの接続のままです。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="mptcp-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `The phone downloads over MPTCP with both subflows. ${ASKED_LOSS_S} s in, the user walks out of Wi-Fi range. What happens to the download?`,
            `スマートフォンは 2 本のサブフローを使う MPTCP でダウンロードしています。${ASKED_LOSS_S} 秒たったところで、利用者が Wi-Fi の届かない場所へ出ました。ダウンロードはどうなる？`,
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
              data-testid={`mptcp-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left', minHeight: 44 }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="mptcp-reveal"
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
              `It carries on over LTE. Until ${ASKED_LOSS_S} s both subflows were full, ${asked.mbpsBefore} Mbit/s together, so ${asked.mbAtLoss} MB had arrived. The Wi-Fi subflow is gone, but the connection is not: the LTE subflow brings the other ${FILE_MB - asked.mbAtLoss} MB at ${asked.mbpsAfter} Mbit/s in ${asked.afterLossSeconds} s, and the file is complete at ${asked.finishSeconds} s. The app notices only that it got slower. A plain TCP connection over Wi-Fi would have broken with ${failover('tcp', ASKED_LOSS_S).mbAtLoss} MB.`,
              `LTE でそのまま続きます。${ASKED_LOSS_S} 秒までは 2 本のサブフローが合わせて ${asked.mbpsBefore} Mbit/s で流れていたので、${asked.mbAtLoss} MB が届いていました。Wi-Fi のサブフローは消えますが、接続は消えません。残りの ${FILE_MB - asked.mbAtLoss} MB は LTE のサブフローが ${asked.mbpsAfter} Mbit/s で ${asked.afterLossSeconds} 秒かけて運び、${asked.finishSeconds} 秒でファイルがそろいます。アプリから見えるのは遅くなったことだけです。Wi-Fi 上のふつうの TCP 接続なら、${failover('tcp', ASKED_LOSS_S).mbAtLoss} MB の時点で切れていました。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="mptcp-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run the download', 'ダウンロードを走らせる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="mptcp-downloads">
          <div style={LESSON_LABEL}>{t('Download time', 'ダウンロード時間')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Connection', '接続')}</th>
                  <th style={cell}>{t('Time', '時間')}</th>
                  <th style={cell}>{t('Over Wi-Fi / LTE', 'Wi-Fi／LTE で運んだ量')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'wifi', name: t('TCP over Wi-Fi', 'Wi-Fi 上の TCP'), result: wifiOnly },
                  { id: 'lte', name: t('TCP over LTE', 'LTE 上の TCP'), result: lteOnly },
                  {
                    id: 'both',
                    name: t('MPTCP, both subflows', 'MPTCP（サブフロー 2 本）'),
                    result: both,
                  },
                ].map(({ id, name, result }) => (
                  <tr key={id} data-testid={`mptcp-time-${id}`} data-seconds={result.seconds}>
                    <td style={cell}>{name}</td>
                    <td style={mono}>{`${result.seconds} s`}</td>
                    <td style={mono}>{`${result.carriedMb.wifi} / ${result.carriedMb.lte} MB`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }} data-testid="mptcp-scheduler">
            {t(
              `Which subflow gets each segment is the scheduler’s choice. The common one, min-RTT, sends on the lowest-RTT subflow that has room in its window, and only then on the next. Full, Wi-Fi’s window holds ${windowKb(WIFI)} KB and LTE’s ${windowKb(LTE)} KB. So a ${64} KB request goes over Wi-Fi alone (${small.wifi} / ${small.lte} KB), a ${200} KB burst fills Wi-Fi and spills ${burst.lte} KB onto LTE, and a long download keeps both full.`,
              `各セグメントをどのサブフローに載せるかは、スケジューラが決めます。よく使われる min-RTT スケジューラは、ウィンドウに空きがあるサブフローのうち往復時間が最も短いものに送り、そこが埋まって初めて次のサブフローを使います。満杯の状態で、Wi-Fi のウィンドウには ${windowKb(WIFI)} KB、LTE のウィンドウには ${windowKb(LTE)} KB が入ります。そのため ${64} KB の要求は Wi-Fi だけで運ばれ（${small.wifi}／${small.lte} KB）、${200} KB のまとまったデータは Wi-Fi を埋めて ${burst.lte} KB が LTE にあふれます。長いダウンロードでは両方が埋まり続けます。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="mptcp-failover">
          <div style={{ ...LESSON_LABEL, textTransform: 'none' }}>
            {t('Losing Wi-Fi', 'Wi-Fi が切れたら')}
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Wi-Fi is lost at', 'Wi-Fi が切れる時刻')}
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={lossAtS}
              data-testid="mptcp-loss-at"
              onChange={(event) => setLossAtS(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${lossAtS} s`}</span>
          </label>
          <div
            role="tablist"
            aria-label={t('The MPTCP handshake', 'MPTCP のハンドシェイク')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
          >
            {[
              { id: false, label: t('MP_CAPABLE arrives', 'MP_CAPABLE が届く') },
              {
                id: true,
                label: t('A middlebox strips MP_CAPABLE', '中間装置が MP_CAPABLE を削る'),
              },
            ].map(({ id, label }) => (
              <button
                key={String(id)}
                type="button"
                role="tab"
                aria-selected={stripped === id}
                data-testid={`mptcp-option-${id ? 'stripped' : 'kept'}`}
                onClick={() => setStripped(id)}
                style={{ ...lessonChoice(stripped === id), minHeight: 44 }}
              >
                {stripped === id ? '✓ ' : ''}
                {label}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr
                  data-testid="mptcp-failover-tcp"
                  data-finished={String(tcpNow.finished)}
                  data-mb={tcpNow.mbAtLoss}
                >
                  <td style={cell}>{t('TCP over Wi-Fi', 'Wi-Fi 上の TCP')}</td>
                  <td style={cell}>{outcomeText(tcpNow)}</td>
                </tr>
                <tr
                  data-testid="mptcp-failover-mptcp"
                  data-mode={mptcpNow.mode}
                  data-finished={String(mptcpNow.finished)}
                  data-finish={mptcpNow.finishSeconds ?? ''}
                  data-mb={mptcpNow.mbAtLoss}
                >
                  <td style={cell}>
                    {mptcpNow.mode === 'mptcp'
                      ? t('MPTCP', 'MPTCP')
                      : t('MPTCP, fallen back to TCP', 'MPTCP（TCP にフォールバック）')}
                  </td>
                  <td style={cell}>{outcomeText(mptcpNow)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ProgressChart lossAtS={lossAtS} stripped={stripped} />
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Dashed: TCP over Wi-Fi. Solid: MPTCP. × marks a connection that broke.',
              '破線は Wi-Fi 上の TCP、実線は MPTCP です。× は接続が切れたところです。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'MPTCP is negotiated by the MP_CAPABLE option in the SYN and SYN/ACK. Some firewalls and middleboxes remove TCP options they do not know; then the handshake still completes, as plain TCP, and the connection has only its first path. Apple uses MPTCP for Siri and in some of its apps, so that a request survives a move from Wi-Fi to cellular. QUIC’s connection migration, by contrast, moves a connection to a new path, one path at a time.',
              'MPTCP は SYN と SYN/ACK に載せる MP_CAPABLE オプションで合意します。知らない TCP オプションを取り除くファイアウォールや中間装置があり、その場合もハンドシェイクはふつうの TCP として完了し、接続は最初の経路しか持ちません。Apple は Siri や一部のアプリで MPTCP を使い、Wi-Fi からモバイル回線へ移っても要求が途切れないようにしています。これに対して QUIC のコネクションマイグレーションは、接続を新しい経路へ移すもので、使う経路は一度に 1 本です。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="mptcp-fairness">
          <div style={LESSON_LABEL}>
            {t('Sharing one bottleneck', '1 つのボトルネックを分け合う')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Now the subflows take different first hops but meet at the same ${BOTTLENECK.mbps} Mbit/s link, shared with one regular TCP flow. Every flow there sees the same loss rate and the same ${BOTTLENECK.rttMs} ms round trip.`,
              `今度は、サブフローは最初の区間こそ別々ですが、同じ ${BOTTLENECK.mbps} Mbit/s の回線で合流し、そこをふつうの TCP フロー 1 本と分け合います。そこを通るフローはどれも、同じ損失率と同じ往復 ${BOTTLENECK.rttMs} ms を経験します。`,
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Congestion control', '輻輳制御')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {[
              {
                id: false,
                label: t('Uncoupled (each subflow on its own)', '非連携（サブフローごとに独立）'),
              },
              { id: true, label: t('Coupled (LIA)', '連携（LIA）') },
            ].map(({ id, label }) => (
              <button
                key={String(id)}
                type="button"
                role="tab"
                aria-selected={coupled === id}
                data-testid={`mptcp-cc-${id ? 'coupled' : 'uncoupled'}`}
                onClick={() => setCoupled(id)}
                style={{ ...lessonChoice(coupled === id), minHeight: 44 }}
              >
                {coupled === id ? '✓ ' : ''}
                {label}
              </button>
            ))}
          </div>
          <label
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            {t('MPTCP subflows', 'MPTCP のサブフロー数')}
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={subflows}
              data-testid="mptcp-subflows"
              onChange={(event) => setSubflows(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{subflows}</span>
          </label>
          <div
            data-testid="mptcp-share"
            data-mptcp={shares.mptcpMbps}
            data-tcp={shares.tcpMbps}
            data-pct={shares.mptcpPct}
            style={{ marginTop: 8 }}
          >
            <div
              style={{
                display: 'flex',
                height: 28,
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid var(--netlab-border)',
              }}
              aria-hidden="true"
            >
              <div
                style={{ width: `${shares.mptcpPct}%`, background: 'var(--netlab-accent-cyan)' }}
              />
              <div style={{ flex: 1, background: 'var(--netlab-accent-orange)' }} />
            </div>
            <p style={{ margin: '8px 0 0', fontWeight: 700 }}>
              {t(
                `MPTCP ${shares.mptcpMbps} Mbit/s (${shares.mptcpPct} %), TCP ${shares.tcpMbps} Mbit/s (${100 - shares.mptcpPct} %)`,
                `MPTCP ${shares.mptcpMbps} Mbit/s（${shares.mptcpPct} %）、TCP ${shares.tcpMbps} Mbit/s（${100 - shares.mptcpPct} %）`,
              )}
            </p>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {coupled
              ? t(
                  `Coupled, the subflows raise their windows together: LIA (RFC 6356) makes their combined window grow no faster than one TCP flow’s, so together they settle at ${shares.mptcpWindow} segments, the same as the TCP flow’s ${shares.tcpWindow}. MPTCP gets no more than one TCP flow would, however many subflows it opens, and still moves its traffic towards the less congested path when the paths differ.`,
                  `連携させると、サブフローはウィンドウを一緒に増やします。LIA（RFC 6356）は、合計のウィンドウが TCP フロー 1 本より速く増えないようにするので、合わせて ${shares.mptcpWindow} セグメントに落ち着き、TCP フローの ${shares.tcpWindow} と同じになります。サブフローを何本開いても、TCP 1 本分より多くは取りません。経路ごとに混み具合が違えば、空いているほうへ通信を寄せることはできます。`,
                )
              : t(
                  `Uncoupled, each subflow behaves as a TCP flow of its own and settles at a full TCP window (${shares.tcpWindow} segments here). With ${subflows} of them against one TCP flow, MPTCP takes ${subflows} parts out of ${subflows + 1}: one phone pushes the other user aside just by opening more subflows.`,
                  `連携させないと、各サブフローはそれぞれ独立した TCP フローとしてふるまい、TCP 1 本分のウィンドウ（ここでは ${shares.tcpWindow} セグメント）に落ち着きます。${subflows} 本で TCP 1 本と競えば、MPTCP は ${subflows + 1} 分の ${subflows} を取ります。サブフローを増やすだけで、1 台のスマートフォンがほかの利用者を押しのけてしまいます。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: rates are steady-state averages from the rule that a TCP window settles at √(2/p) segments under loss rate p (here p ≈ ${(shares.lossRate * 100).toFixed(2)} %), with ${BOTTLENECK.mssBytes}-byte segments. In part 1 each subflow runs at its path’s capacity from the start; slow start, handshakes and the data re-sent after Wi-Fi is lost are left out.`,
              `簡略化しています。速度は、損失率 p のもとで TCP のウィンドウが √(2/p) セグメントに落ち着くという関係から求めた定常状態の平均で（ここでは p ≈ ${(shares.lossRate * 100).toFixed(2)} %）、セグメントは ${BOTTLENECK.mssBytes} バイトです。前半では、各サブフローは最初から経路の容量いっぱいで流れるものとし、スロースタート、ハンドシェイク、Wi-Fi 切断後に送り直すデータは省いています。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function MptcpDemo() {
  return (
    <DemoShell
      title="Multipath TCP"
      desc="One connection over Wi-Fi and LTE at once: the scheduler, a lost path, and sharing a bottleneck fairly"
    >
      <MptcpLesson />
    </DemoShell>
  );
}
