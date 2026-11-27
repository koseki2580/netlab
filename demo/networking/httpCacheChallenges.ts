/**
 * The HTTP caching lesson's challenges (REQ-449): goals reached with the
 * lesson's own controls (the moment shown, when the page is opened the last
 * time, the deploy). Every `reached` and every number in `why` comes from the
 * cache simulation in httpCache.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import {
  DEPLOY_TIME,
  RESOURCES,
  TIMELINE,
  freshnessLifetime,
  parseCacheControl,
  simulate,
  type Resource,
  type Row,
  type Step,
} from './httpCache';

/** The lesson's controls. */
export interface HttpCacheState {
  /** The moment shown, s: one of the visits. */
  readonly at: number;
  /** When the page is opened the last time, s. */
  readonly lastVisitS: number;
  /** Is the new version deployed at DEPLOY_TIME? */
  readonly deploy: boolean;
}

/** The last-visit slider, s. */
export const LAST_VISIT = { min: 180, max: TIMELINE[TIMELINE.length - 1]!, step: 60 } as const;

/** The visits: the lesson's timeline, with the last one moved by the slider. */
export function visits(lastVisitS: number): number[] {
  return [...TIMELINE.slice(0, -1), lastVisitS];
}

/** A duration in whole minutes, or seconds under a minute. */
export function minutes(s: number): { en: string; ja: string } {
  return s < 60
    ? { en: `${s} s`, ja: `${s} 秒` }
    : { en: `${Math.round(s / 60)} min`, ja: `${Math.round(s / 60)} 分` };
}

const rowOf = (step: Step, id: Resource['id']): Row => step.rows.find((r) => r.resource.id === id)!;
const kb = (bytes: number) => `${(bytes / 1000).toFixed(0)} kB`;
const directivesOf = (id: Resource['id']) =>
  parseCacheControl(RESOURCES.find((r) => r.id === id)!.cacheControl);

