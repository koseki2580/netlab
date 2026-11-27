/** REQ-449 — the CUBIC and RACK-TLP lesson's challenges, checked by its model (TC-2640). */
import type { Challenge } from '../components/LessonChallenges';
import {
  ALPHA_CUBIC,
  WC_DEL_ACK_MS,
  cubicRecovery,
  renoRecovery,
  tailLoss,
  windowPackets,
} from './tcpCubic';

export interface TcpCubicChallengeState {
  /** The path's bandwidth, bits per second. */
  readonly bps: number;
  readonly rttMs: number;
  /** The tail-loss part's SRTT and segments lost at the end. */
  readonly srttMs: number;
  readonly lost: number;
}

/** The bandwidth the "under a minute" challenge holds fixed. */
const FAST_BPS = 10e9;
const MINUTE_S = 60;
/** The no-head-start challenge's limit on SRTT, ms. */
const SRTT_LIMIT_MS = 500;

const packets = (value: number) => Math.round(value).toLocaleString('en');
const secondsEn = (value: number) => `${value.toFixed(1)} s`;
const secondsJa = (value: number) => `${value.toFixed(1)} 秒`;
const speed = (bps: number) => (bps >= 1e9 ? `${bps / 1e9} Gb/s` : `${bps / 1e6} Mb/s`);

export function tcpCubicChallenges(state: TcpCubicChallengeState): Challenge[] {
  const w = windowPackets(state.bps, state.rttMs);
  const reno = renoRecovery(w, state.rttMs);
  const cubic = cubicRecovery(w, state.rttMs);
  const tail = tailLoss(state.srttMs, state.lost);

  return [
    {
      id: 'reno-first',
      goal: {
        en: 'Find a path on which Reno gets its window back before CUBIC does.',
        ja: 'Reno のほうが CUBIC より先にウィンドウを取り戻す経路を見つけてください。',
      },
      hint: {
        en: 'CUBIC’s curve runs on clock time, but its Reno-friendly estimate W_est grows per round trip. On what kind of path does W_est decide?',
        ja: 'CUBIC の 3 次曲線は時計の時間で進みますが、Reno 相当の見積もり W_est は往復ごとに増えます。W_est が決め手になるのはどんな経路ですか？',
      },
      reached: reno.seconds < cubic.seconds,
      why: {
        en: `${speed(state.bps)} and ${state.rttMs} ms: the window is only ${packets(w)} packets and a round trip is short, so Reno’s one packet per round trip from ${packets(reno.after)} is back in ${secondsEn(reno.seconds)}. CUBIC starts higher, at ${packets(cubic.after)}, but its W_est climbs only about ${ALPHA_CUBIC.toFixed(2)} packets per round trip, so it needs ${secondsEn(cubic.seconds)}: the same throughput as Reno is what RFC 9438 aims for on such paths.`,
        ja: `${speed(state.bps)}、${state.rttMs} ms では、ウィンドウは ${packets(w)} パケットしかなく往復も短いので、${packets(reno.after)} から 1 往復に 1 パケットずつ増える Reno は ${secondsJa(reno.seconds)} で戻ります。CUBIC は ${packets(cubic.after)} と高いところから始まりますが、W_est は 1 往復に約 ${ALPHA_CUBIC.toFixed(2)} パケットしか増えないので ${secondsJa(cubic.seconds)} かかります。こうした経路で Reno と同じスループットにすることが、RFC 9438 のねらいです。`,
      },
    },
    {
      id: 'reno-minute',
      goal: {
        en: `At ${speed(FAST_BPS)}, bring Reno’s recovery under one minute by changing only the round trip.`,
        ja: `${speed(FAST_BPS)} のまま、往復時間だけを変えて、Reno が戻るまでの時間を 1 分未満にしてください。`,
      },
      hint: {
        en: 'A shorter round trip makes the window smaller and each round trip quicker. How do those two combine?',
        ja: '往復時間が短いと、ウィンドウは小さくなり、1 往復も速くなります。この 2 つを合わせるとどうなりますか？',
      },
      reached: state.bps === FAST_BPS && reno.seconds < MINUTE_S,
      why: {
        en: `At ${state.rttMs} ms the window is ${packets(w)} packets; Reno must win back ${packets(w - reno.after)} of them at one per ${state.rttMs} ms round trip: ${secondsEn(reno.seconds)}. Both the window and the round trip grow with the RTT, so Reno’s recovery grows with its square — which is why a long fat path needs CUBIC (${secondsEn(cubic.seconds)} here).`,
        ja: `${state.rttMs} ms ならウィンドウは ${packets(w)} パケットで、Reno は ${packets(w - reno.after)} パケットを 1 往復（${state.rttMs} ms）に 1 つずつ取り戻すので ${secondsJa(reno.seconds)} です。ウィンドウも 1 往復の時間も往復時間に比例するので、Reno の回復時間は往復時間の 2 乗で伸びます。だから遠くて速い経路には CUBIC（ここでは ${secondsJa(cubic.seconds)}）が要ります。`,
      },
    },
    {
      id: 'no-head-start',
      goal: {
        en: `Make the tail-loss probe fire at the same moment as the retransmission timeout, with an SRTT under ${SRTT_LIMIT_MS} ms.`,
        ja: `SRTT を ${SRTT_LIMIT_MS} ms 未満にしたまま、テールロスプローブが再送タイムアウトと同じ瞬間に送られるようにしてください。`,
      },
      hint: {
        en: 'The PTO is 2 × SRTT, never more than the RTO. Is anything ever added to 2 × SRTT?',
        ja: 'PTO は 2 × SRTT で、RTO を超えることはありません。2 × SRTT に何かが足されることはありますか？',
      },
      reached:
        tail.tlp.firstResendMs === tail.rtoOnly.firstResendMs && state.srttMs < SRTT_LIMIT_MS,
      why: {
        en: `With ${state.lost} segment lost, only one is in flight, so the PTO is 2 × ${state.srttMs} + ${WC_DEL_ACK_MS} = ${2 * state.srttMs + WC_DEL_ACK_MS} ms — no less than the RTO of ${tail.rtoMs} ms, and the PTO is never longer than the RTO, so it is ${tail.ptoMs} ms. Probe and timeout both fire at ${tail.tlp.firstResendMs} ms: TLP gains nothing once 2 × SRTT reaches the RTO’s 1 s floor.`,
        ja: `失われたのが ${state.lost} セグメントで送りっぱなしが 1 つだけなので、PTO は 2 × ${state.srttMs} + ${WC_DEL_ACK_MS} = ${2 * state.srttMs + WC_DEL_ACK_MS} ms です。これは RTO の ${tail.rtoMs} ms 以上で、PTO は RTO を超えないので ${tail.ptoMs} ms になります。プローブもタイムアウトも ${tail.tlp.firstResendMs} ms に送られます。2 × SRTT が RTO の下限 1 秒に届くと、TLP の利点はなくなります。`,
      },
    },
  ];
}
