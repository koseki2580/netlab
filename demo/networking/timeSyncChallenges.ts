/** REQ-449 — the time-sync lesson's challenges, checked by its model (TC-2638). */
import type { Challenge } from '../components/LessonChallenges';
import { ASYMMETRIC, PTP_SCENE, measure, ptp, withForward, withSyncWait } from './timeSync';

export interface TimeSyncChallengeState {
  /** The request's trip out, ms (the first slider). */
  readonly forward: number;
  /** How long Sync waits in the switch's queue, µs (the second slider). */
  readonly syncWaitUs: number;
}

/** The ordinary-switch challenge's limit, ns. */
const PTP_LIMIT_NS = 1000;

const ms = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} ms`;
const signedMs = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${ms(Math.abs(value))}`;
const ns = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en')} ns`;

export function timeSyncChallenges(state: TimeSyncChallengeState): Challenge[] {
  const slid = measure(withForward(state.forward));
  const ordinary = ptp(withSyncWait(state.syncWaitUs * 1000), 'ordinary');
  const back = ASYMMETRIC.backward;

  return [
    {
      id: 'exact',
      goal: {
        en: 'Make NTP compute the true offset exactly: an error of 0 ms.',
        ja: 'NTP が本当のオフセットをぴったり求めるようにしてください（誤差 0 ms）。',
      },
      hint: {
        en: 'NTP assumes something about the two trips. When is that assumption true?',
        ja: 'NTP は行きと帰りについて何かを仮定しています。その仮定が正しくなるのはどんなときですか？',
      },
      reached: slid.error === 0,
      why: {
        en: `Out ${ms(state.forward)}, back ${ms(back)}: the path is even, which is exactly what NTP assumes when it halves the round trip. It computes ${signedMs(slid.offset)}, the true offset; the error is (out − back) / 2 = ${signedMs(slid.error)}.`,
        ja: `行き ${ms(state.forward)}、帰り ${ms(back)} で経路に偏りがありません。これは NTP が往復時間を半分にするときの仮定そのものです。求まるオフセットは ${signedMs(slid.offset)} で本当の値と一致し、誤差は (行き − 帰り) / 2 = ${signedMs(slid.error)} です。`,
      },
    },
    {
      id: 'worst-case',
      goal: {
        en: 'Make the error as large as the error bound allows: the error’s size equals half the measured delay.',
        ja: '誤差を、誤差の上限いっぱいにしてください（誤差の大きさが、測った遅延の半分と等しくなる状態です）。',
      },
      hint: {
        en: 'The bound covers every way the round trip could be split between out and back. Which split is the most uneven?',
        ja: '上限は、往復時間を行きと帰りにどう分けた場合も含んでいます。いちばん偏った分け方はどれですか？',
      },
      reached: Math.abs(slid.error) === slid.bound,
      why: {
        en: `Out ${ms(state.forward)}, back ${ms(back)}: the whole ${ms(slid.delay)} round trip is the reply’s trip, the most uneven split there is. The error ${signedMs(slid.error)} reaches the bound ±${ms(slid.bound)} = δ / 2. Whatever the split, NTP can never be further off than half the delay it measured — which is why it trusts the exchanges with the smallest delay.`,
        ja: `行き ${ms(state.forward)}、帰り ${ms(back)} で、往復 ${ms(slid.delay)} がすべて帰りの時間です。これ以上偏った分け方はありません。誤差 ${signedMs(slid.error)} が上限 ±${ms(slid.bound)} = δ / 2 に届いています。どう分かれていても、NTP の誤差は測った遅延の半分を超えません。だから NTP は遅延のいちばん小さいやりとりを信頼します。`,
      },
    },
    {
      id: 'ordinary-switch',
      goal: {
        en: `Without a transparent clock: bring the slave’s error through the ordinary switch under ${ns(PTP_LIMIT_NS)} (1 µs), by changing only the Sync wait.`,
        ja: `トランスペアレントクロックを使わずに、普通のスイッチを通ったときのスレーブの誤差を ${ns(PTP_LIMIT_NS)}（1 µs）未満にしてください。変えてよいのは Sync の待ち時間だけです。`,
      },
      hint: {
        en: 'A queue hurts because the two messages wait different times. What if they did not?',
        ja: 'キューが問題になるのは、2 つのメッセージの待ち時間がちがうからです。ちがわなければ？',
      },
      reached: Math.abs(ordinary.errorNs) < PTP_LIMIT_NS,
      why: {
        en: `Sync now waits ${ns(state.syncWaitUs * 1000)} and Delay_Req ${ns(PTP_SCENE.delayReqWaitNs)}, so the queue is even and its two waits cancel in the arithmetic: the slave is off by only ${ns(ordinary.errorNs)}, half the fibres’ own difference. A transparent clock gets there whatever the queues do, by subtracting each message’s residence time.`,
        ja: `Sync の待ち時間が ${ns(state.syncWaitUs * 1000)}、Delay_Req が ${ns(PTP_SCENE.delayReqWaitNs)} なので、キューに偏りがなく、2 つの待ち時間は計算の中で打ち消し合います。スレーブの誤差は ${ns(ordinary.errorNs)} だけで、ファイバそのものの差の半分です。トランスペアレントクロックなら、キューがどうであっても、各メッセージの滞留時間を差し引いてここまで来られます。`,
      },
    },
  ];
}
