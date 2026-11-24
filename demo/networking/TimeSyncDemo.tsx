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
  ASYMMETRIC,
  PTP_SCENE,
  SYMMETRIC,
  measure,
  ptp,
  withForward,
  withSyncWait,
  type Path,
  type Timestamps,
} from './timeSync';

type First = 'right' | 'raw' | 'no-hold' | 'sign';
const FIRSTS: readonly First[] = ['raw', 'right', 'no-hold', 'sign'];
type Second = 'none' | 'half' | 'full' | 'half-delay';
const SECONDS: readonly Second[] = ['none', 'full', 'half', 'half-delay'];
type Third = 'queues' | 'delay-req' | 'fibre' | 'zero';
const THIRDS: readonly Third[] = ['queues', 'zero', 'delay-req', 'fibre'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const num: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const ms = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} ms`;
const signedMs = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${ms(Math.abs(value))}`;
const ns = (value: number) => {
  const abs = Math.abs(value);
  return abs >= 1000 ? `${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 2)} µs` : `${abs} ns`;
};

/** The exchange drawn on two time lines; height follows true time. */
function ExchangeDiagram({ path, stamps }: { path: Path; stamps: Timestamps }) {
  const t = useT();
  const total = path.forward + path.hold + path.backward;
  const y = (at: number) => 44 + (at / total) * 120;
  const sent = y(0);
  const arrived = y(path.forward);
  const replied = y(path.forward + path.hold);
  const back = y(total);
  return (
    <svg
      viewBox="0 0 400 190"
      style={{ width: '100%', maxWidth: 520, display: 'block' }}
      role="img"
      aria-label={t(
        'The four timestamps of one NTP exchange',
        '1 回の NTP のやりとりの 4 つのタイムスタンプ',
      )}
    >
      <text x={90} y={20} textAnchor="middle" fontSize={13} fill="var(--netlab-text-primary)">
        {t('Client', 'クライアント')}
      </text>
      <text x={310} y={20} textAnchor="middle" fontSize={13} fill="var(--netlab-text-primary)">
        {t('Server', 'サーバ')}
      </text>
      <line x1={90} x2={90} y1={30} y2={180} stroke="var(--netlab-border-strong)" />
      <line x1={310} x2={310} y1={30} y2={180} stroke="var(--netlab-border-strong)" />
      <line
        x1={90}
        y1={sent}
        x2={310}
        y2={arrived}
        stroke="var(--netlab-accent-cyan)"
        strokeWidth={2}
      />
      <line
        x1={310}
        y1={replied}
        x2={90}
        y2={back}
        stroke="var(--netlab-accent-cyan)"
        strokeWidth={2}
      />
      <text x={84} y={sent + 4} textAnchor="end" fontSize={13} fill="var(--netlab-text-primary)">
        {`t1 ${stamps.t1}`}
      </text>
      <text x={316} y={arrived + 4} fontSize={13} fill="var(--netlab-text-primary)">
        {`t2 ${stamps.t2}`}
      </text>
      <text x={316} y={replied + 14} fontSize={13} fill="var(--netlab-text-primary)">
        {`t3 ${stamps.t3}`}
      </text>
      <text x={84} y={back + 4} textAnchor="end" fontSize={13} fill="var(--netlab-text-primary)">
        {`t4 ${stamps.t4}`}
      </text>
    </svg>
  );
}

