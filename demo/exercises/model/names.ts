/**
 * What a switch port and a router side are called. A bare id (`p1`, `lan`)
 * means nothing to a beginner, so both are said with what they lead to. The
 * settings form and the hints of a template use these same words, so a hint
 * that says which port to change names it exactly as the form does.
 */

import type { Localised } from './types';

/** `peer` is the name of the device plugged in there, in each language; null when nothing is. */
export function portWords(portId: string, peer: Localised | null): Localised {
  return peer === null
    ? { en: `port ${portId}`, ja: `差し込み口 ${portId}` }
    : {
        en: `port ${portId} (to ${peer.en})`,
        ja: `差し込み口 ${portId}（${peer.ja} につながる）`,
      };
}

export function sideWords(ifaceId: string, peer: Localised | null): Localised {
  return peer === null
    ? { en: `side ${ifaceId}`, ja: `${ifaceId} 側` }
    : { en: `side ${ifaceId} (to ${peer.en})`, ja: `${ifaceId} 側（${peer.ja} につながる）` };
}
