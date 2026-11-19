import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  BASE_NETWORK,
  DEFAULT_METRIC,
  DEFAULT_PREFIX,
  LEVELS,
  ROUTER_IDS,
  adjacency,
  nearestAttached,
  parseNet,
  pathMetric,
  routes,
  setsAttached,
  spf,
  trace,
  withLevels,
  type Adjacency,
  type Level,
  type Network,
  type RouterId,
} from './isis';

type Answer = 'direct' | 'via-r2' | 'via-r3' | 'none';
const ANSWERS: readonly Answer[] = ['direct', 'via-r2', 'via-r3', 'none'];
const ANSWER_PATHS: Record<Exclude<Answer, 'none'>, readonly RouterId[]> = {
  direct: ['R1', 'R5'],
  'via-r2': ['R1', 'R2', 'R4', 'R5'],
  'via-r3': ['R1', 'R3', 'R4', 'R5'],
};

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const LEVEL_NAME: Record<Level, string> = { L1: 'L1', L2: 'L2', L1L2: 'L1/L2' };
const ADJ_NAME: Record<Adjacency, string> = { L1: 'L1', L2: 'L2', L1L2: 'L1 + L2', none: '—' };

const POS: Record<RouterId, { x: number; y: number }> = {
  R1: { x: 50, y: 200 },
  R2: { x: 120, y: 50 },
  R3: { x: 140, y: 130 },
  R4: { x: 320, y: 50 },
  R5: { x: 390, y: 200 },
};

/** Which answer a traced path matches. */
function answerOf(network: Network): Answer {
  const result = trace(network, 'R1', 'R5');
  if (!result.reached) return 'none';
  const hops = result.hops.join(' ');
  const found = (Object.keys(ANSWER_PATHS) as Exclude<Answer, 'none'>[]).find(
    (answer) => ANSWER_PATHS[answer].join(' ') === hops,
  );
  return found ?? 'none';
}

