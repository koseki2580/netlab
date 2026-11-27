import type { Challenge } from '../components/LessonChallenges';
import {
  SCENARIOS,
  fullMeshSessions,
  propagate,
  twoRrSessions,
  type ScenarioId,
} from './routeReflector';

/** REQ-449 — the route-reflector lesson's challenges, checked by its model. */

export interface RouteReflectorChallengeState {
  /** Routers in the AS (the session-count slider). */
  readonly n: number;
  /** The design shown in the propagation table. */
  readonly scenario: ScenarioId;
}

const MESH_LIMIT = 100;

/** Whether two reflectors need at most a tenth of the full mesh's sessions. */
const twoRrTenth = (n: number) => 10 * twoRrSessions(n) <= fullMeshSessions(n);

export function routeReflectorChallenges(state: RouteReflectorChallengeState): Challenge[] {
  const { n, scenario } = state;
  const full = fullMeshSessions(n);
  const fullBefore = fullMeshSessions(n - 1);
  const two = twoRrSessions(n);
  const twoBefore = twoRrSessions(n - 1);

  const result = propagate(SCENARIOS[scenario]);
  const origin = SCENARIOS[scenario].origin;
  const back = result.deliveries.filter(
    (delivery) => delivery.to === origin && delivery.verdict === 'originator-id',
  );
  const firstBack = back[0];

  return [
    {
      id: 'mesh-over-100',
      goal: {
        en: `Find the smallest AS whose full iBGP mesh needs more than ${MESH_LIMIT} sessions.`,
        ja: `フルメッシュの iBGP セッションが ${MESH_LIMIT} を超える、いちばん小さい AS を見つけてください。`,
      },
      hint: {
        en: 'A new router needs a session to every router already there. How many does each added router add?',
        ja: '1 台足すと、すでにいる全ルータとのセッションが要ります。1 台足すごとに何本増えるでしょう。',
      },
      reached: full > MESH_LIMIT && fullBefore <= MESH_LIMIT,
      why: {
        en: `${n} routers need ${n} × ${n - 1} / 2 = ${full} sessions; ${n - 1} routers need ${fullBefore}. The ${n}th router alone adds ${n - 1}, because it must peer with every router already in the AS.`,
        ja: `${n} 台なら ${n} × ${n - 1} ÷ 2 = ${full} セッション、${n - 1} 台なら ${fullBefore} です。${n} 台目はすでにいる全ルータと張るので、それだけで ${n - 1} 本増えます。`,
      },
    },
    {
      id: 'two-rr-tenth',
      goal: {
        en: 'Find the smallest AS in which two redundant route reflectors need no more than one tenth of the full mesh’s sessions.',
        ja: '冗長な 2 台のルートリフレクタで、セッション数がフルメッシュの 10 分の 1 以下になる、いちばん小さい AS を見つけてください。',
      },
      hint: {
        en: 'One count grows with n, the other with n². Watch how their ratio moves as the AS grows.',
        ja: '一方は n に比例して、もう一方は n の 2 乗で増えます。台数を増やすと比がどう動くかを見てください。',
      },
      reached: twoRrTenth(n) && !twoRrTenth(n - 1),
      why: {
        en: `At ${n} routers two reflectors need ${two} sessions against ${full} for the mesh, ${((100 * two) / full).toFixed(1)}%; at ${n - 1} they need ${twoBefore} against ${fullBefore}, ${((100 * twoBefore) / fullBefore).toFixed(1)}%. Reflector sessions grow by 2 per router, mesh sessions by n − 1, so the saving keeps growing with the AS.`,
        ja: `${n} 台では RR 2 台で ${two} セッション、フルメッシュは ${full} で、${((100 * two) / full).toFixed(1)}% です。${n - 1} 台では ${twoBefore} 対 ${fullBefore} で ${((100 * twoBefore) / fullBefore).toFixed(1)}% です。RR のセッションは 1 台につき 2 本ずつ、フルメッシュは n − 1 本ずつ増えるので、AS が大きいほど差が開きます。`,
      },
    },
    {
      id: 'route-comes-back',
      goal: {
        en: `Pick a design in which a copy of ${origin}’s own route comes back to ${origin}.`,
        ja: `${origin} 自身の経路のコピーが ${origin} に戻ってくる構成を選んでください。`,
      },
      hint: {
        en: 'A copy can only come back if one reflector accepts another reflector’s reflection. What makes a reflector refuse one?',
        ja: 'コピーが戻るのは、あるリフレクタが別のリフレクタのリフレクトを受け入れたときだけです。リフレクタは何を見て受け取りを断るでしょう。',
      },
      reached: firstBack !== undefined,
      why: {
        en: firstBack
          ? `${back.length} copies come back to ${origin}, from ${back.map((d) => d.copy.from).join(' and ')}, with CLUSTER_LIST ${firstBack.copy.clusterList.join(' ')}: the reflectors have different cluster IDs, so each accepted the other’s reflection. ${origin} drops them because ORIGINATOR_ID ${firstBack.copy.originatorId} is its own router ID.`
          : '',
        ja: firstBack
          ? `${origin} には ${back.map((d) => d.copy.from).join(' と ')} から ${back.length} 個のコピーが、CLUSTER_LIST ${firstBack.copy.clusterList.join(' ')} 付きで戻ってきます。リフレクタのクラスタ ID が別々なので、互いのリフレクトを受け入れたからです。${origin} は ORIGINATOR_ID ${firstBack.copy.originatorId} が自分のルータ ID なので、それを捨てます。`
          : '',
      },
    },
  ];
}
