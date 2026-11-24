import { useMemo, useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  EBGP_NEXT_HOP,
  PREFIX,
  SCENARIOS,
  SCENARIO_IDS,
  propagate,
  reachesC,
  sessionCounts,
  type ScenarioId,
  type Verdict,
} from './routeReflector';

const ASKED_N = 10;

type CountAnswer = 'n' | 'double' | 'pairs' | 'ordered';
const COUNT_ANSWERS: readonly CountAnswer[] = ['n', 'double', 'pairs', 'ordered'];
/** The value each count option states, for the asked n. */
const countOf = (answer: CountAnswer, n: number) =>
  ({ n, double: 2 * n, pairs: (n * (n - 1)) / 2, ordered: n * (n - 1) })[answer];

type ReachAnswer = 'neither' | 'rr-only' | 'both';
const REACH_ANSWERS: readonly ReachAnswer[] = ['neither', 'rr-only', 'both'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Where each router sits in the topology picture. */
const POSITION: Record<string, readonly [number, number]> = {
  A: [50, 70],
  B: [180, 70],
  RR1: [180, 28],
  RR2: [180, 112],
  C: [310, 70],
};

function TopologyPicture({ scenario }: { scenario: ScenarioId }) {
  const t = useT();
  const topology = SCENARIOS[scenario];
  return (
    <svg
      viewBox="0 0 360 140"
      style={{ width: '100%', maxWidth: 480 }}
      role="img"
      aria-label={t(
        `iBGP sessions: ${topology.sessions.map(([a, b]) => `${a}–${b}`).join(', ')}`,
        `iBGP セッション：${topology.sessions.map(([a, b]) => `${a}–${b}`).join('、')}`,
      )}
    >
      {topology.sessions.map(([a, b]) => {
        const [x1, y1] = POSITION[a]!;
        const [x2, y2] = POSITION[b]!;
        return (
          <line
            key={`${a}-${b}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--netlab-text-secondary)"
            strokeWidth={2}
          />
        );
      })}
      {topology.routers.map((router) => {
        const [x, y] = POSITION[router.id]!;
        return (
          <g key={router.id}>
            <circle
              cx={x}
              cy={y}
              r={20}
              fill="var(--netlab-bg-elevated)"
              stroke={router.rr ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border-strong)'}
              strokeWidth={router.rr ? 3 : 1.5}
            />
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill="var(--netlab-text-primary)"
            >
              {router.id}
            </text>
          </g>
        );
      })}
      <text x={6} y={134} fontSize={12} fill="var(--netlab-text-secondary)">
        {t('eBGP → A', 'eBGP → A')}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function RouteReflectorLesson() {
  const t = useT();
  const [countGuess, setCountGuess] = useState<CountAnswer | null>(null);
  const [countRevealed, setCountRevealed] = useState(false);
  const [n, setN] = useState(ASKED_N);
  const [reachGuess, setReachGuess] = useState<ReachAnswer | null>(null);
  const [reachRevealed, setReachRevealed] = useState(false);
  const [shown, setShown] = useState<ScenarioId>('one-rr');

  const asked = sessionCounts(ASKED_N);
  const countTruth = COUNT_ANSWERS.find((answer) => countOf(answer, ASKED_N) === asked.fullMesh)!;
  const counts = sessionCounts(n);

  const plainReaches = reachesC('plain');
  const rrReaches = reachesC('one-rr');
  const reachTruth: ReachAnswer =
    plainReaches && rrReaches ? 'both' : rrReaches ? 'rr-only' : 'neither';
  const atC = propagate(SCENARIOS['one-rr']).installed.get('C');
  const result = useMemo(() => propagate(SCENARIOS[shown]), [shown]);

  const reachName = (answer: ReachAnswer) =>
    ({
      neither: t('No, in neither case', 'どちらでも届かない'),
      'rr-only': t('Only when B is a route reflector', 'B がルートリフレクタのときだけ届く'),
      both: t('Yes, in both cases', 'どちらでも届く'),
    })[answer];
  const scenarioName = (id: ScenarioId) =>
    ({
      plain: t('B is a plain iBGP router', 'B は普通の iBGP ルータ'),
      'one-rr': t('B is a route reflector', 'B がルートリフレクタ'),
      'two-rr-same': t('Two RRs, one cluster ID', 'RR 2 台・同じクラスタ ID'),
      'two-rr-split': t('Two RRs, two cluster IDs', 'RR 2 台・別々のクラスタ ID'),
    })[id];
  const verdictName = (verdict: Verdict) =>
    ({
      accepted: t('accepted', '受け入れ'),
      'originator-id': t('dropped: own ORIGINATOR_ID', '破棄：自分の ORIGINATOR_ID'),
      'cluster-list': t('dropped: own cluster in CLUSTER_LIST', '破棄：CLUSTER_LIST に自クラスタ'),
    })[verdict];

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('iBGP inside one AS', '1 つの AS の中の iBGP')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Every router in an AS needs the routes the border routers learn from other ASes. Inside the AS they are carried by iBGP, over a TCP session between two routers. The question is how many such sessions an AS needs, and what happens when there are fewer.',
            'AS の中のどのルータも、境界ルータがほかの AS から学んだ経路を知る必要があります。AS の中でそれを運ぶのが iBGP で、2 台のルータの間に張った TCP セッションを使います。問題は、AS にこのセッションがいくつ必要か、そして少ないと何が起きるかです。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="rr-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `An AS has ${ASKED_N} routers and runs iBGP as a full mesh: every router has a session with every other router. How many iBGP sessions is that?`,
            `${ASKED_N} 台のルータがある AS で、iBGP をフルメッシュで組みます。どのルータもほかのすべてのルータとセッションを張ります。iBGP セッションはいくつ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {COUNT_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={countGuess === answer}
              data-testid={`rr-guess-${answer}`}
              disabled={countRevealed}
              onClick={() => setCountGuess(answer)}
              style={{ ...lessonChoice(countGuess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, countGuess, countTruth, countRevealed)}
              {t(`${countOf(answer, ASKED_N)} sessions`, `${countOf(answer, ASKED_N)} セッション`)}
            </button>
          ))}
        </div>
        {countRevealed ? (
          <p
            data-testid="rr-reveal"
            data-right={String(countGuess === countTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {countGuess === countTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${asked.fullMesh} sessions. Each of the ${ASKED_N} routers has ${ASKED_N - 1} sessions, but each session joins two routers, so ${ASKED_N} × ${ASKED_N - 1} / 2 = ${asked.fullMesh}. The count grows with the square of the number of routers, and every new router means configuring every other one. A route reflector cuts it to ${asked.oneRr}. Why a mesh is needed at all is the next question.`,
              `${asked.fullMesh} セッションです。${ASKED_N} 台それぞれが ${ASKED_N - 1} 本のセッションを持ちますが、1 本のセッションは 2 台をつなぐので、${ASKED_N} × ${ASKED_N - 1} ÷ 2 = ${asked.fullMesh} です。数はルータ台数の 2 乗で増え、1 台足すたびにほかの全ルータの設定を変えることになります。ルートリフレクタを使えば ${asked.oneRr} まで減ります。そもそもなぜメッシュが要るのかは、次の問題で見ます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="rr-reveal-button"
            disabled={!countGuess}
            style={{
              ...(countGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setCountRevealed(true)}
          >
            {countGuess
              ? t('Count the sessions', 'セッションを数える')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {countRevealed ? (
        <div style={LESSON_CARD} data-testid="rr-counts">
          <div style={LESSON_LABEL}>{t('Sessions as the AS grows', 'AS が大きくなると')}</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Routers', 'ルータ台数')}
            <input
              type="range"
              min={3}
              max={60}
              value={n}
              data-testid="rr-n"
              onChange={(event) => setN(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{n}</span>
          </label>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse' }}
              data-testid="rr-count"
              data-n={counts.n}
              data-full={counts.fullMesh}
              data-one={counts.oneRr}
              data-two={counts.twoRr}
            >
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Design', '構成')}</th>
                  <th style={cell}>{t('iBGP sessions', 'iBGP セッション数')}</th>
                  <th style={cell}>{t('How it is counted', '数え方')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={cell}>{t('Full mesh', 'フルメッシュ')}</td>
                  <td style={mono}>{counts.fullMesh}</td>
                  <td style={mono}>{`${n} × ${n - 1} / 2`}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('One route reflector', 'ルートリフレクタ 1 台')}</td>
                  <td style={mono}>{counts.oneRr}</td>
                  <td style={mono}>{`${n} − 1`}</td>
                </tr>
                <tr>
                  <td style={cell}>
                    {t('Two route reflectors (redundant)', 'ルートリフレクタ 2 台（冗長）')}
                  </td>
                  <td style={mono}>{counts.twoRr}</td>
                  <td style={mono}>{`2 × (${n} − 2) + 1`}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'With two reflectors every other router is a client of both, and the two reflectors also peer with each other, so losing one reflector loses no routes.',
              'RR が 2 台のときは、ほかのルータはどれも両方のクライアントになり、RR 同士もセッションを張ります。だから RR が 1 台止まっても経路は失われません。',
            )}
          </p>
        </div>
      ) : null}

      {countRevealed ? (
        <div style={LESSON_CARD} data-testid="rr-prop-predict">
          <div style={LESSON_LABEL}>{t('Predict again', 'もう一度予想')}</div>
          <TopologyPicture scenario="plain" />
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Three routers with iBGP sessions A–B and B–C only; there is no session between A and C. A learns ${PREFIX} from its eBGP neighbour. Does C learn the route — when B is a plain iBGP router, and when B is a route reflector with A and C as its clients?`,
              `3 台のルータに、iBGP セッションは A–B と B–C だけがあり、A と C の間にはありません。A は eBGP の相手から ${PREFIX} を学びます。C はこの経路を知ることができる？ B が普通の iBGP ルータのときと、B が A と C をクライアントに持つルートリフレクタのときで考えてください。`,
            )}
          </p>
          <div
            role="radiogroup"
            aria-label={t('Your prediction', '予想')}
            style={{ display: 'grid', gap: 6 }}
          >
            {REACH_ANSWERS.map((answer) => (
              <button
                key={answer}
                type="button"
                role="radio"
                aria-checked={reachGuess === answer}
                data-testid={`rr-prop-guess-${answer}`}
                disabled={reachRevealed}
                onClick={() => setReachGuess(answer)}
                style={{ ...lessonChoice(reachGuess === answer), textAlign: 'left' }}
              >
                {predictionMark(answer, reachGuess, reachTruth, reachRevealed)}
                {reachName(answer)}
              </button>
            ))}
          </div>
          {reachRevealed ? (
            <p
              data-testid="rr-prop-reveal"
              data-right={String(reachGuess === reachTruth)}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {reachGuess === reachTruth
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `A plain B keeps the route to itself: a route learned from an iBGP peer is never passed to another iBGP peer (RFC 4271 §9.2). Inside one AS the AS_PATH does not grow, so it cannot catch a loop; this rule is what stops one, and it is why iBGP needs a full mesh. A route reflector is allowed to pass a client’s route on (RFC 4456). C gets it from B with ORIGINATOR_ID ${atC?.originatorId ?? '—'} (A’s router ID) and CLUSTER_LIST ${atC?.clusterList.join(' ') ?? '—'}, and NEXT_HOP is still ${atC?.nextHop ?? '—'}: the reflector does not put itself in the path.`,
                `普通の B は経路を自分で止めます。iBGP の相手から学んだ経路は、別の iBGP の相手には渡さない決まりだからです（RFC 4271 §9.2）。AS の中では AS_PATH が伸びないのでループに気づけず、この決まりがループを防いでいます。iBGP にフルメッシュが要るのはこのためです。ルートリフレクタはクライアントの経路を渡してよいことになっています（RFC 4456）。C は B から、ORIGINATOR_ID ${atC?.originatorId ?? '—'}（A のルータ ID）と CLUSTER_LIST ${atC?.clusterList.join(' ') ?? '—'} の付いた経路を受け取ります。NEXT_HOP は ${atC?.nextHop ?? '—'} のままで、リフレクタは転送の経路には入りません。`,
              )}
            </p>
          ) : (
            <button
              type="button"
              data-testid="rr-prop-reveal-button"
              disabled={!reachGuess}
              style={{
                ...(reachGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
                marginTop: 8,
              }}
              onClick={() => setReachRevealed(true)}
            >
              {reachGuess
                ? t('Send the update', 'UPDATE を流す')
                : t('Predict first', '先に予想を選んでください')}
            </button>
          )}
        </div>
      ) : null}

      {reachRevealed ? (
        <div style={LESSON_CARD} data-testid="rr-prop">
          <div style={LESSON_LABEL}>
            {t('Follow the update, session by session', 'UPDATE をセッションごとに追う')}
          </div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SCENARIO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={shown === id}
                data-testid={`rr-scenario-${id}`}
                onClick={() => setShown(id)}
                style={lessonChoice(shown === id)}
              >
                {shown === id ? '✓ ' : ''}
                {scenarioName(id)}
              </button>
            ))}
          </div>
          <TopologyPicture scenario={shown} />
          <p
            data-testid="rr-c-result"
            data-scenario={shown}
            data-reaches={String(result.installed.has('C'))}
            style={{ margin: '4px 0 8px', fontWeight: 700 }}
          >
            {result.installed.has('C')
              ? t(
                  `C has the route (${result.deliveries.length} updates sent).`,
                  `C は経路を持っています（UPDATE は ${result.deliveries.length} 回）。`,
                )
              : t(
                  `C never hears the route (${result.deliveries.length} update sent).`,
                  `C には経路が届きません（UPDATE は ${result.deliveries.length} 回）。`,
                )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Step', '順')}</th>
                  <th style={cell}>{t('Update', 'UPDATE')}</th>
                  <th style={cell}>NEXT_HOP</th>
                  <th style={cell}>ORIGINATOR_ID</th>
                  <th style={cell}>CLUSTER_LIST</th>
                  <th style={cell}>{t('At the receiver', '受け取った側')}</th>
                </tr>
              </thead>
              <tbody>
                {result.deliveries.map((delivery, index) => (
                  <tr
                    key={index}
                    data-testid={`rr-delivery-${index}`}
                    data-to={delivery.to}
                    data-verdict={delivery.verdict}
                  >
                    <td style={mono}>{delivery.step}</td>
                    <td style={mono}>{`${delivery.copy.from} → ${delivery.to}`}</td>
                    <td style={mono}>{delivery.copy.nextHop}</td>
                    <td style={mono}>{delivery.copy.originatorId ?? '—'}</td>
                    <td style={mono}>
                      {delivery.copy.clusterList.length > 0
                        ? delivery.copy.clusterList.join(' ')
                        : '—'}
                    </td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                      {verdictName(delivery.verdict)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7, fontSize: 14 }}>
            {t(
              'The reflection rules (RFC 4456): a route from a client goes to every other peer; a route from a non-client goes to the clients only; a route from eBGP goes to everyone. Two attributes stop loops: a router drops a route carrying its own router ID as ORIGINATOR_ID, and a reflector drops a route whose CLUSTER_LIST already holds its own cluster ID. Two reflectors sharing a cluster ID drop each other’s reflections at once; with separate IDs they accept them, and the copy that comes back to A is stopped by ORIGINATOR_ID.',
              'リフレクトの決まり（RFC 4456）：クライアントからの経路はほかのすべての相手へ、非クライアントからの経路はクライアントだけへ、eBGP からの経路は全員へ渡します。ループを止める属性は 2 つです。ルータは ORIGINATOR_ID が自分のルータ ID の経路を捨て、リフレクタは CLUSTER_LIST に自分のクラスタ ID がすでにある経路を捨てます。同じクラスタ ID の RR 2 台は互いのリフレクトをすぐに捨てます。別々の ID なら受け入れますが、A に戻ってきた経路は ORIGINATOR_ID で止まります。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: one prefix, and every router passes on each copy it accepts, as if each were its best path for a moment (real BGP passes on only its current best path, but while sessions come up and go down each copy can be best for a while). NEXT_HOP stays ${EBGP_NEXT_HOP}, so C must reach it through the IGP; many operators set next-hop-self on the border router instead, which is a configuration choice, not the default.`,
              `簡略化：プレフィックスは 1 つで、どのルータも受け入れたコピーをそれぞれ一度はベストパスだったものとして渡します（実際の BGP が渡すのはその時点のベストパスだけですが、セッションが上下する間はどのコピーもしばらくベストになりえます）。NEXT_HOP は ${EBGP_NEXT_HOP} のままなので、C は IGP でそこへ届く必要があります。境界ルータで next-hop-self を設定する運用も多いですが、それは設定による選択で、初期動作ではありません。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function RouteReflectorDemo() {
  return (
    <DemoShell
      title="iBGP scaling and route reflectors"
      desc="How many iBGP sessions an AS needs, and how a route reaches a router it has no session with"
    >
      <RouteReflectorLesson />
    </DemoShell>
  );
}
