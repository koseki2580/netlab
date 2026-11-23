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
  BASE_LAST_MODIFIED,
  DEPLOYED,
  DEPLOY_TIME,
  RESOURCES,
  TIMELINE,
  freshnessLifetime,
  httpDate,
  isStorable,
  parseCacheControl,
  simulate,
  type BrowserOutcome,
  type CdnOutcome,
  type Row,
} from './httpCache';

type Answer = 'cache' | 'cdn' | 'revalidate' | 'download';
const ANSWERS: readonly Answer[] = ['revalidate', 'cache', 'cdn', 'download'];
const PREDICT_AT = 10;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const clock = (s: number) => (s >= 3600 ? `${s / 3600} h` : s >= 60 ? `${s / 60} min` : `${s} s`);
const kb = (bytes: number) =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(2)} MB` : `${(bytes / 1000).toFixed(0)} kB`;

/** Which answer a row matches. */
function answerOf(row: Row): Answer {
  if (row.browser === 'fresh') return 'cache';
  if (!row.originHit) return 'cdn';
  return row.status === 304 ? 'revalidate' : 'download';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function HttpCacheLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [time, setTime] = useState<number>(TIMELINE[0]!);
  const [deploy, setDeploy] = useState(false);
  const asked = simulate([0, PREDICT_AT])[1]!.rows.find((r) => r.resource.id === 'index')!;
  const truth = answerOf(asked);
  const steps = simulate(TIMELINE, deploy ? DEPLOY_TIME : null);
  const step = steps[TIMELINE.indexOf(time)]!;

  const answerName = (answer: Answer) =>
    ({
      cache: t(
        'It uses its stored copy without sending anything',
        '保存してあるコピーを、何も送らずにそのまま使う',
      ),
      cdn: t(
        'The CDN answers from its own copy; the origin is not asked',
        'CDN が自分のコピーで答え、オリジンには問い合わせない',
      ),
      revalidate: t(
        'A request reaches the origin, but no body comes back',
        'オリジンまで要求が届くが、本文は返ってこない',
      ),
      download: t(
        'The whole page is downloaded again from the origin',
        'ページ全体をオリジンからもう一度ダウンロードする',
      ),
    })[answer];
  const browserName = (outcome: BrowserOutcome) =>
    ({
      fresh: t('fresh copy, no request', '新鮮なコピー（要求なし）'),
      'revalidated-304': t('revalidated → 304', '再検証 → 304'),
      'revalidated-200': t('revalidated → 200 (new)', '再検証 → 200（新しい版）'),
      fetched: t('fetched in full', '全体を取得'),
    })[outcome];
  const cdnName = (outcome: CdnOutcome) =>
    ({
      none: t('not asked', '問い合わせなし'),
      hit: t('answered from its copy', '自分のコピーで応答'),
      'revalidated-304': t('asked origin → 304', 'オリジンに確認 → 304'),
      'revalidated-200': t('asked origin → 200', 'オリジンに確認 → 200'),
      miss: t('fetched and stored', '取得して保存'),
      pass: t('passed on, not stored', '中継のみ（保存しない）'),
    })[outcome];
  const yesNo = (yes: boolean) => (yes ? t('yes', 'する') : t('no', 'しない'));
  const validatorText = (kind: (typeof RESOURCES)[number]['validator'], id: string) =>
    kind === 'etag'
      ? `ETag: "${id}-v1"`
      : kind === 'last-modified'
        ? `Last-Modified: ${httpDate(BASE_LAST_MODIFIED)}`
        : t('(none)', '（なし）');

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
        <div style={LESSON_LABEL}>{t('Two caches on the way', '途中にある 2 つのキャッシュ')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'A browser loads a page through a CDN, which fetches from the origin server. The browser keeps a private cache for one user; the CDN is a shared cache that serves everyone. The origin labels each response with Cache-Control, and most also carry a validator (an ETag or a Last-Modified date) so a cache can later ask “is my copy still current?”.',
            'ブラウザは CDN を通してページを読み込み、CDN はオリジンサーバーから取ってきます。ブラウザのキャッシュは 1 人の利用者だけのプライベートキャッシュ、CDN は全員に配る共有キャッシュです。オリジンは応答ごとに Cache-Control を付け、多くの応答には検証子（ETag か Last-Modified の日時）も付けます。キャッシュはあとでそれを使って「手元のコピーはまだ最新？」と確かめられます。',
          )}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Resource', 'リソース')}</th>
                <th style={cell}>Cache-Control</th>
                <th style={cell}>{t('Validator', '検証子')}</th>
                <th style={cell}>{t('Size', 'サイズ')}</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => (
                <tr key={resource.id}>
                  <td style={mono}>
                    <code>{resource.path}</code>
                  </td>
                  <td style={mono}>
                    <code>{resource.cacheControl}</code>
                  </td>
                  <td style={mono}>
                    <code>{validatorText(resource.validator, resource.id)}</code>
                  </td>
                  <td style={mono}>{kb(resource.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="cache-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Both caches start empty and the browser loads the page. ${PREDICT_AT} s later the user follows a link back to the same page. What happens to /index.html (Cache-Control: no-cache)?`,
            `2 つのキャッシュは空の状態から始まり、ブラウザがページを読み込みます。${PREDICT_AT} 秒後、利用者はリンクをたどって同じページをもう一度開きます。/index.html（Cache-Control: no-cache）はどうなる？`,
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
              data-testid={`cache-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left', minHeight: 44 }}
            >
              {predictionMark(answer, guess, truth, revealed)}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="cache-reveal"
            data-right={String(guess === truth)}
            data-status={asked.status ?? ''}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `The browser sends a conditional request (If-None-Match: "index-v1"); the CDN, bound by no-cache too, forwards its own to the origin, which answers ${asked.status} Not Modified: ${kb(asked.browserBytes)} of body instead of ${kb(asked.resource.size)}. no-cache does not mean “do not store”: both caches stored the page, but must check with the origin before every use. “Do not store” is no-store.`,
              `ブラウザは条件付きリクエスト（If-None-Match: "index-v1"）を送り、同じく no-cache に従う CDN もオリジンに確認します。オリジンの答えは ${asked.status} Not Modified で、本文は ${kb(asked.resource.size)} ではなく ${kb(asked.browserBytes)} です。no-cache は「保存するな」ではありません。2 つのキャッシュはどちらもページを保存していますが、使う前に毎回オリジンへ確認しなければなりません。「保存するな」は no-store です。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="cache-reveal-button"
            disabled={!guess}
            style={{
              ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED),
              marginTop: 8,
            }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Follow the requests', 'リクエストを追う')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="cache-policy">
          <div style={LESSON_LABEL}>
            {t('How each cache reads the headers', '各キャッシュによるヘッダーの読み方')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Resource', 'リソース')}</th>
                  <th style={cell}>{t('Browser stores', 'ブラウザが保存')}</th>
                  <th style={cell}>{t('Browser fresh for', 'ブラウザで新鮮な時間')}</th>
                  <th style={cell}>{t('CDN stores', 'CDN が保存')}</th>
                  <th style={cell}>{t('CDN fresh for', 'CDN で新鮮な時間')}</th>
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map((resource) => {
                  const d = parseCacheControl(resource.cacheControl);
                  const lifetime = (shared: boolean) =>
                    !isStorable(d, shared)
                      ? '—'
                      : d.noCache
                        ? t('0 s (check every time)', '0 秒（毎回確認）')
                        : clock(freshnessLifetime(d, shared));
                  return (
                    <tr
                      key={resource.id}
                      data-testid={`cache-policy-${resource.id}`}
                      data-browser-ttl={d.noCache ? 0 : freshnessLifetime(d, false)}
                      data-cdn-ttl={d.noCache ? 0 : freshnessLifetime(d, true)}
                      data-cdn-store={String(isStorable(d, true))}
                    >
                      <td style={mono}>{resource.path}</td>
                      <td style={mono}>{yesNo(isStorable(d, false))}</td>
                      <td style={mono}>{lifetime(false)}</td>
                      <td style={mono}>{yesNo(isStorable(d, true))}</td>
                      <td style={mono}>{lifetime(true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'max-age applies to every cache; s-maxage overrides it in shared caches only, so the image may stay a day in the CDN but only a minute in the browser. private keeps account.json out of the CDN, so one user’s data is never served to another. no-store keeps the download out of both.',
              'max-age はすべてのキャッシュに効き、s-maxage は共有キャッシュでだけそれを上書きします。だから画像は CDN では 1 日、ブラウザでは 1 分だけ新鮮です。private は account.json を CDN に保存させないので、ある利用者のデータが別の利用者に配られることはありません。no-store はダウンロードをどちらにも保存させません。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="cache-timeline">
          <div style={LESSON_LABEL}>
            {t('The page, opened again and again', '何度も開かれるページ')}
          </div>
          <div
            role="tablist"
            aria-label={t('Time since the first load', '最初の読み込みからの時間')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {TIMELINE.map((at) => (
              <button
                key={at}
                type="button"
                role="tab"
                aria-selected={time === at}
                data-testid={`cache-time-${at}`}
                onClick={() => setTime(at)}
                style={{ ...lessonChoice(time === at), minHeight: 44 }}
              >
                {time === at ? '✓ ' : ''}
                {`t = ${clock(at)}`}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={deploy}
            data-testid="cache-deploy"
            onClick={() => setDeploy((on) => !on)}
            style={{ ...lessonChoice(deploy), minHeight: 44, marginTop: 8, textAlign: 'left' }}
          >
            {deploy ? '✓ ' : ''}
            {t(
              `Deploy new ${DEPLOYED.map((id) => RESOURCES.find((r) => r.id === id)!.path).join(' and ')} at t = ${clock(DEPLOY_TIME)}`,
              `t = ${clock(DEPLOY_TIME)} に新しい ${DEPLOYED.map((id) => RESOURCES.find((r) => r.id === id)!.path).join(' と ')} を公開する`,
            )}
          </button>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Resource', 'リソース')}</th>
                  <th style={cell}>{t('Browser', 'ブラウザ')}</th>
                  <th style={cell}>CDN</th>
                  <th style={cell}>{t('Origin', 'オリジン')}</th>
                  <th style={cell}>{t('Body to browser', 'ブラウザへの本文')}</th>
                  <th style={cell}>{t('Version used', '使われる版')}</th>
                  <th style={cell}>{t('Age (browser / CDN)', '経過時間（ブラウザ／CDN）')}</th>
                </tr>
              </thead>
              <tbody>
                {step.rows.map((r) => (
                  <tr
                    key={r.resource.id}
                    data-testid={`cache-row-${r.resource.id}`}
                    data-browser={r.browser}
                    data-cdn={r.cdn}
                    data-status={r.status ?? ''}
                    data-origin={String(r.originHit)}
                    data-bytes={r.browserBytes}
                    data-version={r.version}
                  >
                    <td style={mono}>{r.resource.path}</td>
                    <td style={mono}>{browserName(r.browser)}</td>
                    <td style={mono}>{cdnName(r.cdn)}</td>
                    <td style={mono}>
                      {r.originHit ? (r.originBytes ? `200, ${kb(r.originBytes)}` : '304') : '—'}
                    </td>
                    <td style={mono}>{kb(r.browserBytes)}</td>
                    <td style={mono}>{`v${r.version}`}</td>
                    <td style={mono}>
                      {`${r.browserAge === null ? '—' : clock(r.browserAge)} / ${r.cdnAge === null ? '—' : clock(r.cdnAge)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-testid="cache-totals"
            data-requests={step.requests}
            data-origin-hits={step.originHits}
            data-bytes={step.browserBytes}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {t(
              `At t = ${clock(step.time)}: ${step.requests} of ${RESOURCES.length} resources needed a request; the origin was asked ${step.originHits} times and sent ${kb(step.originBytes)}; the browser received ${kb(step.browserBytes)} of bodies.`,
              `t = ${clock(step.time)}：${RESOURCES.length} 個のうち ${step.requests} 個でリクエストが必要でした。オリジンへの問い合わせは ${step.originHits} 回、送った本文は ${kb(step.originBytes)}、ブラウザが受け取った本文は ${kb(step.browserBytes)} です。`,
            )}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Age adds up across caches. At 2 min the browser’s copy of hero.jpg is stale (max-age=60), so it asks the CDN; the CDN’s copy is still fresh under s-maxage, so the CDN answers 304 itself — but with Age: 120, so the refreshed browser copy is already past its 60 s. Turn on the deploy: index.html, checked on every use, picks up the new version at once, while style.css stays on the old version until its hour runs out. That is why sites give long max-age only to files whose name changes with their content (style.3f2a.css).',
              '経過時間はキャッシュをまたいで積み上がります。2 分の時点で、ブラウザの hero.jpg は古くなっている（max-age=60）ので CDN に確認します。CDN のコピーは s-maxage のおかげでまだ新鮮なので、CDN 自身が 304 を返します。ただし Age: 120 付きなので、更新されたブラウザのコピーはすでに 60 秒を過ぎています。公開をオンにしてみてください。毎回確認する index.html はすぐ新しい版になりますが、style.css は 1 時間が切れるまで古い版のままです。だからサイトは、内容が変わると名前も変わるファイル（style.3f2a.css）にだけ長い max-age を付けます。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified (after RFC 9111 and RFC 9110): no network delay or clock skew; only max-age, s-maxage, no-store, no-cache and private are modelled, with no Expires, heuristic freshness or Vary; sizes count bodies only, not headers. The page is opened by following a link — pressing reload makes browsers revalidate more.',
              '簡略化しています（RFC 9111 と RFC 9110 にもとづく）。ネットワークの遅延や時計のずれはなく、扱うのは max-age、s-maxage、no-store、no-cache、private だけで、Expires、ヒューリスティックな新鮮さ、Vary は扱いません。サイズは本文だけで、ヘッダーは数えません。ページはリンクから開くものとしました。再読み込みボタンを押すと、ブラウザはもっと多く再検証します。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function HttpCacheDemo() {
  return (
    <DemoShell
      title="HTTP caching"
      desc="Cache-Control, freshness and revalidation, in a browser and in a CDN"
    >
      <HttpCacheLesson />
    </DemoShell>
  );
}
