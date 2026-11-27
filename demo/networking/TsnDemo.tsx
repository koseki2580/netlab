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
  BEST_EFFORT_FRAME_BYTES,
  CONTROL_FRAME_BYTES,
  CYCLE_NS,
  RATES_MBPS,
  SCHEMES,
  UNSPLITTABLE_BYTES,
  bound,
  cycleShares,
  frameTimeNs,
  gateControlList,
  wireBytes,
  type GclEntry,
  type RateMbps,
  type Scheme,
} from './tsn';
import { tsnChallenges } from './tsnChallenges';

/** The lesson's scene: one 1 Gb/s egress port. */
const RATE: RateMbps = 1000;

type First = 'own' | 'blocked' | 'two' | 'none';
const FIRSTS: readonly First[] = ['own', 'blocked', 'two', 'none'];
type Second = 'own' | 'window' | 'half' | 'blocked';
const SECONDS: readonly Second[] = ['blocked', 'half', 'window', 'own'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const num: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** ns as µs, at most three decimals. */
const us = (ns: number) => `${Number((ns / 1000).toFixed(3))} µs`;
const pct = (share: number) => `${Number((share * 100).toFixed(2))} %`;
const rateName = (rate: number) => (rate >= 1000 ? `${rate / 1000} Gb/s` : `${rate} Mb/s`);

const BAR_X = 20;
const BAR_W = 320;

/** The worst moment under strict priority: a best-effort frame has just started. */
function BlockingDiagram() {
  const t = useT();
  const priority = bound('priority', RATE);
  const scale = BAR_W / priority.worstPerHopNs;
  const beEnd = BAR_X + priority.blockingNs * scale;
  const end = BAR_X + BAR_W;
  return (
    <svg
      data-testid="tsn-blocking-diagram"
      viewBox="0 0 360 112"
      style={{ width: '100%', maxWidth: 520, display: 'block' }}
      role="img"
      aria-label={t(
        `The control frame waits ${us(priority.blockingNs)} behind a best-effort frame, then takes ${us(priority.ownNs)}`,
        `制御フレームはベストエフォートのフレームの後ろで ${us(priority.blockingNs)} 待ち、その後 ${us(priority.ownNs)} かけて送られます`,
      )}
    >
      <text x={BAR_X} y={18} fontSize={13} fill="var(--netlab-text-primary)">
        {t('Egress port, 1 Gb/s', '出力ポート（1 Gb/s）')}
      </text>
      <rect
        x={BAR_X}
        y={28}
        width={beEnd - BAR_X}
        height={26}
        fill="var(--netlab-accent-orange)"
        opacity={0.8}
      />
      <text x={BAR_X + 6} y={46} fontSize={13} fill="var(--netlab-bg-primary)">
        {t('best effort, 1538 B', 'ベストエフォート 1538 バイト')}
      </text>
      <rect x={beEnd} y={28} width={end - beEnd} height={26} fill="var(--netlab-accent-cyan)" />
      <line
        x1={BAR_X + 2}
        x2={BAR_X + 2}
        y1={24}
        y2={70}
        stroke="var(--netlab-text-primary)"
        strokeDasharray="3 3"
      />
      <text x={BAR_X} y={84} fontSize={13} fill="var(--netlab-text-primary)">
        {t('↑ control frame queued', '↑ 制御フレームがキューに入る')}
      </text>
      <text x={end} y={104} textAnchor="end" fontSize={13} fill="var(--netlab-text-primary)">
        {t(
          `last bit out: ${us(priority.worstPerHopNs)}`,
          `最後のビット送出：${us(priority.worstPerHopNs)}`,
        )}
      </text>
    </svg>
  );
}

const GATE_FILL: Record<GclEntry['open'], string> = {
  critical: 'var(--netlab-accent-cyan)',
  'best-effort': 'var(--netlab-accent-orange)',
  closed: 'var(--netlab-text-secondary)',
};

/** One cycle of the gate control list as a bar; tiny entries keep a visible width. */
function CycleDiagram({ entries }: { entries: readonly GclEntry[] }) {
  const t = useT();
  const minW = 5;
  const raw = entries.map((entry) => (entry.durationNs / CYCLE_NS) * BAR_W);
  const small = raw.reduce((sum, w) => sum + (w < minW ? minW - w : 0), 0);
  const largest = raw.indexOf(Math.max(...raw));
  const widths = raw.map((w, i) => (w < minW ? minW : i === largest ? w - small : w));
  const starts = widths.map((_, i) => BAR_X + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const names: Record<GclEntry['open'], string> = {
    critical: t('control window', '制御フレームの窓'),
    'best-effort': t('best effort', 'ベストエフォート'),
    closed: t('guard band (all closed)', 'ガードバンド（すべて閉）'),
  };
  return (
    <svg
      data-testid="tsn-cycle-diagram"
      viewBox="0 0 360 136"
      style={{ width: '100%', maxWidth: 520, display: 'block' }}
      role="img"
      aria-label={t('One cycle of the gate control list', 'ゲート制御リストの 1 周期')}
    >
      <text x={BAR_X} y={16} fontSize={13} fill="var(--netlab-text-primary)">
        {t(`One cycle, ${us(CYCLE_NS)}, then it repeats`, `1 周期 ${us(CYCLE_NS)}、これを繰り返す`)}
      </text>
      {entries.map((entry, i) => (
        <rect
          key={entry.startNs}
          x={starts[i]}
          y={26}
          width={widths[i]}
          height={24}
          fill={GATE_FILL[entry.open]}
        />
      ))}
      {entries.map((entry, i) => (
        <g key={`legend-${entry.startNs}`}>
          <rect x={BAR_X} y={64 + i * 22} width={12} height={12} fill={GATE_FILL[entry.open]} />
          <text x={BAR_X + 18} y={75 + i * 22} fontSize={13} fill="var(--netlab-text-primary)">
            {`${names[entry.open]}: ${us(entry.durationNs)}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

function RevealButton({
  testId,
  ready,
  onReveal,
}: {
  testId: string;
  ready: boolean;
  onReveal: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={!ready}
      style={{ ...(ready ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
      onClick={onReveal}
    >
      {ready
        ? t('Compute the worst case', '最悪値を計算する')
        : t('Predict first', '先に予想を選んでください')}
    </button>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function TsnLesson() {
  const t = useT();
  const [first, setFirst] = useState<First | null>(null);
  const [firstShown, setFirstShown] = useState(false);
  const [second, setSecond] = useState<Second | null>(null);
  const [secondShown, setSecondShown] = useState(false);
  const [rate, setRate] = useState<RateMbps>(RATE);
  const [hops, setHops] = useState(1);

  const priority = bound('priority', RATE);
  const qbv = bound('qbv', RATE);
  const preempt = bound('qbv-preempt', RATE);
  const beNs = frameTimeNs(BEST_EFFORT_FRAME_BYTES, RATE);
  const firstValues: Record<Exclude<First, 'none'>, number> = {
    own: priority.ownNs,
    blocked: priority.worstPerHopNs,
    two: 2 * beNs + priority.ownNs,
  };
  const firstTruth = FIRSTS.find(
    (answer) => answer !== 'none' && firstValues[answer] === priority.worstPerHopNs,
  );
  const firstName = (answer: First) =>
    answer === 'none'
      ? t(
          'No bound: best effort can hold it back for any time',
          '上限なし（ベストエフォートがいくらでも待たせられる）',
        )
      : us(firstValues[answer]);

  const windowLen = gateControlList(RATE, false)[0]!.durationNs;
  const secondValues: Record<Second, number> = {
    own: qbv.ownNs,
    window: windowLen,
    half: beNs / 2 + qbv.ownNs,
    blocked: beNs + qbv.ownNs,
  };
  const secondTruth = SECONDS.find((answer) => secondValues[answer] === qbv.worstPerHopNs);
  const shares = cycleShares(RATE, false);

  const verdict = (right: boolean) =>
    right
      ? t('As you predicted. ', '予想どおりです。')
      : t('Not what you predicted. ', '予想とちがいました。');

  const schemeName: Record<Scheme, string> = {
    priority: t('Strict priority only', '厳密優先制御のみ'),
    'priority-preempt': t('Priority + preemption', '優先制御 + プリエンプション'),
    qbv: t('802.1Qbv, full guard band', '802.1Qbv（フルのガードバンド）'),
    'qbv-preempt': t('802.1Qbv + preemption', '802.1Qbv + プリエンプション'),
  };

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
          {t('A control loop on a shared network', '共有ネットワーク上の制御ループ')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A controller sends a small command to a motor drive every cycle, over the same Ethernet that also carries camera images and file copies. The command is useful only if it always arrives within a known time: the average does not matter, the worst case does. Time-Sensitive Networking (TSN) is the set of IEEE 802.1 standards for giving such traffic a guaranteed bound.',
            'コントローラが周期ごとに小さな指令をモータドライブへ送ります。同じ Ethernet にはカメラ映像やファイルのコピーも流れています。指令は「必ず決まった時間内に届く」ときだけ役に立ち、大事なのは平均ではなく最悪値です。Time-Sensitive Networking（TSN）は、こうしたトラフィックに上限を保証するための IEEE 802.1 の規格群です。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="tsn-predict">
        <div style={LESSON_LABEL}>
          {t('Predict first: strict priority', 'まず予想：厳密優先制御')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A switch’s egress port runs at 1 Gb/s with strict priority queuing: the control frame is in the highest class and is always picked next. Best-effort frames are up to ${BEST_EFFORT_FRAME_BYTES} bytes (1500 bytes of payload); the control frame is ${CONTROL_FRAME_BYTES} bytes. It is the only control frame; nothing else shares its class. Count each frame’s bytes plus 8 bytes of preamble and SFD and the 12-byte inter-frame gap; leave out propagation and the switch’s own processing. Over every moment the control frame could join the queue, what is the longest time from joining it until its last bit has left the port?`,
            `スイッチの出力ポートは 1 Gb/s で、厳密優先キューイング（strict priority）です。制御フレームは最上位のクラスに入り、常に次に選ばれます。ベストエフォートのフレームは最大 ${BEST_EFFORT_FRAME_BYTES} バイト（ペイロード 1500 バイト）、制御フレームは ${CONTROL_FRAME_BYTES} バイトです。制御フレームはこの 1 つだけで、同じクラスにほかのトラフィックはありません。各フレームのバイト数に、プリアンブルと SFD の 8 バイト、フレーム間ギャップの 12 バイトを加えて数え、伝搬遅延とスイッチ内部の処理時間は除きます。制御フレームがキューに入るタイミングをすべて考えたとき、キューに入ってから最後のビットがポートを出るまでの最長時間は？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {FIRSTS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={first === answer}
              data-testid={`tsn-guess-${answer}`}
              disabled={firstShown}
              onClick={() => setFirst(answer)}
              style={{ ...lessonChoice(first === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, first, firstTruth, firstShown)}
              {firstName(answer)}
            </button>
          ))}
        </div>
        {firstShown ? (
          <>
            <p
              data-testid="tsn-reveal"
              data-right={String(first === firstTruth)}
              data-worst={priority.worstPerHopNs}
              data-blocking={priority.blockingNs}
              role="status"
              style={{ margin: '8px 0', lineHeight: 1.7 }}
            >
              <strong>{verdict(first === firstTruth)}</strong>
              {t(
                `${us(priority.worstPerHopNs)}. Priority decides only which frame starts next; a frame that has started is not stopped. In the worst case a ${BEST_EFFORT_FRAME_BYTES}-byte best-effort frame began just before the control frame arrived: ${wireBytes(BEST_EFFORT_FRAME_BYTES)} bytes on the wire × 8 bits ÷ 1 Gb/s = ${us(priority.blockingNs)} of waiting, then its own ${wireBytes(CONTROL_FRAME_BYTES)} bytes take ${us(priority.ownNs)}. So there is a bound, one largest frame per hop, but the delay varies between ${us(priority.bestNs)} and ${us(priority.worstPerHopNs)}, and every hop adds the same again.`,
                `${us(priority.worstPerHopNs)} です。優先制御が決めるのは「次にどのフレームを送り始めるか」だけで、送り始めたフレームは止まりません。最悪なのは、制御フレームが届く直前に ${BEST_EFFORT_FRAME_BYTES} バイトのベストエフォートのフレームが送られ始めた場合です。回線上では ${wireBytes(BEST_EFFORT_FRAME_BYTES)} バイト × 8 ビット ÷ 1 Gb/s = ${us(priority.blockingNs)} 待ち、そのあと自分の ${wireBytes(CONTROL_FRAME_BYTES)} バイトに ${us(priority.ownNs)} かかります。上限はあり、1 ホップあたり最大フレーム 1 つ分ですが、遅延は ${us(priority.bestNs)} から ${us(priority.worstPerHopNs)} まで揺れ、ホップごとに同じだけ加わります。`,
              )}
            </p>
            <BlockingDiagram />
          </>
        ) : (
          <RevealButton
            testId="tsn-reveal-button"
            ready={first !== null}
            onReveal={() => setFirstShown(true)}
          />
        )}
      </div>

      {firstShown ? (
        <div style={LESSON_CARD} data-testid="tsn-qbv">
          <div style={LESSON_LABEL}>
            {t('The time-aware shaper (802.1Qbv)', 'タイムアウェアシェーパ（802.1Qbv）')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `IEEE 802.1Qbv puts a gate in front of each queue. A gate control list, repeated every ${us(CYCLE_NS)} cycle on time-synchronised switches, says which gates are open when. Here it opens a ${us(windowLen)} window for the control class at the start of each cycle, and closes every best-effort gate ${us(qbv.guardBandNs)} before the window opens (the guard band). A closed gate means no new frame may start from that queue. The controller is synchronised too, so its frame is already queued when the window opens. Same port, same frames, same counting as before: what is the control frame’s worst-case delay now?`,
              `IEEE 802.1Qbv は各キューの前にゲートを置きます。時刻同期したスイッチが ${us(CYCLE_NS)} の周期ごとに繰り返すゲート制御リスト（GCL）が、どのゲートをいつ開くかを決めます。ここでは各周期の先頭で制御クラスに ${us(windowLen)} の窓を開き、その窓が開く ${us(qbv.guardBandNs)} 前からベストエフォートのゲートをすべて閉じます（ガードバンド）。ゲートが閉じていると、そのキューから新しいフレームは送り始められません。コントローラも時刻同期しているので、窓が開くときには制御フレームがすでにキューに入っています。ポート、フレーム、数え方は先ほどと同じです。制御フレームの最悪の遅延は？`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6 }}
          >
            {SECONDS.map((answer) => (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={second === answer}
                data-testid={`tsn-qbv-guess-${answer}`}
                disabled={secondShown}
                onClick={() => setSecond(answer)}
                style={{ ...lessonChoice(second === answer), textAlign: 'left' }}
              >
                {predictionMark(answer, second, secondTruth, secondShown)}
                {us(secondValues[answer])}
              </button>
            ))}
          </div>
          {secondShown ? (
            <>
              <p
                data-testid="tsn-qbv-reveal"
                data-right={String(second === secondTruth)}
                data-worst={qbv.worstPerHopNs}
                data-guard={qbv.guardBandNs}
                role="status"
                style={{ margin: '8px 0', lineHeight: 1.7 }}
              >
                <strong>{verdict(second === secondTruth)}</strong>
                {t(
                  `${us(qbv.worstPerHopNs)}, only its own time on the wire. The guard band is as long as the largest best-effort frame, ${us(qbv.guardBandNs)}, so any frame that started before the gates closed has finished when the window opens: the link is idle and the control frame goes at once, every cycle, with no jitter. The price is paid by best effort: in each cycle it may not start frames for ${pct(shares.guardBand)} of the time, the guard band, even when no frame would have overrun.`,
                  `${us(qbv.worstPerHopNs)}、自分が回線に乗る時間だけです。ガードバンドは最大のベストエフォートのフレームと同じ ${us(qbv.guardBandNs)} なので、ゲートが閉じる前に送り始めたフレームは窓が開く前に終わっています。回線は空いており、制御フレームは毎周期すぐに送られ、揺らぎはありません。代わりにベストエフォートが代償を払います。各周期の ${pct(shares.guardBand)} にあたるガードバンドの間は、はみ出さないフレームであっても送り始められません。`,
                )}
              </p>
              <CycleDiagram entries={gateControlList(RATE, false)} />
              <div style={{ overflowX: 'auto' }}>
                <table
                  data-testid="tsn-gcl"
                  style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}
                >
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                      <th style={cell}>{t('Starts at', '開始')}</th>
                      <th style={cell}>{t('Lasts', '長さ')}</th>
                      <th style={cell}>{t('Open gates', '開いているゲート')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateControlList(RATE, false).map((entry) => (
                      <tr key={entry.startNs}>
                        <td style={num}>{us(entry.startNs)}</td>
                        <td style={num}>{us(entry.durationNs)}</td>
                        <td style={cell}>
                          {entry.open === 'critical'
                            ? t('control class only', '制御クラスのみ')
                            : entry.open === 'best-effort'
                              ? t('best-effort classes', 'ベストエフォートのクラス')
                              : t('none (guard band)', 'なし（ガードバンド）')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <RevealButton
              testId="tsn-qbv-reveal-button"
              ready={second !== null}
              onReveal={() => setSecondShown(true)}
            />
          )}
        </div>
      ) : null}

      {secondShown ? (
        <div style={LESSON_CARD} data-testid="tsn-compare">
          <div style={LESSON_LABEL}>
            {t('Rates, hops and preemption', '速度、ホップ数、プリエンプション')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Frame preemption (IEEE 802.1Qbu with IEEE 802.3br) lets an express frame interrupt a best-effort frame and resume it afterwards, so only a piece that cannot be split still blocks. This lesson assumes that piece is at most ${UNSPLITTABLE_BYTES} bytes (${us(preempt.guardBandNs)} at 1 Gb/s with preamble, SFD and gap), which also shrinks the guard band to that length.`,
              `フレームプリエンプション（IEEE 802.1Qbu と IEEE 802.3br）では、エクスプレスフレームがベストエフォートのフレームに割り込み、あとで続きを送れます。待たされるのは分割できない断片だけになります。このレッスンではその断片を最大 ${UNSPLITTABLE_BYTES} バイト（プリアンブル、SFD、ギャップを含めて 1 Gb/s で ${us(preempt.guardBandNs)}）と仮定しており、ガードバンドもその長さまで短くできます。`,
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Link rate', '回線速度')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {RATES_MBPS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={rate === option}
                data-testid={`tsn-rate-${option}`}
                onClick={() => setRate(option)}
                style={lessonChoice(rate === option)}
              >
                {rate === option ? '✓ ' : ''}
                {rateName(option)}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Switches on the path', '経路上のスイッチ数')}
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={hops}
              data-testid="tsn-hops"
              onChange={(event) => setHops(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{hops}</span>
          </label>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Scheme', '方式')}</th>
                  <th style={cell}>{t('Worst case', '最悪値')}</th>
                  <th style={cell}>{t('Jitter', '揺らぎ')}</th>
                  <th style={cell}>{t('Guard band per cycle', '周期あたりのガードバンド')}</th>
                </tr>
              </thead>
              <tbody>
                {SCHEMES.map((scheme) => {
                  const row = bound(scheme, rate, hops);
                  const scheduled = scheme === 'qbv' || scheme === 'qbv-preempt';
                  const guardShare = scheduled
                    ? cycleShares(rate, scheme === 'qbv-preempt').guardBand
                    : 0;
                  return (
                    <tr
                      key={scheme}
                      data-testid={`tsn-row-${scheme}`}
                      data-worst={Number(row.worstNs.toFixed(1))}
                      data-guard-share={Number(guardShare.toFixed(6))}
                    >
                      <td style={cell}>{schemeName[scheme]}</td>
                      <td style={num}>{us(row.worstNs)}</td>
                      <td style={num}>{us(row.jitterNs)}</td>
                      <td style={num}>
                        {scheduled ? `${us(row.guardBandNs)} (${pct(guardShare)})` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: one control frame per cycle and no other critical traffic; propagation and switch processing are left out; the blocking frame is taken to start just before the control frame arrives (an upper bound); every hop’s window is assumed aligned with the one before. The guard band is drawn as an explicit all-closed entry; some switches instead check whether a frame would overrun the next gate closing and hold only that frame. The ${us(CYCLE_NS)} cycle and the ${UNSPLITTABLE_BYTES}-byte unsplittable piece are this lesson’s assumptions: real cycles are chosen per application, and the real piece size follows 802.3br’s fragment rules and the MAC.`,
              `簡略化しています。制御フレームは周期に 1 つで、ほかに重要なトラフィックはありません。伝搬遅延とスイッチ内部の処理時間は除き、待たせるフレームは制御フレームが届く直前に始まるもの（上限）としました。各ホップの窓は前のホップとそろっていると仮定しています。ガードバンドは「すべて閉」のエントリとして描きましたが、次にゲートが閉じるまでに送り終わらないフレームだけを止めるスイッチもあります。${us(CYCLE_NS)} の周期と ${UNSPLITTABLE_BYTES} バイトの分割できない断片はこのレッスンの仮定です。実際の周期は用途ごとに決め、断片の大きさは 802.3br の分割規則と MAC の実装によります。`,
            )}
          </p>
        </div>
      ) : null}

      {secondShown ? (
        <LessonChallenges lessonId="tsn" challenges={tsnChallenges({ rate, hops })} />
      ) : null}
    </div>
  );
}

export default function TsnDemo() {
  return (
    <DemoShell
      title="Time-Sensitive Networking"
      desc="A control frame shares a port with best effort: strict priority, the 802.1Qbv gate control list, and preemption"
    >
      <TsnLesson />
    </DemoShell>
  );
}
