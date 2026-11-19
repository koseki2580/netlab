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
  DETECTORS,
  PACKETS_PER_SECOND,
  RECONVERGE_MS,
  bfdDetector,
  detectionRange,
  outage,
  type Detector,
} from './bfd';

type Answer = 'quarter-second' | 'ten-seconds' | 'forty-seconds' | 'none';
const ANSWERS: readonly Answer[] = ['quarter-second', 'ten-seconds', 'forty-seconds', 'none'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};

const duration = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

/** Which answer an outage matches. */
function answerOf(ms: number): Answer {
  if (ms <= 0) return 'none';
  if (ms < 1000) return 'quarter-second';
  return ms < 20_000 ? 'ten-seconds' : 'forty-seconds';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function BfdLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [intervalMs, setIntervalMs] = useState(300);
  const [multiplier, setMultiplier] = useState(3);
  const ospf = DETECTORS[0]!;
  const asked = outage(ospf, 0);
  const truth = answerOf(asked.outageMs);
  const custom = outage(bfdDetector(intervalMs, multiplier), 0);
  const detectorName = (detector: Detector) =>
    ({
      'ospf-default': t(
        'OSPF, default (hello 10 s, dead 40 s)',
        'OSPF 初期設定（hello 10 秒、dead 40 秒）',
      ),
      'ospf-tuned': t('OSPF, tuned (hello 1 s, dead 4 s)', 'OSPF 調整後（hello 1 秒、dead 4 秒）'),
      'bfd-300': t('BFD 300 ms × 3', 'BFD 300 ms × 3'),
      'bfd-50': t('BFD 50 ms × 3', 'BFD 50 ms × 3'),
      'bfd-custom': t('BFD', 'BFD'),
    })[detector.id];
  const answerName = (answer: Answer) =>
    ({
      'quarter-second': t('A fraction of a second', '1 秒もかからない'),
      'ten-seconds': t('About 10 seconds', '約 10 秒'),
      'forty-seconds': t('About 40 seconds', '約 40 秒'),
      none: t('None: the link is still up', '失われない（リンクは上がったまま）'),
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
        <div style={LESSON_LABEL}>{t('Detecting a failure', '障害に気づくまで')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'R1 and R2 are OSPF neighbours, connected through a switch. R2 suddenly dies. R1’s own port to the switch stays up, so R1 sees no link failure: it learns of the problem only when it stops hearing R2. Until then it keeps sending traffic towards R2, and that traffic is lost.',
            'R1 と R2 はスイッチをはさんでつながった OSPF のネイバーです。R2 が突然止まりました。R1 からスイッチへのポートは上がったままなので、R1 にはリンクの障害が見えません。R2 からの声が聞こえなくなって初めて気づきます。それまで R1 は R2 へ通信を送り続け、その通信は失われます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="bfd-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'OSPF runs with its default timers, and R2 dies just after sending a hello. For how long is R1’s traffic lost?',
            'OSPF は初期設定のタイマーで動いていて、R2 は hello を送った直後に止まりました。R1 の通信が失われるのはどれくらい？',
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
              data-testid={`bfd-guess-${answer}`}
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
            data-testid="bfd-reveal"
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
              `${duration(asked.outageMs)}. R1 declares R2 down only when the dead interval (${duration(ospf.deadMs)}) has passed without a hello, then needs about ${RECONVERGE_MS} ms to recompute its routes. At ${PACKETS_PER_SECOND} packets a second that is ${asked.lostPackets.toLocaleString('en')} packets lost. BFD sends tiny hellos many times a second just to answer “are you there?”, and tells OSPF the moment they stop.`,
              `${duration(asked.outageMs)} です。R1 が R2 を「止まった」と判断するのは、hello が来ないまま dead 間隔（${duration(ospf.deadMs)}）が過ぎたときで、そのあと経路の計算し直しに約 ${RECONVERGE_MS} ms かかります。毎秒 ${PACKETS_PER_SECOND} パケットなら ${asked.lostPackets.toLocaleString('ja')} パケットが失われます。BFD は「いる？」を確かめるだけの小さなパケットを 1 秒に何度も送り、それが途絶えた瞬間に OSPF へ知らせます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="bfd-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See the timers', 'タイマーを比べる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="bfd-table">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Detected by', '気づく仕組み')}</th>
                  <th style={cell}>{t('Detection, best–worst', '検出（最短〜最長）')}</th>
                  <th style={cell}>{t('Worst outage', '最長の断')}</th>
                  <th style={cell}>{t('Packets lost', '失われるパケット')}</th>
                </tr>
              </thead>
              <tbody>
                {DETECTORS.map((detector) => {
                  const range = detectionRange(detector);
                  const worst = outage(detector, 0);
                  return (
                    <tr
                      key={detector.id}
                      data-testid={`bfd-row-${detector.id}`}
                      data-outage={worst.outageMs}
                    >
                      <td style={cell}>{detectorName(detector)}</td>
                      <td style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {`${duration(range.best)} – ${duration(range.worst)}`}
                      </td>
                      <td style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {duration(worst.outageMs)}
                      </td>
                      <td style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {worst.lostPackets.toLocaleString('en')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `The ${RECONVERGE_MS} ms to recompute routes is an assumption for this lesson. When the failure happens later in the hello cycle it is noticed sooner, which is why each detector has a range.`,
              `経路の計算し直しにかかる ${RECONVERGE_MS} ms は、このレッスンの仮定です。障害が hello の周期の後ろのほうで起きれば、早く気づきます。だから検出には幅があります。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="bfd-tune">
          <div style={LESSON_LABEL}>
            {t('Set your own BFD timers', 'BFD のタイマーを決めてみる')}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Interval', '送信間隔')}
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={intervalMs}
                data-testid="bfd-interval"
                onChange={(event) => setIntervalMs(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`${intervalMs} ms`}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Multiplier', '倍数')}
              <input
                type="range"
                min={2}
                max={5}
                value={multiplier}
                data-testid="bfd-multiplier"
                onChange={(event) => setMultiplier(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{`× ${multiplier}`}</span>
            </label>
          </div>
          <p
            data-testid="bfd-custom"
            data-detect={custom.detectMs}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `Detected after ${duration(custom.detectMs)}; ${custom.lostPackets.toLocaleString('en')} packets lost.`,
              `${duration(custom.detectMs)} で検出、失われるのは ${custom.lostPackets.toLocaleString('ja')} パケット。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Shorter is not always better: a router busy with other work can miss a few BFD packets and declare a healthy neighbour down, so 300 ms × 3 is a common choice, and some platforms run BFD in hardware to go faster safely. When the link itself goes down, the router notices at once and needs no timer at all.',
              '短ければ良いとは限りません。ほかの処理で忙しいルータが BFD のパケットをいくつか取りこぼし、正常なネイバーを止まったと判断してしまうことがあるからです。そのため 300 ms × 3 がよく使われ、BFD をハードウェアで処理して安全に速くする機種もあります。リンクそのものが落ちたときは、ルータはすぐに気づくので、タイマーは要りません。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function BfdDemo() {
  return (
    <DemoShell
      title="BFD and failure detection"
      desc="How long a router keeps sending into a dead path, with routing timers and with BFD"
    >
      <BfdLesson />
    </DemoShell>
  );
}
