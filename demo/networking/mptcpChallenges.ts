/**
 * The Multipath TCP lesson's challenges (REQ-449): goals reached with the
 * lesson's own controls (when Wi-Fi is lost, MP_CAPABLE kept or stripped, the
 * number of subflows, coupled or not). Every `reached` and every number in
 * `why` comes from the model in mptcp.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { FILE_MB, LTE, WIFI, bottleneckShares, failover } from './mptcp';

/** The lesson's controls. */
export interface MptcpState {
  /** When Wi-Fi is lost, s (the slider: 1..12). */
  readonly lossAtS: number;
  /** Did a middlebox strip MP_CAPABLE? */
  readonly stripped: boolean;
  /** MPTCP subflows on the shared bottleneck (1..4). */
  readonly subflows: number;
  /** Coupled congestion control (LIA)? */
  readonly coupled: boolean;
}

/** The moment the lesson asks about, s. */
export const ASKED_LOSS_S = 4;
/** The subflow count of the fairness challenge. */
const MANY_SUBFLOWS = 4;

export function mptcpChallenges(state: MptcpState): Challenge[] {
  const now = failover('mptcp', state.lossAtS, !state.stripped);

  // 1. Wi-Fi still lost at 4 s, and the MPTCP download breaks.
  const breaks = state.lossAtS === ASKED_LOSS_S && !now.finished;

  // 2. With MP_CAPABLE kept: the earliest whole second at which the file is already complete.
  const doneBefore = (s: number) => {
    const outcome = failover('mptcp', s, true);
    return outcome.finished && outcome.afterLossSeconds === null;
  };
  const earliestDone =
    !state.stripped &&
    doneBefore(state.lossAtS) &&
    (state.lossAtS === 1 || !doneBefore(state.lossAtS - 1));
  const secondBefore = failover('mptcp', Math.max(1, state.lossAtS - 1), true);

  // 3. Four subflows, no more than the regular TCP flow gets.
  const shares = bottleneckShares(state.subflows, state.coupled);
  const uncoupled = bottleneckShares(state.subflows, false);
  const fair = state.subflows === MANY_SUBFLOWS && shares.mptcpMbps <= shares.tcpMbps;

  return [
    {
      id: 'break-it',
      goal: {
        en: `Keep Wi-Fi lost at ${ASKED_LOSS_S} s and make the MPTCP download fail anyway.`,
        ja: `Wi-Fi が切れるのは ${ASKED_LOSS_S} 秒のままで、MPTCP のダウンロードを失敗させてください。`,
      },
      hint: {
        en: 'MPTCP has to be agreed before the second subflow can exist. Where is it agreed, and what can stop that?',
        ja: '2 本目のサブフローを作るには、先に MPTCP を使うと合意していなければなりません。合意はどこで行われ、何がそれを妨げられるでしょう。',
      },
      reached: breaks,
      why: {
        en: `A middlebox removed MP_CAPABLE from the handshake, so it ended as plain TCP over Wi-Fi alone (${now.mbpsBefore} Mbit/s) and no LTE subflow was ever opened. At ${state.lossAtS} s only ${now.mbAtLoss} MB of ${FILE_MB} MB had arrived, and with Wi-Fi gone the connection has no path left.`,
        ja: `中間装置がハンドシェイクから MP_CAPABLE を取り除いたので、接続は Wi-Fi だけのふつうの TCP（${now.mbpsBefore} Mbit/s）として始まり、LTE のサブフローは一度も開かれませんでした。${state.lossAtS} 秒の時点で届いていたのは ${FILE_MB} MB のうち ${now.mbAtLoss} MB だけで、Wi-Fi が消えると接続に残る経路はありません。`,
      },
    },
    {
      id: 'done-before-loss',
      goal: {
        en: 'With MP_CAPABLE arriving, find the earliest whole second at which Wi-Fi can be lost and the download is already complete.',
        ja: 'MP_CAPABLE が届く状態で、Wi-Fi が切れてもダウンロードがすでに終わっている、いちばん早い時刻（1 秒単位）を見つけてください。',
      },
      hint: {
        en: 'While both subflows are full, how fast does the file arrive, and how long does it take at that rate?',
        ja: '2 本のサブフローがどちらも埋まっているとき、ファイルはどれだけの速さで届き、その速さで何秒かかるでしょう。',
      },
      reached: earliestDone,
      why: {
        en: `Both subflows together carry ${WIFI.mbps} + ${LTE.mbps} = ${now.mbpsBefore} Mbit/s, so the ${FILE_MB} MB (${FILE_MB * 8} Mbit) are complete at ${now.finishSeconds} s, before Wi-Fi goes at ${state.lossAtS} s. One second earlier, at ${state.lossAtS - 1} s, only ${secondBefore.mbAtLoss} MB had arrived.`,
        ja: `2 本のサブフローは合わせて ${WIFI.mbps} + ${LTE.mbps} = ${now.mbpsBefore} Mbit/s で運ぶので、${FILE_MB} MB（${FILE_MB * 8} Mbit）は ${now.finishSeconds} 秒でそろい、${state.lossAtS} 秒に Wi-Fi が切れる前に終わっています。1 秒早い ${state.lossAtS - 1} 秒では、まだ ${secondBefore.mbAtLoss} MB しか届いていません。`,
      },
    },
    {
      id: 'fair-four',
      goal: {
        en: `With ${MANY_SUBFLOWS} MPTCP subflows on the shared bottleneck, make MPTCP get no more than the regular TCP flow.`,
        ja: `共有ボトルネックで MPTCP のサブフローを ${MANY_SUBFLOWS} 本にしたまま、MPTCP の取り分をふつうの TCP フロー以下にしてください。`,
      },
      hint: {
        en: 'Each subflow on its own behaves like a full TCP flow. What would make them grow their windows as one?',
        ja: 'サブフローがそれぞれ独立していると、1 本ずつが TCP フロー 1 本分としてふるまいます。ウィンドウを 1 本分として増やさせるには何が必要でしょう。',
      },
      reached: fair,
      why: {
        en: `Coupled (LIA), the ${state.subflows} subflows together settle at ${shares.mptcpWindow} segments, the same as the TCP flow’s ${shares.tcpWindow}: MPTCP ${shares.mptcpMbps} Mbit/s, TCP ${shares.tcpMbps} Mbit/s. Uncoupled, the same ${state.subflows} subflows would take ${uncoupled.mptcpPct} % (${uncoupled.mptcpMbps} Mbit/s).`,
        ja: `連携（LIA）させると、${state.subflows} 本のサブフローは合わせて ${shares.mptcpWindow} セグメントに落ち着き、TCP フローの ${shares.tcpWindow} セグメントと同じになります。MPTCP は ${shares.mptcpMbps} Mbit/s、TCP は ${shares.tcpMbps} Mbit/s です。連携させなければ、同じ ${state.subflows} 本で ${uncoupled.mptcpPct} %（${uncoupled.mptcpMbps} Mbit/s）を取っていました。`,
      },
    },
  ];
}
