/**
 * The L4S lesson's challenges (REQ-449): goals reached with the shown sender
 * and its buffer. Every `reached` and every number in `why` comes from the
 * bottleneck model in l4s.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { BASE_RTT_MS, CAPACITY, simulate, type L4sScenario } from './l4s';

/** The buffer slider, packets. */
export const BUFFER_RANGE = { min: 10, max: 200, step: 10 } as const;
/** The line use the first challenge asks of a classic sender, %. */
const FULL_PCT = 99;
/** The worst delay the third challenge allows a classic sender, ms. */
const DELAY_LIMIT_MS = 10;

export interface L4sState {
  readonly scenario: L4sScenario;
  readonly bufferPackets: number;
}

export function l4sChallenges({ scenario, bufferPackets }: L4sState): Challenge[] {
  const classic = scenario !== 'l4s';
  const mine = simulate(scenario, bufferPackets);
  const smaller = bufferPackets - BUFFER_RANGE.step;
  const below = smaller >= BUFFER_RANGE.min ? simulate(scenario, smaller) : null;
  const larger = bufferPackets + BUFFER_RANGE.step;
  const above = larger <= BUFFER_RANGE.max ? simulate(scenario, larger) : null;
  const l4s = simulate('l4s');

  // 1. The smallest classic buffer that keeps the line 99 % used.
  const smallestFull =
    classic && mine.utilisationPct >= FULL_PCT && below !== null && below.utilisationPct < FULL_PCT;

  // 2. The smallest buffer an L4S sender needs to lose nothing.
  const smallestLossless = !classic && mine.drops === 0 && below !== null && below.drops > 0;

  // 3. The largest classic buffer whose worst delay stays within 10 ms.
  const largestShort =
    classic &&
    mine.maxDelayMs <= DELAY_LIMIT_MS &&
    above !== null &&
    above.maxDelayMs > DELAY_LIMIT_MS;

  return [
    {
      id: 'classic-full',
      goal: {
        en: `With a classic TCP sender, find the smallest buffer, in steps of ${BUFFER_RANGE.step} packets, that keeps the line at least ${FULL_PCT} % used.`,
        ja: `従来の TCP の送り手で、回線の使用率を ${FULL_PCT} % 以上に保てる最小のバッファを ${BUFFER_RANGE.step} パケット単位で見つけてください。`,
      },
      hint: {
        en: 'After a drop the window halves. What must still be waiting in the buffer so the line does not go idle while the window grows back?',
        ja: 'パケットが捨てられると、送る量は半分になります。送る量が戻るまで回線を空けないためには、バッファに何が残っていればよいでしょう。',
      },
      reached: smallestFull,
      why: {
        en: `With ${bufferPackets} packets of buffer the line is ${mine.utilisationPct} % used: the queue built up before the drop keeps feeding the line after the window halves. With ${smaller} it is ${below?.utilisationPct} %. The price is the queue itself: up to ${mine.maxDelayMs} ms of delay.`,
        ja: `バッファが ${bufferPackets} パケットなら、使用率は ${mine.utilisationPct} % です。捨てられる前にたまった待ち行列が、送る量が半分になったあとも回線に送り続けるからです。${smaller} パケットでは ${below?.utilisationPct} % です。その代わり、待ち行列そのものが最大 ${mine.maxDelayMs} ms の遅延になります。`,
      },
    },
    {
      id: 'l4s-lossless',
      goal: {
        en: `With the L4S sender, find the smallest buffer, in steps of ${BUFFER_RANGE.step} packets, that drops no packet.`,
        ja: `L4S の送り手で、パケットを 1 つも捨てない最小のバッファを ${BUFFER_RANGE.step} パケット単位で見つけてください。`,
      },
      hint: {
        en: 'The L4S sender backs off as soon as the queue passes the marking threshold. How long does its queue get, then?',
        ja: 'L4S の送り手は、待ち行列がマークのしきい値を超えるとすぐに減らします。では、待ち行列はどこまで伸びるでしょう。',
      },
      reached: smallestLossless,
      why: {
        en: `The marks hold the L4S queue near the threshold: at most ${mine.maxDelayMs} ms, so ${bufferPackets} packets of buffer is never overflowed and the line stays ${mine.utilisationPct} % used. With ${smaller} packets the queue does not fit, and it overflows (${below?.drops.toFixed(2)} packets dropped).`,
        ja: `マークによって L4S の待ち行列はしきい値の近くに保たれ、遅延は最大 ${mine.maxDelayMs} ms です。そのため ${bufferPackets} パケットのバッファは一度もあふれず、使用率は ${mine.utilisationPct} % のままです。${smaller} パケットでは待ち行列が収まらずにあふれます（捨てられるのは ${below?.drops.toFixed(2)} パケット分）。`,
      },
    },
    {
      id: 'classic-short',
      goal: {
        en: `With a classic TCP sender, find the largest buffer, in steps of ${BUFFER_RANGE.step} packets, whose worst delay stays at ${DELAY_LIMIT_MS} ms or less. How much of the line is used then?`,
        ja: `従来の TCP の送り手で、最大の遅延が ${DELAY_LIMIT_MS} ms 以下に収まる最大のバッファを ${BUFFER_RANGE.step} パケット単位で見つけてください。そのとき回線はどれだけ使われるでしょう。`,
      },
      hint: {
        en: `A full buffer of ${CAPACITY} packets adds one ${BASE_RTT_MS} ms round trip of delay.`,
        ja: `${CAPACITY} パケットでいっぱいのバッファは、遅延を 1 往復分（${BASE_RTT_MS} ms）増やします。`,
      },
      reached: largestShort,
      why: {
        en: `${bufferPackets} packets keeps the worst delay at ${mine.maxDelayMs} ms (${larger} packets reaches ${above?.maxDelayMs} ms), but after each halving the short queue runs dry and the line is only ${mine.utilisationPct} % used, while L4S uses ${l4s.utilisationPct} % with a worst delay of ${l4s.maxDelayMs} ms.`,
        ja: `${bufferPackets} パケットなら最大の遅延は ${mine.maxDelayMs} ms です（${larger} パケットでは ${above?.maxDelayMs} ms）。しかし半分に減らすたびに短い待ち行列が空になり、使用率は ${mine.utilisationPct} % にとどまります。L4S なら使用率 ${l4s.utilisationPct} %、最大の遅延 ${l4s.maxDelayMs} ms です。`,
      },
    },
  ];
}
