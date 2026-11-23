import { useEffect, useRef, useState } from 'react';
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
  ANYCAST_PREFIX,
  LINKS,
  NODES,
  RESOLVERS,
  SITES,
  USERS,
  dnsSteer,
  lowestLatency,
  routeFor,
  type NodeId,
  type Resolver,
  type SiteId,
  type UserId,
} from './anycast';

type Answer = 'tyo' | 'fra' | 'nyc' | 'spread';
/** Display order: deliberate, so the right answers do not sit in one position across lessons. */
const ANSWERS: readonly Answer[] = ['spread', 'nyc', 'tyo', 'fra'];
const ANSWER_OF: Record<SiteId, Answer> = {
  'site-tyo': 'tyo',
  'site-fra': 'fra',
  'site-nyc': 'nyc',
};

const ASKED: UserId = 'isp-sg';
const DNS_USERS: readonly UserId[] = ['isp-osaka', 'isp-chicago'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const NAMES: Record<NodeId, readonly [string, string]> = {
  'site-tyo': ['CDN Tokyo', 'CDN 東京'],
  'site-fra': ['CDN Frankfurt', 'CDN フランクフルト'],
  'site-nyc': ['CDN New York', 'CDN ニューヨーク'],
  't-us': ['US transit', '米国のトランジット'],
  't-euro': ['Europe transit', '欧州のトランジット'],
  't-asia': ['Asia transit', 'アジアのトランジット'],
  't-global': ['Global carrier', '国際キャリア'],
  'isp-osaka': ['Osaka ISP', '大阪の ISP'],
  'isp-sg': ['Singapore ISP', 'シンガポールの ISP'],
  'isp-london': ['London ISP', 'ロンドンの ISP'],
  'isp-chicago': ['Chicago ISP', 'シカゴの ISP'],
};
const CITY: Record<SiteId, readonly [string, string]> = {
  'site-tyo': ['Tokyo', '東京'],
  'site-fra': ['Frankfurt', 'フランクフルト'],
  'site-nyc': ['New York', 'ニューヨーク'],
};

const POS: Record<NodeId, readonly [number, number]> = {
  'isp-sg': [60, 40],
  'isp-osaka': [220, 40],
  'isp-london': [380, 40],
  'isp-chicago': [540, 40],
  't-global': [60, 150],
  't-asia': [220, 150],
  't-euro': [380, 150],
  't-us': [540, 150],
  'site-tyo': [220, 260],
  'site-fra': [380, 260],
  'site-nyc': [540, 260],
};
const point = (id: NodeId) => POS[id].join(',');
/**
 * Two links are drawn as curves so they miss the boxes between their ends, each
 * with its label placed clear of the boxes. The carrier–Frankfurt curve runs
 * below the whole site row, so it cannot be read as ending at Tokyo.
 */
const CURVES: Partial<Record<string, { d: string; label: readonly [number, number] }>> = {
  't-asia|t-us': { d: `M${point('t-asia')} Q380,90 ${point('t-us')}`, label: [300, 110] },
  'site-fra|t-global': {
    // Lowest point about y 310 at x 220; label under it, at the curve's middle.
    d: `M${point('t-global')} C60,340 380,340 ${point('site-fra')}`,
    label: [220, 324],
  },
};
// 112 wide leaves a 48-unit gap between neighbouring boxes, room for a "120 ms" label.
const BOX_W = 112;
const BOX_H = 36;

const onPath = (path: readonly NodeId[] | undefined, a: NodeId, b: NodeId) => {
  if (!path) return false;
  for (let i = 1; i < path.length; i += 1) {
    const x = path[i - 1];
    const y = path[i];
    if ((x === a && y === b) || (x === b && y === a)) return true;
  }
  return false;
};

/** The networks and links; after the reveal, the asked user's BGP path and its lowest-latency path. */
function Topology({
  bgpPath,
  nearestPath,
  down,
}: {
  bgpPath: readonly NodeId[] | undefined;
  nearestPath: readonly NodeId[] | undefined;
  down: SiteId | null;
}) {
  const t = useT();
  // Below about 560 px the labels would shrink past reading size, so the map keeps
  // that width and scrolls sideways inside its card instead, with a hint saying so.
  const scroller = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div>
      <div ref={scroller} style={{ overflowX: 'auto' }}>
        <svg
          data-testid="any-map"
          viewBox="-10 0 630 332"
          style={{ width: '100%', minWidth: 640 }}
          role="img"
          aria-label={t(
            'Four ISPs, four transit networks and the CDN’s three sites, with the one-way latency of each link',
            '4 つの ISP、4 つのトランジット網、CDN の 3 拠点と、各リンクの片道の遅延',
          )}
        >
          {LINKS.map((link) => {
            const [ax, ay] = POS[link.a];
            const [bx, by] = POS[link.b];
            const key = [link.a, link.b].sort().join('|');
            const curve = CURVES[key];
            const bgp = onPath(bgpPath, link.a, link.b);
            const nearest = onPath(nearestPath, link.a, link.b);
            const d = curve ? curve.d : `M${ax},${ay} L${bx},${by}`;
            // A curve's label is placed by hand; a line's sits in its middle.
            const label = curve
              ? curve.label
              : ax === bx
                ? [ax + 6, (ay + by) / 2 + 4]
                : [(ax + bx) / 2, ay - 5];
            return (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke={
                    bgp
                      ? 'var(--netlab-accent-cyan)'
                      : nearest
                        ? 'var(--netlab-accent-green)'
                        : 'var(--netlab-border-strong)'
                  }
                  strokeWidth={bgp || nearest ? 3 : 1.5}
                  strokeDasharray={!bgp && nearest ? '6 4' : undefined}
                />
                <text
                  x={label[0]}
                  y={label[1]}
                  textAnchor={ax === bx && !curve ? 'start' : 'middle'}
                  fontSize={11}
                  fill="var(--netlab-text-secondary)"
                  // A halo in the card's colour keeps a crossing line from cutting the label.
                  stroke="var(--netlab-bg-primary)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {`${link.ms} ms`}
                </text>
              </g>
            );
          })}
          {NODES.map((node) => {
            const [x, y] = POS[node.id];
            const withdrawn = node.id === down;
            return (
              <g key={node.id} opacity={withdrawn ? 0.4 : 1}>
                <rect
                  x={x - BOX_W / 2}
                  y={y - BOX_H / 2}
                  width={BOX_W}
                  height={BOX_H}
                  rx={6}
                  fill="var(--netlab-bg-surface)"
                  stroke={
                    node.kind === 'site'
                      ? 'var(--netlab-accent-cyan)'
                      : 'var(--netlab-border-strong)'
                  }
                  strokeDasharray={withdrawn ? '4 3' : undefined}
                />
                <text
                  x={x}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--netlab-text-primary)"
                >
                  {t(...NAMES[node.id])}
                </text>
                <text
                  x={x}
                  y={y + 11}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="monospace"
                  fill="var(--netlab-text-secondary)"
                >
                  {withdrawn ? t('withdrawn', '取り下げ') : `AS ${node.asn}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {overflows ? (
        <p
          data-testid="any-map-scroll-hint"
          style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--netlab-text-secondary)' }}
        >
          {t('Scroll the map sideways to see every site →', '地図は横にスクロールできます →')}
        </p>
      ) : null}
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function AnycastLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [down, setDown] = useState<SiteId | null>(null);
  const [resolver, setResolver] = useState<Resolver>('public-london');
  const live = SITES.filter((site) => site !== down);
  const asked = routeFor(ASKED)!;
  const askedNearest = lowestLatency(ASKED)!;
  const truth = ANSWER_OF[asked.site];
  const city = (site: SiteId) => t(...CITY[site]);
  const answerName = (answer: Answer) =>
    answer === 'spread'
      ? t('Spread across all three sites', '3 拠点に振り分けられる')
      : city(SITES.find((site) => ANSWER_OF[site] === answer)!);
  const resolverName = (r: Resolver) =>
    ({
      own: t('Their ISP’s resolver', '自分の ISP のリゾルバ'),
      'public-london': t('A public resolver in London', 'ロンドンの公開リゾルバ'),
      'public-london-ecs': t('The London resolver, with ECS', 'ロンドンのリゾルバ＋ECS'),
    })[r];
  const shownBgp = revealed ? routeFor(ASKED, live) : null;
  const shownNearest = revealed ? lowestLatency(ASKED, live) : null;
  const moved = USERS.flatMap((user) => {
    const before = routeFor(user)!;
    const after = routeFor(user, live);
    return after && after.site !== before.site ? [{ user, before, after }] : [];
  });

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
        <div style={LESSON_LABEL}>{t('Anycast', 'エニーキャスト')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A CDN (AS 64500) announces the same prefix, ${ANYCAST_PREFIX}, from three sites: Tokyo, Frankfurt and New York. Every user sends to the same address, 192.0.2.1. Which copy answers is not decided by the CDN: each network picks, with BGP, among the routes its neighbours tell it about, and the packets follow that route.`,
            `CDN（AS 64500）が、同じプレフィックス ${ANYCAST_PREFIX} を東京・フランクフルト・ニューヨークの 3 拠点から広告しています。利用者はみな同じアドレス 192.0.2.1 へ送ります。どの拠点が応答するかは CDN が決めるのではありません。それぞれのネットワークが、隣から教わった経路の中から BGP で 1 本を選び、パケットはその経路をたどります。`,
          )}
        </p>
        <Topology
          bgpPath={shownBgp?.path}
          nearestPath={shownNearest?.path}
          down={revealed ? down : null}
        />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {revealed
            ? t(
                'Thick solid line: the path the Singapore ISP’s BGP chose. Thick dashed line: its lowest-latency path, when different.',
                '太い実線：シンガポールの ISP が BGP で選んだ経路。太い破線：遅延が最小の経路（ちがう場合）。',
              )
            : t(
                'Each label is the link’s one-way latency.',
                '数字はそれぞれのリンクの片道の遅延です。',
              )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="any-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'A user of the Singapore ISP sends a request to 192.0.2.1. Which site receives it?',
            'シンガポールの ISP の利用者が 192.0.2.1 へリクエストを送ります。受け取るのはどの拠点？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`any-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, guess, truth, revealed)}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="any-reveal"
            data-right={String(guess === truth)}
            data-site={asked.site}
            data-rtt={asked.rttMs}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${city(asked.site)}, with a round trip of ${asked.rttMs} ms. The Singapore ISP hears the prefix only from the global carrier, and the carrier hears it directly from the CDN in Frankfurt (AS path ${asked.asPath.join(' ')}: ${asked.asPath.length} ASes) and from the Asia transit, which adds one more AS (${askedNearest.asPath.join(' ')}: ${askedNearest.asPath.length} ASes). BGP prefers the shorter AS path and knows nothing about latency, so the user goes to ${city(asked.site)} although ${city(askedNearest.site)} would answer in ${askedNearest.rttMs} ms. Anycast reaches the copy nearest by routing, which is usually, but not always, the nearest on the map. Every packet follows the same route, so they all reach the same site.`,
              `${city(asked.site)}で、往復 ${asked.rttMs} ms です。シンガポールの ISP はこのプレフィックスを国際キャリアからしか聞きません。そのキャリアは、フランクフルトの CDN から直接（AS パス ${asked.asPath.join(' ')}：${asked.asPath.length} 個の AS）と、アジアのトランジット経由で AS が 1 つ多い経路（${askedNearest.asPath.join(' ')}：${askedNearest.asPath.length} 個）を聞いています。BGP は AS パスの短い方を選び、遅延のことは知りません。だから${city(askedNearest.site)}なら ${askedNearest.rttMs} ms で応答できるのに、${city(asked.site)}へ行きます。エニーキャストで届くのは経路のうえで最も近い拠点で、たいていは地図上でも近いのですが、いつもではありません。パケットはどれも同じ経路をたどるので、すべて同じ拠点に届きます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="any-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Follow the routes', '経路をたどる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="any-withdraw">
          <div style={LESSON_LABEL}>{t('Take a site down', '拠点を止める')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'When a site fails or is taken down for maintenance, it withdraws its announcement. Nobody has to change anything else: every network falls back to the best route it still hears.',
              '拠点が故障したり保守で止めたりすると、その拠点は広告を取り下げます。ほかに何も変える必要はありません。各ネットワークは、まだ聞こえている経路のうち最良のものへ切り替わります。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Which site is down', '止める拠点')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {[null, ...SITES].map((site) => (
              <button
                key={site ?? 'none'}
                type="button"
                role="tab"
                aria-selected={down === site}
                data-testid={`any-down-${site ?? 'none'}`}
                onClick={() => setDown(site)}
                style={{ ...lessonChoice(down === site), minHeight: 44 }}
              >
                {down === site ? '✓ ' : ''}
                {site === null
                  ? t('All sites up', '全拠点が稼働')
                  : t(`${CITY[site][0]} withdrawn`, `${CITY[site][1]}を取り下げ`)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('User', '利用者')}</th>
                  <th style={cell}>{t('Reaches', '届く拠点')}</th>
                  <th style={cell}>{t('AS path', 'AS パス')}</th>
                  <th style={cell}>{t('Round trip', '往復')}</th>
                  <th style={cell}>{t('Lowest-latency site', '遅延が最小の拠点')}</th>
                </tr>
              </thead>
              <tbody>
                {USERS.map((user) => {
                  const route = routeFor(user, live)!;
                  const nearest = lowestLatency(user, live)!;
                  return (
                    <tr
                      key={user}
                      data-testid={`any-row-${user}`}
                      data-site={route.site}
                      data-rtt={route.rttMs}
                    >
                      <td style={cell}>{t(...NAMES[user])}</td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>{city(route.site)}</td>
                      <td style={mono}>{route.asPath.join(' ')}</td>
                      <td style={mono}>{`${route.rttMs} ms`}</td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                        {`${city(nearest.site)}, ${nearest.rttMs} ms`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p data-testid="any-shift" style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {moved.length === 0
              ? t('Nobody moves.', '移る利用者はいません。')
              : moved
                  .map(({ user, before, after }) =>
                    t(
                      `${NAMES[user][0]}: ${CITY[before.site][0]} → ${CITY[after.site][0]} (${before.rttMs} → ${after.rttMs} ms).`,
                      `${NAMES[user][1]}：${CITY[before.site][1]} → ${CITY[after.site][1]}（${before.rttMs} → ${after.rttMs} ms）。`,
                    ),
                  )
                  .join(' ')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Here the change is instant; in a real network the withdrawal takes from under a second to tens of seconds to spread, and some packets are lost meanwhile. A long TCP connection can break when its route shifts, because the new site knows nothing of the connection; that is why anycast suits DNS and other short exchanges so well.',
              'ここでは一瞬で切り替わりますが、実際のネットワークでは取り下げが伝わるまで 1 秒未満から数十秒かかり、その間に一部のパケットが失われます。長い TCP 接続は、途中で経路が変わると切れることがあります。新しい拠点はその接続を何も知らないからです。エニーキャストが DNS のような短いやりとりに特に向いているのはこのためです。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="any-dns">
          <div style={LESSON_LABEL}>
            {t('The other way: steering with DNS', 'もう 1 つの方法：DNS で振り分ける')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Many CDNs steer with DNS instead. Each site has its own unicast address, and the CDN’s authoritative DNS server answers with the address of the site nearest to whoever asks. But it is the resolver that asks, not the user. Two users, in Osaka and Chicago:',
              '多くの CDN は、かわりに DNS で振り分けます。拠点ごとに別のユニキャストアドレスを持ち、CDN の権威 DNS サーバは、問い合わせてきた相手に最も近い拠点のアドレスを答えます。ところが問い合わせてくるのは利用者ではなくリゾルバです。大阪とシカゴの 2 人の利用者で比べます。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Which resolver they use', '使うリゾルバ')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {RESOLVERS.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={resolver === r}
                data-testid={`any-resolver-${r}`}
                onClick={() => setResolver(r)}
                style={{ ...lessonChoice(resolver === r), minHeight: 44 }}
              >
                {resolver === r ? '✓ ' : ''}
                {resolverName(r)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('User', '利用者')}</th>
                  <th style={cell}>{t('Steered for', '誰の場所で決めたか')}</th>
                  <th style={cell}>{t('DNS answer', 'DNS の答え')}</th>
                  <th style={cell}>{t('Round trip', '往復')}</th>
                  <th style={cell}>{t('With anycast', 'エニーキャストなら')}</th>
                </tr>
              </thead>
              <tbody>
                {DNS_USERS.map((user) => {
                  const steer = dnsSteer(user, resolver);
                  const anycast = routeFor(user)!;
                  return (
                    <tr
                      key={user}
                      data-testid={`any-dns-${user}`}
                      data-server={steer.server}
                      data-rtt={steer.rttMs}
                    >
                      <td style={cell}>{t(...NAMES[user])}</td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                        {steer.seenFrom === user
                          ? t('the user', '利用者')
                          : t('London (the resolver)', 'ロンドン（リゾルバ）')}
                      </td>
                      <td style={mono}>{`${steer.address} (${city(steer.server)})`}</td>
                      <td style={mono}>{`${steer.rttMs} ms`}</td>
                      <td style={mono}>{`${anycast.rttMs} ms`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'With ECS (EDNS Client Subnet, RFC 7871) the resolver passes on part of the user’s address, such as its /24, so the answer can fit the user rather than the resolver, at some cost to privacy. Anycast needs none of this: the route from the user’s own network decides.',
              'ECS（EDNS Client Subnet、RFC 7871）を使うと、リゾルバは利用者のアドレスの一部（/24 など）を伝えるので、リゾルバではなく利用者に合った答えを返せます。そのかわりプライバシーは少し損なわれます。エニーキャストにはこうした仕組みは要りません。利用者自身のネットワークからの経路で決まるからです。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: every network is one AS with one location; it keeps the shortest AS path it hears and breaks ties by the lowest neighbour AS number, standing in for BGP’s later tie-breakers. Real networks also apply policy (local preference, which neighbours pay whom), which can override path length. Latencies are illustrative.',
              '簡略化しています。各ネットワークは 1 つの AS・1 か所とし、聞こえた中で最も短い AS パスを選び、同じ長さなら隣の AS 番号の小さい方を選ぶものとしました（BGP の後段の判定の代わりです）。実際のネットワークではポリシー（local preference や、どちらがお金を払う関係か）も効き、AS パスの長さより優先されることがあります。遅延の値は説明用です。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function AnycastDemo() {
  return (
    <DemoShell
      title="Anycast and CDNs"
      desc="One address announced from many places: which copy a user reaches, and what happens when one goes away"
    >
      <AnycastLesson />
    </DemoShell>
  );
}