/** The five routers, two areas and seven links; after the reveal, the adjacencies and the path. */
function Topology({ network, revealed }: { network: Network; revealed: boolean }) {
  const t = useT();
  const path = revealed ? trace(network, 'R1', 'R5').hops : [];
  const onPath = (a: RouterId, b: RouterId) =>
    path.some(
      (id, i) => i > 0 && ((path[i - 1] === a && id === b) || (path[i - 1] === b && id === a)),
    );
  return (
    <svg
      data-testid="isis-topology"
      viewBox="0 0 440 250"
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        'Area 49.0001 holds R1, R2 and R3; area 49.0002 holds R4 and R5. Links: R1–R2, R1–R3, R2–R3, R2–R4, R3–R4, R4–R5 and R1–R5.',
        'エリア 49.0001 に R1・R2・R3、エリア 49.0002 に R4・R5。リンクは R1–R2、R1–R3、R2–R3、R2–R4、R3–R4、R4–R5、R1–R5 です。',
      )}
    >
      <rect
        x={10}
        y={14}
        width={190}
        height={226}
        rx={14}
        fill="none"
        stroke="var(--netlab-border-strong)"
        strokeDasharray="6 4"
      />
      <rect
        x={270}
        y={14}
        width={160}
        height={226}
        rx={14}
        fill="none"
        stroke="var(--netlab-border-strong)"
        strokeDasharray="6 4"
      />
      <text x={20} y={30} fontSize={11} fill="var(--netlab-text-secondary)">
        {t('area 49.0001', 'エリア 49.0001')}
      </text>
      <text x={420} y={30} fontSize={11} textAnchor="end" fill="var(--netlab-text-secondary)">
        {t('area 49.0002', 'エリア 49.0002')}
      </text>
      {network.links.map((link) => {
        const a = POS[link.a];
        const b = POS[link.b];
        const adj = adjacency(network, link.a, link.b);
        const hot = onPath(link.a, link.b);
        const stroke = !revealed
          ? 'var(--netlab-text-secondary)'
          : hot
            ? 'var(--netlab-accent-cyan)'
            : adj === 'none'
              ? 'var(--netlab-accent-red)'
              : 'var(--netlab-text-secondary)';
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={`${link.a}-${link.b}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={stroke}
              strokeWidth={hot ? 4 : 2}
              strokeDasharray={revealed && adj === 'none' ? '4 4' : undefined}
            />
            <rect
              x={mx - 36}
              y={my - 9}
              width={72}
              height={18}
              rx={4}
              fill="var(--netlab-bg-primary)"
            />
            <text
              x={mx}
              y={my + 4}
              fontSize={11}
              textAnchor="middle"
              fill="var(--netlab-text-primary)"
              fontFamily="monospace"
            >
              {revealed
                ? `${link.metric} ${ADJ_NAME[adj] === '—' ? '✕' : ADJ_NAME[adj]}`
                : String(link.metric)}
            </text>
          </g>
        );
      })}
      {network.routers.map((r) => {
        const p = POS[r.id];
        return (
          <g key={r.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={18}
              fill="var(--netlab-bg-surface)"
              stroke="var(--netlab-text-primary)"
              strokeWidth={1.5}
            />
            <text
              x={p.x}
              y={p.y + 4}
              fontSize={12}
              fontWeight={700}
              textAnchor="middle"
              fill="var(--netlab-text-primary)"
            >
              {r.id}
            </text>
            <text
              x={p.x}
              y={p.y + 32}
              fontSize={11}
              textAnchor="middle"
              fill="var(--netlab-text-secondary)"
              fontFamily="monospace"
            >
              {LEVEL_NAME[r.level]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function IsisLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [netText, setNetText] = useState('49.0001.0000.0000.0001.00');
  const [r1Level, setR1Level] = useState<Level>('L1');
  const [r5Level, setR5Level] = useState<Level>('L1');
  const [root, setRoot] = useState<RouterId>('R1');

  const base = BASE_NETWORK;
  const truth = answerOf(base);
  const baseTrace = trace(base, 'R1', 'R5');
  const exit = nearestAttached(base, 'R1');
  const viaR3 = spf(base, 'R1', 'L1').find((e) => e.to === 'R3');
  const network = withLevels(base, { R1: r1Level, R5: r5Level });
  const live = trace(network, 'R1', 'R5');
  const parts = parseNet(netText);

  const answerName = (answer: Answer) =>
    answer === 'none'
      ? t('It cannot reach R5’s LAN at all', 'R5 の LAN にはまったく届かない')
      : t(
          `${ANSWER_PATHS[answer].join(' → ')} (total metric ${pathMetric(base, ANSWER_PATHS[answer])})`,
          `${ANSWER_PATHS[answer].join(' → ')}（メトリック合計 ${pathMetric(base, ANSWER_PATHS[answer])}）`,
        );
  const sourceName = (source: string) =>
    ({
      connected: t('connected', '直結'),
      L1: 'L1',
      L2: 'L2',
      'L1-default': t('L1 default (ATT)', 'L1 デフォルト（ATT）'),
    })[source] ?? source;

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
        <div style={LESSON_LABEL}>IS-IS</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'IS-IS is a link-state routing protocol like OSPF: every router floods what it knows about its links, builds the same map, and runs SPF (Dijkstra) on it. Many service providers and large data centres run IS-IS rather than OSPF. Each router is named by a NET, and is configured as Level 1 (L1), Level 2 (L2) or both (L1/L2).',
            'IS-IS は OSPF と同じリンクステート型のルーティングプロトコルです。各ルータが自分のリンクの情報を流し、全員が同じ地図を作って SPF（ダイクストラ法）で経路を計算します。多くの通信事業者や大規模データセンターは OSPF ではなく IS-IS を使います。ルータは NET というアドレスで識別され、レベル 1（L1）、レベル 2（L2）、またはその両方（L1/L2）として設定されます。',
          )}
        </p>
        <label style={{ display: 'grid', gap: 4, marginTop: 10, fontSize: 13 }}>
          {t('Read a NET', 'NET を読む')}
          <input
            type="text"
            value={netText}
            data-testid="isis-net-input"
            onChange={(event) => setNetText(event.target.value)}
            spellCheck={false}
            style={{
              minHeight: 44,
              fontFamily: 'monospace',
              fontSize: 14,
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: 360,
            }}
          />
        </label>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          {parts ? (
            <table style={{ borderCollapse: 'collapse' }} data-testid="isis-net">
              <tbody>
                <tr>
                  <td style={cell}>{t('Area address', 'エリアアドレス')}</td>
                  <td style={mono} data-testid="isis-net-area">
                    {parts.area}
                  </td>
                  <td style={cell}>
                    {parts.afi === '49'
                      ? t(
                          'AFI 49: private addressing, like 10.0.0.0/8 in IPv4',
                          'AFI 49：プライベート用。IPv4 の 10.0.0.0/8 のようなもの',
                        )
                      : t(`AFI ${parts.afi}`, `AFI ${parts.afi}`)}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>{t('System ID', 'システム ID')}</td>
                  <td style={mono} data-testid="isis-net-system">
                    {parts.systemId}
                  </td>
                  <td style={cell}>
                    {t('6 bytes, unique per router', '6 バイト。ルータごとに一意')}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>NSEL</td>
                  <td style={mono} data-testid="isis-net-nsel">
                    {parts.nsel}
                  </td>
                  <td style={cell}>{t('always 00 for a router', 'ルータでは常に 00')}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p
              data-testid="isis-net-invalid"
              style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}
            >
              {t(
                'Not a NET: it needs an area (at least one byte), a 6-byte system ID and the NSEL 00, in hex.',
                'NET ではありません。16 進で、エリア（1 バイト以上）、6 バイトのシステム ID、NSEL 00 が必要です。',
              )}
            </p>
          )}
        </div>
      </div>

      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('The network', 'ネットワーク')}</div>
        <Topology network={revealed ? network : base} revealed={revealed} />
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Each link shows its metric. Every router Rn has the LAN 10.0.n.0/24.',
            'リンクの数字はメトリックです。ルータ Rn にはそれぞれ LAN 10.0.n.0/24 があります。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="isis-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'R1 sends a packet to R5’s LAN, 10.0.5.0/24. Which way does it go?',
            'R1 が R5 の LAN（10.0.5.0/24）へパケットを送ります。どの経路を通る？',
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
              data-testid={`isis-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="isis-reveal"
            data-right={String(guess === truth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${baseTrace.hops.join(' → ')}, total metric ${baseTrace.metric}. R1 and R5 are both Level 1 routers in different areas, and Level 1 adjacencies form only inside an area, so the direct link carries no IS-IS at all. R1 knows only its own area. It does not know 10.0.5.0/24; it uses a default route to the nearest router that sets the attached (ATT) bit: ${exit?.to} at metric ${exit?.metric} (R3 is ${viaR3?.metric} away). ${exit?.to} reaches R5’s LAN over Level 2 through R4, and R4 delivers it within its area over Level 1.`,
              `${baseTrace.hops.join(' → ')}、メトリック合計 ${baseTrace.metric} です。R1 と R5 はどちらもレベル 1 のルータで、エリアがちがいます。レベル 1 の隣接はエリアの中でしか作られないので、直結のリンクには IS-IS がまったく流れません。R1 が知っているのは自分のエリアだけで、10.0.5.0/24 は知りません。代わりに、attached（ATT）ビットを立てたいちばん近いルータへのデフォルトルートを使います。それは ${exit?.to}（メトリック ${exit?.metric}）で、R3 は ${viaR3?.metric} 先です。${exit?.to} はレベル 2 で R4 経由で R5 の LAN へ届け、R4 は自分のエリアの中をレベル 1 で届けます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="isis-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run SPF and follow the packet', 'SPF を実行してパケットを追う')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="isis-adjacencies">
          <div style={LESSON_LABEL}>{t('Which adjacencies form', 'どの隣接ができるか')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Link', 'リンク')}</th>
                  <th style={cell}>{t('Levels', 'レベル')}</th>
                  <th style={cell}>{t('Areas', 'エリア')}</th>
                  <th style={cell}>{t('Adjacency', '隣接')}</th>
                </tr>
              </thead>
              <tbody>
                {network.links.map((link) => {
                  const ra = network.routers.find((r) => r.id === link.a)!;
                  const rb = network.routers.find((r) => r.id === link.b)!;
                  const adj = adjacency(network, link.a, link.b);
                  return (
                    <tr
                      key={`${link.a}-${link.b}`}
                      data-testid={`isis-adj-${link.a}-${link.b}`}
                      data-adj={adj}
                    >
                      <td style={mono}>{`${link.a}–${link.b}`}</td>
                      <td style={mono}>{`${LEVEL_NAME[ra.level]} / ${LEVEL_NAME[rb.level]}`}</td>
                      <td
                        style={mono}
                      >{`${parseNet(ra.net)!.area} / ${parseNet(rb.net)!.area}`}</td>
                      <td style={mono}>{adj === 'none' ? t('none', 'なし') : ADJ_NAME[adj]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Level 1 forms only when both routers run Level 1 and share an area. Level 2 forms whenever both run Level 2, whatever their areas. So the border between areas lies on a link (R2–R4, R3–R4, R1–R5): each router sits wholly inside one area. In OSPF the border runs through a router instead: an ABR has interfaces in two areas.',
              'レベル 1 の隣接は、両方がレベル 1 を動かしていて同じエリアにいるときだけできます。レベル 2 の隣接は、両方がレベル 2 を動かしていれば、エリアに関係なくできます。だからエリアの境界はリンクの上（R2–R4、R3–R4、R1–R5）にあり、各ルータはまるごと 1 つのエリアに属します。OSPF では境界はルータの中を通り、ABR はインタフェースを 2 つのエリアに置きます。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="isis-levels">
          <div style={LESSON_LABEL}>
            {t('Change the levels of R1 and R5', 'R1 と R5 のレベルを変える')}
          </div>
          {(['R1', 'R5'] as const).map((id) => {
            const value = id === 'R1' ? r1Level : r5Level;
            const set = id === 'R1' ? setR1Level : setR5Level;
            return (
              <div
                key={id}
                role="tablist"
                aria-label={t(`${id}’s level`, `${id} のレベル`)}
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 28 }}>{id}</span>
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="tab"
                    aria-selected={value === level}
                    data-testid={`isis-level-${id}-${level}`}
                    onClick={() => set(level)}
                    style={{ ...lessonChoice(value === level), minHeight: 44 }}
                  >
                    {value === level ? '✓ ' : ''}
                    {LEVEL_NAME[level]}
                  </button>
                ))}
              </div>
            );
          })}
          <p
            data-testid="isis-trace"
            data-reached={String(live.reached)}
            data-hops={live.hops.join(' ')}
            data-metric={live.metric}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {live.reached
              ? t(
                  `R1 → R5’s LAN: ${live.hops.join(' → ')}, metric ${live.metric}. R1–R5 adjacency: ${ADJ_NAME[adjacency(network, 'R1', 'R5')] === '—' ? 'none' : ADJ_NAME[adjacency(network, 'R1', 'R5')]}.`,
                  `R1 → R5 の LAN：${live.hops.join(' → ')}、メトリック ${live.metric}。R1–R5 の隣接：${ADJ_NAME[adjacency(network, 'R1', 'R5')] === '—' ? 'なし' : ADJ_NAME[adjacency(network, 'R1', 'R5')]}。`,
                )
              : t(
                  `R1 cannot reach R5’s LAN: the packet stops at ${live.hops[live.hops.length - 1]}, which has no route to it.`,
                  `R1 は R5 の LAN に届きません。パケットは経路を持たない ${live.hops[live.hops.length - 1]} で止まります。`,
                )}
          </p>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse' }}
              data-testid="isis-r1-routes"
            >
              <caption
                style={{ textAlign: 'left', fontSize: 13, fontWeight: 700, paddingBottom: 4 }}
              >
                {t('R1’s routing table', 'R1 のルーティングテーブル')}
              </caption>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Prefix', 'プレフィックス')}</th>
                  <th style={cell}>{t('From', '出どころ')}</th>
                  <th style={cell}>{t('Metric', 'メトリック')}</th>
                  <th style={cell}>{t('Next hop', 'ネクストホップ')}</th>
                </tr>
              </thead>
              <tbody>
                {routes(network, 'R1').map((route) => (
                  <tr
                    key={route.prefix}
                    data-testid={route.prefix === DEFAULT_PREFIX ? 'isis-route-default' : undefined}
                    data-metric={route.metric}
                    data-next-hop={route.nextHop ?? ''}
                  >
                    <td style={mono}>{route.prefix}</td>
                    <td style={mono}>{sourceName(route.source)}</td>
                    <td style={mono}>{route.metric}</td>
                    <td style={mono}>{route.nextHop ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Routers setting ATT now: ${ROUTER_IDS.filter((id) => setsAttached(network, id)).join(', ') || 'none'}. An L1/L2 router carries its area’s prefixes into Level 2, but by default does not carry Level 2 prefixes down into Level 1: an L1 router only gets the default route. An L1/L2 router ignores ATT and uses its own Level 2 routes.`,
              `いま ATT を立てているルータ：${ROUTER_IDS.filter((id) => setsAttached(network, id)).join('、') || 'なし'}。L1/L2 ルータは自分のエリアのプレフィックスをレベル 2 へ運びますが、初期設定ではレベル 2 のプレフィックスをレベル 1 へは降ろしません。L1 ルータが受け取るのはデフォルトルートだけです。L1/L2 ルータは ATT を見ず、自分のレベル 2 の経路を使います。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="isis-spf">
          <div style={LESSON_LABEL}>{t('SPF on each database', 'データベースごとの SPF')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'A router keeps one link-state database per level and runs SPF on each separately. Choose the router to run it from:',
              'ルータはレベルごとにリンクステートデータベースを持ち、それぞれで別々に SPF を実行します。どのルータから計算するか選んでください。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('SPF root', 'SPF の起点')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {ROUTER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={root === id}
                data-testid={`isis-spf-root-${id}`}
                onClick={() => setRoot(id)}
                style={{ ...lessonChoice(root === id), minHeight: 44 }}
              >
                {root === id ? '✓ ' : ''}
                {id}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('To', '宛先')}</th>
                  <th style={cell}>{t('Level 1: metric, path', 'レベル 1：メトリック・経路')}</th>
                  <th style={cell}>{t('Level 2: metric, path', 'レベル 2：メトリック・経路')}</th>
                </tr>
              </thead>
              <tbody>
                {ROUTER_IDS.map((to) => {
                  const l1 = spf(network, root, 'L1').find((e) => e.to === to);
                  const l2 = spf(network, root, 'L2').find((e) => e.to === to);
                  return (
                    <tr
                      key={to}
                      data-testid={`isis-spf-row-${to}`}
                      data-l1={l1?.metric ?? ''}
                      data-l2={l2?.metric ?? ''}
                    >
                      <td style={mono}>{to}</td>
                      <td style={mono}>{l1 ? `${l1.metric}  ${l1.path.join('→')}` : '—'}</td>
                      <td style={mono}>{l2 ? `${l2.metric}  ${l2.path.join('→')}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="isis-ospf">
          <div style={LESSON_LABEL}>
            {t('IS-IS and OSPF side by side', 'IS-IS と OSPF を並べる')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell} />
                  <th style={cell}>IS-IS</th>
                  <th style={cell}>OSPF</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    t('Carried in', '運ばれ方'),
                    t(
                      'Directly in layer 2 frames, not in IP',
                      'IP ではなく、レイヤ 2 のフレームに直接',
                    ),
                    t('IP packets (protocol 89)', 'IP パケット（プロトコル番号 89）'),
                  ],
                  [
                    t('Area border', 'エリアの境界'),
                    t(
                      'On a link; each router is in one area',
                      'リンク上。各ルータは 1 つのエリアに属する',
                    ),
                    t('Inside an ABR, between its interfaces', 'ABR の中、インタフェースの間'),
                  ],
                  [
                    t('Backbone', 'バックボーン'),
                    t(
                      'The connected chain of Level 2 routers',
                      'つながったレベル 2 ルータの連なり',
                    ),
                    t('Area 0', 'エリア 0'),
                  ],
                  [
                    t('Leaving the area', 'エリアの外へ'),
                    t(
                      'L1 routers: default to the nearest ATT router',
                      'L1 ルータ：いちばん近い ATT ルータへのデフォルト',
                    ),
                    t(
                      'Normal areas learn every area’s routes; a stub area gets a default in place of external routes',
                      '通常エリアは全エリアの経路を学ぶ。スタブエリアは外部経路の代わりにデフォルトを受け取る',
                    ),
                  ],
                  [
                    t('Extending it', '拡張'),
                    t('New TLVs in the same LSPs', '同じ LSP に新しい TLV を足す'),
                    t(
                      'New LSA types; IPv6 needed a new version, OSPFv3',
                      '新しい LSA タイプ。IPv6 には新版 OSPFv3 が必要だった',
                    ),
                  ],
                  [
                    t('Router identity', 'ルータの識別'),
                    t('System ID in the NET', 'NET の中のシステム ID'),
                    t('Router ID (32-bit)', 'ルータ ID（32 ビット）'),
                  ],
                ].map(([what, isis, ospf]) => (
                  <tr key={what}>
                    <td style={{ ...cell, fontWeight: 700 }}>{what}</td>
                    <td style={cell}>{isis}</td>
                    <td style={cell}>{ospf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `Because IS-IS is not tied to IP and grows by adding TLVs, the same protocol carries IPv4 and IPv6 prefixes side by side (RFC 5308), and segment routing labels ride in extra TLVs too. Wide metrics (RFC 5305) give each link a 24-bit metric, where the original narrow metrics stopped at 63; many implementations give every interface ${DEFAULT_METRIC} unless told otherwise, as in this network.`,
              `IS-IS は IP に縛られず、TLV を足して拡張できるので、同じプロトコルで IPv4 と IPv6 のプレフィックスを並べて運べます（RFC 5308）。セグメントルーティングのラベルも TLV を足して載せます。ワイドメトリック（RFC 5305）ではリンクのメトリックが 24 ビットになります。元のナローメトリックは 63 までしかありませんでした。多くの実装では、指定しなければどのインタフェースも ${DEFAULT_METRIC} になります。このネットワークもそうです。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: one area address and one LAN per router, point-to-point links only (no DIS election), equal-cost ties go to the lower router name instead of being shared (ECMP), an L1/L2 router sets ATT when Level 2 reaches another area, and no route leaking from Level 2 into Level 1.',
              '簡略化しています。ルータごとにエリアアドレスと LAN は 1 つ、リンクはポイントツーポイントだけ（DIS の選出なし）、等コストの経路は分け合わず（ECMP なし）名前の小さいルータを選び、L1/L2 ルータはレベル 2 で別のエリアに届くときに ATT を立て、レベル 2 からレベル 1 への経路のリークはしないものとしました。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function IsisDemo() {
  return (
    <DemoShell
      title="IS-IS"
      desc="The link-state routing protocol of providers and data centres: NETs, levels and areas, and how it differs from OSPF"
    >
      <IsisLesson />
    </DemoShell>
  );
}
