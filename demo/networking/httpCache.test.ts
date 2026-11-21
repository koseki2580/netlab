/** REQ-412 — HTTP caching: freshness, revalidation, browser and CDN caches (TC-2160..TC-2168). */
import { describe, expect, it } from 'vitest';
import {
  DEPLOY_TIME,
  TIMELINE,
  freshnessLifetime,
  isFresh,
  isStorable,
  originAnswer,
  parseCacheControl,
  simulate,
  type Resource,
  type Step,
} from './httpCache';

const row = (step: Step, id: Resource['id']) => step.rows.find((r) => r.resource.id === id)!;

describe('TC-2160: s-maxage sets the lifetime only in a shared cache', () => {
  it('s-maxage=86400, max-age=60 is fresh for 86400 s in a CDN and 60 s in a browser', () => {
    const d = parseCacheControl('s-maxage=86400, max-age=60');
    expect(freshnessLifetime(d, true)).toBe(86_400);
    expect(freshnessLifetime(d, false)).toBe(60);
  });
  it('without s-maxage both caches use max-age', () => {
    const d = parseCacheControl('max-age=3600');
    expect(freshnessLifetime(d, true)).toBe(3600);
    expect(freshnessLifetime(d, false)).toBe(3600);
  });
});

describe('TC-2161: a response is fresh while its age is below its lifetime', () => {
  it('59 s of 60 is fresh; 60 s is stale', () => {
    expect(isFresh(60, 59)).toBe(true);
    expect(isFresh(60, 60)).toBe(false);
  });
  it('the age the CDN reports counts: the browser’s image copy refreshed by the CDN at 2 min is already 120 s old', () => {
    const steps = simulate(TIMELINE);
    expect(row(steps[2]!, 'image').browserAge).toBe(120);
    expect(isFresh(60, row(steps[2]!, 'image').browserAge!)).toBe(false);
  });
});

describe('TC-2162: no-store keeps nothing; no-cache stores but checks before every use', () => {
  it('storability', () => {
    expect(isStorable(parseCacheControl('no-store'), false)).toBe(false);
    expect(isStorable(parseCacheControl('no-store'), true)).toBe(false);
    expect(isStorable(parseCacheControl('no-cache'), false)).toBe(true);
    expect(isStorable(parseCacheControl('no-cache'), true)).toBe(true);
  });
  it('10 s later the browser revalidates index.html through the CDN to the origin and gets 304, no body', () => {
    const [, again] = simulate([0, 10]);
    expect(row(again!, 'index')).toMatchObject({
      browser: 'revalidated-304',
      cdn: 'revalidated-304',
      status: 304,
      browserBytes: 0,
      originHit: true,
    });
  });
  it('the no-store download is fetched in full from the origin every time', () => {
    const steps = simulate(TIMELINE);
    expect(steps.map((s) => row(s, 'download').browser)).toEqual([
      'fetched',
      'fetched',
      'fetched',
      'fetched',
    ]);
    expect(steps.map((s) => row(s, 'download').originBytes)).toEqual([
      5_000_000, 5_000_000, 5_000_000, 5_000_000,
    ]);
  });
});

describe('TC-2163: a matching validator gives 304; a changed one gives 200', () => {
  it('If-None-Match', () => {
    expect(originAnswer({ kind: 'etag', value: '"a"' }, { kind: 'etag', value: '"a"' })).toBe(304);
    expect(originAnswer({ kind: 'etag', value: '"b"' }, { kind: 'etag', value: '"a"' })).toBe(200);
    expect(originAnswer({ kind: 'etag', value: '"a"' }, null)).toBe(200);
  });
  it('If-Modified-Since', () => {
    const lm = (value: number) => ({ kind: 'last-modified' as const, value });
    expect(originAnswer(lm(1000), lm(1000))).toBe(304);
    expect(originAnswer(lm(2000), lm(1000))).toBe(200);
  });
});

