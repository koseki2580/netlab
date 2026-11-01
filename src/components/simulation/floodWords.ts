import type { FloodCopy, PacketHop } from '../../types/simulation';

/**
 * The words for a hop at which a switch copied the frame. They live here, with
 * the two views that use them, rather than in the shared catalogue, which every
 * learning panel loads.
 */
const WORDS = {
  en: {
    field: 'Copies',
    copied: (count: number) => `copied to ${count} more`,
    discarded: 'not for it, discarded',
    flooded: 'copied it on',
    forwarded: 'sent it on',
    dropped: 'dropped it',
  },
  ja: {
    field: 'コピー',
    copied: (count: number) => `ほかに ${count} か所へコピー`,
    discarded: '自分あてでないので捨てた',
    flooded: 'さらにコピーした',
    forwarded: '先へ送った',
    dropped: '捨てた',
  },
} satisfies Record<
  string,
  Record<FloodCopy['outcome'] | 'field', string> & { copied: (count: number) => string }
>;

const wordsFor = (locale: string) => (locale === 'ja' ? WORDS.ja : WORDS.en);

/** The label of the hop-details field that lists the copies. */
export function floodCopiesLabel(locale: string): string {
  return wordsFor(locale).field;
}

/** The timeline's note for a hop at which a switch copied the frame: how many copies. */
export function floodNote(hop: PacketHop, locale: string): string | null {
  const count = hop.flood?.copies.length ?? 0;
  return count > 0 ? wordsFor(locale).copied(count) : null;
}

/** Each copy, the device it reached and what became of it, for the hop's details. */
export function floodCopiesText(
  hop: PacketHop,
  label: (nodeId: string) => string,
  locale: string,
): string | null {
  const copies = hop.flood?.copies ?? [];
  if (copies.length === 0) return null;
  const words = wordsFor(locale);
  return copies.map((copy) => `${label(copy.toNodeId)}: ${words[copy.outcome]}`).join(', ');
}
