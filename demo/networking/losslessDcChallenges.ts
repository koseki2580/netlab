/**
 * The lossless data-centre lesson's challenges (REQ-449): goals reached with
 * the headroom card's cable and headroom sliders. Every `reached` and every
 * number in `why` comes from the PFC simulation in losslessDc.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { DEFAULT_CONFIG, headroomFrames, simulate, type IncastOutcome } from './losslessDc';

/** The sliders' ranges, shared with the lesson page. */
export const CABLE_RANGE = { min: 24, max: 192, step: 24 } as const;
export const HEADROOM_RANGE = { min: 0, max: 18 } as const;

export interface HeadroomSetting {
  readonly cable: number;
  readonly headroom: number;
}

const LONG_CABLE = CABLE_RANGE.max;
const MID_CABLE = DEFAULT_CONFIG.cableMetres;

const run = (cable: number, headroom: number): IncastOutcome =>
  simulate('pfc', { ...DEFAULT_CONFIG, cableMetres: cable, headroomFrames: headroom });

/** XOFF level for this headroom: the buffer minus every incast port's reserve. */
const xoffOf = (headroom: number) =>
  Math.max(0, DEFAULT_CONFIG.bufferFrames - DEFAULT_CONFIG.senders * headroom);

export function losslessDcChallenges({ cable, headroom }: HeadroomSetting): Challenge[] {
  const now = run(cable, headroom);
  const less = headroom > HEADROOM_RANGE.min ? run(cable, headroom - 1) : null;
  const more = headroom < HEADROOM_RANGE.max ? run(cable, headroom + 1) : null;
  const longer = cable < CABLE_RANGE.max ? run(cable + CABLE_RANGE.step, headroom) : null;

  // 1. At 192 m, the smallest headroom that drops nothing.
  const smallestAtLong = cable === LONG_CABLE && now.drops === 0 && less !== null && less.drops > 0;

  // 2. At 96 m, no drop and the most of V's turns over every headroom the slider offers.
  let bestInnocent = -1;
  for (let h = HEADROOM_RANGE.min; h <= HEADROOM_RANGE.max; h += 1) {
    const outcome = run(MID_CABLE, h);
    if (outcome.drops === 0) bestInnocent = Math.max(bestInnocent, outcome.innocentSent);
  }
  const kindestToV = cable === MID_CABLE && now.drops === 0 && now.innocentSent === bestInnocent;

  // 3. With the default headroom, the longest cable that drops nothing.
  const longestProtected =
    headroom === DEFAULT_CONFIG.headroomFrames &&
    now.drops === 0 &&
    longer !== null &&
    longer.drops > 0;

  return [
    {
      id: 'smallest-headroom',
      goal: {
        en: `With a ${LONG_CABLE} m cable, find the smallest headroom per port that loses no frame.`,
        ja: `${LONG_CABLE} m のケーブルで、フレームを 1 つも失わない最小のポートごとのヘッドルームを見つけてください。`,
      },
      hint: {
        en: 'After the switch sends PAUSE, what is still on its way to the switch, and how does that grow with the cable?',
        ja: 'スイッチが PAUSE を送ったあとも、まだスイッチへ向かっているものは何でしょう。ケーブルが長いとそれはどう変わりますか。',
      },
      reached: smallestAtLong,
      why: {
        en: `At ${cable} m the frames still on the cable after a PAUSE fit in ${headroom} frames per port, and none is dropped; with ${headroom - 1} frames, ${less?.drops ?? 0} are dropped. The simplified estimate asks for ${headroomFrames(cable)}; this switch needed ${headroom}.`,
        ja: `${cable} m では、PAUSE のあとケーブル上に残るフレームがポートごと ${headroom} フレームに収まり、ドロップは 0 です。${headroom - 1} フレームでは ${less?.drops ?? 0} フレームが捨てられます。簡略化した見積もりは ${headroomFrames(cable)} フレームですが、このスイッチで要ったのは ${headroom} フレームでした。`,
      },
    },
    {
      id: 'kindest-to-v',
      goal: {
        en: `With the ${MID_CABLE} m cable, lose no frame and let V through on as many of its turns as you can.`,
        ja: `${MID_CABLE} m のケーブルのまま、フレームを 1 つも失わずに、V ができるだけ多く送れるようにしてください。`,
      },
      hint: {
        en: 'Headroom comes out of the same buffer. What does more of it do to the level at which the switch starts pausing?',
        ja: 'ヘッドルームは同じバッファから取られます。増やすと、スイッチが PAUSE を始める水位はどうなるでしょう。',
      },
      reached: kindestToV,
      why: {
        en: `${headroom} frames per port puts XOFF at ${xoffOf(headroom)} of ${DEFAULT_CONFIG.bufferFrames} frames, so the switch pauses as late as it safely can: no drop, and V got ${now.innocentSent} of its ${now.innocentMax} turns${more ? ` (${more.innocentSent} with ${headroom + 1} frames)` : ''}${less ? `; with ${headroom - 1} frames, ${less.drops} frames are dropped` : ''}.`,
        ja: `ポートごと ${headroom} フレームなら XOFF は ${DEFAULT_CONFIG.bufferFrames} フレーム中 ${xoffOf(headroom)} で、安全な範囲でいちばん遅く PAUSE します。ドロップはなく、V は ${now.innocentMax} 回のうち ${now.innocentSent} 回送れました${more ? `（${headroom + 1} フレームでは ${more.innocentSent} 回）` : ''}${less ? `。${headroom - 1} フレームにすると ${less.drops} フレームが捨てられます` : ''}。`,
      },
    },
    {
      id: 'longest-cable',
      goal: {
        en: `Keep the headroom at ${DEFAULT_CONFIG.headroomFrames} frames and find the longest cable it still protects (no frame lost).`,
        ja: `ヘッドルームを ${DEFAULT_CONFIG.headroomFrames} フレームのまま、まだフレームを失わない最長のケーブルを見つけてください。`,
      },
      hint: {
        en: 'Each step of cable adds frames in flight, both while the PAUSE travels out and while the last frames travel back.',
        ja: 'ケーブルが長くなるほど、PAUSE が届くまでの間と、最後のフレームが戻ってくるまでの間に線路上にあるフレームが増えます。',
      },
      reached: longestProtected,
      why: {
        en: `At ${cable} m, ${headroom} frames of headroom hold what is on the cable: 0 dropped. At ${cable + CABLE_RANGE.step} m, ${longer?.drops ?? 0} frames are dropped.`,
        ja: `${cable} m では ${headroom} フレームのヘッドルームにケーブル上のフレームが収まり、ドロップは 0 です。${cable + CABLE_RANGE.step} m にすると ${longer?.drops ?? 0} フレームが捨てられます。`,
      },
    },
  ];
}
