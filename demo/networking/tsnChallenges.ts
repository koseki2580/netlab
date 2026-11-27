/**
 * The TSN lesson's challenges (REQ-449): goals reached with the comparison
 * card's controls (link rate and switches on the path). Every `reached` and
 * every number in `why` comes from the delay model in tsn.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { BEST_EFFORT_FRAME_BYTES, bound, type RateMbps } from './tsn';

/** The comparison card's controls. */
export interface TsnChallengeState {
  readonly rate: RateMbps;
  readonly hops: number;
}

/** The hops slider's largest value. */
export const MAX_HOPS = 8;
/** The worst-case budgets the challenges ask to stay under, ns. */
export const PATH_BUDGET_NS = 50_000;
export const LONG_PATH_BUDGET_NS = 12_000;

const us = (ns: number) => `${Number((ns / 1000).toFixed(3))} µs`;
const rateName = (rate: number) => (rate >= 1000 ? `${rate / 1000} Gb/s` : `${rate} Mb/s`);

/** Settings that reach each challenge, used to explain one that is remembered but no longer set. */
const REACHING = {
  priorityHops: { rate: 1000, hops: 3 },
  fastLink: { rate: 10_000, hops: MAX_HOPS },
  qbvHops: { rate: 100, hops: 7 },
} as const satisfies Record<string, TsnChallengeState>;

/** The most hops `rate` allows with `scheme` under `budgetNs`, checked at the state's hops. */
const isLongest = (state: TsnChallengeState, scheme: 'priority' | 'qbv', budgetNs: number) =>
  bound(scheme, state.rate, state.hops).worstNs < budgetNs &&
  bound(scheme, state.rate, state.hops + 1).worstNs >= budgetNs;

