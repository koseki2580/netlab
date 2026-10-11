/**
 * Words the form and the exercise texts must say the same way. A hint that
 * says "plug the cable in" has to match the button the learner then looks for,
 * so templates may import these (this module has no React in it).
 */

import type { Localised } from '../model/types';

/** The cable switch: what it shows in each state. State first, then what a press does. */
export const CABLE_WORDS = {
  /** The cable is in. */
  up: {
    symbol: '●',
    state: { en: 'Plugged in', ja: 'つながっています' },
    action: { en: 'press to unplug it', ja: '押すと、はずします' },
  },
  /** The cable is out. */
  down: {
    symbol: '✕',
    state: { en: 'Unplugged', ja: 'ぬけています' },
    action: { en: 'press to plug it in', ja: '押すと、つなぎます' },
  },
} as const satisfies Record<string, { symbol: string; state: Localised; action: Localised }>;

/** The whole label of the cable switch, as it is drawn: 「✕ ぬけています → 押すと、つなぎます」. */
export function cableLabel(state: 'up' | 'down'): Localised {
  const words = CABLE_WORDS[state];
  return {
    en: `${words.symbol} ${words.state.en} → ${words.action.en}`,
    ja: `${words.symbol} ${words.state.ja} → ${words.action.ja}`,
  };
}

/** The button under a result that replays the grader's packet on the diagram. Hints point at it. */
export const WATCH_WORDS: Localised = {
  en: '▶ Watch it on the diagram',
  ja: '▶ 図で見てみる',
};

/** A switch port taken out of use (spanning tree exercises): same shape as the cable switch. */
export const PORT_USE_WORDS = {
  on: {
    symbol: '●',
    state: { en: 'In use', ja: '使っています' },
    action: { en: 'press to stop using it', ja: '押すと、使うのをやめます' },
  },
  off: {
    symbol: '✕',
    state: { en: 'Not in use', ja: '使っていません' },
    action: { en: 'press to use it', ja: '押すと、使います' },
  },
} as const satisfies Record<string, { symbol: string; state: Localised; action: Localised }>;

/** Under an access port: what the number does. */
export const ACCESS_PORT_HELP: Localised = {
  en: 'Ports with the same number are one group. Different numbers cannot reach each other.',
  ja: '同じ番号の差し込み口どうしが、1 つのグループです。番号がちがうと届きません。',
};

/** Under a trunk: it carries what is on its list, and nothing else. */
export const TRUNK_PORT_HELP: Localised = {
  en: 'A trunk carries only the VLAN numbers on its list. A number that is not on the list stops here.',
  ja: 'トランクは、ここに書いた VLAN の番号だけを通します。書いていない番号は、ここで止まります。',
};
