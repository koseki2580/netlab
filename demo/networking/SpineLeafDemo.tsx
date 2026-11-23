import { useState } from 'react';
import {
  LESSON_BUTTON,
  LESSON_BUTTON_PLAIN,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  HOST_GBPS,
  HOST_PORTS,
  UPLINK_GBPS,
  capacityLeftPct,
  leafToLeafHops,
  leafToLeafPaths,
  links,
  oversubscription,
  uplinkGbps,
  type Fabric,
} from './spineLeaf';

type Answer = '100' | '75' | '50' | '0';
const ANSWERS: readonly Answer[] = ['100', '75', '50', '0'];
const PREDICT_FABRIC: Fabric = { leaves: 8, spines: 4, failed: 1 };

const W = 400;
const H = 150;

/** A failed spine's button: greyed, struck through and dashed, unlike the cyan running one. */
const SPINE_DOWN_BUTTON = {
  ...LESSON_BUTTON_PLAIN,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  textDecoration: 'line-through',
  borderStyle: 'dashed',
} as const;

/** The fabric: spines on top, leaves below, a link from every leaf to every spine. */
function FabricDrawing({
  fabric,
  down,
  onToggle,
}: {
  fabric: Fabric;
  down: ReadonlySet<number>;
  onToggle: (spine: number) => void;
}) {
  const t = useT();
  const x = (index: number, count: number) => ((index + 0.5) * W) / count;
  return (
    <svg
      data-testid="sl-drawing"
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: 520 }}
      role="img"
      aria-label={t(
        `${fabric.leaves} leaves, each linked to all ${fabric.spines} spines; ${down.size} spine(s) down`,
        `リーフ ${fabric.leaves} 台がスパイン ${fabric.spines} 台すべてとつながる。故障中のスパイン ${down.size} 台`,
      )}
    >
      {Array.from({ length: fabric.leaves }, (_, leaf) =>
        Array.from({ length: fabric.spines }, (_, spine) => (
          <line
            key={`${leaf}-${spine}`}
            x1={x(leaf, fabric.leaves)}
            y1={H - 24}
            x2={x(spine, fabric.spines)}
            y2={24}
            stroke={down.has(spine) ? 'var(--netlab-border-strong)' : 'var(--netlab-accent-cyan)'}
            strokeDasharray={down.has(spine) ? '3 3' : undefined}
            strokeWidth={1}
          />
        )),
      )}
      {Array.from({ length: fabric.spines }, (_, spine) => (
        <g key={spine}>
          <rect
            x={x(spine, fabric.spines) - 22}
            y={10}
            width={44}
            height={24}
            rx={4}
            fill={down.has(spine) ? 'var(--netlab-bg-surface)' : 'var(--netlab-bg-primary)'}
            stroke="var(--netlab-text-secondary)"
          />
          <text
            x={x(spine, fabric.spines)}
            y={26}
            textAnchor="middle"
            fontSize={11}
            fill="var(--netlab-text-primary)"
            style={{ textDecoration: down.has(spine) ? 'line-through' : undefined }}
          >
            {`S${spine + 1}`}
          </text>
        </g>
      ))}
      {Array.from({ length: fabric.leaves }, (_, leaf) => (
        <g key={leaf}>
          <rect
            x={x(leaf, fabric.leaves) - 16}
            y={H - 34}
            width={32}
            height={22}
            rx={4}
            fill="var(--netlab-bg-primary)"
            stroke="var(--netlab-text-secondary)"
          />
          <text
            x={x(leaf, fabric.leaves)}
            y={H - 19}
            textAnchor="middle"
            fontSize={10}
            fill="var(--netlab-text-primary)"
          >
            {`L${leaf + 1}`}
          </text>
        </g>
      ))}
      {/* The spines can be clicked to fail them; the buttons below do the same for keyboards. */}
      {Array.from({ length: fabric.spines }, (_, spine) => (
        <rect
          key={`hit-${spine}`}
          x={x(spine, fabric.spines) - 22}
          y={10}
          width={44}
          height={24}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onToggle(spine)}
        />
      ))}
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function SpineLeafLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [leaves, setLeaves] = useState(8);
  const [spines, setSpines] = useState(4);
  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const fabric: Fabric = { leaves, spines, failed: down.size };
  const truth = String(capacityLeftPct(PREDICT_FABRIC)) as Answer;
  const toggle = (spine: number) =>
    setDown((previous) => {
      const next = new Set(previous);
      if (next.has(spine)) next.delete(spine);
      else next.add(spine);
      return next;
    });
  const ratio = oversubscription(fabric);
  const hops = leafToLeafHops(fabric);

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        gap: 12,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Spine-leaf fabrics', 'スパイン・リーフ構成')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Servers plug into leaf switches. Every leaf has one link to every spine, and the spines link to nothing but leaves. Each link is a routed link, so ECMP spreads traffic over all of them and spanning tree blocks none. Data centres built this way because most of their traffic goes server to server, east–west.',
            'サーバはリーフスイッチにつながります。どのリーフもすべてのスパインと 1 本ずつつながり、スパインはリーフ以外とはつながりません。どのリンクもルーティングされるので、ECMP が通信を全部のリンクに分け、スパニングツリーが止めるリンクはありません。データセンターの通信の多くはサーバどうし（東西方向）なので、この形が広まりました。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="sl-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `${PREDICT_FABRIC.leaves} leaves and ${PREDICT_FABRIC.spines} spines. One spine fails. How much of each leaf’s capacity to the other leaves is left?`,
            `リーフ ${PREDICT_FABRIC.leaves} 台、スパイン ${PREDICT_FABRIC.spines} 台です。スパインが 1 台故障しました。各リーフから他のリーフへの容量は、どれだけ残る？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`sl-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={lessonChoice(guess === answer)}
            >
              {guess === answer ? '✓ ' : ''}
              {answer === '0' ? t('0 % — cut off', '0 %（切れる）') : `${answer} %`}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="sl-reveal"
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
              `${truth} %. Its routes are withdrawn and ECMP spreads the traffic over the ${leafToLeafPaths(PREDICT_FABRIC)} spines left. Every leaf still reaches every other through three switches — only a quarter of the capacity goes. Try failing spines below.`,
              `${truth} % です。故障したスパインの経路は取り下げられ、ECMP は残りの ${leafToLeafPaths(PREDICT_FABRIC)} 台に通信を分けます。どのリーフからも、ほかのリーフへは今までどおりスイッチ 3 台で届き、失われるのは容量の 4 分の 1 だけです。下でスパインを故障させてみてください。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="sl-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => {
              setRevealed(true);
              setLeaves(PREDICT_FABRIC.leaves);
              setSpines(PREDICT_FABRIC.spines);
              setDown(new Set([1]));
            }}
          >
            {guess
              ? t('See the fabric', '構成を見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="sl-fabric">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Leaves', 'リーフ')}
              <input
                type="range"
                min={2}
                max={12}
                value={leaves}
                data-testid="sl-leaves"
                onChange={(event) => setLeaves(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{leaves}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('Spines', 'スパイン')}
              <input
                type="range"
                min={2}
                max={6}
                value={spines}
                data-testid="sl-spines"
                onChange={(event) => {
                  setSpines(Number(event.target.value));
                  setDown(new Set());
                }}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{spines}</span>
            </label>
          </div>
          <FabricDrawing fabric={fabric} down={down} onToggle={toggle} />
          <div
            role="group"
            aria-label={t('Fail or repair a spine', 'スパインを故障・復旧させる')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {Array.from({ length: spines }, (_, spine) => (
              <button
                key={spine}
                type="button"
                aria-pressed={down.has(spine)}
                data-testid={`sl-spine-${spine + 1}`}
                onClick={() => toggle(spine)}
                style={down.has(spine) ? SPINE_DOWN_BUTTON : LESSON_BUTTON}
              >
                {down.has(spine)
                  ? t(`S${spine + 1} down`, `S${spine + 1} 故障中`)
                  : t(`S${spine + 1} up`, `S${spine + 1} 稼働中`)}
              </button>
            ))}
          </div>
          <table
            data-testid="sl-facts"
            style={{ borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}
          >
            <tbody>
              {[
                [t('Links', 'リンク数'), String(links(fabric)), 'links'],
                [
                  t('Paths from one leaf to another', 'リーフ間の経路の数'),
                  String(leafToLeafPaths(fabric)),
                  'paths',
                ],
                [
                  t('Switches crossed, leaf to leaf', 'リーフ間で通るスイッチ'),
                  hops === null ? t('none — cut off', 'なし（切れる）') : String(hops),
                  'hops',
                ],
                [
                  t('Each leaf’s uplink', '各リーフの上り'),
                  `${uplinkGbps(fabric)} Gbit/s (${capacityLeftPct(fabric)} %)`,
                  'uplink',
                ],
                [
                  t(
                    `Oversubscription (${HOST_PORTS} × ${HOST_GBPS} G down, ${UPLINK_GBPS} G per spine up)`,
                    `オーバーサブスクリプション（下り ${HOST_PORTS} × ${HOST_GBPS} G、スパインごとに上り ${UPLINK_GBPS} G）`,
                  ),
                  ratio === null ? '—' : `${Math.round(ratio * 10) / 10} : 1`,
                  'ratio',
                ],
              ].map(([label, value, id]) => (
                <tr key={id}>
                  <td style={{ padding: 4 }}>{label}</td>
                  <td
                    style={{ padding: 4, fontFamily: 'monospace', fontWeight: 700 }}
                    data-testid={`sl-${id}`}
                  >
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Add leaves and the hop count stays at three; add spines and every leaf gets more capacity. The three-tier design it replaced (access, aggregation, core) put two hops more between servers in different pods than in the same one, and spanning tree left one of each access switch’s two uplinks blocked.',
              'リーフを増やしても通るスイッチは 3 台のまま、スパインを増やせばどのリーフの容量も増えます。これに置き換えられた 3 階層構成（アクセス・集約・コア）では、別のポッドのサーバまでは同じポッドより 2 台多くスイッチを通り、各アクセススイッチの 2 本の上りのうち 1 本はスパニングツリーに止められていました。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SpineLeafDemo() {
  return (
    <DemoShell
      title="Spine-leaf fabrics"
      desc="Every leaf linked to every spine: count the paths, the hops, and what a failed spine costs."
    >
      <SpineLeafLesson />
    </DemoShell>
  );
}