export function tsnChallenges(state: TsnChallengeState): Challenge[] {
  // 1. Strict priority at 1 Gb/s: the most switches that keep the worst case under 50 µs.
  const p = REACHING.priorityHops;
  const pRow = bound('priority', p.rate, p.hops);
  const pNext = bound('priority', p.rate, p.hops + 1);

  // 2. Strict priority over all 8 switches under 12 µs.
  const f = REACHING.fastLink;
  const fRow = bound('priority', f.rate, f.hops);
  const fSlow = bound('priority', 1000, f.hops);

  // 3. 802.1Qbv at 100 Mb/s: the most switches under 50 µs.
  const q = REACHING.qbvHops;
  const qRow = bound('qbv', q.rate, q.hops);
  const qNext = bound('qbv', q.rate, q.hops + 1);
  const qPriority = bound('priority', q.rate, 1);

  return [
    {
      id: 'priority-hops',
      goal: {
        en: `On ${rateName(p.rate)} links with strict priority, find the most switches a path can have while the control frame’s worst case stays under ${us(PATH_BUDGET_NS)}.`,
        ja: `${rateName(p.rate)} のリンクで厳密な優先制御だけを使うとき、制御フレームの最悪値が ${us(PATH_BUDGET_NS)} 未満に収まる最大のスイッチ数を見つけてください。`,
      },
      hint: {
        en: 'What can the control frame find already on the wire at every switch, and how long does it hold the link?',
        ja: '制御フレームは、どのスイッチでも何がすでに送信中だと待たされますか。それはリンクをどれだけ占有するでしょう。',
      },
      reached: state.rate === p.rate && isLongest(state, 'priority', PATH_BUDGET_NS),
      why: {
        en: `Each switch can make it wait behind a whole ${BEST_EFFORT_FRAME_BYTES}-byte frame (${us(pRow.blockingNs)}) before its own ${us(pRow.ownNs)}, ${us(pRow.worstPerHopNs)} per switch. ${p.hops} switches add up to ${us(pRow.worstNs)}; a ${p.hops + 1}th makes ${us(pNext.worstNs)}.`,
        ja: `スイッチごとに ${BEST_EFFORT_FRAME_BYTES} バイトのフレーム 1 つ分（${us(pRow.blockingNs)}）待たされたうえで自分の ${us(pRow.ownNs)} がかかり、1 台あたり ${us(pRow.worstPerHopNs)} です。${p.hops} 台で ${us(pRow.worstNs)}、${p.hops + 1} 台目を足すと ${us(pNext.worstNs)} になります。`,
      },
    },
    {
      id: 'fast-link',
      goal: {
        en: `Keep strict priority’s worst case under ${us(LONG_PATH_BUDGET_NS)} across ${MAX_HOPS} switches, still without a schedule.`,
        ja: `スケジュールを使わない厳密な優先制御のまま、スイッチ ${MAX_HOPS} 台の経路で最悪値を ${us(LONG_PATH_BUDGET_NS)} 未満にしてください。`,
      },
      hint: {
        en: 'The blocking frame is always the same number of bytes. What makes those bytes take less time?',
        ja: '待たせるフレームのバイト数はいつも同じです。そのバイト数を短い時間で送り終えるには何を変えればよいでしょう。',
      },
      reached:
        state.hops === MAX_HOPS &&
        bound('priority', state.rate, state.hops).worstNs < LONG_PATH_BUDGET_NS,
      why: {
        en: `At ${rateName(f.rate)} the ${BEST_EFFORT_FRAME_BYTES}-byte frame holds the link for only ${us(fRow.blockingNs)}, so ${f.hops} switches cost ${us(fRow.worstNs)} in the worst case instead of ${us(fSlow.worstNs)} at 1 Gb/s. The wait is still there and still varies by ${us(fRow.jitterNs)}; a faster link only shrinks it.`,
        ja: `${rateName(f.rate)} なら ${BEST_EFFORT_FRAME_BYTES} バイトのフレームがリンクを占有するのは ${us(fRow.blockingNs)} だけなので、スイッチ ${f.hops} 台の最悪値は 1 Gb/s での ${us(fSlow.worstNs)} ではなく ${us(fRow.worstNs)} です。それでも待ち時間はなくならず、${us(fRow.jitterNs)} の揺らぎが残ります。速いリンクは待ちを短くするだけです。`,
      },
    },
    {
      id: 'qbv-hops',
      goal: {
        en: `On ${rateName(q.rate)} links with 802.1Qbv, find the most switches a path can have while the control frame’s worst case stays under ${us(PATH_BUDGET_NS)}.`,
        ja: `${rateName(q.rate)} のリンクで 802.1Qbv を使うとき、制御フレームの最悪値が ${us(PATH_BUDGET_NS)} 未満に収まる最大のスイッチ数を見つけてください。`,
      },
      hint: {
        en: 'With the guard band closing the gates before the window, what is left of the delay at each switch?',
        ja: '窓の前にガードバンドがゲートを閉じているなら、各スイッチでの遅れとして残るのは何でしょう。',
      },
      reached: state.rate === q.rate && isLongest(state, 'qbv', PATH_BUDGET_NS),
      why: {
        en: `Under 802.1Qbv nothing blocks the control frame, so each switch costs only its own ${us(qRow.ownNs)} at ${rateName(q.rate)}: ${q.hops} switches make ${us(qRow.worstNs)} and ${q.hops + 1} make ${us(qNext.worstNs)}. Strict priority at this rate already takes ${us(qPriority.worstNs)} at one switch.`,
        ja: `802.1Qbv では制御フレームを待たせるものがないので、${rateName(q.rate)} ではスイッチごとに自分の ${us(qRow.ownNs)} だけがかかります。${q.hops} 台で ${us(qRow.worstNs)}、${q.hops + 1} 台で ${us(qNext.worstNs)} です。同じ速度の厳密な優先制御では、スイッチ 1 台だけで ${us(qPriority.worstNs)} かかります。`,
      },
    },
  ];
}
