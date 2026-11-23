import { useMemo, useState } from 'react';
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
  FRR_SWITCH_MS,
  LINKS,
  cspfPlacement,
  fastReroute,
  igpPlacement,
  lspRequests,
  unreservedGbps,
  type LinkGbps,
  type Path,
  type RouterId,
} from './mplsTe';

type Answer = 'A-B-Z' | 'A-C-Z' | 'A-E-Z' | 'refused';
const ANSWERS: readonly Answer[] = ['A-B-Z', 'A-C-Z', 'A-E-Z', 'refused'];
const ASKED_GBPS = 4;
const FAILED = 'B-Z';

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const num: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const POS: Record<RouterId, readonly [number, number]> = {
  A: [40, 120],
  B: [170, 40],
  D: [330, 40],
  C: [230, 120],
  E: [230, 200],
  Z: [430, 120],
};

const routeOf = (path: Path | null) => (path ? path.routers.join('-') : null);

/** The six routers; each link shows its IGP metric and capacity, and optionally a number per link. */
function Topology({
  label,
  values,
  failed,
  testId,
}: {
  label: string;
  values?: LinkGbps;
  failed?: string;
  testId: string;
}) {
  const t = useT();
  // On a phone the diagram would shrink its labels below ~9 px, so it keeps a
  // minimum width and scrolls sideways inside its card instead
  // (viewBox 470 wide with 11-unit labels: 470 × 9/11 ≈ 390).
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid={testId}
        viewBox="0 0 470 240"
        style={{ width: '100%', maxWidth: 560, minWidth: 390 }}
        role="img"
        aria-label={label}
      >
        {LINKS.map((l) => {
          const [x1, y1] = POS[l.a];
          const [x2, y2] = POS[l.b];
          const down = l.id === failed;
          const value = values?.[l.id];
          const over = value !== undefined && value > l.capacityGbps;
          return (
            <g key={l.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  down
                    ? 'var(--netlab-accent-red)'
                    : over
                      ? 'var(--netlab-accent-orange)'
                      : 'var(--netlab-border-strong)'
                }
                strokeWidth={over ? 4 : 2}
                strokeDasharray={down ? '6 4' : undefined}
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--netlab-text-secondary)"
              >
                {down
                  ? t('down', '断')
                  : value === undefined
                    ? `m${l.metric} · ${l.capacityGbps}G`
                    : `${value}/${l.capacityGbps}G`}
              </text>
            </g>
          );
        })}
        {(Object.keys(POS) as RouterId[]).map((r) => (
          <g key={r}>
            <circle
              cx={POS[r][0]}
              cy={POS[r][1]}
              r={15}
              fill="var(--netlab-bg-surface)"
              stroke="var(--netlab-accent-cyan)"
              strokeWidth={2}
            />
            <text
              x={POS[r][0]}
              y={POS[r][1] + 4}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="var(--netlab-text-primary)"
            >
              {r}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function MplsTeLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lsp3, setLsp3] = useState(ASKED_GBPS);

  const asked = useMemo(() => cspfPlacement(lspRequests(ASKED_GBPS)), []);
  const askedLsp3 = asked.placements[2]!;
  const truth: Answer = (routeOf(askedLsp3.path) as Answer | null) ?? 'refused';
  const askedIgp = useMemo(() => igpPlacement(lspRequests(ASKED_GBPS)), []);
  const leftAfter1 = unreservedGbps(
    LINKS[0]!,
    cspfPlacement(lspRequests(ASKED_GBPS).slice(0, 1)).reservedGbps,
  );

  const requests = lspRequests(lsp3);
  const igp = useMemo(() => igpPlacement(lspRequests(lsp3)), [lsp3]);
  const te = useMemo(() => cspfPlacement(lspRequests(lsp3)), [lsp3]);
  const frr = useMemo(() => fastReroute(lspRequests(lsp3), FAILED), [lsp3]);
  const bypassGbps = frr.bypass ? frr.bypassLoadGbps[frr.bypass.linkIds[0]!]! : 0;

  const lspName = (index: number) => t(`LSP ${index + 1}`, `LSP ${index + 1}`);
  const pathText = (path: Path | null) =>
    path ? `${path.routers.join('→')} (m${path.metric})` : t('refused', '拒否');
  const answerName = (answer: Answer) =>
    ({
      'A-B-Z': t('A→B→Z, the shortest path', 'A→B→Z（最短経路）'),
      'A-C-Z': t('A→C→Z', 'A→C→Z'),
      'A-E-Z': t('A→E→Z', 'A→E→Z'),
      refused: t('Nowhere: it is refused', 'どこにも通らない（拒否される）'),
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
        <div style={LESSON_LABEL}>{t('Traffic engineering', 'トラフィックエンジニアリング')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Plain IGP routing sends every packet from A to Z along the one path with the lowest metric, however full it is. MPLS traffic engineering lets the ingress router A ask for an LSP with a bandwidth. A runs CSPF (constrained shortest path first): it first removes every link whose unreserved bandwidth is smaller than the request, then takes the shortest path through what is left. RSVP-TE (RFC 3209) then signals the LSP hop by hop, and each router on the path subtracts the bandwidth from its link’s unreserved pool.',
            '素の IGP では、A から Z へのパケットはどれだけ混んでいても、メトリックが最小の 1 本の経路を通ります。MPLS のトラフィックエンジニアリングでは、入口ルータ A が帯域を指定して LSP を要求できます。A は CSPF（制約付き最短経路優先）を実行します。まず未予約帯域が要求より小さいリンクをすべて取り除き、残ったリンクの中で最短の経路を選びます。続いて RSVP-TE（RFC 3209）がその LSP をホップごとにシグナリングし、経路上の各ルータはリンクの未予約帯域から要求分を差し引きます。',
          )}
        </p>
        <Topology
          testId="te-topology"
          label={t(
            'Six routers. A–B and B–Z: metric 10, 10 Gbit/s. A–C and C–Z: metric 15, 10 Gbit/s. A–E and E–Z: metric 20, 6 Gbit/s. B–D: metric 15 and D–Z: metric 20, 10 Gbit/s.',
            '6 台のルータ。A–B と B–Z はメトリック 10・10 Gbit/s、A–C と C–Z はメトリック 15・10 Gbit/s、A–E と E–Z はメトリック 20・6 Gbit/s、B–D はメトリック 15・D–Z はメトリック 20 で 10 Gbit/s です。',
          )}
        />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Each link shows its IGP metric (m) and capacity.',
            '各リンクには IGP メトリック（m）と容量を書いています。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="te-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A asks for three LSPs to Z, in this order: LSP 1 of 6 Gbit/s, LSP 2 of 5 Gbit/s, then LSP 3 of ${ASKED_GBPS} Gbit/s. CSPF places each one before the next is asked for. Where does LSP 3 go?`,
            `A は Z への LSP を 3 本、この順に要求します。LSP 1 が 6 Gbit/s、LSP 2 が 5 Gbit/s、最後に LSP 3 が ${ASKED_GBPS} Gbit/s です。CSPF は 1 本置いてから次の要求を処理します。LSP 3 はどこを通る？`,
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
              data-testid={`te-guess-${answer}`}
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
            data-testid="te-reveal"
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
              `${pathText(askedLsp3.path)}. LSP 1 took the shortest path A→B→Z and left ${leftAfter1} Gbit/s unreserved on A–B and B–Z. That is too little for LSP 2’s 5 Gbit/s, so CSPF pruned those links and LSP 2 went A→C→Z. LSP 3 needs only ${ASKED_GBPS} Gbit/s: the ${leftAfter1} Gbit/s left on the shortest path is enough, so it goes back there and fills it exactly. Without TE, all three would have shared A→B→Z: ${askedIgp.worstLink.loadGbps} Gbit/s offered to a ${askedIgp.worstLink.capacityGbps} Gbit/s link.`,
              `${pathText(askedLsp3.path)} です。LSP 1 は最短経路 A→B→Z を取り、A–B と B–Z の未予約帯域は ${leftAfter1} Gbit/s になりました。LSP 2 の 5 Gbit/s には足りないので、CSPF はそのリンクを取り除き、LSP 2 は A→C→Z を通りました。LSP 3 は ${ASKED_GBPS} Gbit/s しか要らないので、最短経路に残った ${leftAfter1} Gbit/s で足ります。だから最短経路に戻り、ちょうど使い切ります。TE がなければ 3 本とも A→B→Z を通り、${askedIgp.worstLink.capacityGbps} Gbit/s のリンクに ${askedIgp.worstLink.loadGbps} Gbit/s が流れ込みます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="te-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run CSPF', 'CSPF を実行する')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="te-placement">
          <div style={LESSON_LABEL}>{t('IGP only versus CSPF', 'IGP だけの場合と CSPF')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('LSP 3 asks for', 'LSP 3 の要求帯域')}
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={lsp3}
              data-testid="te-lsp3"
              onChange={(event) => setLsp3(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${lsp3} Gbit/s`}</span>
          </label>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>LSP</th>
                  <th style={cell}>{t('Asks for', '要求')}</th>
                  <th style={cell}>{t('IGP only', 'IGP だけ')}</th>
                  <th style={cell}>CSPF</th>
                </tr>
              </thead>
              <tbody>
                {te.placements.map((p, index) => (
                  <tr
                    key={p.id}
                    data-testid={`te-lsp-${p.id}`}
                    data-path={routeOf(p.path) ?? 'refused'}
                  >
                    <td style={cell}>{lspName(index)}</td>
                    <td style={num}>{`${p.bandwidthGbps} Gbit/s`}</td>
                    <td style={num}>{pathText(igp.path)}</td>
                    <td style={num}>{pathText(p.path)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Link', 'リンク')}</th>
                  <th style={cell}>{t('Capacity', '容量')}</th>
                  <th style={cell}>{t('IGP only: offered', 'IGP だけ：流入')}</th>
                  <th style={cell}>{t('CSPF: reserved', 'CSPF：予約済み')}</th>
                  <th style={cell}>{t('Unreserved', '未予約')}</th>
                </tr>
              </thead>
              <tbody>
                {LINKS.map((l) => {
                  const offered = igp.loadGbps[l.id]!;
                  return (
                    <tr
                      key={l.id}
                      data-testid={`te-link-${l.id}`}
                      data-offered={offered}
                      data-reserved={te.reservedGbps[l.id]}
                    >
                      <td style={num}>{l.id.replace('-', '–')}</td>
                      <td style={num}>{`${l.capacityGbps}G`}</td>
                      <td
                        style={{
                          ...num,
                          color:
                            offered > l.capacityGbps ? 'var(--netlab-accent-orange)' : undefined,
                          fontWeight: offered > l.capacityGbps ? 700 : undefined,
                        }}
                      >
                        {`${offered}G${offered > l.capacityGbps ? t(' — over', ' — 超過') : ''}`}
                      </td>
                      <td style={num}>{`${te.reservedGbps[l.id]}G`}</td>
                      <td style={num}>{`${unreservedGbps(l, te.reservedGbps)}G`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p
            data-testid="te-igp-worst"
            data-load={igp.worstLink.loadGbps}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `IGP only: ${igp.worstLink.loadGbps} Gbit/s offered to the ${igp.worstLink.capacityGbps} Gbit/s link ${igp.worstLink.id.replace('-', '–')}${igp.worstLink.loadGbps > igp.worstLink.capacityGbps ? `, so ${igp.worstLink.loadGbps - igp.worstLink.capacityGbps} Gbit/s is dropped while other links sit idle.` : '.'}`,
              `IGP だけ：${igp.worstLink.capacityGbps} Gbit/s のリンク ${igp.worstLink.id.replace('-', '–')} に ${igp.worstLink.loadGbps} Gbit/s が流れ込みます${igp.worstLink.loadGbps > igp.worstLink.capacityGbps ? `。ほかのリンクが空いているのに ${igp.worstLink.loadGbps - igp.worstLink.capacityGbps} Gbit/s が捨てられます。` : '。'}`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Try a bigger LSP 3: CSPF moves it to longer paths, and refuses it when no path has ${requests[2]!.bandwidthGbps} Gbit/s unreserved on every link. A refused LSP is not sent anywhere; the operator must lower the request, add capacity, or let a higher-priority LSP pre-empt others (not modelled here). Reservations are bookkeeping: they only help if traffic actually stays within what was reserved.`,
              `LSP 3 を大きくしてみてください。CSPF はより長い経路へ移し、どの経路にも全リンクで ${requests[2]!.bandwidthGbps} Gbit/s の未予約帯域がなければ拒否します。拒否された LSP はどこにも張られません。要求を下げるか、容量を増やすか、優先度の高い LSP にほかを押しのけさせる（ここでは扱いません）必要があります。予約は帳簿の上の話なので、実際の通信量が予約の範囲に収まっていてこそ役に立ちます。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="te-frr">
          <div style={LESSON_LABEL}>
            {t('Fast reroute: link B–Z fails', '高速迂回（FRR）：リンク B–Z の障害')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `With fast reroute (RFC 4090, facility backup), router ${frr.plr} has already signalled a bypass LSP to ${frr.mergePoint} that avoids link B–Z. When the link fails, ${frr.plr} pushes the bypass label onto every protected LSP and sends them around it at once, typically within about ${FRR_SWITCH_MS} ms (a common target, not a guarantee). It also tells the head end A, which re-runs CSPF without the failed link and re-signals the LSPs on new paths, usually within a second or more.`,
              `高速迂回（RFC 4090 のファシリティバックアップ）では、ルータ ${frr.plr} が B–Z を避けて ${frr.mergePoint} へ向かうバイパス LSP をあらかじめ張っています。リンクが落ちると、${frr.plr} は保護対象の LSP すべてにバイパスのラベルを積み、すぐに迂回させます。目安は ${FRR_SWITCH_MS} ms 程度です（よく使われる目標で、保証ではありません）。同時に入口の A へ知らせ、A は障害リンクを除いて CSPF をやり直し、新しい経路で LSP を張り直します。こちらはふつう 1 秒以上かかります。`,
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('Protected LSPs', '保護される LSP')}</td>
                  <td style={num} data-testid="te-protected" data-ids={frr.protectedIds.join(',')}>
                    {frr.protectedIds.length
                      ? frr.protectedIds
                          .map((id) => lspName(te.placements.findIndex((p) => p.id === id)))
                          .join(', ')
                      : t('none', 'なし')}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>{t('Bypass', 'バイパス')}</td>
                  <td style={num} data-testid="te-bypass" data-path={routeOf(frr.bypass) ?? ''}>
                    {pathText(frr.bypass)}
                  </td>
                </tr>
                <tr>
                  <td style={cell}>{t('Carried on the bypass', 'バイパスを流れる量')}</td>
                  <td style={num} data-testid="te-bypass-load" data-gbps={bypassGbps}>
                    {`${bypassGbps} Gbit/s`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Topology
            testId="te-frr-topology"
            values={frr.bypassLoadGbps}
            failed={FAILED}
            label={t(
              'Traffic on each link while the bypass is in use',
              'バイパス使用中の各リンクの通信量',
            )}
          />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>LSP</th>
                  <th style={cell}>{t('Before the failure', '障害前')}</th>
                  <th style={cell}>{t('After A re-runs CSPF', 'A が CSPF をやり直した後')}</th>
                </tr>
              </thead>
              <tbody>
                {frr.after.placements.map((p, index) => (
                  <tr
                    key={p.id}
                    data-testid={`te-after-${p.id}`}
                    data-path={routeOf(p.path) ?? 'refused'}
                  >
                    <td style={cell}>{lspName(index)}</td>
                    <td style={num}>{pathText(te.placements[index]!.path)}</td>
                    <td style={num}>{pathText(p.path)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'The bypass is only a bridge. Here it reserves no bandwidth of its own, so it may carry more than it was ever planned for; the head end then spreads the LSPs over paths that really have room, and the bypass goes quiet again. One bypass protects every LSP that crosses the link, which is why it is called facility backup.',
              'バイパスはつなぎにすぎません。ここではバイパス自身は帯域を予約しないので、想定以上の量を運ぶこともあります。そのあと入口ルータが、本当に余裕のある経路へ LSP を振り分け直し、バイパスはまた空になります。1 本のバイパスがそのリンクを通るすべての LSP を守るので、ファシリティバックアップと呼ばれます。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Every router on an RSVP-TE path keeps state for each LSP and refreshes it; segment routing’s TE (SR-TE) keeps no per-path state in the core, because the path rides in the packet’s label stack. Simplified: traffic flows one way, there are no priorities, pre-emption, affinities or make-before-break, and the head end re-places the affected LSPs in their original order.',
              'RSVP-TE の経路上のルータは、LSP ごとに状態を持ち続けて定期的に更新します。セグメントルーティングの TE（SR-TE）は経路をパケットのラベルスタックに載せるので、途中のルータは経路ごとの状態を持ちません。簡略化しています：通信は一方向だけ、優先度・プリエンプション・アフィニティ・make-before-break は扱わず、入口ルータは影響を受けた LSP を元の順に置き直すものとしました。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function MplsTeDemo() {
  return (
    <DemoShell
      title="MPLS traffic engineering"
      desc="RSVP-TE paths placed by bandwidth with CSPF, against plain shortest-path routing, and fast reroute around a failed link"
    >
      <MplsTeLesson />
    </DemoShell>
  );
}
