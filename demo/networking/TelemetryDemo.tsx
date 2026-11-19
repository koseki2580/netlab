import { useMemo, useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  COUNTER_PATH,
  POLL_S,
  SAMPLE_S,
  SECONDS,
  STATUS_PATH,
  peak,
  polledStatus,
  readings,
  statusChanges,
  type Reading,
} from './telemetry';

type Answer = 'full' | 'fifth' | 'flat';
const ANSWERS: readonly Answer[] = ['full', 'fifth', 'flat'];

const W = 360;
const H = 100;

/** A card that may shrink below its content's width, so a long path line scrolls inside it. */
const CARD = { ...LESSON_CARD, minWidth: 0 };

/** Utilisation readings as bars across the ten minutes. */
function Bars({
  series,
  label,
  testId,
}: {
  series: readonly Reading[];
  label: string;
  testId: string;
}) {
  const interval = SECONDS / series.length;
  const width = (W * interval) / SECONDS;
  return (
    <svg
      data-testid={testId}
      data-peak={peak(series)}
      viewBox={`-34 -6 ${W + 40} ${H + 24}`}
      style={{ width: '100%', maxWidth: 480 }}
      role="img"
      aria-label={label}
    >
      {[0, 50, 100].map((pct) => {
        const y = H - (pct / 100) * H;
        return (
          <g key={pct}>
            <line x1={0} x2={W} y1={y} y2={y} stroke="var(--netlab-border)" />
            <text
              x={-6}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--netlab-text-secondary)"
            >
              {`${pct} %`}
            </text>
          </g>
        );
      })}
      {series.map((reading) => {
        const height = (reading.utilPct / 100) * H;
        return (
          <rect
            key={reading.at}
            x={((reading.at - interval) / SECONDS) * W + 0.5}
            y={H - height}
            width={Math.max(1, width - 1)}
            height={height}
            fill="var(--netlab-accent-cyan)"
          />
        );
      })}
      {[0, 5, 10].map((minute) => (
        <text
          key={minute}
          x={(minute * 60 * W) / SECONDS}
          y={H + 16}
          textAnchor="middle"
          fontSize={11}
          fill="var(--netlab-text-secondary)"
        >
          {`${minute}:00`}
        </text>
      ))}
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function TelemetryLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const poll = useMemo(() => readings(POLL_S), []);
  const stream = useMemo(() => readings(SAMPLE_S), []);
  const truth: Answer = 'fifth';
  const clock = (at: number) => `${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')}`;
  const answerName = (answer: Answer) =>
    ({
      full: t('About 100 %', '100 % くらい'),
      fifth: t('About 20 %', '20 % くらい'),
      flat: t('15 %, the same as always', 'いつもと同じ 15 %'),
    })[answer];

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={CARD}>
        <div style={LESSON_LABEL}>{t('Streaming telemetry', 'ストリーミングテレメトリ')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Monitoring reads an interface’s octet counter twice and divides the difference by the time between: that is the link’s utilisation over the interval. SNMP pollers commonly ask every five minutes. Streaming telemetry (gNMI with OpenConfig paths) lets the router push: a SAMPLE subscription every few seconds, and ON_CHANGE the moment a state changes.',
            '監視は、インターフェースのオクテットカウンタを 2 回読み、その差を間の時間で割ります。これがその間の回線の使用率です。SNMP の監視は 5 分ごとに問い合わせる設定がよく使われます。ストリーミングテレメトリ（OpenConfig のパスを使う gNMI）では、ルータの側から送ってきます。数秒ごとの SAMPLE と、状態が変わった瞬間の ON_CHANGE です。',
          )}
        </p>
        <pre
          data-testid="telemetry-subscription"
          style={{
            margin: '8px 0 0',
            padding: 8,
            fontSize: 12,
            overflowX: 'auto',
            maxWidth: '100%',
            background: 'var(--netlab-bg-surface)',
            borderRadius: 6,
          }}
        >
          {`subscribe:\n  mode: STREAM\n  - path: ${COUNTER_PATH}\n    mode: SAMPLE  sample_interval: ${SAMPLE_S}s\n  - path: ${STATUS_PATH}\n    mode: ON_CHANGE`}
        </pre>
      </div>

      <div style={CARD} data-testid="telemetry-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The link carries a steady 15 %. At 2:10 a 20-second burst fills it to 100 %, and users complain. What is the highest point on the five-minute SNMP graph?',
            '回線はふだん 15 % です。2:10 から 20 秒間、通信が回線を 100 % まで埋め、利用者から苦情が来ました。5 分ごとの SNMP のグラフの最高値は？',
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
              data-testid={`telemetry-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="telemetry-reveal"
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
              `${peak(poll)} %: twenty seconds of 100 % spread over three hundred look like a slightly busy five minutes. The ten-second stream shows the burst at ${peak(stream)} %.`,
              `${peak(poll)} % です。20 秒間の 100 % も、300 秒で均すと「少し混んだ 5 分間」にしか見えません。10 秒ごとのストリームには、${peak(stream)} % の山がそのまま出ます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="telemetry-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Show both graphs', '2 つのグラフを見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={CARD} data-testid="telemetry-graphs">
          <div style={LESSON_LABEL}>
            {t(`SNMP, every ${POLL_S / 60} minutes`, `SNMP（${POLL_S / 60} 分ごと）`)}
          </div>
          <Bars
            series={poll}
            testId="telemetry-poll"
            label={t(
              `Five-minute readings: at most ${peak(poll)} %`,
              `5 分ごとの値：最大 ${peak(poll)} %`,
            )}
          />
          <div style={{ ...LESSON_LABEL, marginTop: 8, textTransform: 'none' }}>
            {t(`gNMI SAMPLE, every ${SAMPLE_S} seconds`, `gNMI の SAMPLE（${SAMPLE_S} 秒ごと）`)}
          </div>
          <Bars
            series={stream}
            testId="telemetry-stream"
            label={t(
              `Ten-second readings: at most ${peak(stream)} %`,
              `10 秒ごとの値：最大 ${peak(stream)} %`,
            )}
          />
        </div>
      ) : null}

      {revealed ? (
        <div style={CARD} data-testid="telemetry-status">
          <div style={LESSON_LABEL}>
            {t(
              'And at 6:40 the link went down for 30 seconds',
              'さらに 6:40 に、回線が 30 秒間落ちていました',
            )}
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ padding: 4, fontWeight: 700 }}>
                  {t('SNMP polls', 'SNMP の問い合わせ')}
                </td>
                <td style={{ padding: 4, fontFamily: 'monospace' }} data-testid="telemetry-polled">
                  {polledStatus()
                    .map((p) => `${clock(p.at)} ${p.status}`)
                    .join(', ')}
                </td>
              </tr>
              <tr>
                <td style={{ padding: 4, fontWeight: 700 }}>ON_CHANGE</td>
                <td style={{ padding: 4, fontFamily: 'monospace' }} data-testid="telemetry-changes">
                  {statusChanges()
                    .map((c) => `${clock(c.at)} ${c.status}`)
                    .join(', ')}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Both polls found the link up: the outage fell between them (SNMP can push linkDown/linkUp traps for this one event, but not a stream of counters). ON_CHANGE reported it the second it happened, and again when it came back. That is why networks that need to react — reroute, alert, plan capacity — stream rather than poll.',
              '2 回の問い合わせはどちらも「UP」でした。障害がちょうどその間に起きたからです（この障害だけなら SNMP も linkDown/linkUp トラップで知らせられますが、カウンタを流し続けることはできません）。ON_CHANGE は、落ちた瞬間と戻った瞬間に知らせました。素早く反応したいネットワーク（経路の切り替え、警報、容量計画）が、問い合わせではなくストリーミングを使うのはこのためです。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function TelemetryDemo() {
  return (
    <DemoShell
      title="Streaming telemetry"
      desc="A five-minute poll and a ten-second stream of the same link: what each one sees"
    >
      <TelemetryLesson />
    </DemoShell>
  );
}