function RevealButton({
  testId,
  ready,
  label,
  onReveal,
}: {
  testId: string;
  ready: boolean;
  label: string;
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
      {ready ? label : t('Predict first', '先に予想を選んでください')}
    </button>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function TimeSyncLesson() {
  const t = useT();
  const [first, setFirst] = useState<First | null>(null);
  const [firstShown, setFirstShown] = useState(false);
  const [second, setSecond] = useState<Second | null>(null);
  const [secondShown, setSecondShown] = useState(false);
  const [third, setThird] = useState<Third | null>(null);
  const [thirdShown, setThirdShown] = useState(false);
  const [forward, setForward] = useState(ASYMMETRIC.forward);
  const [syncWaitUs, setSyncWaitUs] = useState(PTP_SCENE.syncWaitNs / 1000);

  const even = measure(SYMMETRIC);
  const s = even.timestamps;
  const firstValues: Record<First, { offset: number; delay: number }> = {
    right: { offset: even.offset, delay: even.delay },
    raw: { offset: s.t2 - s.t1, delay: s.t4 - s.t1 },
    'no-hold': { offset: even.offset, delay: s.t4 - s.t1 },
    sign: { offset: -even.offset, delay: even.delay },
  };
  const firstName = (answer: First) =>
    t(
      `Offset ${signedMs(firstValues[answer].offset)}, delay ${ms(firstValues[answer].delay)}`,
      `オフセット ${signedMs(firstValues[answer].offset)}、遅延 ${ms(firstValues[answer].delay)}`,
    );

  const uneven = measure(ASYMMETRIC);
  const asymmetry = ASYMMETRIC.forward - ASYMMETRIC.backward;
  const secondValues: Record<Second, number> = {
    none: 0,
    half: asymmetry / 2,
    full: asymmetry,
    'half-delay': uneven.delay / 2,
  };
  const secondTruth = SECONDS.find((answer) => secondValues[answer] === uneven.error);
  const secondName = (answer: Second) =>
    ({
      none: t('None: the measured delay cancels out', 'ずれない（測った遅延で打ち消される）'),
      half: t(`${ms(secondValues.half)} too far ahead`, `${ms(secondValues.half)} 進みすぎ`),
      full: t(`${ms(secondValues.full)} too far ahead`, `${ms(secondValues.full)} 進みすぎ`),
      'half-delay': t(
        `${ms(secondValues['half-delay'])} too far ahead`,
        `${ms(secondValues['half-delay'])} 進みすぎ`,
      ),
    })[answer];
  const slid = measure(withForward(forward));

  const ordinary = ptp(PTP_SCENE, 'ordinary');
  const transparent = ptp(PTP_SCENE, 'transparent');
  const thirdValues: Record<Third, number> = {
    queues: Math.abs(ordinary.errorNs),
    'delay-req': PTP_SCENE.delayReqWaitNs / 2,
    fibre: Math.abs(transparent.errorNs),
    zero: 0,
  };
  const thirdTruth = THIRDS.find((answer) => thirdValues[answer] === Math.abs(transparent.errorNs));
  const thirdName = (answer: Third) =>
    answer === 'zero'
      ? t('None at all', 'まったくずれない')
      : t(`About ${ns(thirdValues[answer])}`, `約 ${ns(thirdValues[answer])}`);
  const slidPtp = withSyncWait(syncWaitUs * 1000);
  const slidOrdinary = ptp(slidPtp, 'ordinary');
  const slidTransparent = ptp(slidPtp, 'transparent');

  const verdict = (right: boolean) =>
    right
      ? t('As you predicted. ', '予想どおりです。')
      : t('Not what you predicted. ', '予想とちがいました。');

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
        <div style={LESSON_LABEL}>{t('Four timestamps', '4 つのタイムスタンプ')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A client asks an NTP server for the time. Four timestamps come out of one exchange: t1 when the client sends (on the client’s clock), t2 when the server receives and t3 when it replies (both on the server’s clock), and t4 when the reply arrives (on the client’s clock again). From only these four numbers the client works out how far its clock is from the server’s (the offset) and how long the round trip took on the network (the delay).',
            'クライアントが NTP サーバに時刻を尋ねます。1 回のやりとりから 4 つのタイムスタンプが得られます。t1 はクライアントが送った時刻（クライアントの時計）、t2 はサーバが受け取った時刻、t3 はサーバが返した時刻（どちらもサーバの時計）、t4 は返事が届いた時刻（またクライアントの時計）です。この 4 つの数字だけから、クライアントは自分の時計がサーバとどれだけずれているか（オフセット）と、ネットワークの往復にどれだけかかったか（遅延）を求めます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="ts-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <ExchangeDiagram path={SYMMETRIC} stamps={even.timestamps} />
        <p style={{ margin: '8px 0', lineHeight: 1.7 }}>
          {t(
            `The timestamps, in ms: t1 = ${s.t1}, t2 = ${s.t2}, t3 = ${s.t3}, t4 = ${s.t4}. What offset (how far the server is ahead of the client) and delay does NTP compute?`,
            `タイムスタンプ（ms）は t1 = ${s.t1}、t2 = ${s.t2}、t3 = ${s.t3}、t4 = ${s.t4} です。NTP が求めるオフセット（サーバがクライアントよりどれだけ進んでいるか）と遅延はいくつ？`,
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
              data-testid={`ts-guess-${answer}`}
              disabled={firstShown}
              onClick={() => setFirst(answer)}
              style={{ ...lessonChoice(first === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, first, 'right', firstShown)}
              {firstName(answer)}
            </button>
          ))}
        </div>
        {firstShown ? (
          <p
            data-testid="ts-reveal"
            data-right={String(first === 'right')}
            data-offset={even.offset}
            data-delay={even.delay}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>{verdict(first === 'right')}</strong>
            {t(
              `Offset ${signedMs(even.offset)}, delay ${ms(even.delay)}. RFC 5905 takes offset = ((t2 − t1) + (t3 − t4)) / 2 = ((${s.t2 - s.t1}) + (${s.t3 - s.t4})) / 2. The first difference is the trip out plus the offset, the second is the offset minus the trip back; averaging them cancels the trips, as long as they are equal. Delay = (t4 − t1) − (t3 − t2) = ${s.t4 - s.t1} − ${s.t3 - s.t2}: the whole wait minus the ${ms(s.t3 - s.t2)} the server held the request.`,
              `オフセット ${signedMs(even.offset)}、遅延 ${ms(even.delay)} です。RFC 5905 はオフセット = ((t2 − t1) + (t3 − t4)) / 2 = ((${s.t2 - s.t1}) + (${s.t3 - s.t4})) / 2 とします。1 つめの差は「行きの時間 + オフセット」、2 つめは「オフセット − 帰りの時間」で、平均すると行きと帰りが打ち消し合います。ただし行きと帰りが同じなら、です。遅延 = (t4 − t1) − (t3 − t2) = ${s.t4 - s.t1} − ${s.t3 - s.t2} で、待った時間全体からサーバが要求を抱えていた ${ms(s.t3 - s.t2)} を引いたものです。`,
            )}
          </p>
        ) : (
          <RevealButton
            testId="ts-reveal-button"
            ready={first !== null}
            label={t('Compute', '計算する')}
            onReveal={() => setFirstShown(true)}
          />
        )}
      </div>

      {firstShown ? (
        <div style={LESSON_CARD} data-testid="ts-asym">
          <div style={LESSON_LABEL}>{t('An uneven path', '行きと帰りがちがう経路')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Same clocks: the server is really ${signedMs(ASYMMETRIC.trueOffset)} ahead. But now the request takes ${ms(ASYMMETRIC.forward)} to get there and the reply only ${ms(ASYMMETRIC.backward)} to come back (an upload queue, or a different route each way). How far off is the offset NTP computes?`,
              `時計は同じで、サーバは本当に ${signedMs(ASYMMETRIC.trueOffset)} 進んでいます。ただし今度は、要求が届くのに ${ms(ASYMMETRIC.forward)}、返事が戻るのに ${ms(ASYMMETRIC.backward)} しかかかりません（上りの混雑や、行きと帰りで経路がちがう場合です）。NTP が求めるオフセットはどれだけずれる？`,
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
                data-testid={`ts-asym-guess-${answer}`}
                disabled={secondShown}
                onClick={() => setSecond(answer)}
                style={{ ...lessonChoice(second === answer), textAlign: 'left' }}
              >
                {predictionMark(answer, second, secondTruth, secondShown)}
                {secondName(answer)}
              </button>
            ))}
          </div>
          {secondShown ? (
            <p
              data-testid="ts-asym-reveal"
              data-right={String(second === secondTruth)}
              data-error={uneven.error}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>{verdict(second === secondTruth)}</strong>
              {t(
                `NTP computes ${signedMs(uneven.offset)}, ${ms(uneven.error)} more than the true ${signedMs(ASYMMETRIC.trueOffset)}: half the ${ms(asymmetry)} difference between the two directions. The delay it measures, ${ms(uneven.delay)}, is right, but the four timestamps only show the round trip, never how it splits, so NTP has to assume half each way. It can bound the error, though: at most half the delay, ${ms(uneven.bound)}.`,
                `NTP は ${signedMs(uneven.offset)} と求めます。本当の ${signedMs(ASYMMETRIC.trueOffset)} より ${ms(uneven.error)} 大きく、行きと帰りの差 ${ms(asymmetry)} のちょうど半分です。測った遅延 ${ms(uneven.delay)} は正しいのですが、4 つのタイムスタンプからわかるのは往復だけで、その内訳はわかりません。だから NTP は半分ずつと仮定するしかありません。ただし誤差の上限はわかります。遅延の半分、${ms(uneven.bound)} 以下です。`,
              )}
            </p>
          ) : (
            <RevealButton
              testId="ts-asym-reveal-button"
              ready={second !== null}
              label={t('Compute', '計算する')}
              onReveal={() => setSecondShown(true)}
            />
          )}
        </div>
      ) : null}

      {secondShown ? (
        <div style={LESSON_CARD} data-testid="ts-slider">
          <div style={LESSON_LABEL}>{t('Make the path uneven', '経路の偏りを変えてみる')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Request’s trip out', '要求の行きの時間')}
            <input
              type="range"
              min={0}
              max={40}
              step={2}
              value={forward}
              data-testid="ts-forward"
              onChange={(event) => setForward(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{ms(forward)}</span>
          </label>
          <ExchangeDiagram path={withForward(forward)} stamps={slid.timestamps} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('Trip back', '帰りの時間')}</td>
                  <td style={num}>{ms(ASYMMETRIC.backward)}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Offset NTP computes', 'NTP が求めるオフセット')}</td>
                  <td style={num}>{signedMs(slid.offset)}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('True offset', '本当のオフセット')}</td>
                  <td style={num}>{signedMs(ASYMMETRIC.trueOffset)}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Error', '誤差')}</td>
                  <td style={num} data-testid="ts-slid-error" data-error={slid.error}>
                    {signedMs(slid.error)}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>{t('Measured delay; error bound', '測った遅延と誤差の上限')}</td>
                  <td style={num}>{`${ms(slid.delay)}; ±${ms(slid.bound)}`}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: one exchange and exact timestamps. A real NTP client keeps many exchanges, trusts the ones with the smallest delay (they have the least room for asymmetry), and steers its clock gradually.',
              '簡略化しています。やりとりは 1 回で、タイムスタンプは正確としました。実際の NTP クライアントは多くのやりとりを記録し、遅延のいちばん小さいもの（偏りの入る余地が最も小さいもの）を信頼して、時計を少しずつ合わせます。',
            )}
          </p>
        </div>
      ) : null}

      {secondShown ? (
        <div style={LESSON_CARD} data-testid="ts-ptp">
          <div style={LESSON_LABEL}>
            {t('PTP and a transparent clock', 'PTP とトランスペアレントクロック')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `PTP (IEEE 1588) uses the same four-timestamp arithmetic, but takes the timestamps in the network card’s hardware as the packet leaves or arrives, so no time spent in the operating system gets in. A master and a slave are joined by one switch. The master’s Sync waits ${ns(PTP_SCENE.syncWaitNs)} in the switch’s queue, the slave’s Delay_Req only ${ns(PTP_SCENE.delayReqWaitNs)}. The switch is a transparent clock. The fibres take ${ns(PTP_SCENE.linkForwardNs)} towards the slave and ${ns(PTP_SCENE.linkBackwardNs)} back. How far off is the slave’s clock?`,
              `PTP（IEEE 1588）も同じ 4 つのタイムスタンプの計算を使いますが、タイムスタンプはパケットが出入りする瞬間にネットワークカードのハードウェアで打つので、OS の中で過ぎた時間は入りません。マスターとスレーブが 1 台のスイッチでつながっています。マスターの Sync はスイッチのキューで ${ns(PTP_SCENE.syncWaitNs)} 待ち、スレーブの Delay_Req は ${ns(PTP_SCENE.delayReqWaitNs)} しか待ちません。スイッチはトランスペアレントクロックです。ファイバはスレーブ向きが ${ns(PTP_SCENE.linkForwardNs)}、戻りが ${ns(PTP_SCENE.linkBackwardNs)} かかります。スレーブの時計はどれだけずれる？`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6 }}
          >
            {THIRDS.map((answer) => (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={third === answer}
                data-testid={`ts-ptp-guess-${answer}`}
                disabled={thirdShown}
                onClick={() => setThird(answer)}
                style={{ ...lessonChoice(third === answer), textAlign: 'left' }}
              >
                {predictionMark(answer, third, thirdTruth, thirdShown)}
                {thirdName(answer)}
              </button>
            ))}
          </div>
          {thirdShown ? (
            <p
              data-testid="ts-ptp-reveal"
              data-right={String(third === thirdTruth)}
              data-error={transparent.errorNs}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>{verdict(third === thirdTruth)}</strong>
              {t(
                `About ${ns(transparent.errorNs)} (the slave runs ${ns(transparent.errorNs)} behind). A queue is asymmetry too: through an ordinary switch the two waits would put the slave ${ns(ordinary.errorNs)} off. A transparent clock timestamps each message as it enters and leaves, and adds the time it spent inside (its residence time) to the message’s correctionField; the slave subtracts it, so the queues drop out. What is left is the fibres’ own ${ns(PTP_SCENE.linkBackwardNs - PTP_SCENE.linkForwardNs)} difference, halved. PTP cannot see that either, unless the operator measures it and configures it as a known asymmetry.`,
                `約 ${ns(transparent.errorNs)} です（スレーブは ${ns(transparent.errorNs)} 遅れます）。キューも偏りの一種で、普通のスイッチなら 2 つの待ち時間のせいでスレーブは ${ns(ordinary.errorNs)} ずれます。トランスペアレントクロックはメッセージが入るときと出るときにタイムスタンプを打ち、中にいた時間（滞留時間）をメッセージの correctionField に足します。スレーブはそれを差し引くので、キューの影響は消えます。残るのはファイバそのものの差 ${ns(PTP_SCENE.linkBackwardNs - PTP_SCENE.linkForwardNs)} の半分です。これも PTP には見えません。運用者が測って、既知の非対称として設定しない限りは。`,
              )}
            </p>
          ) : (
            <RevealButton
              testId="ts-ptp-reveal-button"
              ready={third !== null}
              label={t('Compute', '計算する')}
              onReveal={() => setThirdShown(true)}
            />
          )}
        </div>
      ) : null}

      {thirdShown ? (
        <div style={LESSON_CARD} data-testid="ts-ptp-compare">
          <div style={LESSON_LABEL}>{t('Change the Sync wait', 'Sync の待ち時間を変える')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Sync waits in the queue', 'Sync のキューでの待ち時間')}
            <input
              type="range"
              min={0}
              max={1000}
              step={20}
              value={syncWaitUs}
              data-testid="ts-sync-wait"
              onChange={(event) => setSyncWaitUs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{ns(syncWaitUs * 1000)}</span>
          </label>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Switch', 'スイッチ')}</th>
                  <th style={cell}>{t('Slave’s error', 'スレーブの誤差')}</th>
                </tr>
              </thead>
              <tbody>
                <tr data-testid="ts-ptp-ordinary" data-error={slidOrdinary.errorNs}>
                  <td style={cell}>{t('Ordinary switch', '普通のスイッチ')}</td>
                  <td style={num}>{ns(slidOrdinary.errorNs)}</td>
                </tr>
                <tr data-testid="ts-ptp-transparent" data-error={slidTransparent.errorNs}>
                  <td style={cell}>{t('Transparent clock', 'トランスペアレントクロック')}</td>
                  <td style={num}>{ns(slidTransparent.errorNs)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: timestamps are exact and the clocks do not drift. Real hardware timestamps have a resolution of a few nanoseconds, which depends on the network card. A boundary clock is the other way to handle a switch: it ends the PTP exchange and runs a new one towards the slave, instead of correcting messages that pass through. NTP software timestamps also include time in the operating system, which this lesson leaves out.',
              '簡略化しています。タイムスタンプは正確で、時計はずれていかないものとしました。実際のハードウェアタイムスタンプの分解能は数ナノ秒程度で、ネットワークカードによって異なります。スイッチの扱い方にはもう 1 つ、バウンダリクロックがあります。通過するメッセージを補正するのではなく、PTP のやりとりをそこで終わらせ、スレーブ向けに新しいやりとりを始めます。NTP のソフトウェアのタイムスタンプには OS の中で過ぎた時間も入りますが、このレッスンでは省いています。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function TimeSyncDemo() {
  return (
    <DemoShell
      title="Time sync: NTP and PTP"
      desc="Four timestamps, one offset: NTP’s arithmetic, an uneven path, and PTP through a switch"
    >
      <TimeSyncLesson />
    </DemoShell>
  );
}
