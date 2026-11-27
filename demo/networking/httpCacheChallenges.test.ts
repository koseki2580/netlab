/** REQ-449 — the HTTP caching lesson's challenges, checked by the cache simulation (TC-2688). */
import { describe, expect, it } from 'vitest';
import { LAST_VISIT, httpCacheChallenges, type HttpCacheState } from './httpCacheChallenges';

const INITIAL: HttpCacheState = { at: 0, lastVisitS: LAST_VISIT.max, deploy: false };

const challenge = (state: HttpCacheState, id: string) => {
  const found = httpCacheChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2688: the HTTP caching challenges are reached by the settings the simulation says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(httpCacheChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('new-style: deployed, a last visit at 60 min gets v2 of style.css; 59 min, 61 min or no deploy do not count', () => {
    const state: HttpCacheState = { ...INITIAL, deploy: true, lastVisitS: 3600 };
    const reached = challenge(state, 'new-style');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('3600 s old');
    expect(reached.why.en).toContain('40 kB of v2');
    expect(reached.why.en).toContain('3540 s old');
    expect(reached.why.ja).toContain('3600 秒');
    expect(challenge({ ...state, lastVisitS: 3540 }, 'new-style').reached).toBe(false);
    expect(challenge({ ...state, lastVisitS: 3660 }, 'new-style').reached).toBe(false);
    expect(challenge({ ...state, deploy: false }, 'new-style').reached).toBe(false);
  });

  it('mixed-versions: deployed, at 2 min index.html is v2 and style.css still v1; at 30 s or 2 h not', () => {
    const state: HttpCacheState = { ...INITIAL, deploy: true, at: 120 };
    const reached = challenge(state, 'mixed-versions');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('12 kB of v2');
    expect(reached.why.en).toContain('style.css is 120 s old');
    expect(reached.why.ja).toContain('120 秒');
    // Before the deploy: both are v1.
    expect(challenge({ ...state, at: 30 }, 'mixed-versions').reached).toBe(false);
    // At 2 h, style.css has been revalidated too: both are v2.
    expect(challenge({ ...state, at: LAST_VISIT.max }, 'mixed-versions').reached).toBe(false);
    expect(challenge({ ...state, deploy: false }, 'mixed-versions').reached).toBe(false);
  });

  it('cdn-304: at 2 min the browser’s 120 s copy is stale but the CDN’s is fresh; at 30 s the browser does not ask', () => {
    const reached = challenge({ ...INITIAL, at: 120 }, 'cdn-304');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('120 s old, past max-age=60');
    expect(reached.why.en).toContain('s-maxage=86400');
    expect(reached.why.ja).toContain('120 秒');
    expect(challenge({ ...INITIAL, at: 30 }, 'cdn-304').reached).toBe(false);
    expect(challenge({ ...INITIAL, at: 0 }, 'cdn-304').reached).toBe(false);
  });
});
