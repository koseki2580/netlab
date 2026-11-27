/**
 * The load-balancer lesson's challenges (REQ-449): goals reached with the
 * lesson's own controls (the algorithm and the health checks). Every `reached`
 * and every number in `why` comes from the assignment model in loadBalancer.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { REQUESTS, SERVERS, addressHash, assign, peakOpen, type Algorithm } from './loadBalancer';

export interface LoadBalancerState {
  readonly algorithm: Algorithm;
  /** Which servers pass their health check, in SERVERS order. */
  readonly up: readonly boolean[];
}

/** The most connections the busiest server may hold at once in the first challenge. */
export const BUSIEST_LIMIT = 2;

const CLIENTS = [...new Set(REQUESTS.map((request) => request.clientIp))];
const ALL_UP = SERVERS.map(() => true);

/** The server the model sends a client's requests to under source hash, when `up` servers pass. */
function hashedServer(ip: string, up: readonly boolean[]): number {
  return assign('source-hash', REQUESTS, up).find((a) => a.request.clientIp === ip)!.server;
}

export function loadBalancerChallenges({ algorithm, up }: LoadBalancerState): Challenge[] {
  const allUp = up.every(Boolean);
  const peaks = peakOpen(assign(algorithm, REQUESTS, up));
  const roundRobinPeaks = peakOpen(assign('round-robin', REQUESTS));

  // 1. All three servers in, and nobody holds more than two connections at once.
  const busiestTwo = allUp && Math.max(...peaks) <= BUSIEST_LIMIT;

  // 2. Source hash, one server out, and a client whose server stayed healthy moves anyway.
  const downCount = up.filter((value) => !value).length;
  const moved =
    algorithm === 'source-hash' && downCount === 1
      ? CLIENTS.find((ip) => {
          const before = hashedServer(ip, ALL_UP);
          return up[before] && hashedServer(ip, up) !== before;
        })
      : undefined;
  const healthyCount = up.filter(Boolean).length;
  const hash = moved === undefined ? 0 : addressHash(moved);
  const before = moved === undefined ? 0 : hashedServer(moved, ALL_UP);
  const after = moved === undefined ? 0 : hashedServer(moved, up);
  const downName = SERVERS[up.findIndex((value) => !value)] ?? SERVERS[0];

  return [
    {
      id: 'busiest-two',
      goal: {
        en: `Keep all three servers in, and make the busiest one hold at most ${BUSIEST_LIMIT} connections at once.`,
        ja: `3 台ともヘルスチェックに合格させたまま、いちばん忙しいサーバが同時に抱える接続を ${BUSIEST_LIMIT} 本以下にしてください。`,
      },
      hint: {
        en: 'The long requests pile up on one server. Which algorithm looks at what is still open when it chooses?',
        ja: '長いリクエストが 1 台に重なっています。選ぶときに、まだ開いている接続を見るのはどのアルゴリズムでしょう。',
      },
      reached: busiestTwo,
      why: {
        en: `Each request goes to the server with the fewest connections still open, so a long one is never stacked on another long one: at most ${peaks.join(', ')} open at once on ${SERVERS.join(', ')}. Round robin counts turns and puts every long request on web1: ${roundRobinPeaks.join(', ')}.`,
        ja: `各リクエストは、まだ開いている接続がいちばん少ないサーバへ行くので、長いリクエストが長いリクエストに重なりません。${SERVERS.join('、')} の同時接続は最大 ${peaks.join('、')} 本です。ラウンドロビンは順番だけを数えるので、長いリクエストが毎回 web1 に当たり、${roundRobinPeaks.join('、')} 本になります。`,
      },
    },
    {
      id: 'hash-reshuffle',
      goal: {
        en: 'With source-IP hash, take one server out of the health check so that a client whose server stayed healthy still moves to another server.',
        ja: '送信元 IP のハッシュで、サーバを 1 台ヘルスチェックから外し、自分のサーバは元気なままなのに別のサーバへ移されるクライアントを作ってください。',
      },
      hint: {
        en: 'The hash picks a server by the remainder after dividing by the number of healthy servers. What happens to every remainder when that number changes?',
        ja: 'ハッシュは、元気なサーバの台数で割った余りでサーバを選びます。台数が変わると、余りはどうなるでしょう。',
      },
      reached: moved !== undefined,
      why: {
        en: `${moved ?? ''} hashes to ${hash}. With three servers, ${hash} mod 3 = ${hash % 3} picks ${SERVERS[before]}; with ${downName} out, ${hash} mod ${healthyCount} = ${hash % healthyCount} picks ${SERVERS[after]}, although ${SERVERS[before]} is still healthy. Dividing by a new count moves clients that had nothing to do with the failure; consistent hashing exists to avoid that.`,
        ja: `${moved ?? ''} のハッシュ値は ${hash} です。3 台なら ${hash} mod 3 = ${hash % 3} で ${SERVERS[before]} ですが、${downName} を外すと ${hash} mod ${healthyCount} = ${hash % healthyCount} で ${SERVERS[after]} になります。${SERVERS[before]} は元気なままなのに、です。台数で割り直すと、故障と関係のないクライアントまで移ります。これを避けるためにあるのがコンシステントハッシュです。`,
      },
    },
  ];
}
