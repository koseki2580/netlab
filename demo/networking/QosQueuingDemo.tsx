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
  BC_BITS,
  BUFFER_BYTES,
  CALLS,
  CIR_BPS,
  LINK_BPS,
  PRIORITY_BPS,
  ROGUE_MBPS,
  RUN_US,
  TICKS,
  customerTraffic,
  offeredPerTick,
  police,
  runLink,
  sentPerTick,
  shape,
  type Scheduler,
} from './qosQueuing';

type ConditionGuess = 'policer-drops' | 'shaper-drops' | 'both-drop' | 'neither';
const CONDITION_GUESSES: readonly ConditionGuess[] = [
  'policer-drops',
  'shaper-drops',
  'both-drop',
  'neither',
];
type DelayGuess = '1' | '20' | '120' | '1000';
const DELAY_GUESSES: readonly DelayGuess[] = ['1', '20', '120', '1000'];
const SCHEDULERS: readonly Scheduler[] = ['fifo', 'llq', 'priority-unpoliced'];

/** The option nearest a computed delay in ms. */
const delayBucket = (ms: number): DelayGuess =>
  ms < 5 ? '1' : ms < 60 ? '20' : ms < 500 ? '120' : '1000';

const ms = (us: number) => {
  const value = us / 1000;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;
};
const mbps = (value: number, digits = 1) => `${value.toFixed(digits)} Mbit/s`;

const W = 400;
const H = 130;
const PAD = 28;

interface Series {
  readonly values: readonly (number | null)[];
  readonly color: string;
  readonly dashed?: boolean;
}

/** One line per series over the two seconds, a 10 ms tick per point; gaps where a value is null. */
function TickChart({
  series,
  yMax,
  unit,
  testId,
  label,
}: {
  series: readonly Series[];
  yMax: number;
  unit: string;
  testId: string;
  label: string;
}) {
  const t = useT();
  const x = (tick: number) => PAD + (tick / (TICKS - 1)) * (W - PAD - 6);
  const y = (value: number) => H - 16 - (Math.min(value, yMax) / yMax) * (H - 36);
  const segments = (values: readonly (number | null)[]) => {
    const runs: string[] = [];
    let run: string[] = [];
    values.forEach((value, tick) => {
      if (value === null) {
        if (run.length) runs.push(run.join(' '));
        run = [];
      } else run.push(`${x(tick).toFixed(1)},${y(value).toFixed(1)}`);
    });
    if (run.length) runs.push(run.join(' '));
    return runs;
  };
  return (
    <svg
      data-testid={testId}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={label}
    >
      {[0, yMax / 2, yMax].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD}
            x2={W - 6}
            y1={y(tick)}
            y2={y(tick)}
            stroke="var(--netlab-border-subtle)"
          />
          <text
            x={PAD - 4}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--netlab-text-secondary)"
          >
            {Math.round(tick)}
          </text>
        </g>
      ))}
      {series.map((line, index) =>
        segments(line.values).map((points, run) => (
          <polyline
            key={`${index}-${run}`}
            points={points}
            fill="none"
            stroke={line.color}
            strokeWidth={line.dashed ? 1 : 2}
            strokeDasharray={line.dashed ? '4 3' : undefined}
          />
        )),
      )}
      <text x={PAD} y={10} fontSize={10} fill="var(--netlab-text-secondary)">
        {unit}
      </text>
      <text x={W - 6} y={H - 2} textAnchor="end" fontSize={10} fill="var(--netlab-text-secondary)">
        {t(`time → ${RUN_US / 1e6} s, 10 ms steps`, `時間 → ${RUN_US / 1e6} 秒（10 ms 刻み）`)}
      </text>
    </svg>
  );
}

