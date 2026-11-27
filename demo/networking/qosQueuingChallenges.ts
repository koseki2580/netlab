/**
 * The QoS queuing lesson's challenges (REQ-449): goals reached with the
 * lesson's own controls — the token bucket's depth (Bc) in part 1, the
 * scheduler and the wrongly marked backup in part 2. Every `reached` and every
 * number in `why` comes from police / shape / runLink in qosQueuing.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import {
  BC_BITS,
  CIR_BPS,
  PRIORITY_BPS,
  customerTraffic,
  police,
  runLink,
  shape,
  type Scheduler,
} from './qosQueuing';

/** The depth slider's step, kbit. */
export const DEPTH_STEP_KBIT = 10;
export const DEPTH_MIN_KBIT = BC_BITS / 1000;
export const DEPTH_MAX_KBIT = 1500;
/** The shaper's delay limit in challenge 3, ms. */
export const SHAPER_LIMIT_MS = 25;
/** What bulk must keep in challenge 2, Mbit/s; voice's delay limit there, ms. */
export const BULK_FLOOR_MBPS = 7.5;
export const VOICE_LIMIT_MS = 5;

export interface QosState {
  readonly depthKbit: number;
  readonly scheduler: Scheduler;
  readonly rogueEf: boolean;
}

export const INITIAL_QOS: QosState = {
  depthKbit: DEPTH_MIN_KBIT,
  scheduler: 'fifo',
  rogueEf: false,
};

const traffic = customerTraffic();
const ms = (us: number) => Math.round(us / 100) / 10;
const one = (value: number) => Math.round(value * 10) / 10;

