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
  ASM_GROUP,
  DEFAULT_RP,
  LINKS,
  RECEIVERS,
  ROUTERS,
  RP_CHOICES,
  SOURCE_IP,
  SOURCE_ROUTER,
  SSM_GROUP,
  linkKey,
  neighbours,
  rpfCheck,
  ssmTree,
  viaSharedTree,
  viaSourceTree,
  type RouterId,
  type TreeResult,
} from './pim';

type Answer = 'all' | 'r6' | 'r5-r7' | 'none';
const ANSWERS: readonly Answer[] = ['all', 'r6', 'r5-r7', 'none'];
type View = 'shared' | 'source' | 'ssm';
const VIEWS: readonly View[] = ['shared', 'source', 'ssm'];

const POS: Record<RouterId, { x: number; y: number }> = {
  R1: { x: 90, y: 170 },
  R2: { x: 190, y: 70 },
  R3: { x: 330, y: 130 },
  R4: { x: 190, y: 280 },
  R5: { x: 470, y: 300 },
  R6: { x: 470, y: 60 },
  R7: { x: 340, y: 240 },
};

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer a set of receivers still passing the RP matches. */
function answerOf(viaRp: readonly RouterId[]): Answer {
  const key = [...viaRp].sort().join(',');
  if (key === RECEIVERS.join(',')) return 'all';
  if (key === '') return 'none';
  if (key === 'R6') return 'r6';
  return 'r5-r7';
}