export function httpCacheChallenges(state: HttpCacheState): Challenge[] {
  const times = visits(state.lastVisitS);
  const deployAt = state.deploy ? DEPLOY_TIME : null;
  const steps = simulate(times, deployAt);
  const index = Math.max(0, times.indexOf(state.at));
  const step = steps[index]!;
  /** How old the browser's copy was when the page was opened at `steps[i]`. */
  const ageBefore = (i: number, id: Resource['id']) => {
    const prev = steps[i - 1];
    const age = prev ? rowOf(prev, id).browserAge : null;
    return prev && age !== null ? age + (steps[i]!.time - prev.time) : 0;
  };
  const styleMaxAge = freshnessLifetime(directivesOf('style'), false);

  // 1. Deployed: the earliest last visit, to the minute, at which style.css is the new one.
  const last = steps[steps.length - 1]!;
  const lastStyle = rowOf(last, 'style');
  const earlierVisit = state.lastVisitS - LAST_VISIT.step;
  const earlier = simulate(visits(Math.max(LAST_VISIT.min, earlierVisit)), deployAt);
  const earlierStyle = rowOf(earlier[earlier.length - 1]!, 'style');
  const newStyle =
    state.deploy &&
    lastStyle.version === 2 &&
    (state.lastVisitS === LAST_VISIT.min || earlierStyle.version === 1);
  const lastAge = ageBefore(steps.length - 1, 'style');
  const earlierAge = lastAge - LAST_VISIT.step;

  // 2. Deployed: one page load with the new index.html and the old style.css.
  const index2 = rowOf(step, 'index');
  const style2 = rowOf(step, 'style');
  const mixed = state.deploy && index2.version === 2 && style2.version === 1;

  // 3. hero.jpg: the browser asks, gets a 304, and the origin hears nothing.
  const image = rowOf(step, 'image');
  const cdnOnly = image.browser === 'revalidated-304' && image.cdn === 'hit' && !image.originHit;
  const imageDirectives = directivesOf('image');

  const lastMin = minutes(state.lastVisitS);
  const earlierMin = minutes(earlierVisit);
  const atMin = minutes(state.at);

  return [
    {
      id: 'new-style',
      goal: {
        en: `With the deploy on, move the last visit to the earliest minute at which the browser uses the new style.css.`,
        ja: '公開をオンにして、ブラウザが新しい style.css を使う、いちばん早い最後の訪問時刻を 1 分単位で見つけてください。',
      },
      hint: {
        en: 'The browser used its copy without asking while it was fresh. How long is style.css fresh, and since when has the browser held it?',
        ja: 'ブラウザは新鮮なうちは確認せずにコピーを使います。style.css が新鮮なのは何秒間で、ブラウザはいつからそのコピーを持っているでしょう。',
      },
      reached: newStyle,
      why: {
        en: `The browser has held style.css since t = 0 without asking, because it was fresh (max-age=${styleMaxAge}). At ${lastMin.en} its copy is ${lastAge} s old, no longer under ${styleMaxAge} s, so it revalidates; "style-v1" no longer matches and the origin sends ${kb(lastStyle.browserBytes)} of v${lastStyle.version}. At ${earlierMin.en} the copy was ${earlierAge} s old, still fresh, and the old v${earlierStyle.version} was used.`,
        ja: `ブラウザは t = 0 から style.css を確認せずに使っていました。新鮮（max-age=${styleMaxAge}）だったからです。${lastMin.ja}ではコピーの経過時間が ${lastAge} 秒で、${styleMaxAge} 秒未満ではなくなったので再検証します。"style-v1" はもう一致しないので、オリジンは v${lastStyle.version} を ${kb(lastStyle.browserBytes)} 送ります。${earlierMin.ja}ではコピーは ${earlierAge} 秒で、まだ新鮮なので古い v${earlierStyle.version} が使われていました。`,
      },
    },
    {
      id: 'mixed-versions',
      goal: {
        en: 'With the deploy on, find a page load that uses the new index.html together with the old style.css.',
        ja: '公開をオンにして、新しい index.html と古い style.css が一緒に使われる読み込みを見つけてください。',
      },
      hint: {
        en: 'Which of the two files is checked on every use, and which one is used without asking for as long as it is fresh?',
        ja: '2 つのファイルのうち、毎回確認されるのはどちらで、新鮮なうちは確認なしで使われるのはどちらでしょう。',
      },
      reached: mixed,
      why: {
        en: `At ${atMin.en}, index.html (no-cache) is revalidated on every use, and since the deploy at t = ${minutes(DEPLOY_TIME).en} its ETag has changed, so the browser gets ${kb(index2.browserBytes)} of v${index2.version}. style.css is ${ageBefore(index, 'style')} s old, under its ${styleMaxAge} s, so the browser uses v${style2.version} without asking. The new page runs with the old stylesheet.`,
        ja: `${atMin.ja}の時点で、index.html（no-cache）は使うたびに再検証され、t = ${minutes(DEPLOY_TIME).ja}の公開で ETag が変わっているので、ブラウザは v${index2.version} を ${kb(index2.browserBytes)} 受け取ります。style.css は経過時間 ${ageBefore(index, 'style')} 秒で ${styleMaxAge} 秒未満なので、ブラウザは確認せずに v${style2.version} を使います。新しいページが古いスタイルシートで動くことになります。`,
      },
    },
    {
      id: 'cdn-304',
      goal: {
        en: 'Find a page load in which the browser asks about hero.jpg, gets a 304, and the origin never hears of it.',
        ja: 'ブラウザが hero.jpg について問い合わせて 304 を受け取るのに、オリジンには何も届かない読み込みを見つけてください。',
      },
      hint: {
        en: 'hero.jpg has two lifetimes, one for each kind of cache. When is one of them over while the other is not?',
        ja: 'hero.jpg には、キャッシュの種類ごとに 2 つの有効期間があります。片方が切れていて、もう片方が切れていないのはいつでしょう。',
      },
      reached: cdnOnly,
      why: {
        en: `At ${atMin.en} the browser’s copy is ${ageBefore(index, 'image')} s old, past max-age=${freshnessLifetime(imageDirectives, false)}, so it asks the CDN. The CDN’s copy is ${image.cdnAge} s old, still under s-maxage=${freshnessLifetime(imageDirectives, true)}, so the CDN answers 304 itself: ${kb(image.browserBytes)} of body, and nothing reaches the origin.`,
        ja: `${atMin.ja}の時点で、ブラウザのコピーは経過時間 ${ageBefore(index, 'image')} 秒で max-age=${freshnessLifetime(imageDirectives, false)} を過ぎているので、CDN に問い合わせます。CDN のコピーは ${image.cdnAge} 秒で、まだ s-maxage=${freshnessLifetime(imageDirectives, true)} 未満なので、CDN 自身が 304 を返します。本文は ${kb(image.browserBytes)} で、オリジンには何も届きません。`,
      },
    },
  ];
}
