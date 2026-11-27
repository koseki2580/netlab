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
  LESSON_DEFAULTS,
  scenario,
  simulate,
  type Detection,
  type Outcome,
  type RouteState,
} from './bgpGracefulRestart';

type CpAnswer = 'both' | 'without-only' | 'with-only' | 'neither';
const CP_ANSWERS: readonly CpAnswer[] = ['both', 'without-only', 'with-only', 'neither'];

type DeadAnswer = 'under-second' | 'hold' | 'restart' | 'none';
const DEAD_ANSWERS: readonly DeadAnswer[] = ['under-second', 'hold', 'restart', 'none'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const secs = (ms: number) => Number((ms / 1000).toFixed(1));

const ROUTE_COLOUR: Record<RouteState, string> = {
  fresh: 'var(--netlab-accent-green)',
  stale: 'var(--netlab-accent-orange)',
  none: 'var(--netlab-border-strong)',
};

const CHART_W = 400;
const X0 = 16;
const X1 = CHART_W - 16;

/** Two bands over time: R2's route to R1's prefixes, and whether traffic gets through. */
function Timeline({ outcome, testId }: { outcome: Outcome; testId: string }) {
  const t = useT();
  const x = (ms: number) => X0 + (ms / outcome.endMs) * (X1 - X0);
  const loss = Number.isFinite(outcome.lossMs)
    ? t(`${secs(outcome.lossMs)} s lost`, `${secs(outcome.lossMs)} 秒の断`)
    : t('never recovers', '回復しない');
  return (
    <svg
      data-testid={testId}
      viewBox={`0 0 ${CHART_W} 112`}
      style={{ width: '100%', maxWidth: 560 }}
      role="img"
      aria-label={t(
        `Route and traffic over ${secs(outcome.endMs)} s: ${loss}`,
        `${secs(outcome.endMs)} 秒間の経路と通信：${loss}`,
      )}
    >
      <text x={X0} y={12} fontSize={12} fill="var(--netlab-text-secondary)">
        {t('R2’s route via R1', 'R2 の R1 経由の経路')}
      </text>
      {outcome.segments.map((seg, index) => (
        <rect
          key={`r${index}`}
          x={x(seg.fromMs)}
          y={18}
          width={Math.max(x(seg.toMs) - x(seg.fromMs), 1)}
          height={18}
          fill={ROUTE_COLOUR[seg.route]}
          stroke="var(--netlab-bg-primary)"
        />
      ))}
      <text x={X0} y={54} fontSize={12} fill="var(--netlab-text-secondary)">
        {t('Traffic', '通信')}
      </text>
      {outcome.segments.map((seg, index) => (
        <rect
          key={`f${index}`}
          x={x(seg.fromMs)}
          y={60}
          width={Math.max(x(seg.toMs) - x(seg.fromMs), 1)}
          height={18}
          fill={seg.flowing ? 'var(--netlab-accent-cyan)' : 'var(--netlab-accent-red)'}
          stroke="var(--netlab-bg-primary)"
        />
      ))}
      <text x={X0} y={98} fontSize={12} fill="var(--netlab-text-secondary)">
        {t('0 s', '0 秒')}
      </text>
      <text x={X1} y={98} textAnchor="end" fontSize={12} fill="var(--netlab-text-secondary)">
        {t(`${secs(outcome.endMs)} s`, `${secs(outcome.endMs)} 秒`)}
      </text>
    </svg>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function BgpGracefulRestartLesson() {
  const t = useT();
  const [cpGuess, setCpGuess] = useState<CpAnswer | null>(null);
  const [cpRevealed, setCpRevealed] = useState(false);
  const [cpRestartMs, setCpRestartMs] = useState<number>(LESSON_DEFAULTS.cpRestartMs);
  const [deadGuess, setDeadGuess] = useState<DeadAnswer | null>(null);
  const [deadRevealed, setDeadRevealed] = useState(false);
  const [restartTimeMs, setRestartTimeMs] = useState<number>(LESSON_DEFAULTS.restartTimeMs);

  const d = LESSON_DEFAULTS;
  const en = (ms: number) => (Number.isFinite(ms) ? `${secs(ms)} s` : 'never');
  const ja = (ms: number) => (Number.isFinite(ms) ? `${secs(ms)} 秒` : '回復しない');

  // Part 1: control-plane restart, no other path.
  const askedNoGr = simulate(scenario({ gr: false }));
  const askedGr = simulate(scenario({ gr: true }));
  const cpTruth: CpAnswer =
    askedNoGr.lossMs > 0
      ? askedGr.lossMs > 0
        ? 'both'
        : 'without-only'
      : askedGr.lossMs > 0
        ? 'with-only'
        : 'neither';
  const tunedNoGr = simulate(scenario({ gr: false, cpRestartMs }));
  const tunedGr = simulate(scenario({ gr: true, cpRestartMs }));

  // Part 2: R1 dies entirely; a backup path through R3.
  const dead = (gr: boolean, detection: Detection, rt: number = d.restartTimeMs) =>
    simulate(scenario({ gr, detection, failure: 'whole-router', backup: true, restartTimeMs: rt }));
  const askedDead = dead(true, 'bfd-c0');
  const deadValue: Record<DeadAnswer, number> = {
    'under-second': d.bfdDetectMs,
    hold: d.holdTimeMs,
    restart: d.bfdDetectMs + d.restartTimeMs,
    none: 0,
  };
  const deadTruth = DEAD_ANSWERS.find((answer) => deadValue[answer] === askedDead.lossMs);
  const rows = [
    { id: 'nogr-bfd', outcome: dead(false, 'bfd-c0', restartTimeMs) },
    { id: 'gr-nobfd', outcome: dead(true, 'none', restartTimeMs) },
    { id: 'gr-c0', outcome: dead(true, 'bfd-c0', restartTimeMs) },
    { id: 'gr-c1', outcome: dead(true, 'bfd-c1', restartTimeMs) },
  ] as const;
  const rowName = (id: (typeof rows)[number]['id']) =>
    ({
      'nogr-bfd': t('No GR, BFD', 'GR なし、BFD あり'),
      'gr-nobfd': t('GR, no BFD', 'GR あり、BFD なし'),
      'gr-c0': t('GR, BFD with C = 0', 'GR あり、BFD（C = 0）'),
      'gr-c1': t('GR, BFD with C = 1', 'GR あり、BFD（C = 1）'),
    })[id];

  const cpName = (answer: CpAnswer) =>
    ({
      both: t('It drops in both cases', 'どちらでも途切れる'),
      'without-only': t('It drops only without GR', 'GR なしのときだけ途切れる'),
      'with-only': t('It drops only with GR', 'GR ありのときだけ途切れる'),
      neither: t('It drops in neither case', 'どちらでも途切れない'),
    })[answer];
  const deadName = (answer: DeadAnswer) =>
    ({
      'under-second': t('Under 1 s', '1 秒未満'),
      hold: t('About 90 s', '約 90 秒'),
      restart: t('About 121 s', '約 121 秒'),
      none: t('No traffic is lost', '失われない'),
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
        <div style={LESSON_LABEL}>
          {t('A router restarts its BGP', 'ルータが BGP を再起動する')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A router has a control plane, which runs protocols such as BGP and computes routes, and a forwarding plane, which forwards packets using the table the control plane installed. Many routers can restart the control plane, for a software upgrade or after a crash, while the forwarding plane keeps forwarding. BGP graceful restart (GR, RFC 4724) lets a neighbour, the helper, take part in that. R1 restarts; R2 is its eBGP neighbour and sends traffic for R1’s prefixes to R1.',
            'ルータには、BGP などのプロトコルを動かして経路を計算するコントロールプレーンと、コントロールプレーンが入れたテーブルでパケットを転送するフォワーディングプレーンがあります。多くのルータは、ソフトウェア更新やクラッシュのあとにコントロールプレーンだけを再起動し、そのあいだもフォワーディングプレーンで転送を続けられます。BGP グレースフルリスタート（GR、RFC 4724）は、隣のルータ（ヘルパー）がそれに協力するための仕組みです。R1 が再起動し、R2 は R1 の eBGP ネイバーで、R1 の配下のプレフィックス宛ての通信を R1 へ送っています。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="bgpgr-predict">
        <div style={LESSON_LABEL}>
          {t('Predict first: a control-plane restart', 'まず予想：コントロールプレーンの再起動')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `R1’s BGP process restarts; its forwarding plane keeps forwarding throughout. R2 sees the BGP session drop at once. The session is back ${en(d.cpRestartMs)} later, and R1 finishes re-sending its routes with End-of-RIB ${en(d.eorAfterMs)} after that. R2 has no other path to R1’s prefixes. Compare two cases: GR not configured, and GR negotiated with a Restart Time of ${en(d.restartTimeMs)}. Is R2’s traffic to R1’s prefixes interrupted?`,
            `R1 の BGP プロセスが再起動します。フォワーディングプレーンはそのあいだずっと転送を続けます。R2 には BGP セッションが切れたことがすぐに見えます。セッションは ${ja(d.cpRestartMs)}後に戻り、その ${ja(d.eorAfterMs)}後に R1 は End-of-RIB を送って経路を送り直し終えます。R2 には R1 の配下のプレフィックスへのほかの経路はありません。GR を設定していない場合と、Restart Time ${ja(d.restartTimeMs)} で GR をネゴシエートした場合を比べます。R2 からそのプレフィックスへの通信は途切れる？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {CP_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={cpGuess === answer}
              data-testid={`bgpgr-guess-${answer}`}
              disabled={cpRevealed}
              onClick={() => setCpGuess(answer)}
              style={{ ...lessonChoice(cpGuess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, cpGuess, cpTruth, cpRevealed)}
              {cpName(answer)}
            </button>
          ))}
        </div>
        {cpRevealed ? (
          <p
            data-testid="bgpgr-reveal"
            data-right={String(cpGuess === cpTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {cpGuess === cpTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `Without GR, traffic is lost for ${en(askedNoGr.lossMs)}; with GR, for ${en(askedGr.lossMs)}. R1 never stopped forwarding, but without GR, R2 withdraws R1’s routes the moment the session drops and has nowhere to send the traffic until the routes come back at End-of-RIB. With GR, R2 keeps them, marked stale, and goes on forwarding to R1; at End-of-RIB the re-sent routes replace them and any still stale are deleted.`,
              `GR なしでは ${ja(askedNoGr.lossMs)}、GR ありでは ${ja(askedGr.lossMs)}の断です。R1 は転送をやめていませんが、GR がないと R2 はセッションが切れた瞬間に R1 の経路を取り消し、End-of-RIB で経路が戻るまで通信の送り先がありません。GR があると R2 は経路を stale（古い）と印を付けて残し、R1 への転送を続けます。End-of-RIB で送り直された経路に置き換わり、stale のまま残った経路は消されます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="bgpgr-reveal-button"
            disabled={!cpGuess}
            style={{
              ...(cpGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setCpRevealed(true)}
          >
            {cpGuess
              ? t('Restart R1’s BGP', 'R1 の BGP を再起動')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {cpRevealed ? (
        <div style={LESSON_CARD} data-testid="bgpgr-cp">
          <div style={LESSON_LABEL}>{t('Route and traffic over time', '経路と通信の時間変化')}</div>
          <p
            data-testid="bgpgr-loss-nogr"
            data-loss-ms={tunedNoGr.lossMs}
            style={{ margin: '0 0 4px', fontWeight: 700 }}
          >
            {t(`Without GR: ${en(tunedNoGr.lossMs)} lost`, `GR なし：${ja(tunedNoGr.lossMs)}の断`)}
          </p>
          <Timeline outcome={tunedNoGr} testId="bgpgr-timeline-nogr" />
          <p
            data-testid="bgpgr-loss-gr"
            data-loss-ms={tunedGr.lossMs}
            style={{ margin: '8px 0 4px', fontWeight: 700 }}
          >
            {t(`With GR: ${en(tunedGr.lossMs)} lost`, `GR あり：${ja(tunedGr.lossMs)}の断`)}
          </p>
          <Timeline outcome={tunedGr} testId="bgpgr-timeline-gr" />
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Route: green fresh, orange stale, grey none. Traffic: cyan gets through, red lost.',
              '経路：緑は最新、橙は stale、灰色はなし。通信：水色は届く、赤は失われる。',
            )}
          </p>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            {t('Session back after', 'セッションが戻るまで')}
            <input
              type="range"
              min={15_000}
              max={240_000}
              step={15_000}
              value={cpRestartMs}
              data-testid="bgpgr-cp-restart"
              onChange={(event) => setCpRestartMs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{t(en(cpRestartMs), ja(cpRestartMs))}</span>
          </label>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `The Restart Time is R1’s promise of how soon its session will be back. If it is not back within ${en(d.restartTimeMs)}, R2 deletes the stale routes and traffic is lost from then on until End-of-RIB.`,
              `Restart Time は、セッションがいつまでに戻るかという R1 の約束です。${ja(d.restartTimeMs)}以内に戻らなければ、R2 は stale の経路を消し、そこから End-of-RIB まで通信は失われます。`,
            )}
          </p>
        </div>
      ) : null}

      <div style={LESSON_CARD} data-testid="bgpgr-dead-predict">
        <div style={LESSON_LABEL}>
          {t('Predict: the whole router dies', '予想：ルータ全体が止まる')}
        </div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `This time R1 loses power: its forwarding plane stops too, and it does not come back. R2 now has a backup path to the same prefixes through R3, used only when R2 has no route via R1. GR is negotiated with a Restart Time of ${en(d.restartTimeMs)}. R2 and R1 also run BFD at 300 ms × 3, so R2 notices in ${en(d.bfdDetectMs)}. R1’s BFD has its C bit at 0: it runs in the control plane, so a BFD failure might be only a control-plane restart, and R2 treats it as one. Take moving to the backup path as instant. How long is R2’s traffic lost?`,
            `今度は R1 の電源が落ちます。フォワーディングプレーンも止まり、戻ってきません。R2 には R3 経由で同じプレフィックスへのバックアップ経路があり、R1 経由の経路がないときだけそれを使います。GR は Restart Time ${ja(d.restartTimeMs)} でネゴシエート済みです。R2 と R1 は BFD を 300 ms × 3 で動かしているので、R2 は ${ja(d.bfdDetectMs)}で気づきます。R1 の BFD は C ビットが 0 で、コントロールプレーンで動いています。そのため BFD が落ちてもコントロールプレーンの再起動にすぎない可能性があり、R2 はそのように扱います。バックアップ経路への切り替えは一瞬とします。R2 の通信が失われるのはどれくらい？`,
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {DEAD_ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={deadGuess === answer}
              data-testid={`bgpgr-dead-guess-${answer}`}
              disabled={deadRevealed}
              onClick={() => setDeadGuess(answer)}
              style={{ ...lessonChoice(deadGuess === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, deadGuess, deadTruth, deadRevealed)}
              {deadName(answer)}
            </button>
          ))}
        </div>
        {deadRevealed ? (
          <p
            data-testid="bgpgr-dead-reveal"
            data-right={String(deadGuess === deadTruth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {deadGuess === deadTruth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${en(askedDead.lossMs)}. BFD noticed in ${en(askedDead.noticedMs)}, but R2, as a GR helper, kept the stale routes via R1 for the whole Restart Time, forwarding into a dead router, and moved to the backup only at ${en(askedDead.deletedMs ?? 0)}. GR must not hide a real failure. A BFD with the C bit at 1 runs independently of the control plane (often in hardware), so it stays up through a control-plane restart; when it does go down, the forwarding plane has failed, and RFC 5882 has the helper drop the routes at once.`,
              `${ja(askedDead.lossMs)}です。BFD は ${ja(askedDead.noticedMs)}で気づきましたが、R2 は GR のヘルパーとして Restart Time いっぱい R1 経由の stale の経路を残し、止まったルータへ転送し続けました。バックアップへ移ったのは ${ja(askedDead.deletedMs ?? 0)}です。GR が本物の障害を隠してはいけません。C ビットが 1 の BFD はコントロールプレーンから独立して（多くはハードウェアで）動くので、コントロールプレーンの再起動中も落ちません。それが落ちたならフォワーディングプレーンの障害なので、RFC 5882 ではヘルパーはすぐに経路を消します。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="bgpgr-dead-reveal-button"
            disabled={!deadGuess}
            style={{
              ...(deadGuess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setDeadRevealed(true)}
          >
            {deadGuess
              ? t('Power off R1', 'R1 の電源を切る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {deadRevealed ? (
        <div style={LESSON_CARD} data-testid="bgpgr-dead">
          <div style={LESSON_LABEL}>{t('Four ways to configure R2', 'R2 の 4 通りの設定')}</div>
          <Timeline outcome={rows[2].outcome} testId="bgpgr-timeline-dead" />
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('R2’s setup', 'R2 の設定')}</th>
                  <th style={cell}>{t('Noticed', '気づく')}</th>
                  <th style={cell}>{t('Routes via R1 removed', 'R1 経由の経路を消す')}</th>
                  <th style={cell}>{t('Traffic lost', '通信の断')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid={`bgpgr-row-${row.id}`}
                    data-loss-ms={row.outcome.lossMs}
                  >
                    <td style={cell}>{rowName(row.id)}</td>
                    <td style={mono}>{t(en(row.outcome.noticedMs), ja(row.outcome.noticedMs))}</td>
                    <td style={mono}>
                      {row.outcome.deletedMs === null
                        ? '—'
                        : t(en(row.outcome.deletedMs), ja(row.outcome.deletedMs))}
                    </td>
                    <td style={mono}>{t(en(row.outcome.lossMs), ja(row.outcome.lossMs))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            Restart Time
            <input
              type="range"
              min={30_000}
              max={300_000}
              step={30_000}
              value={restartTimeMs}
              data-testid="bgpgr-restart-time"
              onChange={(event) => setRestartTimeMs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>
              {t(en(restartTimeMs), ja(restartTimeMs))}
            </span>
          </label>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              `Without BFD, R2 notices a dead router only when the hold time runs out (${en(d.holdTimeMs)} here, a common value; some vendors default to 180 s) and then still keeps the stale routes for the Restart Time. A shorter Restart Time hides a failure for less time, but a restart that takes longer then loses traffic.`,
              `BFD がないと、R2 が止まったルータに気づくのはホールドタイムが切れたとき（ここでは ${ja(d.holdTimeMs)}。よく使われる値で、初期値を 180 秒とするベンダーもあります）で、そのあとさらに Restart Time のあいだ stale の経路を残します。Restart Time を短くすれば障害を隠す時間は減りますが、それより長くかかる再起動では通信が失われます。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Simplified: one prefix stands for all; moving to the backup and installing routes take no time; R2 sees the session drop at once in a control-plane restart; all routes arrive by End-of-RIB. ${en(d.restartTimeMs)} is a common default Restart Time, not a fixed value; real helpers may also keep stale routes under a separate stale-path timer.`,
              `簡略化：1 つのプレフィックスで全体を代表させ、バックアップへの切り替えと経路のインストールには時間がかからないとしています。コントロールプレーンの再起動では R2 はセッション断にすぐ気づき、経路は End-of-RIB までにすべて届くとしています。Restart Time の ${ja(d.restartTimeMs)} はよくある初期値で、決まった値ではありません。実機のヘルパーには stale の経路を別のタイマーで管理するものもあります。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function BgpGracefulRestartDemo() {
  return (
    <DemoShell
      title="BGP graceful restart and BFD"
      desc="What a BGP neighbour does with a restarting router's routes, and what happens to the traffic"
    >
      <BgpGracefulRestartLesson />
    </DemoShell>
  );
}
