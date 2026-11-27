/**
 * Challenges for the DHCP lease lesson (REQ-449): goals reached with the
 * lesson's own controls, each checked by the lease model.
 */
import type { Challenge } from '../components/LessonChallenges';
import { simulateLease, type LeaseOutcome } from './dhcpLease';

const H = 3600;

/** The lesson's controls after the reveal (A's death time as the page applies it). */
export interface DhcpLeaseChallengeState {
  readonly leaseH: number;
  readonly downH: number;
  readonly serverB: boolean;
}

/** How long the laptop must keep working with only server A, after A dies, hours. */
export const SURVIVE_H = 20;
/** The lease length the second challenge keeps fixed (the one the lesson asked about), hours. */
export const KEPT_LEASE_H = 8;
/** How soon after A dies the laptop must notice, hours. */
export const NOTICE_WITHIN_H = 0.5;
/** How soon after A dies server B must take over, hours. */
export const TAKEOVER_WITHIN_H = 1.5;

/** Settings that reach each challenge, used to explain one that is remembered but no longer set. */
const REACHING = {
  survive: { leaseH: 24, downH: 1, serverB: false },
  notice: { leaseH: KEPT_LEASE_H, downH: 3.5, serverB: false },
  takeover: { leaseH: 2, downH: 1, serverB: true },
} as const satisfies Record<string, DhcpLeaseChallengeState>;

const simulate = (state: DhcpLeaseChallengeState): LeaseOutcome =>
  simulateLease({ leaseS: state.leaseH * H, serverDownS: state.downH * H, serverB: state.serverB });

/** Hours, as the lesson shows them: 23.5. */
const h = (s: number) => Number((s / H).toFixed(2));

/** Seconds the client keeps its address after A dies, or null when it never loses it. */
function survivedS(state: DhcpLeaseChallengeState): number | null {
  const outcome = simulate(state);
  return outcome.addressLostS === null ? null : outcome.addressLostS - state.downH * H;
}

function noticeS(state: DhcpLeaseChallengeState): number {
  return simulate(state).firstUnansweredS - state.downH * H;
}

/** When server B answered the rebind, or null when it did not. */
function takeoverAtS(state: DhcpLeaseChallengeState): number | null {
  const answer = simulate(state).events.find((e) => e.kind === 'rebind' && e.answeredBy === 'B');
  return answer ? answer.atS : null;
}

function survives(state: DhcpLeaseChallengeState): boolean {
  const kept = survivedS(state);
  return !state.serverB && kept !== null && kept >= SURVIVE_H * H;
}

function noticesSoon(state: DhcpLeaseChallengeState): boolean {
  return !state.serverB && state.leaseH === KEPT_LEASE_H && noticeS(state) <= NOTICE_WITHIN_H * H;
}

function takesOverSoon(state: DhcpLeaseChallengeState): boolean {
  const at = takeoverAtS(state);
  return at !== null && at - state.downH * H <= TAKEOVER_WITHIN_H * H;
}

export function dhcpLeaseChallenges(state: DhcpLeaseChallengeState): Challenge[] {
  const survive = survives(state) ? state : REACHING.survive;
  const surviveOutcome = simulate(survive);
  const survivedH = h(survivedS(survive)!);

  const notice = noticesSoon(state) ? state : REACHING.notice;
  const noticeOutcome = simulate(notice);

  const takeover = takesOverSoon(state) ? state : REACHING.takeover;
  const takeoverAt = takeoverAtS(takeover)!;

  return [
    {
      id: 'survive-outage',
      goal: {
        en: `With server A as the only server, keep the laptop’s address for at least ${SURVIVE_H} h after A dies.`,
        ja: `サーバ A だけの状態で、A が止まってから ${SURVIVE_H} 時間以上ノート PC がアドレスを使い続けられるようにしてください。`,
      },
      hint: {
        en: 'With no server answering at all, what decides how long the client may keep using the address?',
        ja: 'どのサーバも応えないとき、クライアントがアドレスを使い続けられる長さを決めるのは何でしょうか？',
      },
      reached: survives(state),
      why: {
        en: `The ${survive.leaseH} h lease in force when A died at ${survive.downH} h runs out at ${h(surviveOutcome.addressLostS!)} h, so the laptop works for ${survivedH} h with no server at all. A longer lease rides out a longer outage, but an address given to a departed client stays taken that much longer too.`,
        ja: `A が ${survive.downH} 時間後に止まったときに有効だった ${survive.leaseH} 時間のリースは ${h(surviveOutcome.addressLostS!)} 時間後に切れるので、ノート PC はサーバなしで ${survivedH} 時間使えます。リースが長いほど長い停止に耐えられますが、いなくなったクライアントのアドレスもそれだけ長くふさがったままになります。`,
      },
    },
    {
      id: 'notice-soon',
      goal: {
        en: `Keeping the ${KEPT_LEASE_H} h lease and only server A, choose when A dies so that the laptop notices within ${NOTICE_WITHIN_H * 60} minutes.`,
        ja: `${KEPT_LEASE_H} 時間のリースとサーバ A だけのまま、A が止まる時刻を選んで、ノート PC が ${NOTICE_WITHIN_H * 60} 分以内に気づくようにしてください。`,
      },
      hint: {
        en: 'The laptop learns that A is gone only when it next speaks to A. When is that?',
        ja: 'ノート PC が A の停止を知るのは、次に A に話しかけたときだけです。それはいつでしょうか？',
      },
      reached: noticesSoon(state),
      why: {
        en: `A dies at ${notice.downH} h and the laptop’s next renew, at T1 of its current lease, goes unanswered at ${h(noticeOutcome.firstUnansweredS)} h: ${h(noticeOutcome.firstUnansweredS - notice.downH * H) * 60} minutes later. Dying just before a renewal is noticed at once; dying just after one goes unseen for half a lease.`,
        ja: `A は ${notice.downH} 時間後に止まり、今のリースの T1 にあたる次の更新が ${h(noticeOutcome.firstUnansweredS)} 時間後に応答なしになります。止まってから ${h(noticeOutcome.firstUnansweredS - notice.downH * H) * 60} 分です。更新の直前に止まればすぐ気づかれ、直後に止まるとリースの半分の間気づかれません。`,
      },
    },
    {
      id: 'quick-takeover',
      goal: {
        en: `With server B on the network, get the laptop onto B’s lease within ${TAKEOVER_WITHIN_H} h of A dying.`,
        ja: `サーバ B もいる状態で、A が止まってから ${TAKEOVER_WITHIN_H} 時間以内にノート PC が B のリースに移るようにしてください。`,
      },
      hint: {
        en: 'B never answers a renew sent to A. At what point in the lease does the client first ask everyone?',
        ja: 'B は A あての更新には応えません。クライアントが初めて全員に尋ねるのは、リースのどの時点でしょうか？',
      },
      reached: takesOverSoon(state),
      why: {
        en: `B answers only the broadcast rebind, sent at T2, 7/8 of the lease. With a ${takeover.leaseH} h lease and A dying at ${takeover.downH} h, B answers at ${h(takeoverAt)} h, ${h(takeoverAt - takeover.downH * H)} h after A died. A shorter lease brings T2 sooner, at the price of more renewals.`,
        ja: `B が応えるのは T2（リースの 7/8）に送るブロードキャストの再バインドだけです。リースが ${takeover.leaseH} 時間で A が ${takeover.downH} 時間後に止まると、B は ${h(takeoverAt)} 時間後に応え、A の停止から ${h(takeoverAt - takeover.downH * H)} 時間です。リースを短くすると T2 が早く来ますが、そのぶん更新が増えます。`,
      },
    },
  ];
}
