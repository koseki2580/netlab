import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  DEST,
  NO_FS,
  ROUTER,
  WITH_FS,
  failSuccessor,
  pathFrom,
  select,
  topologyTable,
  withCtoN,
  type NeighbourRow,
  type Selection,
  type Topology,
} from './eigrp';

type Answer = 'b' | 'bc' | 'bd' | 'bcd' | 'none';
const ANSWERS: readonly Answer[] = ['bcd', 'bc', 'b', 'bd', 'none'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const num: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const metric = (value: number) => (Number.isFinite(value) ? String(value) : '∞');

/** The answer id for a set of feasible successors. */
function answerOf(selection: Selection): string {
  const set = selection.feasibleSuccessors.map((row) => row.id.toLowerCase()).join('');
  return set === '' ? 'none' : set;
}

const POSITIONS: Record<Topology['id'], Record<string, readonly [number, number]>> = {
  'with-fs': {
    R1: [50, 112],
    A: [260, 28],
    B: [260, 84],
    C: [260, 140],
    D: [260, 196],
    N: [470, 112],
  },
  'no-fs': {
    R1: [50, 112],
    A: [260, 28],
    C: [260, 112],
    X: [170, 196],
    Y: [340, 196],
    N: [470, 112],
  },
};

function TopologyDiagram({ topology }: { topology: Topology }) {
  const t = useT();
  const at = POSITIONS[topology.id];
  // Labels are 12 user units; below 390 px they would shrink under 9 px, so the diagram keeps
  // that width and scrolls sideways inside its card instead.
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid={`eigrp-diagram-${topology.id}`}
        viewBox="0 0 520 224"
        style={{ width: '100%', maxWidth: 520, minWidth: 390 }}
        role="img"
        aria-label={t(
          `Routers and link costs: ${topology.links.map((link) => `${link.a}–${link.b} ${link.cost}`).join(', ')}`,
          `ルータとリンクのコスト：${topology.links.map((link) => `${link.a}–${link.b} ${link.cost}`).join('、')}`,
        )}
      >
        {topology.links.map((link) => {
          const [x1, y1] = at[link.a]!;
          const [x2, y2] = at[link.b]!;
          return (
            <g key={`${link.a}-${link.b}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--netlab-border-strong)" />
              {/* The cost sits on its own line's midpoint, boxed so it reads as that link's label. */}
              <rect
                x={(x1 + x2) / 2 - 12}
                y={(y1 + y2) / 2 - 9}
                width={24}
                height={18}
                rx={4}
                fill="var(--netlab-bg-surface)"
                stroke="var(--netlab-border-strong)"
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 + 4}
                textAnchor="middle"
                fontSize={12}
                fontFamily="monospace"
                fill="var(--netlab-accent-cyan)"
              >
                {link.cost}
              </text>
            </g>
          );
        })}
        {Object.entries(at).map(([name, [x, y]]) => (
          <g key={name}>
            <circle
              cx={x}
              cy={y}
              r={name === DEST ? 20 : 16}
              fill="var(--netlab-bg-surface)"
              stroke={name === ROUTER ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border-strong)'}
              strokeWidth={2}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="var(--netlab-text-primary)"
            >
              {name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** R1's topology table; roles appear only when `selection` is given (after the reveal). */
function NeighbourTable({
  rows,
  selection,
  testid,
}: {
  rows: readonly NeighbourRow[];
  selection?: Selection;
  testid: string;
}) {
  const t = useT();
  const role = (row: NeighbourRow) => {
    if (!selection) return null;
    if (row.id === selection.successor.id) return t('Successor', 'サクセサ');
    if (selection.feasibleSuccessors.some((fs) => fs.id === row.id))
      return t(
        `Feasible successor (${metric(row.rd)} < ${selection.feasibleDistance})`,
        `フィージブルサクセサ（${metric(row.rd)} < ${selection.feasibleDistance}）`,
      );
    return t(
      `Not a backup (${metric(row.rd)} ≥ ${selection.feasibleDistance})`,
      `予備にならない（${metric(row.rd)} ≥ ${selection.feasibleDistance}）`,
    );
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table data-testid={testid} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
            <th style={cell}>{t('Neighbour', 'ネイバー')}</th>
            <th style={cell}>{t('Link to R1', 'R1 とのリンク')}</th>
            <th style={cell}>{t('Reported distance (RD)', '報告距離（RD）')}</th>
            <th style={cell}>{t('R1’s total via it', 'R1 から見た合計')}</th>
            {selection ? <th style={cell}>{t('Role', '役割')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-testid={`${testid}-${row.id}`} data-fd={row.fd}>
              <td style={{ ...cell, fontWeight: 700 }}>{row.id}</td>
              <td style={num}>{row.link}</td>
              <td style={num}>{metric(row.rd)}</td>
              <td style={num}>{`${row.link} + ${metric(row.rd)} = ${metric(row.fd)}`}</td>
              {selection ? <td style={cell}>{role(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function EigrpLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tab, setTab] = useState<Topology['id']>('with-fs');
  const [cToN, setCToN] = useState(30);

  const rows = topologyTable(WITH_FS);
  const selection = select(rows);
  const truth = answerOf(selection);
  const fd = selection.feasibleDistance;
  const row = (id: string) => rows.find((entry) => entry.id === id)!;

  const topology = tab === 'with-fs' ? WITH_FS : NO_FS;
  const tabRows = topologyTable(topology);
  const tabSelection = select(tabRows);
  const failover = failSuccessor(topology);
  const loopPath = pathFrom(NO_FS, 'X');
  const noFsRows = topologyTable(NO_FS);
  const noFsFd = select(noFsRows).feasibleDistance;
  const x = noFsRows.find((entry) => entry.id === 'X')!;
  const c = noFsRows.find((entry) => entry.id === 'C')!;

  const whatIf = select(topologyTable(withCtoN(cToN)));

  const answerName = (answer: Answer) =>
    ({
      b: t('B only', 'B だけ'),
      bc: t('B and C', 'B と C'),
      bd: t('B and D', 'B と D'),
      bcd: t('B, C and D', 'B、C、D のすべて'),
      none: t('None of them', 'どれも当てはまらない'),
    })[answer];

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
        <div style={LESSON_LABEL}>{t('EIGRP and DUAL', 'EIGRP と DUAL')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'EIGRP is a routing protocol created by Cisco and later published as the informational RFC 7868. Its route calculation, DUAL, has a trick: it can keep a backup route ready, and switch to it the instant the main one fails, without asking anyone. But it only keeps a backup it can prove is loop-free.',
            'EIGRP は Cisco が作り、のちに情報提供の RFC 7868 として公開されたルーティングプロトコルです。経路計算の仕組み DUAL には工夫があります。予備の経路を用意しておき、本命が落ちた瞬間に誰にも問い合わせずに切り替えられるのです。ただし予備にするのは、ループしないと証明できる経路だけです。',
          )}
        </p>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'R1 has four neighbours, A to D, and each tells R1 its own distance to network N: the reported distance (RD). R1 adds the cost of its link to that neighbour. The neighbour with the lowest total is the successor, the route R1 uses, and that lowest total is R1’s feasible distance (FD).',
            'R1 には A から D の 4 つのネイバーがあり、それぞれが自分からネットワーク N までの距離を R1 に伝えます。これが報告距離（RD）です。R1 はそこに、そのネイバーとのリンクのコストを足します。合計がいちばん小さいネイバーがサクセサ（R1 が実際に使う経路）で、その最小の合計が R1 のフィージブルディスタンス（FD）です。',
          )}
        </p>
        <TopologyDiagram topology={WITH_FS} />
        <NeighbourTable rows={rows} testid="eigrp-table" />
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Simplified: one small number per link stands for EIGRP’s composite metric (built from bandwidth and delay). Real metrics are much larger numbers, and there are no ties here.',
            '簡略化しています。リンクごとの小さな数 1 つで、EIGRP の複合メトリック（帯域幅と遅延から計算）を表しています。実際のメトリックはずっと大きな数で、ここでは同点もありません。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="eigrp-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `R1 uses ${selection.successor.id}. Which of the others does DUAL keep as instant, loop-free backups (feasible successors)? Hint: what does a neighbour’s own distance tell R1 about whether that neighbour’s path could pass back through R1?`,
            `R1 は ${selection.successor.id} を使います。残りのうち、DUAL がすぐに切り替えられるループのない予備（フィージブルサクセサ）として持っておくのはどれ？ ヒント：ネイバー自身の距離から、そのネイバーの経路が R1 を通って戻ってくる可能性について何がわかるでしょうか。`,
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
              data-testid={`eigrp-guess-${answer}`}
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
          <div
            data-testid="eigrp-reveal"
            data-right={String(guess === truth)}
            data-fs={truth}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <p style={{ margin: 0 }}>
              <strong>
                {guess === truth
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `${selection.feasibleSuccessors.map((entry) => entry.id).join(' and ')}. The feasibility condition: a neighbour qualifies only if its reported distance is strictly less than R1’s feasible distance, here ${fd}. B reports ${row('B').rd} < ${fd}: yes. C reports ${row('C').rd}, which is not less than ${fd}: no, even though its total (${row('C').fd}) is only ${row('C').fd - row('B').fd} more than B’s. D reports ${row('D').rd} < ${fd}: yes, even though its total (${row('D').fd}) is the worst.`,
                `${selection.feasibleSuccessors.map((entry) => entry.id).join(' と ')} です。フィージブル条件では、ネイバーの報告距離が R1 のフィージブルディスタンス（ここでは ${fd}）より厳密に小さいときだけ予備にできます。B の報告は ${row('B').rd} < ${fd} なので合格。C の報告 ${row('C').rd} は ${fd} より小さくないので不合格です。C は合計 ${row('C').fd} で B と ${row('C').fd - row('B').fd} しか違わないのに、予備になれません。D の報告は ${row('D').rd} < ${fd} なので合格。D は合計 ${row('D').fd} でいちばん遠いのに、予備になれます。`,
              )}
            </p>
            <p style={{ margin: '8px 0 0' }}>
              {t(
                `Why it works: any path that runs through R1 costs at least R1’s own distance, ${fd}. A neighbour whose own distance is below ${fd} therefore cannot be using R1, so sending traffic to it can never come back. The test is cautious: C’s path does not actually loop, but R1 cannot prove that from the number ${row('C').rd} alone, so it does not count on C.`,
                `なぜこれで安全なのか。R1 を通る経路は、少なくとも R1 自身の距離 ${fd} はかかります。だから自分の距離が ${fd} より小さいネイバーは R1 を使っているはずがなく、そこへ送った通信が戻ってくることはありません。この判定は慎重です。C の経路は実際にはループしませんが、R1 は ${row('C').rd} という数だけからはそれを証明できないので、C を当てにしません。`,
              )}
            </p>
          </div>
        ) : (
          <button
            type="button"
            data-testid="eigrp-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Check the condition', '条件を確かめる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="eigrp-fail">
          <div style={LESSON_LABEL}>
            {t('The successor’s link fails', 'サクセサへのリンクが切れる')}
          </div>
          <div
            role="tablist"
            aria-label={t('Network', 'ネットワーク')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {(['with-fs', 'no-fs'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                data-testid={`eigrp-tab-${id}`}
                onClick={() => setTab(id)}
                style={{ ...lessonChoice(tab === id), minHeight: 44 }}
              >
                {tab === id ? '✓ ' : ''}
                {id === 'with-fs'
                  ? t('With a feasible successor', 'フィージブルサクセサあり')
                  : t('Without one', 'フィージブルサクセサなし')}
              </button>
            ))}
          </div>
          <TopologyDiagram topology={topology} />
          <NeighbourTable rows={tabRows} selection={tabSelection} testid="eigrp-fail-table" />
          <p
            data-testid="eigrp-failover"
            data-state={failover.state}
            data-queried={failover.queried.join(',')}
            data-new-successor={failover.newSuccessor ?? ''}
            data-new-distance={failover.newDistance}
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {failover.state === 'passive'
              ? t(
                  `${failover.failed}’s link goes down. R1 already has a feasible successor, so it switches to ${failover.newSuccessor} at once (distance ${failover.newDistance}). The route stays passive: no queries are sent, and nobody else has to recompute anything before traffic flows again.`,
                  `${failover.failed} へのリンクが切れます。R1 にはもうフィージブルサクセサがあるので、すぐに ${failover.newSuccessor} へ切り替えます（距離 ${failover.newDistance}）。経路はパッシブのままです。クエリは送らず、通信が再開するまでにほかのルータが計算し直す必要もありません。`,
                )
              : t(
                  `${failover.failed}’s link goes down and R1 has no feasible successor, so the route goes active: R1 sends a query to every other neighbour (${failover.queried.join(', ')}) and must wait for every reply before choosing. The replies: ${failover.replies.map((reply) => `${reply.id} ${metric(reply.distance)}`).join(', ')}. The new successor is ${failover.newSuccessor} at ${failover.newDistance}. Until the replies arrive, traffic for N has nowhere safe to go.`,
                  `${failover.failed} へのリンクが切れ、R1 にはフィージブルサクセサがないので、経路はアクティブになります。R1 はほかのすべてのネイバー（${failover.queried.join('、')}）にクエリを送り、全員の返事（リプライ）を待ってから選びます。返事は ${failover.replies.map((reply) => `${reply.id} ${metric(reply.distance)}`).join('、')}。新しいサクセサは ${failover.newSuccessor}（距離 ${failover.newDistance}）です。返事がそろうまで、N 行きの通信には安全な行き先がありません。`,
                )}
          </p>
          {tab === 'no-fs' ? (
            <p
              data-testid="eigrp-loop"
              data-path={loopPath.join('>')}
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              {t(
                `Look at X: its total (${x.fd}) is lower than C’s (${c.fd}), so a router that simply took the next-best total would pick X. But X’s reported distance ${x.rd} is not below ${noFsFd}, and for good reason: X reaches N through Y, and Y through R1. Traffic handed to X would go ${loopPath.join(' → ')}, a loop. The condition kept X out. Y, whose own best path goes straight through R1, advertises N back to R1 as unreachable (∞, split horizon with poison reverse), and with R1 unreachable, X and Y have nothing to offer, so they reply ∞.`,
                `X を見てください。合計（${x.fd}）は C（${c.fd}）より小さいので、単に「次に小さい合計」を選ぶルータなら X を選んでしまいます。しかし X の報告距離 ${x.rd} は ${noFsFd} より小さくありません。それには理由があります。X は Y を通って N へ行き、Y は R1 を通って行くのです。X に渡した通信は ${loopPath.join(' → ')} と進み、ループになります。フィージブル条件が X を外しました。Y は自分の最良経路が R1 を直接通るので、N を R1 へは到達不能（∞、ポイズンリバース付きのスプリットホライズン）として広告します。R1 を使えなければ X と Y には経路がないので、返事は ∞ です。`,
              )}
            </p>
          ) : null}
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: the queries are shown as one round, and each reply is the neighbour’s best distance that does not use R1. A real neighbour that also loses its route goes active and queries its own neighbours before replying; if replies take too long, the route can become stuck in active. Timers and query limits are left out.',
              '簡略化しています。クエリは 1 回のやり取りで表し、各返事は R1 を使わない場合のそのネイバーの最良距離としました。実際には、自分も経路を失ったネイバーはアクティブになり、自分のネイバーに問い合わせてから返事をします。返事が遅すぎると、経路が SIA（stuck in active）になることもあります。タイマーやクエリの範囲の制限は省いています。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="eigrp-whatif">
          <div style={LESSON_LABEL}>{t('Change C’s own distance', 'C 自身の距離を変える')}</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Cost of C’s link to N', 'C から N へのリンクのコスト')}
            <input
              type="range"
              min={20}
              max={40}
              value={cToN}
              data-testid="eigrp-c-cost"
              onChange={(event) => setCToN(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{cToN}</span>
          </label>
          <p
            data-testid="eigrp-whatif-result"
            data-successor={whatIf.successor.id}
            data-fd={whatIf.feasibleDistance}
            data-fs={whatIf.feasibleSuccessors.map((entry) => entry.id).join(',')}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `Successor ${whatIf.successor.id}, FD ${whatIf.feasibleDistance}. Feasible successors: ${whatIf.feasibleSuccessors.map((entry) => entry.id).join(', ') || 'none'}.`,
              `サクセサは ${whatIf.successor.id}、FD は ${whatIf.feasibleDistance}。フィージブルサクセサ：${whatIf.feasibleSuccessors.map((entry) => entry.id).join('、') || 'なし'}。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Below 30, C reports less than the FD and becomes a feasible successor. Lower still and C becomes the successor itself; the FD drops, and neighbours that qualified before can stop qualifying.',
              '30 より小さくすると、C の報告は FD を下回り、フィージブルサクセサになります。さらに下げると C 自身がサクセサになり、FD が下がるので、それまで合格していたネイバーが外れることもあります。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function EigrpDemo() {
  return (
    <DemoShell
      title="EIGRP and DUAL"
      desc="Successors, feasible successors and what happens when the best route fails"
    >
      <EigrpLesson />
    </DemoShell>
  );
}
