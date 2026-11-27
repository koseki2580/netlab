/**
 * The BGP graceful restart lesson's challenges (REQ-449): goals reached with
 * the control-plane restart's two sliders, how long the session takes to come
 * back and the Restart Time R1 advertises. Every `reached` and every number in
 * `why` comes from the model in bgpGracefulRestart.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { LESSON_DEFAULTS, scenario, simulate } from './bgpGracefulRestart';

export interface RestartTuning {
  /** Until the session is back up, ms. */
  readonly cpRestartMs: number;
  /** The Restart Time R1 advertises, ms. */
  readonly restartTimeMs: number;
}

/** The sliders' steps, ms. */
const CP_STEP_MS = 15_000;
const RT_STEP_MS = 30_000;
/** The slow restart of the second challenge, ms. */
const SLOW_RESTART_MS = 180_000;
/** How much GR must still save in the third challenge, ms. */
const SAVED_MS = 60_000;

const secs = (ms: number) => Number((ms / 1000).toFixed(1));
const run = (gr: boolean, tuning: RestartTuning) => simulate(scenario({ gr, ...tuning }));

export function bgpGracefulRestartChallenges(tuning: RestartTuning): Challenge[] {
  const d = LESSON_DEFAULTS;
  const gr = run(true, tuning);
  const noGr = run(false, tuning);
  const laterSession = run(true, { ...tuning, cpRestartMs: tuning.cpRestartMs + CP_STEP_MS });
  const shorterRt = run(true, { ...tuning, restartTimeMs: tuning.restartTimeMs - RT_STEP_MS });
  const saved = noGr.lossMs - gr.lossMs;

  // 1. Restart Time as advertised by default; the slowest session that GR still covers.
  const longestSafe =
    tuning.restartTimeMs === d.restartTimeMs && gr.lossMs === 0 && laterSession.lossMs > 0;

  // 2. A 180 s restart; the shortest Restart Time that still loses nothing.
  const shortestRt =
    tuning.cpRestartMs === SLOW_RESTART_MS && gr.lossMs === 0 && shorterRt.lossMs > 0;

  // 3. GR loses traffic, yet saves exactly 60 s compared with no GR.
  const savesSixty = gr.lossMs > 0 && saved === SAVED_MS;

  return [
    {
      id: 'longest-safe-restart',
      goal: {
        en: `Keep the Restart Time at ${secs(d.restartTimeMs)} s and find the longest time for the session to come back, to ${secs(CP_STEP_MS)} s, with which GR still loses no traffic.`,
        ja: `Restart Time は ${secs(d.restartTimeMs)} 秒のままで、GR でも通信が失われない、セッションが戻るまでの最長の時間を ${secs(CP_STEP_MS)} 秒単位で見つけてください。`,
      },
      hint: {
        en: 'What does the helper do with the stale routes if the session is not back in time, and from when does that time count?',
        ja: 'セッションが期限までに戻らないと、ヘルパーは stale の経路をどうしますか。その期限はいつから数えるでしょう。',
      },
      reached: longestSafe,
      why: {
        en: `The session is back at ${secs(tuning.cpRestartMs)} s, within the ${secs(tuning.restartTimeMs)} s Restart Time, so R2 keeps the stale routes until End-of-RIB at ${secs(gr.refreshedMs ?? 0)} s and loses nothing. Back at ${secs(tuning.cpRestartMs + CP_STEP_MS)} s, R2 deletes the stale routes at ${secs(laterSession.deletedMs ?? 0)} s and ${secs(laterSession.lossMs)} s is lost until End-of-RIB at ${secs(laterSession.refreshedMs ?? 0)} s.`,
        ja: `セッションは ${secs(tuning.cpRestartMs)} 秒で戻り、Restart Time ${secs(tuning.restartTimeMs)} 秒以内なので、R2 は ${secs(gr.refreshedMs ?? 0)} 秒の End-of-RIB まで stale の経路を残し、通信は失われません。${secs(tuning.cpRestartMs + CP_STEP_MS)} 秒で戻ると、R2 は ${secs(laterSession.deletedMs ?? 0)} 秒に stale の経路を消し、${secs(laterSession.refreshedMs ?? 0)} 秒の End-of-RIB まで ${secs(laterSession.lossMs)} 秒の断になります。`,
      },
    },
    {
      id: 'shortest-restart-time',
      goal: {
        en: `Set the session to come back after ${secs(SLOW_RESTART_MS)} s, then find the shortest Restart Time with which GR loses no traffic.`,
        ja: `セッションが戻るまでを ${secs(SLOW_RESTART_MS)} 秒にしてから、GR で通信が失われない最短の Restart Time を見つけてください。`,
      },
      hint: {
        en: 'The Restart Time is a promise about one moment of the restart. Which one?',
        ja: 'Restart Time は、再起動のある瞬間についての約束です。どの瞬間でしょう。',
      },
      reached: shortestRt,
      why: {
        en: `A Restart Time of ${secs(tuning.restartTimeMs)} s covers a session that is back at ${secs(tuning.cpRestartMs)} s, so the stale routes last until End-of-RIB at ${secs(gr.refreshedMs ?? 0)} s. With ${secs(tuning.restartTimeMs - RT_STEP_MS)} s, R2 deletes them at ${secs(shorterRt.deletedMs ?? 0)} s and ${secs(shorterRt.lossMs)} s is lost. End-of-RIB may come later than the Restart Time: it only has to cover the session coming back.`,
        ja: `Restart Time ${secs(tuning.restartTimeMs)} 秒なら ${secs(tuning.cpRestartMs)} 秒で戻るセッションに間に合い、stale の経路は ${secs(gr.refreshedMs ?? 0)} 秒の End-of-RIB まで残ります。${secs(tuning.restartTimeMs - RT_STEP_MS)} 秒にすると R2 は ${secs(shorterRt.deletedMs ?? 0)} 秒に経路を消し、${secs(shorterRt.lossMs)} 秒の断になります。End-of-RIB は Restart Time より後でもかまいません。間に合えばよいのはセッションが戻ることだけです。`,
      },
    },
    {
      id: 'saves-sixty',
      goal: {
        en: `Make GR lose some traffic, yet still lose exactly ${secs(SAVED_MS)} s less than without GR.`,
        ja: `GR でも通信が失われるようにしつつ、GR なしより失われる時間がちょうど ${secs(SAVED_MS)} 秒短くなるようにしてください。`,
      },
      hint: {
        en: 'When the session is late, for how long does the helper keep forwarding on the stale routes?',
        ja: 'セッションが遅れたとき、ヘルパーは stale の経路でどれだけのあいだ転送を続けるでしょう。',
      },
      reached: savesSixty,
      why: {
        en: `Without GR, ${secs(noGr.lossMs)} s is lost, from the drop to End-of-RIB at ${secs(noGr.refreshedMs ?? 0)} s. With GR, the session is back at ${secs(tuning.cpRestartMs)} s, after the ${secs(tuning.restartTimeMs)} s Restart Time, so R2 forwards on the stale routes only until ${secs(gr.deletedMs ?? 0)} s and loses ${secs(gr.lossMs)} s. A late restart saves exactly the Restart Time: ${secs(saved)} s.`,
        ja: `GR なしでは、セッション断から ${secs(noGr.refreshedMs ?? 0)} 秒の End-of-RIB まで ${secs(noGr.lossMs)} 秒の断です。GR ありでは、セッションが戻るのは ${secs(tuning.cpRestartMs)} 秒で Restart Time ${secs(tuning.restartTimeMs)} 秒より後なので、R2 が stale の経路で転送するのは ${secs(gr.deletedMs ?? 0)} 秒までで、${secs(gr.lossMs)} 秒の断になります。遅れた再起動で GR が減らせるのは、ちょうど Restart Time の ${secs(saved)} 秒です。`,
      },
    },
  ];
}
