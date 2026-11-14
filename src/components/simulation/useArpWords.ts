import { useEffect, useState } from 'react';

type ArpWords = typeof import('./arpWords');

let loaded: ArpWords | null = null;

/**
 * The words for an unanswered ARP (REQ-350), loaded the first time a view has
 * one to show, so they stay out of the bundles that never do. Null until then.
 */
export function useArpWords(needed: boolean): ArpWords | null {
  const [words, setWords] = useState(loaded);
  useEffect(() => {
    if (!needed || loaded) return;
    let live = true;
    void import('./arpWords').then((module) => {
      loaded = module;
      if (live) setWords(module);
    });
    return () => {
      live = false;
    };
  }, [needed]);
  return words ?? loaded;
}
