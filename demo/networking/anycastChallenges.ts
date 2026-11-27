/**
 * The anycast lesson's challenges (REQ-449): goals reached with the lesson's
 * own controls (which site is withdrawn, which resolver the users ask). Every
 * `reached` and every number in `why` comes from the BGP and DNS models in
 * anycast.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { SITES, UNICAST, dnsSteer, routeFor, type Resolver, type SiteId } from './anycast';

export interface AnycastState {
  /** The withdrawn site, or null when all three announce the prefix. */
  readonly down: SiteId | null;
  readonly resolver: Resolver;
}

/** Under this round trip, ms, the Singapore user counts as served nearby. */
export const NEAR_RTT_MS = 100;

const CITY: Record<SiteId, readonly [string, string]> = {
  'site-tyo': ['Tokyo', '東京'],
  'site-fra': ['Frankfurt', 'フランクフルト'],
  'site-nyc': ['New York', 'ニューヨーク'],
};

export function anycastChallenges({ down, resolver }: AnycastState): Challenge[] {
  const live = SITES.filter((site) => site !== down);
  const sgAll = routeFor('isp-sg')!;
  const sg = routeFor('isp-sg', live)!;

  // 1. Withdraw one site so the Singapore user's round trip falls under 100 ms.
  const sgNear = down !== null && sg.rttMs < NEAR_RTT_MS;

  // 2. Keep the public London resolver, and still steer Osaka to its anycast site.
  const osakaAnycast = routeFor('isp-osaka')!;
  const osakaDns = dnsSteer('isp-osaka', resolver);
  const osakaFromLondon = dnsSteer('isp-osaka', 'public-london');
  const osakaFitted = resolver !== 'own' && osakaDns.server === osakaAnycast.site;

  return [
    {
      id: 'singapore-near',
      goal: {
        en: `Withdraw one site so that the Singapore user’s round trip falls under ${NEAR_RTT_MS} ms.`,
        ja: `拠点を 1 つ取り下げて、シンガポールの利用者の往復を ${NEAR_RTT_MS} ms 未満にしてください。`,
      },
      hint: {
        en: 'BGP picks the shortest AS path, not the fastest. Which announcement makes the slow path the shortest one?',
        ja: 'BGP が選ぶのは速い経路ではなく、AS パスの短い経路です。遅い経路をいちばん短くしているのは、どの拠点の広告でしょう。',
      },
      reached: sgNear,
      why: {
        en: `With ${CITY[down ?? 'site-fra'][0]} withdrawn, the global carrier no longer hears the ${sgAll.asPath.length}-AS path (${sgAll.asPath.join(' ')}); its shortest remaining route is ${sg.asPath.join(' ')}, to ${CITY[sg.site][0]}. The round trip falls from ${sgAll.rttMs} ms to ${sg.rttMs} ms: taking a site away made this user faster.`,
        ja: `${CITY[down ?? 'site-fra'][1]}を取り下げると、国際キャリアには AS ${sgAll.asPath.length} 個の経路（${sgAll.asPath.join(' ')}）が聞こえなくなり、残る最短の経路は ${CITY[sg.site][1]}への ${sg.asPath.join(' ')} です。往復は ${sgAll.rttMs} ms から ${sg.rttMs} ms に縮みます。拠点を減らしたことで、この利用者は速くなりました。`,
      },
    },
    {
      id: 'osaka-through-london',
      goal: {
        en: `Keep Osaka on the public resolver in London, and still have DNS send it to the same site anycast does (${CITY[osakaAnycast.site][0]}).`,
        ja: `大阪の利用者にはロンドンの公開リゾルバを使わせたまま、DNS でもエニーキャストと同じ拠点（${CITY[osakaAnycast.site][1]}）へ向かわせてください。`,
      },
      hint: {
        en: 'The authoritative server answers for whoever it thinks is asking. What could the resolver tell it about the user?',
        ja: '権威サーバは、問い合わせてきたと思う相手に合わせて答えます。リゾルバは利用者について何を伝えられるでしょう。',
      },
      reached: osakaFitted,
      why: {
        en: `With ECS the London resolver passes on Osaka’s /24, so the authoritative server answers ${UNICAST[osakaDns.server]} (${CITY[osakaDns.server][0]}): a round trip of ${osakaDns.rttMs} ms, the same as anycast’s ${osakaAnycast.rttMs} ms. Without ECS it answered for London, ${UNICAST[osakaFromLondon.server]} (${CITY[osakaFromLondon.server][0]}), ${osakaFromLondon.rttMs} ms.`,
        ja: `ECS を使うと、ロンドンのリゾルバは大阪の利用者の /24 を伝えるので、権威サーバは ${UNICAST[osakaDns.server]}（${CITY[osakaDns.server][1]}）と答えます。往復は ${osakaDns.rttMs} ms で、エニーキャストの ${osakaAnycast.rttMs} ms と同じです。ECS がないとロンドンに合わせて ${UNICAST[osakaFromLondon.server]}（${CITY[osakaFromLondon.server][1]}）と答え、${osakaFromLondon.rttMs} ms でした。`,
      },
    },
  ];
}
