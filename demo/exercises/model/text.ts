/**
 * The bilingual-text kit both exercise tracks share: a pair of sentences,
 * sentences put one after another, ordinals, a device's label with its id as
 * the fallback, the two address shapes the judges accept, and a topology with
 * its devices named in one language.
 */

import type { TopologySnapshot } from '../../../src/types/topology';
import type { Localised } from './types';

/** A text in both languages. */
export const L = (en: string, ja: string): Localised => ({ en, ja });

/** Sentences one after another: a space between English ones, nothing between Japanese ones. */
export const join = (...parts: readonly Localised[]): Localised => ({
  en: parts.map((part) => part.en).join(' '),
  ja: parts.map((part) => part.ja).join(''),
});

/** "first" to "fifth"; a caller that says "last" for the fourth of four says so itself. */
export const ORDINALS_EN = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

/** The English ordinal of `n` (1-based); past the list, `${n}th`. */
export const ordinalEn = (n: number): string => ORDINALS_EN[n - 1] ?? `${n}th`;

/** A device's name from a label table, or its id in both languages when it has none. */
export const labelIn = (
  labels: Readonly<Record<string, Localised>> | undefined,
  id: string,
): Localised => labels?.[id] ?? L(id, id);

/**
 * Four numbers with dots, each at most 255; leading zeros allowed ("010").
 * What the topology reader accepts as an address it can compare.
 */
export function isDottedQuad(text: string): boolean {
  return (
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
      .exec(text)
      ?.slice(1)
      .every((part) => Number(part) <= 255) ?? false
  );
}

/** An IPv4 address as written, without leading zeros: what a learner's typed field must hold. */
export const isCanonicalIpv4 = (text: string): boolean =>
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(text);

/** `topology` with each device named in `locale` from `labels`; devices without a label keep theirs. */
export function localiseTopology(
  topology: TopologySnapshot,
  labels: Readonly<Record<string, Localised>>,
  locale: 'en' | 'ja',
): TopologySnapshot {
  return {
    ...topology,
    nodes: topology.nodes.map((node) => ({
      ...node,
      data: { ...node.data, label: labels[node.id]?.[locale] ?? node.data.label },
    })),
  };
}
