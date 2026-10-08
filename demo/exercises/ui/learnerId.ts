import { isValidLearnerId } from '../../../src/progress';

/**
 * The learner id a link names, wherever in the address it sits.
 *
 * The app is hash-routed, so `?learnerId=` can be written in two places:
 * before the `#` (`/?learnerId=x#/exercises`), which the router never sees,
 * and after it (`/#/exercises?learnerId=x`), which the router sees only until
 * the first link that does not repeat it. The app's own resolution
 * (`demo/main.tsx`) reads the router's query alone, so on the exercise pages
 * an id named in the address was lost either at once or one click later and
 * the record went under the browser's made-up `local-…` id.
 */
export function learnerIdFromAddress(search: string, hash: string): string | null {
  const cut = hash.indexOf('?');
  const inner = cut === -1 ? null : new URLSearchParams(hash.slice(cut)).get('learnerId');
  const outer = new URLSearchParams(search).get('learnerId');
  for (const id of [inner, outer]) {
    if (id && isValidLearnerId(id)) return id;
  }
  return null;
}

/** The id from the address, or the last one this page saw there. */
export function rememberedLearnerId(
  search: string,
  hash: string,
  seen: { current: string | null },
): string | null {
  seen.current = learnerIdFromAddress(search, hash) ?? seen.current;
  return seen.current;
}

const seenOnThisPage = { current: null as string | null };

/** The learner id named in this page's address, now or earlier in this visit; null when none was. */
export function addressLearnerId(): string | null {
  if (typeof window === 'undefined') return null;
  return rememberedLearnerId(window.location.search, window.location.hash, seenOnThisPage);
}
