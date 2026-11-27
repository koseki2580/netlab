/**
 * The TCP options lesson's challenges (REQ-449): goals reached with the
 * lesson's own controls (the round trip, the stripped option, the lost
 * segments). Every `reached` and every number in `why` comes from the model
 * in tcpOptions.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import {
  LINK_BPS,
  MAX_UNSCALED_WINDOW,
  WINDOW_SEGMENTS,
  cumulativeAck,
  maxSackBlocks,
  sackBlocks,
  scaledWindow,
  transfer,
} from './tcpOptions';

/** The lesson's controls. */
export interface TcpOptionsState {
  /** The explored round trip, ms (the slider: 5..300 in steps of 5). */
  readonly rttMs: number;
  /** Does a middlebox strip the window scale option? */
  readonly stripped: boolean;
  /** The lost segments of the SACK window. */
  readonly lost: readonly number[];
}

/** The round-trip slider's step, ms. */
export const RTT_STEP_MS = 5;
/** The rate the stripped-option challenge asks for, bit/s. */
const TARGET_BPS = 10_000_000;
/** The shift the window scale challenge asks for. */
const TARGET_SHIFT = 10;
/** The SACK blocks one ACK holds without timestamps. */
const BLOCK_LIMIT = maxSackBlocks(false);

const mbit = (bps: number) => `${(bps / 1e6).toFixed(1)} Mbit/s`;
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(2)} MB`;
const bytesEn = (n: number) => n.toLocaleString('en');

export function tcpOptionsChallenges(state: TcpOptionsState): Challenge[] {
  const path = (rttMs: number, stripped: boolean) =>
    transfer(LINK_BPS, rttMs, { offered: true, stripped });
  const now = path(state.rttMs, state.stripped);

  // 1. Option stripped: the longest round trip that still gets 10 Mbit/s.
  const longer = path(state.rttMs + RTT_STEP_MS, true);
  const longestTen =
    state.stripped && now.throughputBps >= TARGET_BPS && longer.throughputBps < TARGET_BPS;

  // 2. Scaling on: the shortest round trip that needs shift 10.
  const shorter = path(Math.max(RTT_STEP_MS, state.rttMs - RTT_STEP_MS), false);
  const shortestTen =
    !state.stripped &&
    now.shiftNeeded === TARGET_SHIFT &&
    (state.rttMs === RTT_STEP_MS || shorter.shiftNeeded !== TARGET_SHIFT);

  // 3. More blocks than one ACK can carry, with as few losses as that takes.
  const sorted = [...state.lost].sort((a, b) => a - b);
  const allBlocks = sackBlocks(WINDOW_SEGMENTS, sorted, WINDOW_SEGMENTS);
  const tooMany = allBlocks.length > BLOCK_LIMIT && sorted.length === BLOCK_LIMIT + 1;
  const ack = cumulativeAck(WINDOW_SEGMENTS, sorted);
  const blockBytes = 2 + 8 * BLOCK_LIMIT;

  return [
    {
      id: 'stripped-longest',
      goal: {
        en: `With a middlebox stripping the window scale option, find the longest round trip, in ${RTT_STEP_MS} ms steps, at which the download still reaches ${TARGET_BPS / 1e6} Mbit/s.`,
        ja: `途中の機器がウィンドウスケールのオプションを消す状態で、ダウンロードがまだ ${TARGET_BPS / 1e6} Mbit/s に届く最長の往復時間を ${RTT_STEP_MS} ms 単位で見つけてください。`,
      },
      hint: {
        en: 'Without scaling the window cannot grow. How much is in flight, and how often can the sender send it?',
        ja: 'スケールがなければウィンドウは大きくなれません。一度に送れるのは何バイトで、それを何秒ごとに送れるでしょう。',
      },
      reached: longestTen,
      why: {
        en: `Scaling is off, so at most ${bytesEn(MAX_UNSCALED_WINDOW)} bytes are in flight per round trip: ${bytesEn(MAX_UNSCALED_WINDOW)} × 8 bits ÷ ${state.rttMs / 1000} s = ${mbit(now.throughputBps)}. At ${state.rttMs + RTT_STEP_MS} ms the same window gives only ${mbit(longer.throughputBps)}.`,
        ja: `スケールが使われないので、1 往復に送れるのは最大 ${bytesEn(MAX_UNSCALED_WINDOW)} バイトです。${bytesEn(MAX_UNSCALED_WINDOW)} × 8 ビット ÷ ${state.rttMs / 1000} 秒 = ${mbit(now.throughputBps)} になります。${state.rttMs + RTT_STEP_MS} ms では、同じウィンドウで ${mbit(longer.throughputBps)} しか出ません。`,
      },
    },
    {
      id: 'shift-ten',
      goal: {
        en: `With both ends offering window scaling, find the shortest round trip, in ${RTT_STEP_MS} ms steps, at which 1 Gbit/s needs a shift of ${TARGET_SHIFT}.`,
        ja: `両端がウィンドウスケールを示す状態で、1 Gbit/s を使い切るのにシフト ${TARGET_SHIFT} が必要になる最短の往復時間を ${RTT_STEP_MS} ms 単位で見つけてください。`,
      },
      hint: {
        en: 'Each step of the shift doubles the largest window. Which round trip makes the bandwidth-delay product outgrow shift 9?',
        ja: 'シフトが 1 増えるごとに、最大のウィンドウは 2 倍になります。どの往復時間で帯域幅遅延積がシフト 9 の窓に収まらなくなるでしょう。',
      },
      reached: shortestTen,
      why: {
        en: `At ${state.rttMs} ms, 1 Gbit/s needs ${mb(now.bdpBytes)} in flight, more than ${bytesEn(MAX_UNSCALED_WINDOW)} << ${TARGET_SHIFT - 1} = ${bytesEn(scaledWindow(TARGET_SHIFT - 1))} bytes, so the shift must be ${TARGET_SHIFT} (up to ${bytesEn(scaledWindow(TARGET_SHIFT))} bytes). At ${state.rttMs - RTT_STEP_MS} ms the product is ${mb(shorter.bdpBytes)}, and shift ${shorter.shiftNeeded} is enough.`,
        ja: `${state.rttMs} ms では、1 Gbit/s を流し続けるのに ${mb(now.bdpBytes)} が送信中である必要があり、${bytesEn(MAX_UNSCALED_WINDOW)} << ${TARGET_SHIFT - 1} = ${bytesEn(scaledWindow(TARGET_SHIFT - 1))} バイトを超えるので、シフトは ${TARGET_SHIFT}（最大 ${bytesEn(scaledWindow(TARGET_SHIFT))} バイト）が必要です。${state.rttMs - RTT_STEP_MS} ms なら帯域幅遅延積は ${mb(shorter.bdpBytes)} で、シフト ${shorter.shiftNeeded} で足ります。`,
      },
    },
    {
      id: 'too-many-blocks',
      goal: {
        en: 'Lose segments until one ACK can no longer list every block the receiver holds, losing as few segments as that takes.',
        ja: '受信側が持っているブロックを 1 つの ACK で伝えきれなくなるまでセグメントを失わせてください。失わせるセグメントはできるだけ少なくします。',
      },
      hint: {
        en: 'How many blocks fit in the 40 bytes of options? And how many separate blocks can each lost segment create?',
        ja: 'オプションの 40 バイトに入るブロックはいくつでしょう。また、失われたセグメント 1 つで、離れたブロックはいくつ増やせるでしょう。',
      },
      reached: tooMany,
      why: {
        en: `With segments ${sorted.join(', ')} lost, the ACK says ${ack} and the receiver holds ${allBlocks.length} separate blocks. The SACK option takes 2 + 8 × ${BLOCK_LIMIT} = ${blockBytes} bytes for ${BLOCK_LIMIT} blocks; one more would need ${blockBytes + 8}, over the 40 bytes. Every block sits right after a lost segment, so ${BLOCK_LIMIT + 1} blocks need ${BLOCK_LIMIT + 1} losses, none of them next to each other.`,
        ja: `セグメント ${sorted.join('、')} が失われると、ACK は ${ack} で、受信側が持っている離れたブロックは ${allBlocks.length} 個です。SACK オプションは ${BLOCK_LIMIT} ブロックで 2 + 8 × ${BLOCK_LIMIT} = ${blockBytes} バイトを使い、もう 1 つ載せると ${blockBytes + 8} バイトになって 40 バイトを超えます。ブロックはどれも失われたセグメントの直後から始まるので、${BLOCK_LIMIT + 1} ブロックには、隣り合わない ${BLOCK_LIMIT + 1} 個の損失が必要です。`,
      },
    },
  ];
}
