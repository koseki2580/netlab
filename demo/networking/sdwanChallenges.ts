/**
 * The SD-WAN lesson's challenges (REQ-449): goals reached with the lesson's
 * own controls — the period tabs and video meetings' loss limit. Every
 * `reached` and every number in `why` comes from choose / misses in sdwan.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { PERIODS, POLICIES, UPLINKS, choose, type AppPolicy, type Uplink } from './sdwan';

/** The loss-limit slider's step and range, %. */
export const LOSS_STEP_PCT = 0.1;
export const LOSS_MAX_PCT = 2;

const VIDEO = POLICIES.find((policy) => policy.id === 'video')!;
export const VIDEO_LOSS_PCT = VIDEO.sla.lossPct;

export interface SdwanState {
  readonly period: number;
  /** The most loss video meetings accept, %. */
  readonly videoLossPct: number;
}

/** The lesson right after the reveal: the 18:00 rush, video at its own 0.5 %. */
export const INITIAL_SDWAN: SdwanState = { period: 1, videoLossPct: VIDEO_LOSS_PCT };

const tenth = (value: number) => Math.round(value * 10) / 10;

/** Video meetings' policy with another loss limit. */
export const videoPolicy = (lossPct: number): AppPolicy => ({
  ...VIDEO,
  sla: { ...VIDEO.sla, lossPct: tenth(lossPct) },
});

const link = (id: Uplink['id']) => UPLINKS.find((entry) => entry.id === id)!;

export function sdwanChallenges(state: SdwanState): Challenge[] {
  const loss = tenth(state.videoLossPct);
  const tighter = tenth(loss - LOSS_STEP_PCT);
  const video = videoPolicy(loss);
  const rush = choose(video, 1);
  const rushTighter = choose(videoPolicy(tighter), 1);
  const at20 = choose(video, 2);
  const day = Array.from({ length: PERIODS }, (_, period) => choose(video, period));
  const lte = link('lte').samples[1]!;
  const evening = link('internet').samples[2]!;
  const quiet = link('internet').samples[0]!;
  const mpls = link('mpls');

  // 1. In the rush, the smallest loss limit that moves video off MPLS.
  const offMpls = state.period === 1 && rush !== 'mpls' && tighter >= 0 && rushTighter === 'mpls';
  // 2. At 20:00, video off the internet line.
  const offInternet = state.period === 2 && at20 !== 'internet';
  // 3. Video on one link in all four moments of the day.
  const oneLink = day.every((id) => id === day[0]);

  return [
    {
      id: 'rush-off-mpls',
      goal: {
        en: `In the 18:00 rush, move video meetings off MPLS by loosening only their loss limit — as little as possible, to ${LOSS_STEP_PCT} %.`,
        ja: `18:00 の混雑時に、ビデオ会議の損失の上限だけをゆるめて MPLS から移してください。ゆるめるのは ${LOSS_STEP_PCT} % 単位で、できるだけ少なくします。`,
      },
      hint: {
        en: 'Which link already meets video’s latency and jitter in the rush, and by how much does it miss on loss?',
        ja: '混雑時に、ビデオ会議の遅延と揺らぎをすでに満たしている回線はどれでしょう。損失ではどれだけ足りませんか。',
      },
      reached: offMpls,
      why: {
        en: `LTE measures ${lte.latencyMs} ms / ${lte.jitterMs} ms / ${lte.lossPct} %, inside video’s ${VIDEO.sla.latencyMs} ms and ${VIDEO.sla.jitterMs} ms; only its loss missed. At ${loss} % it meets all three and costs ${link('lte').cost}, less than MPLS’s ${mpls.cost}, so video moves to ${link(rush).name.en}. At ${tighter} % it would stay on ${link(rushTighter).name.en}.`,
        ja: `LTE の測定値は ${lte.latencyMs} ms／${lte.jitterMs} ms／${lte.lossPct} % で、ビデオ会議の ${VIDEO.sla.latencyMs} ms と ${VIDEO.sla.jitterMs} ms の内側です。足りなかったのは損失だけでした。${loss} % なら 3 つとも満たし、費用 ${link('lte').cost} は MPLS の ${mpls.cost} より安いので、ビデオ会議は ${link(rush).name.ja}へ移ります。${tighter} % では ${link(rushTighter).name.ja}のままです。`,
      },
    },
    {
      id: 'evening-off-internet',
      goal: {
        en: 'At 20:00, make video meetings leave the internet line by changing only their loss limit.',
        ja: '20:00 の時点で、ビデオ会議の損失の上限だけを変えて、インターネット回線から外してください。',
      },
      hint: {
        en: 'At 20:00 the internet line is still recovering. Which of its three measurements sits exactly on video’s limit?',
        ja: '20:00 のインターネット回線はまだ回復の途中です。3 つの測定値のうち、ビデオ会議の上限ちょうどのものはどれでしょう。',
      },
      reached: offInternet,
      why: {
        en: `At 20:00 the internet line loses ${evening.lossPct} %. With a limit of ${loss} % it misses, LTE’s ${link('lte').samples[2]!.lossPct} % misses too, and the cheapest link left that meets video is ${link(at20).name.en} (cost ${link(at20).cost} instead of ${link('internet').cost}).`,
        ja: `20:00 のインターネット回線の損失は ${evening.lossPct} % です。上限が ${loss} % だとこれを満たせず、LTE の ${link('lte').samples[2]!.lossPct} % も満たせないので、残る中でいちばん安いのは ${link(at20).name.ja}です（費用は ${link('internet').cost} ではなく ${link(at20).cost}）。`,
      },
    },
    {
      id: 'one-link-all-day',
      goal: {
        en: 'Make video meetings use the same link at all four moments of the day, changing only their loss limit.',
        ja: 'ビデオ会議の損失の上限だけを変えて、1 日の 4 つの時点すべてでビデオ会議が同じ回線を使うようにしてください。',
      },
      hint: {
        en: 'Video moves whenever a cheaper link starts or stops meeting its needs. Which link meets them at every moment, and what keeps the others out?',
        ja: 'ビデオ会議は、より安い回線が条件を満たしたり外れたりするたびに移ります。どの時点でも条件を満たす回線はどれで、ほかの回線を外すには何が要るでしょう。',
      },
      reached: oneLink,
      why: {
        en: `At ${loss} %, even the internet line’s quiet ${quiet.lossPct} % is too much, and so is LTE’s ${link('lte').samples[0]!.lossPct} %; only ${link(day[0]!).name.en} at ${link(day[0]!).samples[0]!.lossPct} % qualifies, all day. Video never moves — at cost ${link(day[0]!).cost} every hour instead of ${link('internet').cost} most of the day.`,
        ja: `${loss} % では、インターネット回線の空いているときの ${quiet.lossPct} % も、LTE の ${link('lte').samples[0]!.lossPct} % も多すぎます。条件を満たすのは損失 ${link(day[0]!).samples[0]!.lossPct} % の ${link(day[0]!).name.ja}だけで、1 日中そこを使います。ビデオ会議は動かなくなりますが、ほとんどの時間を費用 ${link('internet').cost} で済ませる代わりに、ずっと費用 ${link(day[0]!).cost} を払います。`,
      },
    },
  ];
}
