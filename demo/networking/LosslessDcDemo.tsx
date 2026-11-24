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
import {
  DEFAULT_CONFIG,
  FRAME_BYTES,
  FRAME_NS,
  LINK_GBPS,
  MODES,
  NS_PER_METRE,
  headroomBytes,
  headroomFrames,
  oneWayTicks,
  simulate,
  type IncastOutcome,
  type Mode,
} from './losslessDc';

type Answer = 'unaffected' | 'slowed' | 'drops';
const ANSWERS: readonly Answer[] = ['unaffected', 'slowed', 'drops'];

const NAMES: Record<Mode, readonly [string, string]> = {
  plain: ['Plain Ethernet', '普通の Ethernet'],
  pfc: ['PFC', 'PFC'],
  'pfc-ecn': ['PFC + ECN (DCQCN-style)', 'PFC + ECN（DCQCN 風）'],
};

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const { senders, burstFrames, bufferFrames, ticks } = DEFAULT_CONFIG;
const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

const CHART_W = 360;
const CHART_H = 120;

/** E1's queue, tick by tick, with the buffer and the PFC XOFF level. */
function QueueChart({ outcome }: { outcome: IncastOutcome }) {
  const t = useT();
  const y = (frames: number) => CHART_H - (frames / bufferFrames) * CHART_H;
  const xoff = bufferFrames - senders * DEFAULT_CONFIG.headroomFrames;
  const points = outcome.queue
    .map((frames, tick) => `${((tick / (ticks - 1)) * CHART_W).toFixed(1)},${y(frames).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      data-testid="ll-chart"
      data-mode={outcome.mode}
      viewBox={`-52 -8 ${CHART_W + 62} ${CHART_H + 32}`}
      style={{ width: '100%', maxWidth: 520 }}
      role="img"
      aria-label={t(
        `Queue at E1 over ${ticks} frame times: at most ${outcome.maxQueue} of ${bufferFrames} frames`,
        `${ticks} フレーム時間の E1 の待ち行列：最大 ${outcome.maxQueue}／${bufferFrames} フレーム`,
      )}
    >
      {[0, bufferFrames / 2, bufferFrames].map((frames) => (
        <g key={frames}>
          <line x1={0} x2={CHART_W} y1={y(frames)} y2={y(frames)} stroke="var(--netlab-border)" />
          <text
            x={-6}
            y={y(frames) + 4}
            textAnchor="end"
            fontSize={12}
            fill="var(--netlab-text-secondary)"
          >
            {frames}
          </text>
        </g>
      ))}
      {outcome.mode !== 'plain' ? (
        <g>
          <line
            x1={0}
            x2={CHART_W}
            y1={y(xoff)}
            y2={y(xoff)}
            stroke="var(--netlab-accent-orange)"
            strokeDasharray="4 3"
          />
          <text
            x={CHART_W}
            y={y(xoff) - 4}
            textAnchor="end"
            fontSize={12}
            fill="var(--netlab-accent-orange)"
          >
            XOFF
          </text>
        </g>
      ) : null}
      <polyline points={points} fill="none" stroke="var(--netlab-accent-cyan)" strokeWidth={2} />
      <text
        x={CHART_W / 2}
        y={CHART_H + 18}
        textAnchor="middle"
        fontSize={12}
        fill="var(--netlab-text-secondary)"
      >
        {t('frame times →', 'フレーム時間 →')}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function LosslessDcLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState<Mode>('pfc');
  const [cable, setCable] = useState(DEFAULT_CONFIG.cableMetres);
  const [headroom, setHeadroom] = useState(DEFAULT_CONFIG.headroomFrames);
  const outcomes = useMemo(
    () =>
      Object.fromEntries(MODES.map((mode) => [mode, simulate(mode)])) as Record<
        Mode,
        IncastOutcome
      >,
    [],
  );
  const pfc = outcomes.pfc;
  const truth: Answer =
    pfc.drops > 0 ? 'drops' : pfc.innocentSent < pfc.innocentMax ? 'slowed' : 'unaffected';
  const tuned = useMemo(
    () => simulate('pfc', { ...DEFAULT_CONFIG, cableMetres: cable, headroomFrames: headroom }),
    [cable, headroom],
  );
  const needed = headroomFrames(cable);
  const neededBytes = headroomBytes(cable);
  const answerName = (answer: Answer) =>
    ({
      unaffected: t(
        'No drops, and V is unaffected: it goes to an idle port',
        'ドロップはなく、V も影響なし（空いたポート宛てだから）',
      ),
      slowed: t('No drops, but V slows down too', 'ドロップはないが、V も遅くなる'),
      drops: t('Still drops, and V loses frames too', 'まだドロップし、V のフレームも失われる'),
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
        <div style={LESSON_LABEL}>{t('Incast', 'インキャスト')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `RoCEv2 carries RDMA over UDP/IP on Ethernet, and its NICs recover from a lost frame slowly (typically by resending everything after it), so the network is expected not to drop. Here ${senders} servers S1–S${senders} answer one request at the same moment: each sends ${burstFrames} frames to one receiver behind switch port E1, which has room for ${bufferFrames} frames. Every link runs at ${LINK_GBPS} Gb/s. Plain Ethernet drops what does not fit (tail drop).`,
            `RoCEv2 は RDMA を Ethernet 上の UDP/IP で運びます。NIC はフレームを 1 つ失うと立ち直りが遅い（多くはそれ以降をすべて送り直す）ので、ネットワークは落とさないことが前提です。ここでは ${senders} 台のサーバ S1〜S${senders} が 1 つの要求に同時に答え、それぞれ ${burstFrames} フレームを、スイッチのポート E1 の先にある 1 台の受信側へ送ります。E1 のバッファは ${bufferFrames} フレーム分です。どのリンクも ${LINK_GBPS} Gb/s です。普通の Ethernet は入りきらない分を捨てます（テールドロップ）。`,
          )}
        </p>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            'One more flow, V, shares S1’s link into the switch, in the same priority class, but goes to a different port, E2, which is idle.',
            'もう 1 つの通信 V が、同じ優先度クラスで S1 とスイッチへのリンクを共有しています。ただし宛先は別のポート E2 で、そこは空いています。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ll-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'PFC (priority-based flow control, IEEE 802.1Qbb) is switched on: when E1’s buffer runs high, the switch sends PAUSE frames for that priority out of the ports the traffic comes in on, with headroom set aside for what is still on the wire. What happens?',
            'PFC（優先度ベースのフロー制御、IEEE 802.1Qbb）を有効にします。E1 のバッファが埋まってくると、スイッチは通信が入ってくるポートへ、その優先度の PAUSE フレームを送ります。線路上にまだあるフレームのためにヘッドルームも確保しています。何が起きる？',
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
              data-testid={`ll-guess-${answer}`}
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
            data-testid="ll-reveal"
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
              `Plain Ethernet dropped ${outcomes.plain.drops} of ${outcomes.plain.offered} frames. With PFC none is dropped, but a PAUSE stops the whole priority on a link, not one flow: the switch sent ${pfc.pauses} XOFFs and held the ports paused for ${pfc.pausedTicks} frame times, and V, which only wanted the idle E2, got ${pfc.innocentSent} of its ${pfc.innocentMax} turns (${percent(pfc.innocentSent, pfc.innocentMax)} %). That is head-of-line blocking; across several switches the pauses can spread further back.`,
              `普通の Ethernet では ${outcomes.plain.offered} フレーム中 ${outcomes.plain.drops} フレームが捨てられました。PFC ならドロップは 0 ですが、PAUSE が止めるのは 1 つの通信ではなく、リンク上のその優先度全体です。スイッチは XOFF を ${pfc.pauses} 回送り、${pfc.pausedTicks} フレーム時間ポートを止めました。空いた E2 に行きたいだけの V も、${pfc.innocentMax} 回の送信機会のうち ${pfc.innocentSent} 回（${percent(pfc.innocentSent, pfc.innocentMax)} %）しか送れませんでした。これがヘッドオブラインブロッキングで、スイッチを何段もまたぐと PAUSE はさらに上流へ広がります。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ll-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run the incast', 'インキャストを流す')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ll-results">
          <div style={LESSON_LABEL}>
            {t('Three switches, same burst', '同じバーストを 3 通りで')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell} />
                  <th style={cell}>{t('Dropped', 'ドロップ')}</th>
                  <th style={cell}>{t('XOFFs / paused', 'XOFF／停止時間')}</th>
                  <th style={cell}>{t('ECN marks', 'ECN マーク')}</th>
                  <th style={cell}>{t('Peak queue', '最大の待ち行列')}</th>
                  <th style={cell}>{t('V got through', 'V が送れた割合')}</th>
                  <th style={cell}>{t('Last frame out', '最後のフレーム')}</th>
                </tr>
              </thead>
              <tbody>
                {MODES.map((mode) => {
                  const outcome = outcomes[mode];
                  return (
                    <tr
                      key={mode}
                      data-testid={`ll-row-${mode}`}
                      data-drops={outcome.drops}
                      data-pauses={outcome.pauses}
                      data-marks={outcome.marks}
                      data-innocent={outcome.innocentSent}
                    >
                      <td style={cell}>{t(...NAMES[mode])}</td>
                      <td style={mono}>{`${outcome.drops} / ${outcome.offered}`}</td>
                      <td style={mono}>{`${outcome.pauses} / ${outcome.pausedTicks}`}</td>
                      <td style={mono}>{outcome.marks}</td>
                      <td style={mono}>{outcome.maxQueue}</td>
                      <td style={mono}>
                        {`${percent(outcome.innocentSent, outcome.innocentMax)} %`}
                      </td>
                      <td style={mono}>{outcome.finishTick}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Times are in frame times: one ${FRAME_BYTES}-byte frame at ${LINK_GBPS} Gb/s, ${FRAME_NS} ns. The receiver cannot take more than one frame per frame time, so ${outcomes.pfc.offered} frames need at least ${outcomes.pfc.offered}.`,
              `時間の単位はフレーム時間です。${LINK_GBPS} Gb/s で ${FRAME_BYTES} バイトのフレーム 1 つ、${FRAME_NS} ns です。受信側は 1 フレーム時間に 1 フレームしか受け取れないので、${outcomes.pfc.offered} フレームには少なくとも ${outcomes.pfc.offered} フレーム時間かかります。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `With ECN (RFC 3168) the switch marks frames CE once E1 holds more than ${DEFAULT_CONFIG.ecnThreshold} frames instead of waiting to pause. The receiver tells each sender (a CNP in RoCEv2), and the sender cuts its rate, as DCQCN does. Here ${outcomes['pfc-ecn'].marks} marks slowed the senders before the buffer reached XOFF, so PFC fired ${outcomes['pfc-ecn'].pauses} time instead of ${pfc.pauses}, and V got ${percent(outcomes['pfc-ecn'].innocentSent, outcomes['pfc-ecn'].innocentMax)} % through. PFC stays as the safety net; ECN keeps it from being used.`,
              `ECN（RFC 3168）を使うと、スイッチは E1 に ${DEFAULT_CONFIG.ecnThreshold} フレームを超えてたまった時点でフレームに CE の印を付けます。PAUSE を待ちません。受信側が各送信側へ知らせ（RoCEv2 では CNP）、送信側は DCQCN のように送信レートを下げます。ここでは ${outcomes['pfc-ecn'].marks} 回のマークで、バッファが XOFF に届く前に送信側が減速したので、PFC が働いたのは ${pfc.pauses} 回ではなく ${outcomes['pfc-ecn'].pauses} 回で、V は ${percent(outcomes['pfc-ecn'].innocentSent, outcomes['pfc-ecn'].innocentMax)} % 送れました。PFC は安全網として残し、ECN でそれを使わずに済ませます。`,
            )}
          </p>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={shown === mode}
                data-testid={`ll-show-${mode}`}
                onClick={() => setShown(mode)}
                style={lessonChoice(shown === mode)}
              >
                {shown === mode ? '✓ ' : ''}
                {t(...NAMES[mode])}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 4px', fontSize: 13, fontWeight: 700 }}>
            {t(`E1’s queue: ${NAMES[shown][0]}`, `E1 の待ち行列：${NAMES[shown][1]}`)}
          </p>
          <QueueChart outcome={outcomes[shown]} />
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ll-headroom-card">
          <div style={LESSON_LABEL}>{t('How much headroom', 'ヘッドルームはどれだけ要る')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'A PAUSE takes time to reach the sender, and the frames already on the cable keep coming. The headroom must hold them. A simplified estimate: headroom ≈ 2 × link rate × cable delay + 2 × MTU (one frame that cannot be cut off at each end). Vendor formulas add the PHY and MAC response times the standard allows, so treat this as a lower bound.',
              'PAUSE が送信側に届くまでには時間がかかり、その間もケーブル上のフレームは届き続けます。それを受け止めるのがヘッドルームです。簡略化した見積もりは「ヘッドルーム ≈ 2 × リンク速度 × ケーブルの遅延 + 2 × MTU」です（MTU の項は、両端で途中で止められないフレーム 1 つずつ）。ベンダーの計算式は規格が認める PHY と MAC の応答時間も足すので、これは下限の目安です。',
            )}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Cable', 'ケーブル')}
              <input
                type="range"
                min={24}
                max={192}
                step={24}
                value={cable}
                data-testid="ll-cable"
                onChange={(event) => setCable(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${cable} m`}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Headroom per port', 'ポートごとのヘッドルーム')}
              <input
                type="range"
                min={0}
                max={18}
                value={headroom}
                data-testid="ll-headroom"
                onChange={(event) => setHeadroom(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>
                {t(`${headroom} frames`, `${headroom} フレーム`)}
              </span>
            </label>
          </div>
          <p style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: 13 }}>
            {`2 × ${LINK_GBPS / 8} B/ns × ${cable * NS_PER_METRE} ns + 2 × ${FRAME_BYTES} B = ${neededBytes.toLocaleString('en')} B ≈ ${needed}`}
            {t(' frames', ' フレーム')}
          </p>
          <p
            data-testid="ll-tuned"
            data-needed={needed}
            data-drops={tuned.drops}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {tuned.drops > 0
              ? t(
                  `${tuned.drops} frames dropped despite PFC: the frames on a ${cable} m cable (${oneWayTicks(cable)} frame times each way) do not fit in ${headroom} frames of headroom.`,
                  `PFC があるのに ${tuned.drops} フレームが捨てられました。${cable} m のケーブル（片道 ${oneWayTicks(cable)} フレーム時間）の上にあるフレームが、${headroom} フレームのヘッドルームに入りきりません。`,
                )
              : t(
                  `No frame dropped: ${tuned.pauses} XOFFs, and the frames still on the cable fit in the headroom.`,
                  `ドロップなし。XOFF は ${tuned.pauses} 回で、ケーブル上に残ったフレームはヘッドルームに収まりました。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Headroom comes out of the same ${bufferFrames}-frame buffer, ${senders} ports’ worth, so more headroom also means pausing earlier. Simplified: one shared buffer for E1, every incast port paused together, one frame time per tick, and the ECN threshold and rate-cut timers are this lesson’s choices, not DCQCN defaults. Dropped frames are counted, not resent.`,
              `ヘッドルームは同じ ${bufferFrames} フレームのバッファから ${senders} ポート分取られるので、増やすほど早めに PAUSE することになります。簡略化：E1 のバッファは 1 つの共有バッファ、インキャストのポートはまとめて止める、1 ティックは 1 フレーム時間、ECN のしきい値とレートを下げる間隔はこのレッスンで決めた値で、DCQCN の初期値ではありません。捨てられたフレームは数えるだけで、送り直しません。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function LosslessDcDemo() {
  return (
    <DemoShell
      title="Lossless Ethernet for RoCEv2"
      desc="Many servers answer one at once: what a data-centre switch does with the burst"
    >
      <LosslessDcLesson />
    </DemoShell>
  );
}
