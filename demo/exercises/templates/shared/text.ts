/**
 * Small helpers for bilingual text. Sentences are written whole, per language;
 * the only thing put into a sentence is the name of a device (a noun phrase)
 * or an address.
 */

import type { Localised } from '../../model/types';

export const L = (en: string, ja: string): Localised => ({ en, ja });

/** Sentences one after another: a space between English ones, nothing between Japanese ones. */
export function say(...parts: readonly (Localised | null | undefined)[]): Localised {
  const present = parts.filter((part): part is Localised => part != null);
  return {
    en: present.map((part) => part.en).join(' '),
    ja: present.map((part) => part.ja).join(''),
  };
}

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * A device name. `en` is the bare noun phrase ("till", "office PC"); sentences
 * use `the(name)` and the canvas label is the capitalised noun.
 */
export type Named = Localised;

export const the = (name: Named): string => `the ${name.en}`;
export const The = (name: Named): string => `The ${name.en}`;

/** The label the canvas shows for a device. */
export const labelOf = (name: Named): Localised => ({ en: capitalise(name.en), ja: name.ja });

/** "A", "A and B", "A, B and C" / 「A」「A と B」「A・B・C」. */
export function listOf(names: readonly Named[]): Localised {
  const en = names.map(the);
  const head = en.slice(0, -1).join(', ');
  return {
    en: en.length <= 1 ? (en[0] ?? '') : `${head} and ${en[en.length - 1] ?? ''}`,
    ja: names.map((name) => name.ja).join(names.length === 2 ? 'と' : '・'),
  };
}

/** The last sentence of every brief at levels 1 and 2. */
export const PRESS_CHECK = L(
  'When you have changed it, press Check.',
  '変えたら「たしかめる」を押してください。',
);

export const PRESS_CHECK_CHOICE = L(
  'Pick one, say what you expect, then press Check to run it.',
  '1 つ選んで、どうなるかを予想してから「たしかめる」を押してください。',
);