describe('TC-2164: a private response is kept by the browser but not by the CDN', () => {
  it('account.json passes through the CDN; the browser revalidates it with If-Modified-Since once stale', () => {
    expect(isStorable(parseCacheControl('private, max-age=60'), true)).toBe(false);
    const steps = simulate(TIMELINE);
    expect(steps.map((s) => row(s, 'account').cdn)).toEqual(['pass', 'none', 'pass', 'pass']);
    expect(steps.map((s) => row(s, 'account').browser)).toEqual([
      'fetched',
      'fresh',
      'revalidated-304',
      'revalidated-304',
    ]);
    expect(steps.map((s) => row(s, 'account').cdnAge)).toEqual([null, null, null, null]);
  });
});

describe('TC-2165: the timeline at 0, 30 s, 2 min and 2 h', () => {
  const steps = simulate(TIMELINE);
  it('what the browser does with each resource', () => {
    expect(steps.map((s) => s.rows.map((r) => r.browser))).toEqual([
      ['fetched', 'fetched', 'fetched', 'fetched', 'fetched'],
      ['fresh', 'revalidated-304', 'fresh', 'fetched', 'fresh'],
      ['fresh', 'revalidated-304', 'revalidated-304', 'fetched', 'revalidated-304'],
      ['revalidated-304', 'revalidated-304', 'revalidated-304', 'fetched', 'revalidated-304'],
    ]);
  });
  it('what the CDN does', () => {
    expect(steps.map((s) => s.rows.map((r) => r.cdn))).toEqual([
      ['miss', 'miss', 'pass', 'pass', 'miss'],
      ['none', 'revalidated-304', 'none', 'pass', 'none'],
      ['none', 'revalidated-304', 'pass', 'pass', 'hit'],
      ['revalidated-304', 'revalidated-304', 'pass', 'pass', 'hit'],
    ]);
  });
  it('origin hits and bytes', () => {
    expect(steps.map((s) => s.originHits)).toEqual([5, 2, 3, 4]);
    expect(steps.map((s) => s.browserBytes)).toEqual([5_354_000, 5_000_000, 5_000_000, 5_000_000]);
    expect(steps.map((s) => s.originBytes)).toEqual([5_354_000, 5_000_000, 5_000_000, 5_000_000]);
    expect(steps.map((s) => s.requests)).toEqual([5, 2, 4, 5]);
  });
});

describe('TC-2166: the CDN answers the image’s revalidation itself while its s-maxage lasts', () => {
  it('at 2 h: 304 from the CDN, no origin hit', () => {
    const step = simulate(TIMELINE)[3]!;
    expect(row(step, 'image')).toMatchObject({
      browser: 'revalidated-304',
      cdn: 'hit',
      status: 304,
      originHit: false,
      cdnAge: 7200,
    });
  });
});

describe('TC-2167: after a deploy, revalidation fetches the new version, a fresh copy does not', () => {
  const steps = simulate(TIMELINE, DEPLOY_TIME);
  it('at 2 min index.html is new (200) but style.css is still the old, fresh copy', () => {
    expect(row(steps[2]!, 'index')).toMatchObject({
      browser: 'revalidated-200',
      cdn: 'revalidated-200',
      status: 200,
      browserBytes: 12_000,
      version: 2,
    });
    expect(row(steps[2]!, 'style')).toMatchObject({ browser: 'fresh', version: 1 });
  });
  it('at 2 h style.css has expired and the new version arrives', () => {
    expect(row(steps[3]!, 'style')).toMatchObject({
      browser: 'revalidated-200',
      cdn: 'revalidated-200',
      status: 200,
      version: 2,
    });
    expect(row(steps[3]!, 'index')).toMatchObject({ status: 304, version: 2 });
  });
});

describe('TC-2168: Cache-Control parsing', () => {
  it('reads the directives and ignores unknown ones', () => {
    expect(parseCacheControl('private, max-age=60, must-revalidate')).toEqual({
      maxAge: 60,
      sMaxAge: undefined,
      noStore: false,
      noCache: false,
      private: true,
    });
    expect(parseCacheControl('No-Cache').noCache).toBe(true);
  });
});
