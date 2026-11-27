/**
 * The PLPMTUD lesson's challenges (REQ-449): goals reached with the hidden
 * path MTU slider. Every `reached` and every number in `why` comes from the
 * probe search in plpmtud.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { HEADER_BYTES, LINK_MTU, MAX_PROBES, SEARCH_STEP, search } from './plpmtud';

/** The hidden path MTU slider's range, shared with the lesson page. */
export const PATH_MTU_RANGE = { min: 1280, max: LINK_MTU, step: 4 } as const;

const SLIDER_MTUS: readonly number[] = Array.from(
  { length: (PATH_MTU_RANGE.max - PATH_MTU_RANGE.min) / PATH_MTU_RANGE.step + 1 },
  (_, index) => PATH_MTU_RANGE.min + index * PATH_MTU_RANGE.step,
);
const gapOf = (pathMtu: number) => {
  const result = search(pathMtu);
  return result.largestFitting - result.plpmtu;
};
const MOST_DATAGRAMS = Math.max(...SLIDER_MTUS.map((mtu) => search(mtu).datagrams));
const WIDEST_GAP = Math.max(...SLIDER_MTUS.map(gapOf));

export function plpmtudChallenges(pathMtu: number): Challenge[] {
  const result = search(pathMtu);
  const lostSizes = result.probes.filter((probe) => !probe.acked).length;
  const ackedSizes = result.probes.length - lostSizes;
  const gap = result.largestFitting - result.plpmtu;

  return [
    {
      id: 'exact',
      goal: {
        en: `On a path smaller than the ${LINK_MTU}-byte link, make the search settle on exactly the largest size that fits.`,
        ja: `${LINK_MTU} バイトのリンクより小さい経路で、探索がちょうど通る最大のサイズに落ち着くようにしてください。`,
      },
      hint: {
        en: 'The search only ever settles on a size it probed and saw acknowledged. Which probe sizes does it try?',
        ja: '探索が落ち着くのは、実際に試して確認応答が返ったサイズだけです。どんなサイズを試しているでしょう。',
      },
      reached: pathMtu < LINK_MTU && gap === 0,
      why: {
        en: `A ${pathMtu}-byte path fits ${result.largestFitting} bytes (${pathMtu} − ${HEADER_BYTES}), and one of the halving steps probed exactly ${result.plpmtu}: it was acknowledged, so the search settles there with nothing left over.`,
        ja: `${pathMtu} バイトの経路に通るのは ${result.largestFitting} バイト（${pathMtu} − ${HEADER_BYTES}）で、半分ずつ狭める途中のプローブがちょうど ${result.plpmtu} を試しました。確認応答が返ったので、探索は余りなくそこに落ち着きます。`,
      },
    },
    {
      id: 'costliest',
      goal: {
        en: `Find a path MTU on which the search spends the most probe packets the slider allows: ${MOST_DATAGRAMS}.`,
        ja: `探索が使うプローブのパケット数が、スライダーの範囲でいちばん多い ${MOST_DATAGRAMS} 個になる経路 MTU を見つけてください。`,
      },
      hint: {
        en: 'An acknowledged size costs one packet; what does a lost size cost?',
        ja: '確認応答が返ったサイズはパケット 1 個で済みます。失われたサイズはいくつ使うでしょう。',
      },
      reached: result.datagrams === MOST_DATAGRAMS,
      why: {
        en: `On a ${pathMtu}-byte path ${lostSizes} of the ${result.probes.length} sizes are lost and each is tried ${MAX_PROBES} times, while ${ackedSizes} ${ackedSizes === 1 ? 'is' : 'are'} acknowledged at once: ${lostSizes} × ${MAX_PROBES} + ${ackedSizes} = ${result.datagrams} packets.`,
        ja: `${pathMtu} バイトの経路では ${result.probes.length} サイズのうち ${lostSizes} サイズが失われ、それぞれ ${MAX_PROBES} 回送られます。確認応答が返る ${ackedSizes} サイズは 1 回ずつなので、${lostSizes} × ${MAX_PROBES} + ${ackedSizes} = ${result.datagrams} 個です。`,
      },
    },
    {
      id: 'widest-gap',
      goal: {
        en: 'Find a path MTU on which the search ends the furthest below the largest size that fits.',
        ja: '探索の結果が、通る最大のサイズからいちばん大きく下回る経路 MTU を見つけてください。',
      },
      hint: {
        en: `The search stops once bad − good ≤ ${SEARCH_STEP}. How far below “bad” can the size that fits be?`,
        ja: `探索は 不可 − 良 ≤ ${SEARCH_STEP} で止まります。通る最大のサイズは「不可」よりどれだけ下にありえるでしょう。`,
      },
      reached: gap === WIDEST_GAP,
      why: {
        en: `On a ${pathMtu}-byte path the search settles at ${result.plpmtu} bytes while ${result.largestFitting} would fit: ${gap} bytes short. It stops as soon as the gap between good and bad is ${SEARCH_STEP} bytes or less, and here the size that fits sits just under bad.`,
        ja: `${pathMtu} バイトの経路では、通る最大は ${result.largestFitting} バイトなのに探索は ${result.plpmtu} バイトに落ち着き、${gap} バイト足りません。良と不可の差が ${SEARCH_STEP} バイト以下になった時点で止まり、ここでは通る最大のサイズが不可のすぐ下にあるからです。`,
      },
    },
  ];
}
