import { useMemo, useState } from 'react';
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
import { BASE_RTT_MS, MARK_THRESHOLD, SCENARIOS, simulate, type L4sScenario } from './l4s';

const NAMES: Record<L4sScenario, readonly [string, string]> = {
  'classic-deep': ['Classic TCP, deep buffer', '従来の TCP・深いバッファ'],
  'classic-shallow': ['Classic TCP, shallow buffer', '従来の TCP・浅いバッファ'],
  l4s: ['L4S (ECN marks from 1 ms)', 'L4S（1 ms から ECN マーク）'],
};

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

const CHART_W = 360;
const CHART_H = 120;
const CHART_MAX_MS = 20;

/** The queueing delay, round by round, as a line. */
function DelayChart({ scenario }: { scenario: L4sScenario }) {
  const t = useT();
  const outcome = useMemo(() => simulate(scenario), [scenario]);
  const step = CHART_W / (outcome.rounds.length - 1);
  const points = outcome.rounds
    .map(
      (round, index) =>
        `${(index * step).toFixed(1)},${(CHART_H - (round.delayMs / CHART_MAX_MS) * CHART_H).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg
      data-testid="l4s-chart"
      data-scenario={scenario}
      viewBox={`-44 -8 ${CHART_W + 54} ${CHART_H + 32}`}
      style={{ width: '100%', maxWidth: 480 }}
      role="img"
      aria-label={t(
        `Queueing delay over ${outcome.rounds.length} round trips: at most ${outcome.maxDelayMs} ms`,
        `${outcome.rounds.length} 往復の間の待ち時間：最大 ${outcome.maxDelayMs} ms`,
      )}
    >
      {[0, 10, 20].map((ms) => {
        const y = CHART_H - (ms / CHART_MAX_MS) * CHART_H;
        return (
          <g key={ms}>
            <line x1={0} x2={CHART_W} y1={y} y2={y} stroke="var(--netlab-border)" />
            <text
              x={-6}
              y={y + 4}
              textAnchor="end"
              fontSize={12}
              fill="var(--netlab-text-secondary)"
            >
              {`${ms} ms`}
            </text>
          </g>
        );
      })}
      <polyline points={points} fill="none" stroke="var(--netlab-accent-cyan)" strokeWidth={2} />
      <text
        x={CHART_W / 2}
        y={CHART_H + 18}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {t('round trips →', '往復 →')}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function L4sLesson() {
  const t = useT();
  const [guess, setGuess] = useState<L4sScenario | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState<L4sScenario>('classic-deep');
  const outcomes = useMemo(
    () =>
      Object.fromEntries(SCENARIOS.map((id) => [id, simulate(id)])) as Record<
        L4sScenario,
        ReturnType<typeof simulate>
      >,
    [],
  );

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
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>L4S</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A sender keeps adding a few packets per round trip until the bottleneck tells it to slow down. Classic TCP is told by a drop, once the buffer is full, and then halves. L4S (Low Latency, Low Loss, Scalable throughput) is told early: its packets carry ECT(1), the router marks them CE as soon as the queue passes ${MARK_THRESHOLD} packets (1 ms), and the sender backs off in proportion to the marks.`,
            `送り手は、ボトルネックから「減らして」と伝えられるまで、往復ごとに少しずつパケットを増やします。従来の TCP は、バッファがあふれてパケットが捨てられたときに初めて気づき、送る量を半分にします。L4S（低遅延・低損失・スケーラブルな帯域）は早く伝えられます。パケットに ECT(1) の印を付けておくと、ルータは待ち行列が ${MARK_THRESHOLD} パケット（1 ms）を超えた時点で CE の印に書き換え、送り手は印の数に応じて少しだけ減らします。`,
          )}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            `Here the line sends 100 packets per ${BASE_RTT_MS} ms round trip, so 100 packets waiting add ${BASE_RTT_MS} ms of delay.`,
            `ここでは回線が ${BASE_RTT_MS} ms の 1 往復で 100 パケットを送ります。100 パケット待てば、遅延が ${BASE_RTT_MS} ms 増えます。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="l4s-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'Which keeps the line full and the delay low at the same time?',
            '回線を使い切りながら、遅延も小さく保てるのはどれ？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {SCENARIOS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={guess === id}
              data-testid={`l4s-guess-${id}`}
              disabled={revealed}
              onClick={() => setGuess(id)}
              style={{ ...lessonChoice(guess === id), textAlign: 'left' }}
            >
              {predictionMark(id, guess, 'l4s', revealed)}
              {t(...NAMES[id])}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="l4s-reveal"
            data-right={String(guess === 'l4s')}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === 'l4s'
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              'Classic TCP has to pick: a deep buffer keeps the line full but lets the queue grow until it overflows; a shallow one keeps the queue short, but halving then leaves the line idle. L4S is told while the queue is still short and backs off a little, so it does both — and here loses no packet.',
              '従来の TCP はどちらかを選ぶしかありません。深いバッファなら回線は埋まりますが、あふれるまで待ち行列が伸びます。浅いバッファなら待ち行列は短いままですが、半分に減らしたあと回線が空きます。L4S は待ち行列が短いうちに伝えられて少しだけ減らすので、両方を満たし、ここではパケットも失いません。',
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="l4s-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run all three', '3 つを走らせる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="l4s-results">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell} />
                <th style={cell}>{t('Line used', '回線の使用率')}</th>
                <th style={cell}>{t('Delay, average / worst', '遅延（平均／最大）')}</th>
                <th style={cell}>{t('Dropped', '捨てられた')}</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((id) => {
                const outcome = outcomes[id];
                return (
                  <tr key={id} data-testid={`l4s-row-${id}`}>
                    <td style={cell}>{t(...NAMES[id])}</td>
                    <td
                      style={{ ...cell, fontFamily: 'monospace' }}
                    >{`${outcome.utilisationPct} %`}</td>
                    <td
                      style={{ ...cell, fontFamily: 'monospace' }}
                    >{`${outcome.averageDelayMs} / ${outcome.maxDelayMs} ms`}</td>
                    <td style={{ ...cell, fontFamily: 'monospace' }}>{outcome.drops}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {SCENARIOS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={shown === id}
                data-testid={`l4s-show-${id}`}
                onClick={() => setShown(id)}
                style={lessonChoice(shown === id)}
              >
                {t(...NAMES[id])}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 4px', fontSize: 13, fontWeight: 700 }}>
            {t(`Shown: ${NAMES[shown][0]}`, `表示中：${NAMES[shown][1]}`)}
          </p>
          <DelayChart scenario={shown} />
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'In a real network L4S and classic traffic share the line through a dual-queue AQM (RFC 9332), which keeps classic flows from being starved. The marks reach the sender in the ACKs, counted by Accurate ECN.',
              '実際のネットワークでは、L4S と従来の通信はデュアルキュー AQM（RFC 9332）で回線を分け合い、従来の通信が締め出されないようにします。印は ACK に載って送り手に戻り、Accurate ECN で数えられます。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function L4sDemo() {
  return (
    <DemoShell
      title="L4S"
      desc="One bottleneck, three senders: told it is full by a drop, or early by an ECN mark."
    >
      <L4sLesson />
    </DemoShell>
  );
}
