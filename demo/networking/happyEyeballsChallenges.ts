/**
 * The Happy Eyeballs lesson's challenges (REQ-449): goals reached with the
 * Connection Attempt Delay slider. Every `reached` and every number in `why`
 * comes from the race model in happyEyeballs.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { ATTEMPT_DELAY_MS, RTT, happyEyeballs } from './happyEyeballs';

/** The Connection Attempt Delay slider, ms. */
export const DELAY_RANGE_MS = { min: 10, max: 500, step: 10 } as const;
/** How soon the second challenge wants the broken-IPv6 browser connected, ms. */
const CONNECT_LIMIT_MS = 100;

export function happyEyeballsChallenges(delayMs: number): Challenge[] {
  const step = DELAY_RANGE_MS.step;
  const slow = happyEyeballs('v6-slow', delayMs);
  const slowShorter = happyEyeballs('v6-slow', delayMs - step);
  const broken = happyEyeballs('v6-broken', delayMs);
  const brokenLonger = happyEyeballs('v6-broken', delayMs + step);
  const v6Slow = RTT['v6-slow'].v6 ?? 0;
  const v4 = RTT['v6-slow'].v4;

  // 1. The shortest delay at which the slow IPv6 path (300 ms) still wins.
  const keepSlowV6 =
    slow.family === 'IPv6' && delayMs - step >= DELAY_RANGE_MS.min && slowShorter.family === 'IPv4';

  // 2. The longest delay that still connects past a broken IPv6 path within 100 ms.
  const quickPastBroken =
    broken.connectedMs <= CONNECT_LIMIT_MS &&
    delayMs + step <= DELAY_RANGE_MS.max &&
    brokenLonger.connectedMs > CONNECT_LIMIT_MS;

  return [
    {
      id: 'keep-slow-v6',
      goal: {
        en: `When IPv6 is slow (${v6Slow} ms) it loses at the recommended ${ATTEMPT_DELAY_MS} ms. Find the shortest delay, to ${step} ms, at which it still connects over IPv6.`,
        ja: `IPv6 が遅い（${v6Slow} ms）と、推奨の ${ATTEMPT_DELAY_MS} ms では IPv4 に負けます。それでも IPv6 でつながる最短の待ち時間を ${step} ms 単位で見つけてください。`,
      },
      hint: {
        en: 'IPv4 starts only after the delay, and then needs its own round trip. When is IPv4 up, compared with IPv6?',
        ja: 'IPv4 は待ち時間のあとに始まり、そこから自分の往復時間がかかります。IPv4 がつながるのは、IPv6 と比べていつでしょう。',
      },
      reached: keepSlowV6,
      why: {
        en: `With a ${delayMs} ms delay, IPv4 would be up only at ${delayMs} + ${v4} = ${delayMs + v4} ms, no sooner than IPv6 at ${slow.connectedMs} ms, so IPv6 wins. At ${delayMs - step} ms IPv4 connects first, at ${slowShorter.connectedMs} ms.`,
        ja: `待ち時間が ${delayMs} ms なら、IPv4 がつながるのは ${delayMs} + ${v4} = ${delayMs + v4} ms で、IPv6 の ${slow.connectedMs} ms より早くはないので IPv6 が勝ちます。${delayMs - step} ms では IPv4 が ${slowShorter.connectedMs} ms で先につながります。`,
      },
    },
    {
      id: 'quick-past-broken',
      goal: {
        en: `With IPv6 silently broken, connect within ${CONNECT_LIMIT_MS} ms, using the longest delay that does it.`,
        ja: `IPv6 が黙って届かないとき、${CONNECT_LIMIT_MS} ms 以内につながるようにしてください。そのうえで、待ち時間はできるだけ長くします。`,
      },
      hint: {
        en: 'When IPv6 never answers, what is the whole time to connect made of?',
        ja: 'IPv6 がまったく答えないとき、つながるまでの時間は何と何の合計でしょう。',
      },
      reached: quickPastBroken,
      why: {
        en: `A dead IPv6 path makes the delay pure waiting: ${delayMs} ms + IPv4's ${RTT['v6-broken'].v4} ms round trip = ${broken.connectedMs} ms (${delayMs + step} ms would give ${brokenLonger.connectedMs} ms). The cost of a short delay: the ${v6Slow} ms IPv6 path now loses to IPv4 (${slow.family}, ${slow.connectedMs} ms), the trade-off behind RFC 8305's recommended ${ATTEMPT_DELAY_MS} ms.`,
        ja: `IPv6 の経路が止まっていると、待ち時間はただの待ちになります。${delayMs} ms + IPv4 の往復 ${RTT['v6-broken'].v4} ms = ${broken.connectedMs} ms です（${delayMs + step} ms なら ${brokenLonger.connectedMs} ms）。短い待ち時間の代償として、${v6Slow} ms の IPv6 は IPv4 に負けます（${slow.family}、${slow.connectedMs} ms）。RFC 8305 が推奨する ${ATTEMPT_DELAY_MS} ms は、この釣り合いから来ています。`,
      },
    },
  ];
}
