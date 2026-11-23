import type { Catalog } from '../../../../types';

/** The `httpcache` deck's questions (en); its name is in the core chunk. */
export const httpcache: Catalog = {
  'learning.concept.httpcache.q1.prompt':
    'index.html is served with Cache-Control: no-cache and an ETag, and has not changed. What happens when the browser opens the page again 30 s later?',
  'learning.concept.httpcache.q1.a': 'It uses its stored copy without sending anything',
  'learning.concept.httpcache.q1.b': 'It asks with If-None-Match and gets a 304 with no body',
  'learning.concept.httpcache.q1.c': 'Nothing was stored, so it downloads the whole file again',
  'learning.concept.httpcache.q1.why':
    'no-cache means “store it, but check before every use”. The browser sends its ETag in If-None-Match; the version still matches, so the answer is 304 Not Modified and no body crosses the network.',
  'learning.concept.httpcache.q1.a.why':
    'Using a copy without asking needs it to be fresh, and no-cache forbids that: every use must be revalidated first.',
  'learning.concept.httpcache.q1.c.why':
    'That is no-store. no-cache does let caches keep the response; they just revalidate it, so an unchanged file costs a 304, not a full download.',
  'learning.concept.httpcache.q2.prompt':
    '/account.json is sent with Cache-Control: private, max-age=60, through a shared CDN. Who stores it?',
  'learning.concept.httpcache.q2.a': 'Only the browser; the CDN passes it on without storing',
  'learning.concept.httpcache.q2.b': 'Nobody: private means it must never be stored',
  'learning.concept.httpcache.q2.c': 'Both, each for 60 seconds',
  'learning.concept.httpcache.q2.why':
    'private forbids shared caches from storing the response, so one user’s data is never served to another. The browser’s private cache may keep it, fresh for 60 s.',
  'learning.concept.httpcache.q2.b.why':
    'Forbidding every cache is no-store. private only rules out shared caches such as a CDN; the user’s own browser may still keep it.',
  'learning.concept.httpcache.q2.c.why':
    'max-age=60 applies to caches allowed to store it, and private excludes the CDN, which is shared by every user.',
  'learning.concept.httpcache.q3.prompt':
    'hero.jpg has Cache-Control: s-maxage=86400, max-age=60. Two minutes after the first visit the browser opens the page again. What happens?',
  'learning.concept.httpcache.q3.a': 'The browser downloads the full image from the origin again',
  'learning.concept.httpcache.q3.b': 'The browser uses its own copy: it is fresh for a day',
  'learning.concept.httpcache.q3.c': 'The browser asks the CDN, which answers 304 by itself',
  'learning.concept.httpcache.q3.why':
    'max-age=60 has run out for the browser, so it revalidates. s-maxage overrides max-age only in a shared cache, so the CDN’s copy is still fresh and the CDN answers 304 itself; the origin is not contacted.',
  'learning.concept.httpcache.q3.a.why':
    'The browser still has a copy and a validator, so it sends a conditional request, and the image has not changed: no full download. The CDN answers before the origin is reached.',
  'learning.concept.httpcache.q3.b.why':
    's-maxage counts only in shared caches. The browser goes by max-age=60, and after 120 s its copy is stale.',
  'learning.concept.httpcache.q4.prompt':
    'At 60 s a deploy changes style.css (max-age=3600) and index.html (no-cache). What does the browser show at 120 s?',
  'learning.concept.httpcache.q4.a': 'Both new versions: the origin has changed',
  'learning.concept.httpcache.q4.b': 'New index.html; old style.css, used without asking',
  'learning.concept.httpcache.q4.c': 'Both old versions until the hour is up',
  'learning.concept.httpcache.q4.why':
    'index.html is revalidated on every use, so the changed ETag brings the new version at once. style.css is still fresh for its hour and is used without a request, so it stays old: that is why long max-age goes only on files whose name changes with their content.',
  'learning.concept.httpcache.q4.a.why':
    'A cache does not learn about a deploy. A fresh copy is used without asking, so style.css stays old until its max-age runs out.',
  'learning.concept.httpcache.q4.c.why':
    'no-cache makes the browser check index.html every time, so its new ETag is noticed straight away; only the fresh style.css stays old.',
};
