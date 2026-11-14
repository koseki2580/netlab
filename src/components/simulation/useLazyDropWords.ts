import { useEffect, useState } from 'react';

type LazyDropWords = typeof import('./lazyDropWords');

let loaded: LazyDropWords | null = null;

/**
 * The words of `lazyDropWords.ts`, loaded the first time a view shows a drop
 * (the module itself says which reasons it has words for), so they stay out of
 * the bundles that never do. Null until then.
 */
export function useLazyDropWords(needed: boolean): LazyDropWords | null {
  const [words, setWords] = useState(loaded);
  useEffect(() => {
    if (!needed || loaded) return;
    let live = true;
    void import('./lazyDropWords').then((module) => {
      loaded = module;
      if (live) setWords(module);
    });
    return () => {
      live = false;
    };
  }, [needed]);
  return words ?? loaded;
}