export function qosQueuingChallenges(state: QosState): Challenge[] {
  const depth = state.depthKbit;
  const below = depth - DEPTH_STEP_KBIT;
  const policed = police(traffic, CIR_BPS, depth * 1000);
  const policedBelow = police(traffic, CIR_BPS, below * 1000);
  const shaped = shape(traffic, CIR_BPS, depth * 1000);
  const shapedBelow = shape(traffic, CIR_BPS, below * 1000);
  const link = runLink({ scheduler: state.scheduler, rogueEf: state.rogueEf });

  // 1. The smallest depth at which the policer drops nothing.
  const policerSmallest =
    policed.droppedPackets === 0 && below >= DEPTH_MIN_KBIT && policedBelow.droppedPackets > 0;
  // 2. Backup wrongly EF: bulk keeps ≥ 7.5 Mbit/s and voice waits < 5 ms.
  const rogueContained =
    state.rogueEf &&
    link.bulk.mbpsDuringTransfer >= BULK_FLOOR_MBPS &&
    link.voice.maxDelayUs < VOICE_LIMIT_MS * 1000;
  // 3. The smallest depth at which the shaper holds nothing longer than 25 ms.
  const limitUs = SHAPER_LIMIT_MS * 1000;
  const shaperSmallest =
    shaped.maxDelayUs <= limitUs && below >= DEPTH_MIN_KBIT && shapedBelow.maxDelayUs > limitUs;

  return [
    {
      id: 'policer-no-drop',
      goal: {
        en: `Find the smallest bucket depth (Bc), to ${DEPTH_STEP_KBIT} kbit, at which the policer drops no packet of the customer's bursts.`,
        ja: `顧客のバーストを 1 パケットも捨てずにポリサーが通せる、いちばん小さいバケットの深さ（Bc）を ${DEPTH_STEP_KBIT} kbit 単位で見つけてください。`,
      },
      hint: {
        en: `A burst sends 15 Mbit/s for 100 ms while the bucket refills at ${CIR_BPS / 1e6} Mbit/s. How many bits arrive beyond what the refill covers?`,
        ja: `バーストは 15 Mbit/s で 100 ms 続き、その間バケットは ${CIR_BPS / 1e6} Mbit/s でしか補充されません。補充で賄えない分は何ビットでしょう。`,
      },
      reached: policerSmallest,
      why: {
        en: `A 100 ms burst at 15 Mbit/s is 1500 kbit; the ${CIR_BPS / 1e6} Mbit/s refill covers about 500 kbit of it, so the bucket must hold the other 1000 kbit or so. At ${depth} kbit the policer drops ${policed.droppedPackets} of ${policed.offeredPackets} packets; at ${below} kbit it drops ${policedBelow.droppedPackets}.`,
        ja: `15 Mbit/s で 100 ms のバーストは 1500 kbit です。${CIR_BPS / 1e6} Mbit/s の補充で賄えるのは約 500 kbit なので、残りの約 1000 kbit をバケットが持っていなければなりません。${depth} kbit ではポリサーが捨てるのは ${policed.offeredPackets} 個中 ${policed.droppedPackets} 個、${below} kbit では ${policedBelow.droppedPackets} 個です。`,
      },
    },
    {
      id: 'rogue-contained',
      goal: {
        en: `In part 2, with the backup wrongly marked EF, keep the bulk transfer at ${BULK_FLOOR_MBPS} Mbit/s or more while no voice packet waits ${VOICE_LIMIT_MS} ms or longer.`,
        ja: `パート 2 で、バックアップが誤って EF に印付けされたまま、バルク転送に ${BULK_FLOOR_MBPS} Mbit/s 以上を残しつつ、音声パケットの待ちを ${VOICE_LIMIT_MS} ms 未満に抑えてください。`,
      },
      hint: {
        en: 'Strict priority keeps voice fast, but what stops everything marked EF from taking the whole link?',
        ja: '完全優先なら音声は速く送れますが、EF の印が付いたものがリンクを使い切らないよう止めるのは何でしょう。',
      },
      reached: rogueContained,
      why: {
        en: `The priority class is policed to ${PRIORITY_BPS / 1e6} Mbit/s, so EF goes first but cannot take more: bulk keeps ${one(link.bulk.mbpsDuringTransfer)} Mbit/s and voice waits at most ${ms(link.voice.maxDelayUs)} ms. The policer cannot tell calls from the backup, though, so voice loses ${link.voice.lossPct} % — the real fix is the marking.`,
        ja: `優先クラスは ${PRIORITY_BPS / 1e6} Mbit/s にポリシングされるので、EF は先に送られてもそれ以上は使えません。バルクには ${one(link.bulk.mbpsDuringTransfer)} Mbit/s が残り、音声の待ちは最大 ${ms(link.voice.maxDelayUs)} ms です。ただしポリサーは通話とバックアップを区別できず、音声も ${link.voice.lossPct} % 失われます。本当に直すべきはマーキングです。`,
      },
    },
    {
      id: 'shaper-delay',
      goal: {
        en: `Find the smallest bucket depth (Bc), to ${DEPTH_STEP_KBIT} kbit, at which the shaper holds no packet longer than ${SHAPER_LIMIT_MS} ms.`,
        ja: `シェーパーがどのパケットも ${SHAPER_LIMIT_MS} ms より長く待たせない、いちばん小さいバケットの深さ（Bc）を ${DEPTH_STEP_KBIT} kbit 単位で見つけてください。`,
      },
      hint: {
        en: `What the bucket cannot hold waits in the queue and drains at ${CIR_BPS / 1e6} Mbit/s. How many bits drain in ${SHAPER_LIMIT_MS} ms?`,
        ja: `バケットに入りきらない分はキューで待ち、${CIR_BPS / 1e6} Mbit/s で出ていきます。${SHAPER_LIMIT_MS} ms で出ていくのは何ビットでしょう。`,
      },
      reached: shaperSmallest,
      why: {
        en: `At ${CIR_BPS / 1e6} Mbit/s, ${SHAPER_LIMIT_MS} ms drains ${(CIR_BPS / 1000) * (SHAPER_LIMIT_MS / 1000)} kbit, so the bucket must be deep enough that no more than that is ever left waiting. At ${depth} kbit the longest hold is ${ms(shaped.maxDelayUs)} ms with at most ${shaped.maxQueueBytes / 1000} KB queued; at ${below} kbit it is ${ms(shapedBelow.maxDelayUs)} ms.`,
        ja: `${CIR_BPS / 1e6} Mbit/s では ${SHAPER_LIMIT_MS} ms に ${(CIR_BPS / 1000) * (SHAPER_LIMIT_MS / 1000)} kbit が出ていきます。キューに残る分がそれ以下になるだけの深さがバケットに要ります。${depth} kbit では最大の待ちは ${ms(shaped.maxDelayUs)} ms、キューは最大 ${shaped.maxQueueBytes / 1000} KB です。${below} kbit では ${ms(shapedBelow.maxDelayUs)} ms です。`,
      },
    },
  ];
}
