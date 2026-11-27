/**
 * The BFD lesson's challenges (REQ-449): goals reached with the lesson's own
 * BFD timers (interval and multiplier). Every `reached` and every number in
 * `why` comes from the detection model in bfd.ts, for a failure just after a
 * BFD packet (the worst case the lesson's tuner shows).
 */
import type { Challenge } from '../components/LessonChallenges';
import { PACKETS_PER_SECOND, RECONVERGE_MS, bfdDetector, outage } from './bfd';

/** The interval slider, ms. */
export const INTERVAL_RANGE_MS = { min: 50, max: 1000, step: 50 } as const;
/** The multiplier slider. */
export const MULTIPLIER_RANGE = { min: 2, max: 5 } as const;
/** The tuner's starting timers: 300 ms × 3. */
export const START_TIMERS: BfdTimers = { intervalMs: 300, multiplier: 3 };

/** The most packets the first challenge allows to be lost. */
const LOSS_LIMIT = 500;
/** The detection time the third challenge must stay within, ms. */
const DETECT_LIMIT_MS = 1000;

export interface BfdTimers {
  readonly intervalMs: number;
  readonly multiplier: number;
}

const worst = ({ intervalMs, multiplier }: BfdTimers) =>
  outage(bfdDetector(intervalMs, multiplier), 0);

export function bfdChallenges(timers: BfdTimers): Challenge[] {
  const mine = worst(timers);
  const slower: BfdTimers = { ...timers, intervalMs: timers.intervalMs + INTERVAL_RANGE_MS.step };
  const next = slower.intervalMs <= INTERVAL_RANGE_MS.max ? worst(slower) : null;
  const start = worst(START_TIMERS);
  const perSecond = Math.round(1000 / timers.intervalMs);

  // 1. Multiplier 3, at most 500 packets lost, with the longest interval.
  const longestUnderLoss =
    timers.multiplier === START_TIMERS.multiplier &&
    mine.lostPackets <= LOSS_LIMIT &&
    next !== null &&
    next.lostPackets > LOSS_LIMIT;

  // 2. The same detection as 300 ms × 3, with another multiplier.
  const sameDetection =
    timers.multiplier !== START_TIMERS.multiplier && mine.detectMs === start.detectMs;

  // 3. Multiplier 5, detected within 1 s, with the fewest BFD packets a second.
  const patientButQuick =
    timers.multiplier === MULTIPLIER_RANGE.max &&
    mine.detectMs <= DETECT_LIMIT_MS &&
    next !== null &&
    next.detectMs > DETECT_LIMIT_MS;

  return [
    {
      id: 'loss-limit',
      goal: {
        en: `Keeping the multiplier at ${START_TIMERS.multiplier}, lose no more than ${LOSS_LIMIT} packets with the longest interval you can.`,
        ja: `倍数を ${START_TIMERS.multiplier} のまま、失われるパケットを ${LOSS_LIMIT} 以下にしてください。送信間隔はできるだけ長くします。`,
      },
      hint: {
        en: 'Packets are lost from the failure until routes are recomputed. What is that time made of, and how many packets does one second cost here?',
        ja: '通信は、障害から経路を計算し直すまで失われます。その時間は何と何の合計でしょう。ここでは 1 秒で何パケット失われますか。',
      },
      reached: longestUnderLoss,
      why: {
        en: `${timers.intervalMs} ms × ${timers.multiplier} = ${mine.detectMs} ms to detect, plus ${RECONVERGE_MS} ms to recompute, is ${mine.outageMs} ms: ${mine.lostPackets} packets at ${PACKETS_PER_SECOND} a second. At ${slower.intervalMs} ms it would be ${next?.lostPackets}.`,
        ja: `${timers.intervalMs} ms × ${timers.multiplier} = ${mine.detectMs} ms で検出し、計算し直しに ${RECONVERGE_MS} ms かかるので、断は ${mine.outageMs} ms です。毎秒 ${PACKETS_PER_SECOND} パケットなら ${mine.lostPackets} パケットです。${slower.intervalMs} ms にすると ${next?.lostPackets} パケットになります。`,
      },
    },
    {
      id: 'same-detection',
      goal: {
        en: `Detect the failure exactly as fast as ${START_TIMERS.intervalMs} ms × ${START_TIMERS.multiplier} (${start.detectMs} ms), but with a different multiplier.`,
        ja: `${START_TIMERS.intervalMs} ms × ${START_TIMERS.multiplier} と同じ速さ（${start.detectMs} ms）で障害に気づくようにしてください。ただし倍数は変えます。`,
      },
      hint: {
        en: 'Detection is the interval times the multiplier. Which other pair gives the same product?',
        ja: '検出時間は「送信間隔 × 倍数」です。同じ積になる別の組はどれでしょう。',
      },
      reached: sameDetection,
      why: {
        en: `${timers.intervalMs} ms × ${timers.multiplier} is also ${mine.detectMs} ms, so the outage is the same. The difference is tolerance: the neighbour is declared down after ${timers.multiplier} missed packets in a row instead of ${START_TIMERS.multiplier}, sending ${perSecond} packets a second.`,
        ja: `${timers.intervalMs} ms × ${timers.multiplier} も ${mine.detectMs} ms なので、断の長さは同じです。違うのは許せる取りこぼしの数で、${START_TIMERS.multiplier} 回ではなく ${timers.multiplier} 回続けて届かないとネイバーを止まったと判断します。送るのは毎秒 ${perSecond} パケットです。`,
      },
    },
    {
      id: 'patient-quick',
      goal: {
        en: `With multiplier ${MULTIPLIER_RANGE.max} (tolerant of busy moments), still detect within ${DETECT_LIMIT_MS / 1000} second, sending as few BFD packets as possible.`,
        ja: `倍数 ${MULTIPLIER_RANGE.max}（忙しいときの取りこぼしに強い設定）のまま、${DETECT_LIMIT_MS / 1000} 秒以内に気づくようにしてください。BFD のパケットはできるだけ少なくします。`,
      },
      hint: {
        en: `How long may one interval be, if ${MULTIPLIER_RANGE.max} of them must fit in the limit?`,
        ja: `${MULTIPLIER_RANGE.max} 回分の間隔が制限に収まるなら、1 回の間隔はどこまで長くできますか。`,
      },
      reached: patientButQuick,
      why: {
        en: `${timers.intervalMs} ms × ${timers.multiplier} = ${mine.detectMs} ms, with ${perSecond} BFD packets a second. At ${slower.intervalMs} ms detection takes ${next?.detectMs} ms, over the limit.`,
        ja: `${timers.intervalMs} ms × ${timers.multiplier} = ${mine.detectMs} ms で、BFD は毎秒 ${perSecond} パケットです。${slower.intervalMs} ms にすると検出に ${next?.detectMs} ms かかり、制限を超えます。`,
      },
    },
  ];
}