function Facts({ rows }: { rows: readonly (readonly [string, string, string])[] }) {
  return (
    <table style={{ borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
      <tbody>
        {rows.map(([label, value, id]) => (
          <tr key={id}>
            <td style={{ padding: 4 }}>{label}</td>
            <td
              style={{ padding: 4, fontFamily: 'monospace', fontWeight: 700 }}
              data-testid={`qq-${id}`}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Reveal({ right, testId, children }: { right: boolean; testId: string; children: string }) {
  const t = useT();
  return (
    <p
      data-testid={testId}
      data-right={String(right)}
      role="status"
      style={{ margin: '8px 0 0', lineHeight: 1.7 }}
    >
      <strong>
        {right
          ? t('As you predicted. ', '予想どおりです。')
          : t('Not what you predicted. ', '予想とちがいました。')}
      </strong>
      {children}
    </p>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function QosQueuingLesson() {
  const t = useT();
  const traffic = useMemo(() => customerTraffic(), []);
  const policed = useMemo(() => police(traffic), [traffic]);
  const shaped = useMemo(() => shape(traffic), [traffic]);
  const offered = useMemo(() => offeredPerTick(traffic), [traffic]);
  const [conditionGuess, setConditionGuess] = useState<ConditionGuess | null>(null);
  const [conditionShown, setConditionShown] = useState(false);
  const [view, setView] = useState<'police' | 'shape'>('police');

  const [delayGuess, setDelayGuess] = useState<DelayGuess | null>(null);
  const [delayShown, setDelayShown] = useState(false);
  const [scheduler, setScheduler] = useState<Scheduler>('fifo');
  const [rogueEf, setRogueEf] = useState(false);
  const fifo = useMemo(() => runLink({ scheduler: 'fifo', rogueEf: false }), []);
  const link = useMemo(() => runLink({ scheduler, rogueEf }), [scheduler, rogueEf]);
  const delayTruth = delayBucket(fifo.voice.maxDelayUs / 1000);

  const conditionTruth: ConditionGuess =
    policed.droppedPackets > 0 && shaped.droppedPackets === 0 ? 'policer-drops' : 'both-drop';
  const conditionLabel = (guess: ConditionGuess) =>
    ({
      'policer-drops': t(
        'The policer drops, the shaper delays',
        'ポリサーが捨て、シェーパーが遅らせる',
      ),
      'shaper-drops': t(
        'The shaper drops, the policer delays',
        'シェーパーが捨て、ポリサーが遅らせる',
      ),
      'both-drop': t('Both drop the same packets', 'どちらも同じパケットを捨てる'),
      neither: t('Neither — 5 Mbit/s is the average', 'どちらも何もしない（平均は 5 Mbit/s 以下）'),
    })[guess];
  const schedulerLabel = (id: Scheduler) =>
    ({
      fifo: t('One FIFO queue', 'FIFO キュー 1 本'),
      llq: t('LLQ: policed priority + class queue', 'LLQ：ポリシング付き優先 + クラスキュー'),
      'priority-unpoliced': t('Priority without a policer', 'ポリサーなしの優先'),
    })[id];
  const runMbps = (bytes: number) => (bytes * 8) / RUN_US;

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
        <div style={LESSON_LABEL}>{t('QoS queuing', 'QoS のキューイング')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Marking (DSCP) only labels packets. What happens to them is decided where a link is full: a token bucket decides how much may pass, and a scheduler decides which waiting packet goes next. Here the packets are already marked — voice as EF, the rest as best effort.',
            'マーキング（DSCP）はパケットに印を付けるだけです。実際の扱いはリンクがあふれる場所で決まります。トークンバケットがどれだけ通すかを決め、スケジューラが待っているパケットのどれを次に送るかを決めます。ここではパケットはもう印付きです（音声は EF、残りはベストエフォート）。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="qq-condition">
        <div style={LESSON_LABEL}>
          {t('1 · Policing or shaping a contract', '1 · 契約帯域のポリシングとシェーピング')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A customer pays for ${CIR_BPS / 1e6} Mbit/s. Their traffic comes in bursts: 100 ms at 15 Mbit/s every 400 ms (3.75 Mbit/s on average). The provider enforces the contract with a token bucket of ${BC_BITS / 1000} kbit refilled at ${CIR_BPS / 1e6} Mbit/s — either a policer or a shaper. Which drops packets, and which only delays them?`,
            `ある顧客の契約は ${CIR_BPS / 1e6} Mbit/s です。通信はバースト状で、400 ms ごとに 15 Mbit/s で 100 ms 送ります（平均 3.75 Mbit/s）。事業者は ${CIR_BPS / 1e6} Mbit/s で補充される ${BC_BITS / 1000} kbit のトークンバケットで契約を守らせます。使うのはポリサーかシェーパーです。パケットを捨てるのはどちらで、遅らせるだけなのはどちら？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {CONDITION_GUESSES.map((guess) => (
            <button
              key={guess}
              type="button"
              role="radio"
              aria-checked={conditionGuess === guess}
              data-testid={`qq-guess-${guess}`}
              disabled={conditionShown}
              onClick={() => setConditionGuess(guess)}
              style={lessonChoice(conditionGuess === guess)}
            >
              {conditionGuess === guess ? '✓ ' : ''}
              {conditionLabel(guess)}
            </button>
          ))}
        </div>
        {conditionShown ? (
          <>
            <Reveal right={conditionGuess === conditionTruth} testId="qq-condition-reveal">
              {t(
                `The policer drops ${policed.droppedPackets} of ${policed.offeredPackets} packets and delays none; the shaper drops none and holds packets up to ${ms(shaped.maxDelayUs)}. Both send no faster than ${CIR_BPS / 1e6} Mbit/s after the bucket's first ${BC_BITS / 1000} kbit. A shaper needs a queue to do it; a policer has none. A TCP sender behind the policer would see the losses and slow down — here the load stays as offered.`,
                `ポリサーは ${policed.offeredPackets} 個中 ${policed.droppedPackets} 個を捨て、遅らせるパケットはありません。シェーパーは 1 個も捨てず、最大 ${ms(shaped.maxDelayUs)} 待たせます。どちらもバケットの最初の ${BC_BITS / 1000} kbit を過ぎると ${CIR_BPS / 1e6} Mbit/s より速くは送りません。シェーパーにはそのためのキューが要り、ポリサーにはキューがありません。ポリサーの手前の TCP は損失を見て送信を緩めますが、ここでは送る量を変えていません。`,
              )}
            </Reveal>
            <div
              role="group"
              aria-label={t('Show', '表示')}
              style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}
            >
              {(['police', 'shape'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  data-testid={`qq-view-${id}`}
                  onClick={() => setView(id)}
                  style={lessonChoice(view === id)}
                >
                  {id === 'police'
                    ? t('Policer output', 'ポリサーの出力')
                    : t('Shaper output', 'シェーパーの出力')}
                </button>
              ))}
            </div>
            <TickChart
              testId="qq-condition-chart"
              unit="Mbit/s"
              yMax={16}
              label={t(
                `Offered traffic (dashed) and the ${view === 'police' ? 'policer' : 'shaper'} output per 10 ms`,
                `送られた量（破線）と${view === 'police' ? 'ポリサー' : 'シェーパー'}の出力（10 ms ごと）`,
              )}
              series={[
                { values: offered, color: 'var(--netlab-text-secondary)', dashed: true },
                {
                  values: sentPerTick(view === 'police' ? policed : shaped),
                  color:
                    view === 'police' ? 'var(--netlab-accent-orange)' : 'var(--netlab-accent-cyan)',
                },
              ]}
            />
            <Facts
              rows={[
                [
                  t('Policer: delivered', 'ポリサー：届いた'),
                  `${policed.deliveredPackets} / ${policed.offeredPackets}`,
                  'police-delivered',
                ],
                [
                  t('Policer: dropped', 'ポリサー：捨てた'),
                  String(policed.droppedPackets),
                  'police-dropped',
                ],
                [
                  t('Policer: longest hold', 'ポリサー：最大の待ち'),
                  ms(policed.maxDelayUs),
                  'police-delay',
                ],
                [
                  t('Policer: average rate', 'ポリサー：平均レート'),
                  mbps(runMbps(policed.deliveredBytes), 2),
                  'police-rate',
                ],
                [
                  t('Shaper: delivered', 'シェーパー：届いた'),
                  `${shaped.deliveredPackets} / ${shaped.offeredPackets}`,
                  'shape-delivered',
                ],
                [
                  t('Shaper: dropped', 'シェーパー：捨てた'),
                  String(shaped.droppedPackets),
                  'shape-dropped',
                ],
                [
                  t('Shaper: longest hold', 'シェーパー：最大の待ち'),
                  ms(shaped.maxDelayUs),
                  'shape-delay',
                ],
                [
                  t('Shaper: most queued', 'シェーパー：最大のキュー'),
                  `${shaped.maxQueueBytes / 1000} KB`,
                  'shape-queue',
                ],
                [
                  t('Shaper: average rate', 'シェーパー：平均レート'),
                  mbps(runMbps(shaped.deliveredBytes), 2),
                  'shape-rate',
                ],
              ]}
            />
          </>
        ) : (
          <button
            type="button"
            data-testid="qq-condition-button"
            disabled={!conditionGuess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: conditionGuess ? 1 : 0.5 }}
            onClick={() => setConditionShown(true)}
          >
            {conditionGuess
              ? t('Run both', '両方を動かす')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      <div style={LESSON_CARD} data-testid="qq-schedule">
        <div style={LESSON_LABEL}>
          {t('2 · Scheduling a congested link', '2 · 混雑したリンクのスケジューリング')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A ${LINK_BPS / 1e6} Mbit/s WAN link carries ${CALLS} phone calls (200-byte packets every 20 ms, about 1 Mbit/s). From 0.5 s to 1.5 s a bulk transfer offers 15 Mbit/s. The interface has one first-in first-out queue of ${BUFFER_BYTES / 1000} KB. How long does a voice packet wait at worst?`,
            `${LINK_BPS / 1e6} Mbit/s の WAN リンクに通話が ${CALLS} 本（20 ms ごとに 200 バイト、合計約 1 Mbit/s）流れています。0.5 秒から 1.5 秒まで、大きな転送が 15 Mbit/s 送ってきます。インターフェースのキューは ${BUFFER_BYTES / 1000} KB の FIFO 1 本です。音声パケットは最悪どれだけ待つ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {DELAY_GUESSES.map((guess) => (
            <button
              key={guess}
              type="button"
              role="radio"
              aria-checked={delayGuess === guess}
              data-testid={`qq-delay-${guess}`}
              disabled={delayShown}
              onClick={() => setDelayGuess(guess)}
              style={lessonChoice(delayGuess === guess)}
            >
              {delayGuess === guess ? '✓ ' : ''}
              {guess === '1'
                ? t('Under 2 ms', '2 ms 未満')
                : guess === '1000'
                  ? t('Over 1 s', '1 秒以上')
                  : t(`About ${guess} ms`, `約 ${guess} ms`)}
            </button>
          ))}
        </div>
        {delayShown ? (
          <>
            <Reveal right={delayGuess === delayTruth} testId="qq-delay-reveal">
              {t(
                `${ms(fifo.voice.maxDelayUs)}. Once the transfer fills the buffer, every packet — voice too — waits behind ${BUFFER_BYTES / 1000} KB, which takes 120 ms to send at ${LINK_BPS / 1e6} Mbit/s, and voice packets that find it full are dropped (${fifo.voice.lossPct} %). ITU-T G.114 advises keeping the whole one-way trip under 150 ms; this one hop takes most of it. Now give voice its own queue.`,
                `${ms(fifo.voice.maxDelayUs)} です。転送がバッファを満たすと、音声も含めどのパケットも ${BUFFER_BYTES / 1000} KB の後ろに並びます。${LINK_BPS / 1e6} Mbit/s で送り切るのに 120 ms かかり、満杯のときに着いた音声は捨てられます（${fifo.voice.lossPct} %）。ITU-T G.114 は片道全体を 150 ms 未満に抑えるよう勧めていますが、この 1 ホップだけでその大半を使います。次は音声に専用のキューを与えてみましょう。`,
              )}
            </Reveal>
            <div
              role="group"
              aria-label={t('Scheduler', 'スケジューラ')}
              style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}
            >
              {SCHEDULERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={scheduler === id}
                  data-testid={`qq-sched-${id}`}
                  onClick={() => setScheduler(id)}
                  style={lessonChoice(scheduler === id)}
                >
                  {schedulerLabel(id)}
                </button>
              ))}
            </div>
            <label
              style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, minHeight: 44 }}
            >
              <input
                type="checkbox"
                data-testid="qq-rogue"
                checked={rogueEf}
                onChange={(event) => setRogueEf(event.target.checked)}
              />
              {t(
                `A backup job is wrongly marked EF too (+${ROGUE_MBPS} Mbit/s)`,
                `バックアップ処理まで誤って EF に（+${ROGUE_MBPS} Mbit/s）`,
              )}
            </label>
            <TickChart
              testId="qq-delay-chart"
              unit={t('voice delay, ms', '音声の遅延（ms）')}
              yMax={130}
              label={t(
                'Worst voice delay per 10 ms: FIFO (dashed) and the chosen scheduler',
                '10 ms ごとの音声の最大遅延：FIFO（破線）と選んだスケジューラ',
              )}
              series={[
                {
                  values: fifo.voiceDelayPerTick,
                  color: 'var(--netlab-text-secondary)',
                  dashed: true,
                },
                { values: link.voiceDelayPerTick, color: 'var(--netlab-accent-cyan)' },
              ]}
            />
            <Facts
              rows={[
                [
                  t('Voice: worst delay', '音声：最大遅延'),
                  ms(link.voice.maxDelayUs),
                  'voice-delay',
                ],
                [
                  t('Voice: jitter (worst − best)', '音声：ジッタ（最大 − 最小）'),
                  ms(link.voice.jitterUs),
                  'voice-jitter',
                ],
                [t('Voice: lost', '音声：損失'), `${link.voice.lossPct} %`, 'voice-loss'],
                [
                  t('Bulk during the transfer', '転送中のバルク'),
                  mbps(link.bulk.mbpsDuringTransfer),
                  'bulk-rate',
                ],
                ...(rogueEf
                  ? ([
                      [
                        t('Backup marked EF', 'EF 印のバックアップ'),
                        mbps(link.rogue.mbpsDuringTransfer),
                        'rogue-rate',
                      ],
                    ] as const)
                  : []),
              ]}
            />
            <p style={{ margin: '8px 0 0', lineHeight: 1.7 }} data-testid="qq-schedule-note">
              {scheduler === 'fifo'
                ? t(
                    'One queue: voice shares the bulk transfer’s wait and its drops.',
                    'キューが 1 本なので、音声もバルク転送と同じだけ待ち、同じように捨てられます。',
                  )
                : scheduler === 'llq'
                  ? t(
                      `Low-latency queuing: EF goes first, so while only voice is EF a voice packet waits at most for the 1500-byte packet already on the wire (1.2 ms) plus its own 0.16 ms. The priority class is policed to ${PRIORITY_BPS / 1e6} Mbit/s, so it can never take more; everything else waits in its own class queue (CBWFQ would share the rest among several classes by weight). With the backup marked EF, the policer holds EF to ${PRIORITY_BPS / 1e6} Mbit/s and bulk keeps the rest — but it cannot tell calls from the backup, so calls lose packets too. Fix the marking.`,
                      `低遅延キューイング（LLQ）：EF が先に送られるので、EF が音声だけなら音声が待つのは送信中の 1500 バイト（1.2 ms）と自分の 0.16 ms だけです。優先クラスは ${PRIORITY_BPS / 1e6} Mbit/s にポリシングされ、それ以上は使えません。残りは自分のクラスキューで待ちます（CBWFQ なら複数のクラスで重みに応じて残りを分けます）。バックアップまで EF だと、ポリサーが EF を ${PRIORITY_BPS / 1e6} Mbit/s に抑えるのでバルクは残りを使えますが、通話とバックアップを区別できないため通話も損失します。直すべきはマーキングです。`,
                    )
                  : t(
                      'Strict priority with no policer: fine while EF is only voice. Mark the backup EF and it takes what it wants first — bulk is left about 1 Mbit/s and waits over a second. This is why the priority queue has its own policer.',
                      'ポリサーなしの完全優先：EF が音声だけなら問題ありません。バックアップを EF にすると先に好きなだけ使われ、バルクには約 1 Mbit/s しか残らず、1 秒以上待たされます。優先キューに専用のポリサーが付くのはこのためです。',
                    )}
            </p>
          </>
        ) : (
          <button
            type="button"
            data-testid="qq-delay-button"
            disabled={!delayGuess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: delayGuess ? 1 : 0.5 }}
            onClick={() => setDelayShown(true)}
          >
            {delayGuess
              ? t('Run the link', 'リンクを動かす')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function QosQueuingDemo() {
  return (
    <DemoShell
      title="QoS queuing"
      desc="Police or shape a contract with a token bucket, then give voice a policed priority queue on a congested link."
    >
      <QosQueuingLesson />
    </DemoShell>
  );
}
