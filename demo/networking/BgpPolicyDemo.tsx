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
  BASE_PATHS,
  COMMUNITIES,
  COMMUNITY_VALUE,
  DEFAULT_LOCAL_PREF,
  LOCAL_AS,
  PREFIX,
  TAGGED_LOCAL_PREF,
  decide,
  propagate,
  withChange,
  type BgpPath,
  type CommunityId,
  type Decision,
  type PathId,
  type RouterId,
  type StepId,
} from './bgpPolicy';

const PATH_IDS: readonly PathId[] = ['isp-a', 'isp-b', 'ibgp'];
type Spread = 'only-e1' | 'inside' | 'everyone' | 'nobody';
const SPREADS: readonly Spread[] = ['only-e1', 'inside', 'everyone', 'nobody'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const path = (id: PathId, paths: readonly BgpPath[] = BASE_PATHS) =>
  paths.find((entry) => entry.id === id)!;

/** Which answer a propagation matches. */
function spreadOf(community: CommunityId): Spread {
  const held = new Set(
    propagate(community)
      .filter((router) => router.holds && router.id !== 'cust')
      .map((router) => router.id),
  );
  if (held.has('peer')) return 'everyone';
  if (held.has('c1') && held.has('e2')) return 'inside';
  return held.has('e1') ? 'only-e1' : 'nobody';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function BgpPolicyLesson() {
  const t = useT();
  const [guess, setGuess] = useState<PathId | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [medGuess, setMedGuess] = useState<PathId | null>(null);
  const [medRevealed, setMedRevealed] = useState(false);
  const [ispAMed, setIspAMed] = useState(0);
  const [ibgpLocalPref, setIbgpLocalPref] = useState(DEFAULT_LOCAL_PREF);
  const [alwaysCompareMed, setAlwaysCompareMed] = useState(false);
  const [spreadGuess, setSpreadGuess] = useState<Spread | null>(null);
  const [spreadRevealed, setSpreadRevealed] = useState(false);
  const [community, setCommunity] = useState<CommunityId>('no-export');

  const base = decide(BASE_PATHS);
  const lowered = withChange('isp-a', { med: 0 });
  const afterMed = decide(lowered);
  const afterMedCompared = decide(lowered, { alwaysCompareMed: true });
  const explorePaths = withChange(
    'ibgp',
    { localPref: ibgpLocalPref },
    withChange('isp-a', { med: ispAMed }),
  );
  const explored = decide(explorePaths, { alwaysCompareMed });
  const spreadTruth = spreadOf('no-export');
  const states = propagate(community);

  const pathName = (id: PathId) =>
    ({
      'isp-a': t('ISP-A (eBGP)', 'ISP-A（eBGP）'),
      'isp-b': t('ISP-B (eBGP)', 'ISP-B（eBGP）'),
      ibgp: t('Via R2 (iBGP)', 'R2 経由（iBGP）'),
    })[id];
  const stepName = (step: StepId) =>
    ({
      weight: t('Highest weight (vendor-specific)', 'weight が最大（ベンダー独自）'),
      'local-pref': t('Highest LOCAL_PREF', 'LOCAL_PREF が最大'),
      'as-path': t('Shortest AS_PATH', 'AS_PATH が最短'),
      origin: t(
        'Lowest ORIGIN (IGP < EGP < INCOMPLETE)',
        'ORIGIN が最小（IGP < EGP < INCOMPLETE）',
      ),
      med: t('Lowest MED', 'MED が最小'),
      ebgp: t('eBGP over iBGP', 'iBGP より eBGP'),
      'igp-metric': t('Lowest IGP cost to the next hop', '次ホップまでの IGP コストが最小'),
      'router-id': t('Lowest router ID', 'ルータ ID が最小'),
    })[step];
  const routerName = (id: RouterId) =>
    ({
      cust: t('Customer router', '顧客ルータ'),
      e1: 'E1',
      c1: 'C1',
      e2: 'E2',
      peer: t('AS65002 router', 'AS65002 のルータ'),
    })[id];
  const communityName = (id: CommunityId) =>
    ({
      none: t('No community', 'コミュニティなし'),
      'no-export': 'NO_EXPORT',
      'no-advertise': 'NO_ADVERTISE',
      'lp-80': '65001:80',
    })[id];
  const spreadName = (spread: Spread) =>
    ({
      'only-e1': t('Only E1, the router it was sent to', '受け取った E1 だけ'),
      inside: t('E1, C1 and E2, but not AS65002', 'E1・C1・E2 まで。AS65002 には届かない'),
      everyone: t('Every router, AS65002 included', 'AS65002 も含めて全ルータ'),
      nobody: t('Nobody: E1 rejects it', 'だれも持たない（E1 が拒否する）'),
    })[spread];
  const verdict = (right: boolean) => (
    <strong>
      {right
        ? t('As you predicted. ', '予想どおりです。')
        : t('Not what you predicted. ', '予想とちがいました。')}
    </strong>
  );

  const a = path('isp-a');
  const b = path('isp-b');
  const i = path('ibgp');

  const trace = (decision: Decision, testid: string) => (
    <div style={{ overflowX: 'auto' }} data-testid={testid}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
            <th style={cell}>{t('Step', 'ステップ')}</th>
            <th style={cell}>{t('Removed', '外れた経路')}</th>
            <th style={cell}>{t('Still in', '残った経路')}</th>
          </tr>
        </thead>
        <tbody>
          {decision.steps.map((step) => (
            <tr
              key={step.step}
              data-testid={`${testid}-${step.step}`}
              data-removed={step.removed.join(' ')}
              style={step.step === decision.decidedBy ? { fontWeight: 700 } : undefined}
            >
              <td style={cell}>{stepName(step.step)}</td>
              <td style={cell}>
                {step.removed.length ? step.removed.map(pathName).join(', ') : '—'}
              </td>
              <td style={cell}>{step.survivors.map(pathName).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const choices = <T extends string>(
    options: readonly T[],
    chosen: T | null,
    choose: (value: T) => void,
    name: (value: T) => string,
    prefix: string,
    locked: boolean,
  ) => (
    <div
      role="radiogroup"
      aria-label={t('Your prediction', '予想')}
      style={{ display: 'grid', gap: 6 }}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={chosen === option}
          data-testid={`${prefix}-${option}`}
          disabled={locked}
          onClick={() => choose(option)}
          style={{ ...lessonChoice(chosen === option), textAlign: 'left', minHeight: 44 }}
        >
          {chosen === option ? '✓ ' : ''}
          {name(option)}
        </button>
      ))}
    </div>
  );

  const revealButton = (testid: string, ready: boolean, label: string, go: () => void) => (
    <button
      type="button"
      data-testid={testid}
      disabled={!ready}
      style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, minHeight: 44, opacity: ready ? 1 : 0.5 }}
      onClick={go}
    >
      {ready ? label : t('Predict first', '先に予想を選んでください')}
    </button>
  );

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
          {t('Three paths to one prefix', '1 つのプレフィックスへ 3 本の経路')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `R1 in AS${LOCAL_AS} has three BGP paths to ${PREFIX}, a network of AS64510 that buys transit from both ISPs: one from ISP-A (AS64501) on its own link, one from ISP-B (AS64502), and one from R2, a router in R1’s own AS that learned the prefix from ISP-A on a second link and passes it on over iBGP. BGP installs only one of them, and compares the paths attribute by attribute in a fixed order.`,
            `AS${LOCAL_AS} の R1 は、${PREFIX}（両方の ISP からトランジットを買っている AS64510 のネットワーク）への BGP 経路を 3 本持っています。自分のリンクで ISP-A（AS64501）から受けたもの、ISP-B（AS64502）から受けたもの、そして同じ AS の R2 が別のリンクで ISP-A から受け、iBGP で渡してきたものです。BGP が使うのはこのうち 1 本だけで、決まった順番で属性を 1 つずつ比べて選びます。`,
          )}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="bgp-paths">
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Path', '経路')}</th>
                <th style={cell}>weight</th>
                <th style={cell}>LOCAL_PREF</th>
                <th style={cell}>AS_PATH</th>
                <th style={cell}>ORIGIN</th>
                <th style={cell}>MED</th>
                <th style={cell}>{t('IGP cost', 'IGP コスト')}</th>
                <th style={cell}>{t('Router ID', 'ルータ ID')}</th>
              </tr>
            </thead>
            <tbody>
              {BASE_PATHS.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{pathName(entry.id)}</td>
                  <td style={mono}>{entry.weight}</td>
                  <td style={mono}>{entry.localPref}</td>
                  <td style={mono}>{entry.asPath.join(' ')}</td>
                  <td style={mono}>{entry.origin.toUpperCase()}</td>
                  <td style={mono}>{entry.med}</td>
                  <td style={mono}>{entry.igpMetric}</td>
                  <td style={mono}>{entry.routerId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="bgp-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t('Which path does R1 choose?', 'R1 が選ぶのはどの経路？')}
        </p>
        {choices(PATH_IDS, guess, setGuess, pathName, 'bgp-guess', revealed)}
        {revealed ? (
          <p
            data-testid="bgp-reveal"
            data-right={String(guess === base.winner)}
            data-winner={base.winner}
            data-step={base.decidedBy}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {verdict(guess === base.winner)}
            {t(
              `${pathName(base.winner)}, decided at “${stepName(base.decidedBy)}”. Weight, LOCAL_PREF (${a.localPref}), AS_PATH length (${a.asPath.length}) and ORIGIN tie. MED is compared only between paths from the same neighbouring AS: ISP-A’s ${a.med} is compared with the iBGP path’s ${i.med}, which also came from AS${i.asPath[0]}, and loses; ISP-B’s ${b.med} has no path from AS${b.asPath[0]} to be compared with, so it stays. The lowest MED of all (${i.med}) does not win either: the next step prefers a path learned over eBGP to one learned over iBGP.`,
              `「${stepName(base.decidedBy)}」で ${pathName(base.winner)} に決まります。weight、LOCAL_PREF（${a.localPref}）、AS_PATH の長さ（${a.asPath.length}）、ORIGIN は同じです。MED は同じ隣接 AS から来た経路どうしでしか比べません。ISP-A の ${a.med} は、同じ AS${i.asPath[0]} から来た iBGP 経路の ${i.med} と比べられて負けます。ISP-B の ${b.med} には、比べる相手（AS${b.asPath[0]} から来た別の経路）がないので残ります。いちばん小さい MED（${i.med}）も勝てません。次のステップで、iBGP で受けた経路より eBGP で受けた経路が優先されるからです。`,
            )}
          </p>
        ) : (
          revealButton(
            'bgp-reveal-button',
            guess !== null,
            t('Run the decision', '比べてみる'),
            () => setRevealed(true),
          )
        )}
        {revealed ? <div style={{ marginTop: 8 }}>{trace(base, 'bgp-trace')}</div> : null}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="bgp-med-predict">
          <div style={LESSON_LABEL}>{t('Predict again', 'もう一度予想')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'ISP-A wants your traffic and sends its path with MED 0, lower than every other path. Nothing else changes. Which path does R1 choose now?',
              'ISP-A はトラフィックを引き込みたくて、MED を 0（どの経路よりも小さい値）にして送ってきました。ほかは何も変わりません。R1 が選ぶのはどの経路？',
            )}
          </p>
          {choices(PATH_IDS, medGuess, setMedGuess, pathName, 'bgp-guess-med', medRevealed)}
          {medRevealed ? (
            <p
              data-testid="bgp-med-reveal"
              data-right={String(medGuess === afterMed.winner)}
              data-winner={afterMed.winner}
              data-step={afterMed.decidedBy}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              {verdict(medGuess === afterMed.winner)}
              {t(
                `Still ${pathName(afterMed.winner)}, now decided at “${stepName(afterMed.decidedBy)}”. MED 0 beats the iBGP path from the same AS, but it is never compared with ISP-B’s ${b.med} from another AS. Both remaining paths are eBGP with IGP cost ${a.igpMetric}, so the lower router ID wins: ${b.routerId} beats ${a.routerId}. Only if the operator turns on always-compare-med does MED count across ASes, and then ${pathName(afterMedCompared.winner)} wins at “${stepName(afterMedCompared.decidedBy)}”.`,
                `変わらず ${pathName(afterMed.winner)} で、今度は「${stepName(afterMed.decidedBy)}」で決まります。MED 0 は同じ AS から来た iBGP 経路には勝ちますが、別の AS から来た ISP-B の ${b.med} とは比べられません。残った 2 本はどちらも eBGP で IGP コストも ${a.igpMetric} なので、ルータ ID の小さいほう（${b.routerId} は ${a.routerId} より小さい）が勝ちます。運用者が always-compare-med を有効にしたときだけ MED が AS をまたいで比べられ、そのときは「${stepName(afterMedCompared.decidedBy)}」で ${pathName(afterMedCompared.winner)} が勝ちます。`,
              )}
            </p>
          ) : (
            revealButton(
              'bgp-med-reveal-button',
              medGuess !== null,
              t('Run it again', 'もう一度比べる'),
              () => setMedRevealed(true),
            )
          )}
        </div>
      ) : null}

      {medRevealed ? (
        <div style={LESSON_CARD} data-testid="bgp-explore">
          <div style={LESSON_LABEL}>{t('Change the attributes', '属性を変えてみる')}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('ISP-A MED', 'ISP-A の MED')}
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={ispAMed}
                data-testid="bgp-isp-a-med"
                onChange={(event) => setIspAMed(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{ispAMed}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {t('LOCAL_PREF via R2', 'R2 経由の LOCAL_PREF')}
              <input
                type="range"
                min={50}
                max={200}
                step={10}
                value={ibgpLocalPref}
                data-testid="bgp-ibgp-local-pref"
                onChange={(event) => setIbgpLocalPref(Number(event.target.value))}
                style={{ minHeight: 44 }}
              />
              <span style={{ fontFamily: 'monospace' }}>{ibgpLocalPref}</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 44 }}>
              <input
                type="checkbox"
                checked={alwaysCompareMed}
                data-testid="bgp-always-compare-med"
                onChange={(event) => setAlwaysCompareMed(event.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              always-compare-med
            </label>
          </div>
          <p
            data-testid="bgp-explore-result"
            data-winner={explored.winner}
            data-step={explored.decidedBy}
            style={{ margin: '8px 0', fontWeight: 700 }}
          >
            {t(
              `R1 chooses ${pathName(explored.winner)}, decided at “${stepName(explored.decidedBy)}”.`,
              `R1 は ${pathName(explored.winner)} を選びます。決め手は「${stepName(explored.decidedBy)}」です。`,
            )}
          </p>
          {trace(explored, 'bgp-explore-trace')}
          <p style={{ margin: '8px 0 0', lineHeight: 1.7, fontSize: 13 }}>
            {t(
              'LOCAL_PREF is R1’s own AS speaking: it is set on the way in and shared over iBGP, and it is checked before anything the neighbours send. MED is a neighbouring AS’s hint about which of its own links to enter by. Weight is a vendor-specific value (Cisco calls it weight) that is local to one router and checked before everything else; it is not in RFC 4271.',
              'LOCAL_PREF は自分の AS の意思です。受け取るときに設定して iBGP で共有し、隣の AS が送ってくるどの値よりも先に比べます。MED は、隣の AS が「自分のどのリンクから入ってほしいか」を伝える目安です。weight はベンダー独自の値（Cisco の呼び名）で、1 台のルータの中だけで効き、ほかのどれよりも先に比べます。RFC 4271 には含まれません。',
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD} data-testid="bgp-community-predict">
        <div style={LESSON_LABEL}>{t('Communities', 'コミュニティ')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'A community is a tag attached to a route (RFC 1997). A customer in AS65000 sends 198.51.100.0/24 to its provider AS65001, whose routers E1, C1 and E2 are iBGP peers of each other. E1 receives the route; E2 has an eBGP session to AS65002. The customer tags the route NO_EXPORT. Which routers end up with it?',
            'コミュニティは経路に付けるタグです（RFC 1997）。AS65000 の顧客が、198.51.100.0/24 をプロバイダの AS65001 へ送ります。AS65001 のルータ E1・C1・E2 は互いに iBGP でつながり、経路を受け取るのは E1、AS65002 と eBGP でつながっているのは E2 です。顧客は経路に NO_EXPORT を付けました。経路を持つことになるのはどのルータ？',
          )}
        </p>
        <p style={{ margin: '0 0 8px', fontFamily: 'monospace', fontSize: 13 }}>
          AS65000 → [ AS65001: E1 — C1 — E2 ] → AS65002
        </p>
        {choices(
          SPREADS,
          spreadGuess,
          setSpreadGuess,
          spreadName,
          'bgp-guess-spread',
          spreadRevealed,
        )}
        {spreadRevealed ? (
          <p
            data-testid="bgp-spread-reveal"
            data-right={String(spreadGuess === spreadTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            {verdict(spreadGuess === spreadTruth)}
            {t(
              `${spreadName(spreadTruth)}. NO_EXPORT means “do not advertise this outside the AS that receives it”. E1 accepts and uses the route and gives it to its iBGP peers C1 and E2, but E2 does not send it over eBGP to AS65002. It is how a customer keeps a more specific route, used to steer traffic inside the provider, from leaking to the rest of the Internet.`,
              `正解は「${spreadName(spreadTruth)}」です。NO_EXPORT は「受け取った AS の外へ広告しない」という意味です。E1 は経路を受け入れて使い、iBGP ピアの C1 と E2 にも渡しますが、E2 は eBGP で AS65002 へは送りません。プロバイダの中だけで通信を振り分けたい細かい経路を、インターネットの残りへ漏らさないために顧客が使います。`,
            )}
          </p>
        ) : (
          revealButton(
            'bgp-spread-reveal-button',
            spreadGuess !== null,
            t('Send the route', '経路を送る'),
            () => setSpreadRevealed(true),
          )
        )}
      </div>

      {spreadRevealed ? (
        <div style={LESSON_CARD} data-testid="bgp-communities">
          <div style={LESSON_LABEL}>{t('Try each community', 'コミュニティを切り替える')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COMMUNITIES.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={community === id}
                data-testid={`bgp-community-${id}`}
                onClick={() => setCommunity(id)}
                style={{ ...lessonChoice(community === id), minHeight: 44 }}
              >
                {community === id ? '✓ ' : ''}
                {communityName(id)}
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0', fontFamily: 'monospace', fontSize: 13 }}>
            {`community: ${COMMUNITY_VALUE[community]}`}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Router', 'ルータ')}</th>
                  <th style={cell}>AS</th>
                  <th style={cell}>{t('Has the route', '経路を持つ')}</th>
                  <th style={cell}>LOCAL_PREF</th>
                  <th style={cell}>{t('Sends it to', '送る相手')}</th>
                </tr>
              </thead>
              <tbody>
                {states.map((router) => (
                  <tr
                    key={router.id}
                    data-testid={`bgp-router-${router.id}`}
                    data-holds={String(router.holds)}
                    data-local-pref={router.localPref ?? ''}
                  >
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{routerName(router.id)}</td>
                    <td style={mono}>{router.as}</td>
                    <td style={mono}>
                      {router.id === 'cust'
                        ? t('originates', '自分で広告')
                        : router.holds
                          ? t('yes', 'はい')
                          : t('no', 'いいえ')}
                    </td>
                    <td style={mono}>{router.localPref ?? '—'}</td>
                    <td style={cell}>
                      {router.advertisesTo.length
                        ? router.advertisesTo.map(routerName).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7, fontSize: 13 }}>
            {
              {
                none: t(
                  'Untagged, the route goes everywhere. C1 learned it over iBGP, so it does not pass it to another iBGP peer: inside an AS, every router hears it from the edge that received it.',
                  'タグがなければ経路はどこへでも届きます。C1 は iBGP で受け取ったので、ほかの iBGP ピアへは渡しません。AS の中では、各ルータは受け取った境界ルータから直接聞きます。',
                ),
                'no-export': t(
                  'NO_EXPORT: kept inside AS65001 (or inside a confederation, if the AS is one), never sent over eBGP.',
                  'NO_EXPORT：AS65001 の中（AS がコンフェデレーションなら、その中）にとどまり、eBGP では送られません。',
                ),
                'no-advertise': t(
                  'NO_ADVERTISE: the router that receives it uses it but sends it to no BGP peer at all, not even inside its own AS.',
                  'NO_ADVERTISE：受け取ったルータは経路を使いますが、同じ AS の中も含めてどの BGP ピアにも送りません。',
                ),
                'lp-80': t(
                  `65001:80 is not a standard value: it means something only because AS65001 publishes a policy that routes tagged with it get LOCAL_PREF ${TAGGED_LOCAL_PREF} instead of ${DEFAULT_LOCAL_PREF}. A customer with two providers uses such a tag to make this one a backup. The route still goes everywhere; LOCAL_PREF is never sent over eBGP, so AS65002 starts again at its own ${DEFAULT_LOCAL_PREF}.`,
                  `65001:80 は標準の値ではありません。AS65001 が「このタグの付いた経路は LOCAL_PREF を ${DEFAULT_LOCAL_PREF} ではなく ${TAGGED_LOCAL_PREF} にする」というポリシーを公開しているから意味を持ちます。2 つのプロバイダを使う顧客が、こちらを予備にしたいときに付けます。経路はどこへでも届きます。LOCAL_PREF は eBGP では送られないので、AS65002 では自分の ${DEFAULT_LOCAL_PREF} から始まります。`,
                ),
              }[community]
            }
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('What is simplified', '簡略化していること')}</div>
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: 13 }}>
          {t(
            'The order follows RFC 4271 §9.1.2.2 with weight in front. Real routers add steps: many vendors prefer a path the router originates itself is preferred, some vendors prefer the older of two eBGP paths before comparing router IDs, route reflection adds its own tie-breaks, and the lowest peer address comes last. Here every path has a MED, router IDs are distinct, and nobody removes communities, which providers often do at their edge.',
            '比べる順番は RFC 4271 §9.1.2.2 に weight を先頭に加えたものです。実際のルータにはさらにステップがあります。多くのベンダーは自分で広告した経路を優先する、ベンダーによっては 2 本の eBGP 経路のうち古いほうをルータ ID より先に優先する、ルートリフレクタ独自の比較がある、最後にピアアドレスの小さいほうを選ぶ、などです。ここではすべての経路に MED があり、ルータ ID は重複せず、コミュニティを取り除くルータもいません（実際のプロバイダは境界でよく取り除きます）。',
          )}
        </p>
      </div>
    </div>
  );
}

export default function BgpPolicyDemo() {
  return (
    <DemoShell
      title="BGP best path and communities"
      desc="Step through how a router picks one of several BGP paths, then tag a route with communities"
    >
      <BgpPolicyLesson />
    </DemoShell>
  );
}