/** The routers and links; the links of `tree` are drawn bold when given. */
function Topology({ rp, tree }: { rp: RouterId | null; tree: TreeResult | null }) {
  const t = useT();
  const used = new Set(tree?.links ?? []);
  // On a phone the diagram would shrink its labels below ~9 px, so it keeps a
  // minimum width and scrolls sideways inside its card instead
  // (viewBox 560 wide with 11-unit labels: 560 × 9/11 ≈ 460).
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid="pim-map"
        viewBox="-10 20 560 320"
        style={{ width: '100%', maxWidth: 560, minWidth: 460 }}
        role="img"
        aria-label={t(
          'Seven routers. The source is behind R1; receivers are behind R5, R6 and R7. Each link shows its cost in ms.',
          '7 台のルータ。送信元は R1 の先、受信者は R5・R6・R7 の先にいます。リンクの数字はコスト（ms）です。',
        )}
      >
        {LINKS.map((link) => {
          const a = POS[link.a];
          const b = POS[link.b];
          const on = used.has(linkKey(link.a, link.b));
          return (
            <g key={linkKey(link.a, link.b)}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={on ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}
                strokeWidth={on ? 5 : 2}
              />
              <text
                x={(a.x + b.x) / 2 + 6}
                y={(a.y + b.y) / 2 - 6}
                fontSize={13}
                fill="var(--netlab-text-secondary)"
              >
                {link.cost}
              </text>
            </g>
          );
        })}
        <line
          x1={20}
          y1={170}
          x2={POS.R1.x}
          y2={170}
          stroke="var(--netlab-border)"
          strokeDasharray="4 3"
        />
        <text x={-6} y={160} fontSize={12} fill="var(--netlab-text-primary)">
          {t('Source', '送信元')}
        </text>
        <text x={-6} y={190} fontSize={11} fill="var(--netlab-text-secondary)">
          {SOURCE_IP}
        </text>
        {ROUTERS.map((router) => {
          const p = POS[router];
          const isRp = router === rp;
          return (
            <g key={router}>
              <circle
                cx={p.x}
                cy={p.y}
                r={18}
                fill="var(--netlab-bg-surface)"
                stroke={isRp ? 'var(--netlab-accent-orange)' : 'var(--netlab-border-strong)'}
                strokeWidth={isRp ? 4 : 2}
              />
              <text
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="var(--netlab-text-primary)"
              >
                {router}
              </text>
              {isRp ? (
                <text
                  x={p.x}
                  y={p.y - 24}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="var(--netlab-accent-orange)"
                >
                  RP
                </text>
              ) : null}
              {RECEIVERS.includes(router) ? (
                <text
                  x={p.x}
                  y={p.y + 34}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--netlab-text-secondary)"
                >
                  {t('receiver', '受信者')}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function PimLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rp, setRp] = useState<RouterId>(DEFAULT_RP);
  const [view, setView] = useState<View>('shared');
  const [rpfRouter, setRpfRouter] = useState<RouterId>('R5');
  const [rpfFrom, setRpfFrom] = useState<RouterId>('R3');
  const [rpfTree, setRpfTree] = useState<'shared' | 'source'>('source');

  const asked = viaSourceTree(DEFAULT_RP);
  const askedViaRp = asked.deliveries.filter((d) => d.viaRp).map((d) => d.receiver);
  const truth = answerOf(askedViaRp);

  const before = viaSharedTree(rp);
  const after = viaSourceTree(rp);
  const ssm = ssmTree();
  const shown = view === 'shared' ? before : view === 'source' ? after : ssm;
  const rpf = rpfCheck(
    rpfRouter,
    rpfFrom,
    rpfTree === 'shared' ? { tree: 'shared', rp } : { tree: 'source' },
  );
  const askedBefore = viaSharedTree(DEFAULT_RP);
  const r5Before = askedBefore.deliveries.find((d) => d.receiver === 'R5')!;
  const r5After = asked.deliveries.find((d) => d.receiver === 'R5')!;

  const answerName = (answer: Answer) =>
    ({
      all: t('All three still pass through the RP', '3 台とも、まだ RP を通る'),
      r6: t('Only R6’s traffic', 'R6 の通信だけ'),
      'r5-r7': t('Only R5’s and R7’s traffic', 'R5 と R7 の通信だけ'),
      none: t(
        'None: the source tree never passes the RP',
        'どれも通らない（送信元ツリーは RP を通らない）',
      ),
    })[answer];
  const viewName = (v: View) =>
    ({
      shared: t('Shared tree (*,G), before', '共有ツリー (*,G)・切り替え前'),
      source: t('Source tree (S,G), after', '送信元ツリー (S,G)・切り替え後'),
      ssm: t('SSM', 'SSM'),
    })[v];
  const route = (path: readonly RouterId[]) => path.join(' → ');

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
        <div style={LESSON_LABEL}>
          {t('Multicast across routers', 'ルータをまたぐマルチキャスト')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A source sends to the group ${ASM_GROUP}. Hosts behind R5, R6 and R7 joined it with an IGMP report, and their routers want the group's traffic. With PIM sparse mode (PIM-SM) nobody gets multicast unless they ask. The routers do not know where the source is, but they all know one meeting point, the rendezvous point (RP), here on R3. Each last-hop router sends a PIM Join hop by hop towards the RP, building a shared tree, (*,G). The source's router R1 sends the traffic to the RP, and the RP sends it down the shared tree.`,
            `送信元がグループ ${ASM_GROUP} へ送っています。R5・R6・R7 の先のホストが IGMP の Report でこのグループに参加したので、そのルータたちはグループの通信を欲しがっています。PIM スパースモード（PIM-SM）では、求めた先にしかマルチキャストは流れません。ルータは送信元がどこにいるか知りませんが、全員が 1 つの待ち合わせ場所、ランデブーポイント（RP）を知っています。ここでは R3 です。各ラストホップルータは RP に向けて PIM Join をホップごとに送り、共有ツリー (*,G) を作ります。送信元側のルータ R1 は通信を RP へ送り、RP がそれを共有ツリーに流します。`,
          )}
        </p>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            'Once a last-hop router gets the first packets, it learns the source address and can switch: it sends an (S,G) Join towards the source itself, along its own shortest path, and then prunes the source off the shared tree.',
            '最初のパケットが届くと、ラストホップルータは送信元のアドレスを知り、切り替えができます。自分から送信元に向けて、自分の最短経路に沿って (S,G) の Join を送り、そのあと共有ツリーからはその送信元を外す（Prune する）のです。',
          )}
        </p>
        <Topology rp={DEFAULT_RP} tree={null} />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Each link’s cost is also its one-way delay in ms, and unicast routing takes the path with the lowest total cost.',
            'リンクのコストはそのまま片道の遅延（ms）で、ユニキャストの経路はコストの合計が最小の道を選びます。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="pim-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'R5, R6 and R7 have all switched to the source tree. Whose traffic still passes through the RP router R3?',
            'R5・R6・R7 がすべて送信元ツリーに切り替えました。まだ RP のルータ R3 を通っているのは、どの受信者の通信？',
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
              data-testid={`pim-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left', minHeight: 44 }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="pim-reveal"
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
              `Only ${askedViaRp.join(', ')}. After the switch each receiver gets the traffic on its own shortest path from the source, and the RP has no special role on that tree. R5’s path is ${route(r5After.path)} (${r5After.delayMs} ms) instead of ${route(r5Before.path)} (${r5Before.delayMs} ms). R6’s shortest path to the source happens to run through R3, so its traffic still crosses that router — now on the (S,G) tree, not because R3 is the RP.`,
              `${askedViaRp.join('、')} だけです。切り替えたあとは、各受信者が送信元からの自分の最短経路で通信を受け取り、そのツリーでは RP に特別な役目はありません。R5 の経路は ${route(r5Before.path)}（${r5Before.delayMs} ms）から ${route(r5After.path)}（${r5After.delayMs} ms）に変わります。R6 は送信元への最短経路がたまたま R3 を通るので、通信はいまも R3 を通ります。ただし R3 が RP だからではなく、(S,G) ツリーの途中にあるからです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="pim-reveal-button"
            disabled={!guess}
            style={{
              ...LESSON_TEAL_BUTTON,
              marginTop: 8,
              minHeight: 44,
              opacity: guess ? 1 : 0.5,
            }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Build both trees', '2 つのツリーを作る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="pim-trees">
          <div style={LESSON_LABEL}>{t('Before and after the switch', '切り替えの前と後')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>{t('Put the RP on', 'RP の場所')}</span>
            <div
              role="tablist"
              aria-label={t('Where the RP is', 'RP の場所')}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
            >
              {RP_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="tab"
                  aria-selected={rp === choice}
                  data-testid={`pim-rp-${choice}`}
                  onClick={() => setRp(choice)}
                  style={{ ...lessonChoice(rp === choice), minHeight: 44 }}
                >
                  {rp === choice ? '✓ ' : ''}
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <div
            role="tablist"
            aria-label={t('Tree to draw', '描くツリー')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
          >
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                data-testid={`pim-view-${v}`}
                onClick={() => setView(v)}
                style={{ ...lessonChoice(view === v), minHeight: 44 }}
              >
                {view === v ? '✓ ' : ''}
                {viewName(v)}
              </button>
            ))}
          </div>
          <Topology rp={view === 'ssm' ? null : rp} tree={shown} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Receiver', '受信者')}</th>
                  <th style={cell}>{t('Shared tree: path', '共有ツリーの経路')}</th>
                  <th style={cell}>{t('Delay', '遅延')}</th>
                  <th style={cell}>{t('Source tree: path', '送信元ツリーの経路')}</th>
                  <th style={cell}>{t('Delay', '遅延')}</th>
                </tr>
              </thead>
              <tbody>
                {RECEIVERS.map((receiver, i) => {
                  const b = before.deliveries[i]!;
                  const a = after.deliveries[i]!;
                  return (
                    <tr
                      key={receiver}
                      data-testid={`pim-row-${receiver}`}
                      data-before={b.delayMs}
                      data-after={a.delayMs}
                      data-via-rp={String(a.viaRp)}
                    >
                      <td style={mono}>{receiver}</td>
                      <td style={mono}>{route(b.path)}</td>
                      <td style={mono}>{`${b.delayMs} ms`}</td>
                      <td style={mono}>{route(a.path)}</td>
                      <td style={mono}>{`${a.delayMs} ms`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p
            data-testid="pim-links"
            data-before-links={before.links.length}
            data-after-links={after.links.length}
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {t(
              `Links carrying the group: ${before.links.length} (cost ${before.linkCost}) on the shared tree, ${after.links.length} (cost ${after.linkCost}) on the source tree. Total delay to the three receivers: ${before.deliveries.reduce((s, d) => s + d.delayMs, 0)} ms before, ${after.deliveries.reduce((s, d) => s + d.delayMs, 0)} ms after.`,
              `グループの通信が流れるリンク：共有ツリーで ${before.links.length} 本（コスト ${before.linkCost}）、送信元ツリーで ${after.links.length} 本（コスト ${after.linkCost}）。3 受信者への遅延の合計：切り替え前 ${before.deliveries.reduce((s, d) => s + d.delayMs, 0)} ms、切り替え後 ${after.deliveries.reduce((s, d) => s + d.delayMs, 0)} ms。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Try the RP on R6: traffic for R5 and R7 climbs up to R6 and comes back down the same link, because the shared tree must pass the RP. An RP placed off the receivers’ paths costs delay until the switch. Many routers switch as soon as the first packet arrives; the switch is the last-hop router’s choice, not a rule of the protocol.',
              'RP を R6 に置いてみてください。共有ツリーは必ず RP を通るので、R5 と R7 への通信は R6 まで上ってから同じリンクを下りてきます。受信者の経路から外れた場所の RP は、切り替えまで遅延を増やします。多くのルータは最初のパケットが届いた時点で切り替えます。切り替えるかどうかはラストホップルータが決めることで、プロトコルの決まりではありません。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="pim-rpf">
          <div style={LESSON_LABEL}>{t('The RPF check', 'RPF チェック')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'A multicast packet’s destination is a group, so a router cannot check it against its routes the usual way. Instead it looks back at the source: it accepts the packet only on the interface it would itself use to reach the source (on the shared tree: the RP). That is the reverse path forwarding (RPF) check. Choose a router and where a copy comes from.',
              'マルチキャストの宛先はグループなので、ルータはいつものように宛先で経路を確かめられません。代わりに送信元を振り返り、自分が送信元へ向かうときに使うインタフェース（共有ツリーでは RP へ向かうインタフェース）に届いたパケットだけを受け入れます。これが RPF（逆経路転送）チェックです。ルータと、コピーがどこから届くかを選んでください。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Which tree', 'どのツリー')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {(['source', 'shared'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={rpfTree === mode}
                data-testid={`pim-rpf-tree-${mode}`}
                onClick={() => setRpfTree(mode)}
                style={{ ...lessonChoice(rpfTree === mode), minHeight: 44 }}
              >
                {rpfTree === mode ? '✓ ' : ''}
                {mode === 'source'
                  ? t('Source tree: look to the source', '送信元ツリー：送信元を見る')
                  : t(`Shared tree: look to the RP (${rp})`, `共有ツリー：RP（${rp}）を見る`)}
              </button>
            ))}
          </div>
          <div
            role="tablist"
            aria-label={t('Router', 'ルータ')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
          >
            {ROUTERS.filter((r) => r !== SOURCE_ROUTER).map((router) => (
              <button
                key={router}
                type="button"
                role="tab"
                aria-selected={rpfRouter === router}
                data-testid={`pim-rpf-router-${router}`}
                onClick={() => {
                  setRpfRouter(router);
                  setRpfFrom(neighbours(router)[0]!);
                }}
                style={{ ...lessonChoice(rpfRouter === router), minHeight: 44 }}
              >
                {rpfRouter === router ? '✓ ' : ''}
                {router}
              </button>
            ))}
          </div>
          <div
            role="tablist"
            aria-label={t('Arrives from', '届いた方向')}
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13 }}>{t('Arrives from', '届いた方向')}</span>
            {neighbours(rpfRouter).map((from) => (
              <button
                key={from}
                type="button"
                role="tab"
                aria-selected={rpfFrom === from}
                data-testid={`pim-rpf-from-${from}`}
                onClick={() => setRpfFrom(from)}
                style={{ ...lessonChoice(rpfFrom === from), minHeight: 44 }}
              >
                {rpfFrom === from ? '✓ ' : ''}
                {from}
              </button>
            ))}
          </div>
          <p
            data-testid="pim-rpf-result"
            data-accepted={String(rpf.accepted)}
            data-rpf={rpf.rpfNeighbour ?? ''}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {rpf.rpfNeighbour === null
              ? t(
                  `${rpfRouter} is the RP itself: it is the root of the shared tree and gets the source’s traffic from R1 (Register, then an (S,G) branch).`,
                  `${rpfRouter} は RP そのものです。共有ツリーの根で、送信元の通信は R1 から（Register、そのあと (S,G) の枝で）受け取ります。`,
                )
              : rpf.accepted
                ? t(
                    `Accepted: ${rpfRouter} reaches ${rpfTree === 'source' ? 'the source' : 'the RP'} through ${rpf.rpfNeighbour}, and the copy came from ${rpfFrom}.`,
                    `受け入れます。${rpfRouter} は ${rpf.rpfNeighbour} を通って${rpfTree === 'source' ? '送信元' : ' RP '}へ向かい、コピーも ${rpfFrom} から届きました。`,
                  )
                : t(
                    `Dropped: ${rpfRouter} reaches ${rpfTree === 'source' ? 'the source' : 'the RP'} through ${rpf.rpfNeighbour}, but the copy came from ${rpfFrom}.`,
                    `捨てます。${rpfRouter} は ${rpf.rpfNeighbour} を通って${rpfTree === 'source' ? '送信元' : ' RP '}へ向かうのに、コピーは ${rpfFrom} から届きました。`,
                  )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'This is what stops loops. The links R3–R5–R4–R7–R3 form a ring; if every router forwarded every copy it heard, copies would circle it for ever. With the RPF check each router takes the packet from exactly one neighbour, so the accepted copies form a tree. It also explains the switch: R5 accepts from R3 on the shared tree but from R4 on the source tree, which is why it joins the source tree before pruning the shared one.',
              'これがループを防ぎます。R3–R5–R4–R7–R3 のリンクは輪になっています。もしすべてのルータが聞こえたコピーをすべて転送したら、コピーは輪の中を回り続けます。RPF チェックがあれば、各ルータはちょうど 1 つの隣からだけパケットを受け取るので、受け入れたコピーはツリーになります。切り替えの手順もこれで説明できます。R5 は共有ツリーでは R3 から、送信元ツリーでは R4 から受け入れるので、まず送信元ツリーに参加してから共有ツリーを Prune するのです。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div
          style={LESSON_CARD}
          data-testid="pim-ssm"
          data-links={ssm.links.length}
          data-same={String(ssm.links.join() === viaSourceTree(rp).links.join())}
        >
          <div style={LESSON_LABEL}>
            {t('Source-specific multicast (SSM)', 'SSM（送信元指定マルチキャスト）')}
          </div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {t(
              `If the receivers already know the source, they can say so: with IGMPv3 (MLDv2 for IPv6) a host asks for (${SOURCE_IP}, ${SSM_GROUP}) — this source, this group. SSM groups use 232.0.0.0/8 (RFC 4607). The last-hop router sends an (S,G) Join straight towards the source, so there is no RP, no Register and no shared tree. The tree is the source tree from the first packet: ${ssm.links.length} links, delays ${ssm.deliveries.map((d) => `${d.receiver} ${d.delayMs} ms`).join(', ')}. Choose “SSM” above to draw it.`,
              `受信者が送信元を最初から知っているなら、それを伝えられます。IGMPv3（IPv6 では MLDv2）で、ホストは (${SOURCE_IP}, ${SSM_GROUP})、つまり「この送信元の、このグループ」を求めます。SSM のグループは 232.0.0.0/8 を使います（RFC 4607）。ラストホップルータは送信元へまっすぐ (S,G) の Join を送るので、RP も Register も共有ツリーもありません。ツリーは最初のパケットから送信元ツリーです。リンク ${ssm.links.length} 本、遅延は ${ssm.deliveries.map((d) => `${d.receiver} ${d.delayMs} ms`).join('、')}。上の「SSM」を選ぶと描けます。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: link cost equals delay and is the same in both directions; hosts sit on their routers; DR election, Assert, timers, Register-Stop and the (S,G,rpt) prune are left out. After the switch the RP’s own branch to the source is taken as pruned unless a receiver’s source tree runs through it. PIM-SM is RFC 7761.',
              '簡略化しています。リンクのコストは遅延と同じで、向きによらず等しいとしました。ホストはルータの上にいるものとし、DR の選出、Assert、タイマー、Register-Stop、(S,G,rpt) の Prune は省いています。切り替え後、RP から送信元への枝は、受信者の送信元ツリーが通らない限り Prune されたものとしています。PIM-SM は RFC 7761 です。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function PimDemo() {
  return (
    <DemoShell
      title="PIM multicast routing"
      desc="Shared tree, source tree and SSM: how routers build a multicast tree, and the check that keeps it loop-free"
    >
      <PimLesson />
    </DemoShell>
  );
}
