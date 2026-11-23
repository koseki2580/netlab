import { useState } from 'react';
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
  DEFAULT_AD,
  E2_SEED_METRIC,
  FIXES,
  OSPF_LINKS,
  PREFIX,
  RAISED_OSPF_EXTERNAL_AD,
  RIP_LINKS,
  RIP_TAG,
  SOURCES,
  chooseSource,
  simulate,
  type Candidate,
  type Fix,
  type Path,
  type Protocol,
  type RouterId,
  type SourceId,
  type Step,
} from './redistribution';

type AdAnswer = SourceId | 'share';
/** Display order: deliberate, so the right answers do not sit in one position across lessons. */
const AD_ANSWERS: readonly AdAnswer[] = ['rip-r9', 'static', 'ospf-r8', 'share'];

type Answer = 'direct' | 'long' | 'loop' | 'none';
const ANSWERS: readonly Answer[] = ['long', 'direct', 'loop', 'none'];

const PROTOCOLS: readonly Protocol[] = ['connected', 'static', 'ebgp', 'ospf', 'rip', 'ibgp'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer a forwarding path matches. */
function answerOf(path: Path): Answer {
  if (path.loop) return 'loop';
  if (!path.reached) return 'none';
  return path.hops === 1 ? 'direct' : 'long';
}

const POSITION: Readonly<Record<RouterId, readonly [number, number]>> = {
  RA: [110, 95],
  R1: [230, 35],
  R2: [230, 155],
  O1: [380, 35],
  O2: [380, 155],
};

function Topology({ path }: { readonly path: readonly RouterId[] | null }) {
  const t = useT();
  const onPath = (a: RouterId, b: RouterId) =>
    !!path &&
    path.some(
      (router, index) =>
        index > 0 &&
        ((path[index - 1] === a && router === b) || (path[index - 1] === b && router === a)),
    );
  const links = [
    ...RIP_LINKS.map(([a, b]) => ({ a, b, dashed: true })),
    ...OSPF_LINKS.map(([a, b]) => ({ a, b, dashed: false })),
  ];
  // On a phone the diagram would shrink its labels below ~9 px, so it keeps a
  // minimum width and scrolls sideways inside its card instead
  // (viewBox 470 wide with 10-unit labels: 470 × 9/10 ≈ 430).
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        data-testid="redist-topology"
        viewBox="0 0 470 195"
        style={{ width: '100%', maxWidth: 560, minWidth: 430 }}
        role="img"
        aria-label={
          path
            ? t(`R2’s path: ${path.join(' → ')}`, `R2 からの経路：${path.join(' → ')}`)
            : t(
                'RA in the RIP domain is linked to R1 and R2; R1, O1, O2 and R2 form the OSPF domain',
                'RIP ドメインの RA が R1 と R2 につながり、R1・O1・O2・R2 が OSPF ドメインを作っています',
              )
        }
      >
        <text x={70} y={14} fill="var(--netlab-text-secondary)" fontSize={11}>
          {t('RIP domain', 'RIP ドメイン')}
        </text>
        <text x={340} y={100} fill="var(--netlab-text-secondary)" fontSize={11}>
          {t('OSPF domain', 'OSPF ドメイン')}
        </text>
        <rect
          x={4}
          y={80}
          width={62}
          height={30}
          rx={4}
          fill="none"
          stroke="var(--netlab-accent-green)"
        />
        <text x={35} y={99} textAnchor="middle" fill="var(--netlab-text-primary)" fontSize={10}>
          10.5.0.0/16
        </text>
        <line x1={66} y1={95} x2={92} y2={95} stroke="var(--netlab-accent-green)" />
        {links.map(({ a, b, dashed }) => {
          const [x1, y1] = POSITION[a];
          const [x2, y2] = POSITION[b];
          const hot = onPath(a, b);
          return (
            <line
              key={`${a}-${b}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={hot ? 'var(--netlab-accent-orange)' : 'var(--netlab-border-strong)'}
              strokeWidth={hot ? 4 : 2}
              strokeDasharray={dashed ? '6 4' : undefined}
            />
          );
        })}
        {(Object.keys(POSITION) as RouterId[]).map((router) => {
          const [x, y] = POSITION[router];
          return (
            <g key={router}>
              <circle
                cx={x}
                cy={y}
                r={18}
                fill="var(--netlab-bg-surface)"
                stroke={
                  router === 'R1' || router === 'R2'
                    ? 'var(--netlab-accent-cyan)'
                    : 'var(--netlab-border-strong)'
                }
                strokeWidth={2}
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill="var(--netlab-text-primary)"
                fontSize={12}
                fontWeight={700}
              >
                {router}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function RedistributionLesson() {
  const t = useT();
  const [adGuess, setAdGuess] = useState<AdAnswer | null>(null);
  const [adRevealed, setAdRevealed] = useState(false);
  const [present, setPresent] = useState<readonly SourceId[]>(SOURCES.map((s) => s.id));
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [fix, setFix] = useState<Fix>('none');

  const adTruth = chooseSource(SOURCES.map((s) => s.id))!;
  const chosen = chooseSource(present);
  const broken = simulate('none');
  const truth = answerOf(broken.pathFromR2);
  const shown = simulate(fix);

  const protocolName = (protocol: Protocol) =>
    ({
      connected: t('Connected', '直結'),
      static: t('Static', 'スタティック'),
      ebgp: 'eBGP',
      ospf: 'OSPF',
      rip: 'RIP',
      ibgp: 'iBGP',
    })[protocol];
  const unit = (candidate: Candidate) =>
    candidate.protocol === 'rip'
      ? t(
          `${candidate.metric} hop${candidate.metric === 1 ? '' : 's'}`,
          `${candidate.metric} ホップ`,
        )
      : candidate.protocol === 'ospf'
        ? t(`cost ${candidate.metric}`, `コスト ${candidate.metric}`)
        : '—';
  const sourceName = (id: SourceId) => {
    const source = SOURCES.find((s) => s.id === id)!.candidate;
    return source.protocol === 'static'
      ? t(`Static route via ${source.via}`, `ネクストホップ ${source.via} のスタティックルート`)
      : t(
          `${protocolName(source.protocol)} via ${source.via}, ${unit(source)}`,
          `${source.via} 経由の ${protocolName(source.protocol)}（${unit(source)}）`,
        );
  };
  const adAnswerName = (answer: AdAnswer) =>
    answer === 'share'
      ? t('All of them, sharing the load', 'すべてを使って負荷分散する')
      : sourceName(answer);
  const answerName = (answer: Answer) =>
    ({
      direct: t('Straight to RA, 1 hop', 'RA へ直接、1 ホップ'),
      long: t('Through the OSPF domain and R1, then to RA', 'OSPF ドメインと R1 を回って RA へ'),
      loop: t('Round in a loop between R2 and O2', 'R2 と O2 の間でループする'),
      none: t('It has no route at all', '経路がなくなる'),
    })[answer];
  const fixName = (value: Fix) =>
    ({
      none: t('No fix', '対策なし'),
      tag: t(`Tag ${RIP_TAG} and filter`, `タグ ${RIP_TAG} とフィルタ`),
      distance: t(
        `OSPF external AD ${RAISED_OSPF_EXTERNAL_AD}`,
        `OSPF 外部の AD を ${RAISED_OSPF_EXTERNAL_AD} に`,
      ),
    })[value];
  const stepText = (step: Step) => {
    switch (step.kind) {
      case 'install':
        return step.route.protocol === 'connected'
          ? t(
              `${step.router} has ${PREFIX} on a connected interface.`,
              `${step.router} は ${PREFIX} を直結のインターフェースに持っています。`,
            )
          : t(
              `${step.router} installs ${protocolName(step.route.protocol)} via ${step.route.via} (AD ${step.route.ad}, ${unit(step.route)}).`,
              `${step.router} が ${step.route.via} 経由の ${protocolName(step.route.protocol)} を経路表に入れます（AD ${step.route.ad}、${unit(step.route)}）。`,
            );
      case 'remove':
        return t(`${step.router} loses its route.`, `${step.router} の経路がなくなります。`);
      case 'to-ospf':
        return step.tag !== undefined
          ? t(
              `${step.router} redistributes its RIP route into OSPF as an external route, tagged ${step.tag}.`,
              `${step.router} が RIP の経路を OSPF へ外部経路として再配布し、タグ ${step.tag} を付けます。`,
            )
          : t(
              `${step.router} redistributes its RIP route into OSPF as an external route.`,
              `${step.router} が RIP の経路を OSPF へ外部経路として再配布します。`,
            );
      case 'withdraw-ospf':
        return t(
          `${step.router} stops redistributing into OSPF.`,
          `${step.router} は OSPF への再配布をやめます。`,
        );
      case 'to-rip':
        return t(
          `${step.router} redistributes that OSPF route back into RIP: the route has come full circle.`,
          `${step.router} がその OSPF の経路を RIP へ再配布し返します。経路が一周して戻ってきました。`,
        );
      case 'withdraw-rip':
        return t(
          `${step.router} stops redistributing into RIP.`,
          `${step.router} は RIP への再配布をやめます。`,
        );
      case 'deny-to-rip':
        return t(
          `${step.router} refuses to redistribute a route tagged ${step.tag} back into RIP.`,
          `${step.router} はタグ ${step.tag} の経路を RIP へ戻しません。`,
        );
    }
  };

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
          {t('Part 1: several sources, one route', 'その 1：情報源はいくつも、経路は 1 つ')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `A router runs OSPF and RIP and also has a static route. It hears about ${PREFIX} from all of them:`,
            `あるルータは OSPF と RIP を動かし、スタティックルートも持っています。${PREFIX} について、そのすべてから経路を受け取りました。`,
          )}
        </p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
          {SOURCES.map((source) => (
            <li key={source.id}>{sourceName(source.id)}</li>
          ))}
        </ul>
      </div>

      <div style={LESSON_CARD} data-testid="redist-ad-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Which one goes into the routing table for ${PREFIX}?`,
            `${PREFIX} の経路として経路表に入るのはどれ？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {AD_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={adGuess === answer}
              data-testid={`redist-ad-guess-${answer}`}
              disabled={adRevealed}
              onClick={() => setAdGuess(answer)}
              style={{ ...lessonChoice(adGuess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, adGuess, adTruth, adRevealed)}
              {adAnswerName(answer)}
            </button>
          ))}
        </div>
        {adRevealed ? (
          <p
            data-testid="redist-ad-reveal"
            data-right={String(adGuess === adTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {adGuess === adTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${sourceName(adTruth)}. When different sources offer the same prefix, the router trusts the one with the lowest administrative distance (AD): static ${DEFAULT_AD.static}, OSPF ${DEFAULT_AD.ospf}, RIP ${DEFAULT_AD.rip}. Metrics are compared only between routes of one protocol: RIP’s 2 hops and OSPF’s cost 20 are different units, so “2 is smaller” means nothing here. Between the two OSPF routes, the lower cost (20) wins.`,
              `${sourceName(adTruth)}です。同じプレフィックスを別々の情報源が教えてくるとき、ルータはアドミニストレーティブディスタンス（AD）がいちばん小さいものを信じます。スタティックは ${DEFAULT_AD.static}、OSPF は ${DEFAULT_AD.ospf}、RIP は ${DEFAULT_AD.rip} です。メトリックを比べるのは同じプロトコルの経路どうしだけです。RIP の 2 ホップと OSPF のコスト 20 は単位がちがうので、「2 のほうが小さい」は意味を持ちません。2 本ある OSPF の経路の間では、コストの低い 20 が勝ちます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="redist-ad-reveal-button"
            disabled={!adGuess}
            style={{
              ...(adGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setAdRevealed(true)}
          >
            {adGuess
              ? t('See the routing table', '経路表を見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {adRevealed ? (
        <div style={LESSON_CARD} data-testid="redist-ad-table">
          <div style={LESSON_LABEL}>
            {t('Turn sources off and on', '情報源を消したり戻したりする')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SOURCES.map((source) => {
              const on = present.includes(source.id);
              return (
                <label
                  key={source.id}
                  style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 44 }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    data-testid={`redist-source-${source.id}`}
                    onChange={() =>
                      setPresent(
                        on ? present.filter((id) => id !== source.id) : [...present, source.id],
                      )
                    }
                    style={{ width: 20, height: 20 }}
                  />
                  {sourceName(source.id)}
                </label>
              );
            })}
          </div>
          <p
            data-testid="redist-ad-chosen"
            data-chosen={chosen ?? 'none'}
            style={{ margin: '8px 0', fontWeight: 700 }}
          >
            {chosen
              ? t(`Installed: ${sourceName(chosen)}`, `経路表に入るもの：${sourceName(chosen)}`)
              : t('No route: nothing is installed.', '経路なし：何も入りません。')}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Source', '情報源')}</th>
                  <th style={cell}>{t('Default AD (Cisco)', '初期 AD（Cisco）')}</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOLS.map((protocol) => (
                  <tr key={protocol}>
                    <td style={cell}>{protocolName(protocol)}</td>
                    <td style={mono}>{DEFAULT_AD[protocol]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'These are the common Cisco defaults. Other vendors use other numbers (Juniper calls them route preferences, and its OSPF internal default is 10), and every router lets you change them.',
              'これは Cisco でよく使われる初期値です。ほかのベンダーは別の値を使います（Juniper では route preference と呼び、OSPF 内部経路の初期値は 10 です）。どのルータでも変更できます。',
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>
          {t('Part 2: redistributing at two points', 'その 2：2 か所での再配布')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `${PREFIX} sits behind RA in a RIP domain. RA is linked directly to two border routers, R1 and R2, which also belong to an OSPF domain (R1 – O1 – O2 – R2, cost 10 per link). For redundancy, both R1 and R2 redistribute in both directions: RIP into OSPF and OSPF into RIP. RIP settles first, so R1 and R2 each start with a 1-hop RIP route to RA. Then R1 begins redistributing a moment before R2.`,
            `${PREFIX} は RIP ドメインの RA の先にあります。RA は 2 台の境界ルータ R1 と R2 に直接つながっていて、R1 と R2 は OSPF ドメイン（R1 – O1 – O2 – R2、各リンクのコスト 10）にも属しています。冗長化のため、R1 と R2 はどちらも双方向に再配布します。RIP から OSPF へ、OSPF から RIP へ。先に RIP が落ち着くので、R1 と R2 はどちらも RA への 1 ホップの RIP 経路を持った状態から始まります。そのあと R1 が R2 より少し先に再配布を始めます。`,
          )}
        </p>
        <Topology path={revealed ? shown.pathFromR2.routers : null} />
      </div>

      <div style={LESSON_CARD} data-testid="redist-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Once everything has settled, how does R2 forward traffic for ${PREFIX}?`,
            `すべてが落ち着いたあと、R2 は ${PREFIX} 宛ての通信をどう転送する？`,
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
              data-testid={`redist-guess-${answer}`}
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
            data-testid="redist-reveal"
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
              `${broken.pathFromR2.routers.join(' → ')}: ${broken.pathFromR2.hops} hops instead of 1. R1 put its RIP route into OSPF as an external route. OSPF carried it to R2, which now holds two routes: its own RIP route (AD ${DEFAULT_AD.rip}, 1 hop) and the OSPF external one (AD ${DEFAULT_AD.ospf}). Lower AD wins, so R2 replaces the direct route with the one pointing back through the OSPF domain. The 1 hop never gets compared with anything. R2 then even feeds that route back into RIP.`,
              `${broken.pathFromR2.routers.join(' → ')} の ${broken.pathFromR2.hops} ホップです。本来は 1 ホップです。R1 は自分の RIP 経路を OSPF へ外部経路として入れました。OSPF がそれを R2 まで運ぶと、R2 は 2 つの経路を持つことになります。自分の RIP 経路（AD ${DEFAULT_AD.rip}、1 ホップ）と OSPF の外部経路（AD ${DEFAULT_AD.ospf}）です。AD の小さいほうが勝つので、R2 は直接の経路を捨てて、OSPF ドメインを逆戻りする経路を使います。1 ホップという数字は何とも比べられません。さらに R2 は、その経路を RIP へ再配布し返します。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="redist-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run the redistribution', '再配布を動かす')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="redist-tables">
          <div style={LESSON_LABEL}>{t('Try a fix', '対策を試す')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FIXES.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={fix === value}
                data-testid={`redist-fix-${value}`}
                onClick={() => setFix(value)}
                style={{ ...lessonChoice(fix === value), minHeight: 44 }}
              >
                {fix === value ? '✓ ' : ''}
                {fixName(value)}
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0', lineHeight: 1.7 }}>
            {
              {
                none: t(
                  'Both border routers redistribute everything, both ways.',
                  '両方の境界ルータが、すべての経路を双方向に再配布します。',
                ),
                tag: t(
                  `R1 and R2 put tag ${RIP_TAG} on every route they take from RIP into OSPF. Neither installs an OSPF route carrying tag ${RIP_TAG} (it came from the RIP side, where they already have the real route), and neither redistributes such a route back into RIP.`,
                  `R1 と R2 は、RIP から OSPF へ入れる経路すべてにタグ ${RIP_TAG} を付けます。どちらもタグ ${RIP_TAG} の OSPF 経路は経路表に入れず（もとは RIP 側の経路で、本物はすでに持っています）、RIP へ戻すこともしません。`,
                ),
                distance: t(
                  `R1 and R2 give OSPF external routes AD ${RAISED_OSPF_EXTERNAL_AD}, above RIP’s ${DEFAULT_AD.rip}, so their own RIP route wins. OSPF’s internal routes keep ${DEFAULT_AD.ospf}.`,
                  `R1 と R2 は OSPF の外部経路の AD を ${RAISED_OSPF_EXTERNAL_AD} にして、RIP の ${DEFAULT_AD.rip} より大きくします。これで自分の RIP 経路が勝ちます。OSPF の内部経路は ${DEFAULT_AD.ospf} のままです。`,
                ),
              }[fix]
            }
          </p>
          <p
            data-testid="redist-path"
            data-fix={fix}
            data-hops={shown.pathFromR2.hops}
            data-path={shown.pathFromR2.routers.join('-')}
            style={{ margin: '0 0 8px', fontWeight: 700 }}
          >
            {t(
              `R2 → ${PREFIX}: ${shown.pathFromR2.routers.join(' → ')} (${shown.pathFromR2.hops} hop${shown.pathFromR2.hops === 1 ? '' : 's'})`,
              `R2 → ${PREFIX}：${shown.pathFromR2.routers.join(' → ')}（${shown.pathFromR2.hops} ホップ）`,
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Router', 'ルータ')}</th>
                  <th style={cell}>{t('Learned from', '学習元')}</th>
                  <th style={cell}>{t('Next hop', 'ネクストホップ')}</th>
                  <th style={cell}>AD</th>
                  <th style={cell}>{t('Metric', 'メトリック')}</th>
                  <th style={cell}>{t('Tag', 'タグ')}</th>
                  <th style={cell}>{t('Used?', '使う？')}</th>
                </tr>
              </thead>
              <tbody>
                {(['R1', 'R2'] as const).flatMap((router) =>
                  shown.tables[router].candidates.map((candidate) => {
                    const route = shown.tables[router].installed;
                    const installed =
                      route?.protocol === candidate.protocol && route.via === candidate.via;
                    return (
                      <tr
                        key={`${router}-${candidate.protocol}`}
                        data-testid={`redist-row-${router}-${candidate.protocol}`}
                        data-ad={candidate.ad}
                        data-installed={String(installed)}
                      >
                        <td style={mono}>{router}</td>
                        <td style={cell}>
                          {candidate.protocol === 'ospf'
                            ? t('OSPF external (E2)', 'OSPF 外部（E2）')
                            : protocolName(candidate.protocol)}
                        </td>
                        <td style={mono}>{candidate.via}</td>
                        <td style={mono}>{candidate.ad}</td>
                        <td style={mono}>{unit(candidate)}</td>
                        <td style={mono}>{candidate.tag ?? '—'}</td>
                        <td style={cell}>
                          {installed
                            ? t('✓ installed', '✓ 経路表へ')
                            : candidate.filtered
                              ? t('filtered (tag)', 'フィルタ（タグ）')
                              : t('loses on AD', 'AD で負け')}
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          <div style={{ ...LESSON_LABEL, marginTop: 12 }}>
            {t('What happened, in order', '起きた順に')}
          </div>
          <ol data-testid="redist-steps" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            {shown.steps.map((step, index) => (
              <li key={index}>{stepText(step)}</li>
            ))}
          </ol>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: one prefix; Cisco default distances; OSPF externals are type E2 with seed metric ${E2_SEED_METRIC}; routers update one at a time with R1 first, and updates arrive instantly. Here the feedback only makes the path longer. In larger designs, or while a link is failing and routes are being withdrawn, the same feedback can make routers point at each other — a routing loop — or flap between the two sources. Tags and filters stop a route from re-entering the domain it came from.`,
              `簡略化しています。プレフィックスは 1 つ、AD は Cisco の初期値、OSPF の外部経路はシードメトリック ${E2_SEED_METRIC} の E2 です。ルータは R1 から 1 台ずつ順に更新し、更新は一瞬で届きます。ここではフィードバックで経路が長くなるだけですが、もっと大きな構成や、リンク障害で経路が取り消されている最中には、同じフィードバックでルータどうしがお互いを指し合うルーティングループになったり、2 つの情報源の間で経路が行ったり来たりしたりします。タグとフィルタは、経路が出てきたドメインへ戻って入り込むのを止めます。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function RedistributionDemo() {
  return (
    <DemoShell
      title="Route redistribution and administrative distance"
      desc="How a router chooses between protocols, and what happens when two border routers redistribute both ways"
    >
      <RedistributionLesson />
    </DemoShell>
  );
}
