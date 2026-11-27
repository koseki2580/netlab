/**
 * Challenges for the MAC learning lesson (REQ-449): goals reached with the
 * ageing part's controls, each checked by the switch model.
 */
import type { Challenge } from '../components/LessonChallenges';
import { AGEING_TIME_S, HOSTS, agedScene, type Step } from './macLearning';

/** The ageing part's controls: how long A is silent, and the switch's ageing time. */
export interface MacLearningChallengeState {
  readonly idleS: number;
  readonly ageingS: number;
}

/** The silence the lesson asks about, seconds. */
export const ASKED_IDLE_S = 400;
/** The silence slider. */
export const IDLE_RANGE_S = { min: 10, max: 600, step: 10 } as const;
/** The ageing-time slider. */
export const AGEING_RANGE_S = { min: 30, max: 600, step: 30 } as const;
/** The third challenge's silence limit, seconds. */
export const SHORT_SILENCE_S = 60;

/** Settings that reach each challenge, used to explain one that is remembered but no longer set. */
const REACHING = {
  keep: { idleS: ASKED_IDLE_S, ageingS: 420 },
  longest: { idleS: 290, ageingS: AGEING_TIME_S },
  flood: { idleS: SHORT_SILENCE_S, ageingS: SHORT_SILENCE_S },
} as const satisfies Record<string, MacLearningChallengeState>;

const frame = (state: MacLearningChallengeState): Step => agedScene(state.idleS, state.ageingS);
const ports = (step: Step) => step.egress.join(', ');

function keepsAfterAsked(state: MacLearningChallengeState): boolean {
  return state.idleS === ASKED_IDLE_S && frame(state).kind === 'forward';
}

function isLongestSilence(state: MacLearningChallengeState): boolean {
  return (
    state.ageingS === AGEING_TIME_S &&
    frame(state).kind === 'forward' &&
    frame({ ...state, idleS: state.idleS + IDLE_RANGE_S.step }).kind === 'flood'
  );
}

function floodsSoon(state: MacLearningChallengeState): boolean {
  return state.idleS <= SHORT_SILENCE_S && frame(state).kind === 'flood';
}

export function macLearningChallenges(state: MacLearningChallengeState): Challenge[] {
  const keep = keepsAfterAsked(state) ? state : REACHING.keep;
  const keepStep = frame(keep);
  const entryA = keepStep.tableBefore.find((entry) => entry.mac === HOSTS.A.mac)!;
  const entryAge = keepStep.atS - entryA.lastSeenS;

  const longest = isLongestSilence(state) ? state : REACHING.longest;
  const longestStep = frame(longest);
  const nextIdleS = longest.idleS + IDLE_RANGE_S.step;
  const nextStep = frame({ ...longest, idleS: nextIdleS });

  const flood = floodsSoon(state) ? state : REACHING.flood;
  const floodStep = frame(flood);

  return [
    {
      id: 'keep-entry',
      goal: {
        en: `Keeping A silent for ${ASKED_IDLE_S} s, make B → A leave by A’s port only, by changing the ageing time.`,
        ja: `A が黙っている時間は ${ASKED_IDLE_S} 秒のまま、エージングタイムを変えて、B → A が A のポートからだけ出るようにしてください。`,
      },
      hint: {
        en: 'An entry is removed once it has gone unrefreshed for the ageing time. How old is A’s entry when B sends?',
        ja: 'エントリは、エージングタイムの間更新されないと消されます。B が送るとき、A のエントリはどれくらい古いでしょうか？',
      },
      reached: keepsAfterAsked(state),
      why: {
        en: `A’s entry was last refreshed ${entryAge} s before B sends, under the ${keep.ageingS} s ageing time, so it is still in the table and B → A leaves by port ${ports(keepStep)} only. A long ageing time floods less, but a host that moves silently is sent to its old port for longer.`,
        ja: `A のエントリが最後に更新されたのは B が送る ${entryAge} 秒前で、エージングタイムの ${keep.ageingS} 秒より短いので、まだテーブルにあります。そのため B → A はポート ${ports(keepStep)} からだけ出ます。エージングタイムが長いとフラッディングは減りますが、黙って移動したホストへは古いポートに送られる時間が長くなります。`,
      },
    },
    {
      id: 'longest-silence',
      goal: {
        en: `With the default ${AGEING_TIME_S} s ageing time, find the longest silence on the slider after which B → A still leaves by one port only.`,
        ja: `エージングタイムは既定の ${AGEING_TIME_S} 秒のままで、B → A がまだ 1 つのポートからだけ出る、スライダーでいちばん長い沈黙を見つけてください。`,
      },
      hint: {
        en: 'Is an entry exactly as old as the ageing time still in the table?',
        ja: 'ちょうどエージングタイムと同じだけ古いエントリは、まだテーブルに残っているでしょうか？',
      },
      reached: isLongestSilence(state),
      why: {
        en: `After ${longest.idleS} s, A’s entry is younger than ${longest.ageingS} s and B → A leaves by port ${ports(longestStep)} only. After ${nextIdleS} s it has reached the ageing time, is removed, and B → A floods out of ports ${ports(nextStep)}.`,
        ja: `${longest.idleS} 秒後なら A のエントリは ${longest.ageingS} 秒より新しく、B → A はポート ${ports(longestStep)} からだけ出ます。${nextIdleS} 秒後にはエージングタイムに達して消され、B → A はポート ${ports(nextStep)} へフラッディングされます。`,
      },
    },
    {
      id: 'flood-soon',
      goal: {
        en: `Make the switch flood B → A after a silence of ${SHORT_SILENCE_S} s or less.`,
        ja: `沈黙が ${SHORT_SILENCE_S} 秒以下でも、スイッチが B → A をフラッディングするようにしてください。`,
      },
      hint: {
        en: 'Which setting decides how long a switch remembers a host that says nothing?',
        ja: '何も送らないホストをスイッチがどれだけ覚えているかを決める設定はどれでしょうか？',
      },
      reached: floodsSoon(state),
      why: {
        en: `With a ${flood.ageingS} s ageing time, ${flood.idleS} s of silence is enough to remove A’s entry, so B → A floods out of ports ${ports(floodStep)}, as on a fresh switch. A short ageing time follows moved hosts quickly, at the price of flooding quiet ones.`,
        ja: `エージングタイムが ${flood.ageingS} 秒なら、${flood.idleS} 秒の沈黙で A のエントリが消えるので、電源を入れた直後と同じく B → A はポート ${ports(floodStep)} へフラッディングされます。エージングタイムが短いと移動したホストにすぐ追いつけますが、静かなホストあてのフレームがフラッディングされます。`,
      },
    },
  ];
}
