/**
 * The HTTP caching lesson (REQ-412): Cache-Control, freshness and age, and
 * revalidation with ETag / Last-Modified (RFC 9111 HTTP Caching, RFC 9110
 * conditional requests), in a browser's private cache behind a shared CDN cache.
 *
 * Simplified: zero network delay and no clock skew, so a response's age is the
 * Age it arrived with plus the time it has been stored; only the directives
 * max-age, s-maxage, no-store, no-cache and private are understood; there is
 * no Expires and no heuristic freshness; no Vary; bytes count response bodies
 * only, not headers; the browser opens the page normally (a reload button would
 * revalidate more). A 304 refreshes the stored copy, whose age becomes the Age
 * the 304 carried.
 */

export interface Directives {
  readonly maxAge?: number | undefined;
  readonly sMaxAge?: number | undefined;
  readonly noStore: boolean;
  readonly noCache: boolean;
  readonly private: boolean;
}

/** Reads the directives this lesson understands from a Cache-Control value. */
export function parseCacheControl(header: string): Directives {
  let maxAge: number | undefined;
  let sMaxAge: number | undefined;
  let noStore = false;
  let noCache = false;
  let isPrivate = false;
  for (const part of header.split(',')) {
    const [rawName, rawValue] = part.trim().split('=');
    const name = (rawName ?? '').toLowerCase();
    const value = rawValue === undefined ? undefined : Number(rawValue.replace(/"/g, ''));
    if (name === 'max-age' && value !== undefined && Number.isFinite(value)) maxAge = value;
    else if (name === 's-maxage' && value !== undefined && Number.isFinite(value)) sMaxAge = value;
    else if (name === 'no-store') noStore = true;
    else if (name === 'no-cache') noCache = true;
    else if (name === 'private') isPrivate = true;
  }
  return { maxAge, sMaxAge, noStore, noCache, private: isPrivate };
}

/** May this cache keep the response? no-store: nobody; private: not a shared cache. */
export function isStorable(directives: Directives, shared: boolean): boolean {
  return !directives.noStore && !(shared && directives.private);
}

/** Seconds a stored response stays fresh. s-maxage counts only in a shared cache. */
export function freshnessLifetime(directives: Directives, shared: boolean): number {
  if (shared && directives.sMaxAge !== undefined) return directives.sMaxAge;
  return directives.maxAge ?? 0;
}

/** Fresh while its lifetime is greater than its current age (RFC 9111 §4.2). */
export function isFresh(lifetime: number, age: number): boolean {
  return lifetime > age;
}

export type Validator =
  | { readonly kind: 'etag'; readonly value: string }
  | { readonly kind: 'last-modified'; readonly value: number };

export interface Resource {
  readonly id: 'style' | 'index' | 'account' | 'download' | 'image';
  readonly path: string;
  readonly cacheControl: string;
  /** Body size, bytes. */
  readonly size: number;
  readonly validator: 'etag' | 'last-modified' | 'none';
}

export const RESOURCES: readonly Resource[] = [
  {
    id: 'style',
    path: '/style.css',
    cacheControl: 'max-age=3600',
    size: 40_000,
    validator: 'etag',
  },
  { id: 'index', path: '/index.html', cacheControl: 'no-cache', size: 12_000, validator: 'etag' },
  {
    id: 'account',
    path: '/account.json',
    cacheControl: 'private, max-age=60',
    size: 2_000,
    validator: 'last-modified',
  },
  {
    id: 'download',
    path: '/report.zip',
    cacheControl: 'no-store',
    size: 5_000_000,
    validator: 'none',
  },
  {
    id: 'image',
    path: '/hero.jpg',
    cacheControl: 's-maxage=86400, max-age=60',
    size: 300_000,
    validator: 'etag',
  },
];

/** Resources a deploy replaces with a new version. */
export const DEPLOYED: readonly Resource['id'][] = ['style', 'index'];

/** Last-Modified of version 1, seconds since the epoch: Mon, 02 Nov 2026 09:00:00 GMT. */
export const BASE_LAST_MODIFIED = Date.UTC(2026, 10, 2, 9, 0, 0) / 1000;

/** The HTTP-date form of a Last-Modified value. */
export function httpDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toUTCString();
}

/** A resource's validator for a version; version 2 was modified at `deployTime` (s). */
export function originValidator(
  resource: Resource,
  version: number,
  deployTime: number,
): Validator | null {
  if (resource.validator === 'etag') return { kind: 'etag', value: `"${resource.id}-v${version}"` };
  if (resource.validator === 'last-modified')
    return {
      kind: 'last-modified',
      value: version === 1 ? BASE_LAST_MODIFIED : BASE_LAST_MODIFIED + deployTime,
    };
  return null;
}

/**
 * The origin's answer to a conditional request: 304 when the client's validator
 * still matches (If-None-Match equal, or not modified since If-Modified-Since).
 */
export function originAnswer(current: Validator | null, conditional: Validator | null): 200 | 304 {
  if (!current || !conditional || current.kind !== conditional.kind) return 200;
  if (current.kind === 'etag' || conditional.kind === 'etag')
    return current.value === conditional.value ? 304 : 200;
  return current.value <= conditional.value ? 304 : 200;
}

interface Entry {
  readonly version: number;
  readonly validator: Validator | null;
  readonly storedAt: number;
  readonly ageAtStore: number;
}

const currentAge = (entry: Entry, now: number) => entry.ageAtStore + (now - entry.storedAt);

/** What the browser did: used its copy, revalidated it, or fetched it whole. */
export type BrowserOutcome = 'fresh' | 'revalidated-304' | 'revalidated-200' | 'fetched';
/**
 * What the CDN did: `hit` answered from its fresh copy; `revalidated-*` asked the
 * origin about its copy; `miss` fetched and stored; `pass` forwarded without
 * storing; `none` was not asked.
 */
export type CdnOutcome = 'none' | 'hit' | 'revalidated-304' | 'revalidated-200' | 'miss' | 'pass';

export interface Row {
  readonly resource: Resource;
  readonly browser: BrowserOutcome;
  readonly cdn: CdnOutcome;
  /** Status the browser received, or null when it sent nothing. */
  readonly status: 200 | 304 | null;
  readonly browserBytes: number;
  readonly originHit: boolean;
  readonly originBytes: number;
  /** Version the page uses. */
  readonly version: number;
  /** Age of the browser's stored copy after the request, or null if not stored. */
  readonly browserAge: number | null;
  /** Age of the CDN's stored copy after the request, or null if not stored. */
  readonly cdnAge: number | null;
}

export interface Step {
  readonly time: number;
  readonly rows: readonly Row[];
  readonly requests: number;
  readonly browserBytes: number;
  readonly originHits: number;
  readonly originBytes: number;
}

/**
 * The browser loads every resource at each of `times` (seconds, ascending),
 * through one CDN to the origin. When `deployTime` is set, the origin serves
 * version 2 of the DEPLOYED resources from then on.
 */
export function simulate(times: readonly number[], deployTime: number | null = null): Step[] {
  const browserStore = new Map<Resource['id'], Entry>();
  const cdnStore = new Map<Resource['id'], Entry>();
  const versionAt = (resource: Resource, now: number) =>
    deployTime !== null && now >= deployTime && DEPLOYED.includes(resource.id) ? 2 : 1;

  return times.map((now) => {
    const rows = RESOURCES.map((resource): Row => {
      const directives = parseCacheControl(resource.cacheControl);
      const originVersion = versionAt(resource, now);
      const originCurrent = originValidator(resource, originVersion, deployTime ?? 0);
      let originHit = false;
      let originBytes = 0;

      // The CDN answers a request from the browser; returns status, version and Age.
      const viaCdn = (conditional: Validator | null) => {
        const toOrigin = (cond: Validator | null) => {
          originHit = true;
          const status = originAnswer(originCurrent, cond);
          if (status === 200) originBytes = resource.size;
          return status;
        };
        const entry = cdnStore.get(resource.id);
        let cdn: CdnOutcome;
        if (
          entry &&
          !directives.noCache &&
          isFresh(freshnessLifetime(directives, true), currentAge(entry, now))
        ) {
          cdn = 'hit';
        } else if (entry && entry.validator) {
          const status = toOrigin(entry.validator);
          cdn = status === 304 ? 'revalidated-304' : 'revalidated-200';
          cdnStore.set(resource.id, {
            version: status === 304 ? entry.version : originVersion,
            validator: status === 304 ? entry.validator : originCurrent,
            storedAt: now,
            ageAtStore: 0,
          });
        } else {
          // Nothing usable stored: forward the browser's request as it is.
          const status = toOrigin(conditional);
          const storable = isStorable(directives, true);
          cdn = storable ? 'miss' : 'pass';
          if (storable && status === 200)
            cdnStore.set(resource.id, {
              version: originVersion,
              validator: originCurrent,
              storedAt: now,
              ageAtStore: 0,
            });
          else if (!storable) cdnStore.delete(resource.id);
          return { cdn, status, version: originVersion, age: 0 };
        }
        const stored = cdnStore.get(resource.id)!;
        const status = originAnswer(stored.validator, conditional);
        return { cdn, status, version: stored.version, age: currentAge(stored, now) };
      };

      const entry = browserStore.get(resource.id);
      let browser: BrowserOutcome;
      let cdn: CdnOutcome = 'none';
      let status: 200 | 304 | null = null;
      let browserBytes = 0;
      let version: number;
      if (
        entry &&
        !directives.noCache &&
        isFresh(freshnessLifetime(directives, false), currentAge(entry, now))
      ) {
        browser = 'fresh';
        version = entry.version;
      } else {
        const conditional = entry ? entry.validator : null;
        const answer = viaCdn(conditional);
        cdn = answer.cdn;
        status = answer.status;
        version = answer.status === 304 && entry ? entry.version : answer.version;
        if (status === 200) browserBytes = resource.size;
        browser = !conditional ? 'fetched' : status === 304 ? 'revalidated-304' : 'revalidated-200';
        if (isStorable(directives, false))
          browserStore.set(resource.id, {
            version,
            validator:
              status === 304 && entry
                ? entry.validator
                : originValidator(resource, version, deployTime ?? 0),
            storedAt: now,
            ageAtStore: answer.age,
          });
      }
      const b = browserStore.get(resource.id);
      const c = cdnStore.get(resource.id);
      return {
        resource,
        browser,
        cdn,
        status,
        browserBytes,
        originHit,
        originBytes,
        version,
        browserAge: b ? currentAge(b, now) : null,
        cdnAge: c ? currentAge(c, now) : null,
      };
    });
    return {
      time: now,
      rows,
      requests: rows.filter((row) => row.status !== null).length,
      browserBytes: rows.reduce((sum, row) => sum + row.browserBytes, 0),
      originHits: rows.filter((row) => row.originHit).length,
      originBytes: rows.reduce((sum, row) => sum + row.originBytes, 0),
    };
  });
}

/** The moments the lesson's timeline shows, seconds. */
export const TIMELINE: readonly number[] = [0, 30, 120, 7200];
/** When the optional deploy happens, seconds. */
export const DEPLOY_TIME = 60;
