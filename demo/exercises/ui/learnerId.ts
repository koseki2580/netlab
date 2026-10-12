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

/** Where the id seen in the address is kept: a holder for the page, and (when given) one that outlives a reload. */
export interface SeenLearner {
  current: string | null;
}

export interface TabMemory {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Kept per tab: another tab, or the browser opened again, is another visit. */
export const LEARNER_MEMORY_KEY = 'netlab-exercises:address-learner';

/**
 * The id from the address, or the last one this tab saw there.
 *
 * It used to be kept for the life of the page only: a reload of an address
 * that no longer carried the query (every link inside the pages drops it) put
 * the learner back under the browser's made-up id, and their record seemed
 * gone. `tab` (the tab's session storage) keeps it across reloads.
 */
export function rememberedLearnerId(
  search: string,
  hash: string,
  seen: SeenLearner,
  tab?: TabMemory | null,
): string | null {
  const named = learnerIdFromAddress(search, hash);
  if (named !== null) {
    seen.current = named;
    try {
      tab?.setItem(LEARNER_MEMORY_KEY, named);
    } catch {
      // Storage that cannot be written: the id stays for the life of the page.
    }
    return named;
  }
  if (seen.current === null) {
    try {
      const kept = tab?.getItem(LEARNER_MEMORY_KEY) ?? null;
      if (kept !== null && isValidLearnerId(kept)) seen.current = kept;
    } catch {
      // Storage that cannot be read: nothing was kept.
    }
  }
  return seen.current;
}

const seenOnThisPage: SeenLearner = { current: null };

function tabMemory(): TabMemory | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** The learner id named in this tab's address, now or earlier in this visit; null when none was. */
export function addressLearnerId(): string | null {
  if (typeof window === 'undefined') return null;
  return rememberedLearnerId(
    window.location.search,
    window.location.hash,
    seenOnThisPage,
    tabMemory(),
  );
}
