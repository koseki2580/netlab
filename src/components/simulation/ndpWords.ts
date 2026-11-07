import { useMemo } from 'react';
import { substitute } from '../../i18n/substitute';
import type { TranslatorFn } from '../../i18n/types';
import { useI18n } from '../../i18n/useI18n';

/**
 * The words for NDP rows (REQ-192). They live here, with the views that show a
 * trace, rather than in the shared catalogue every learning panel loads.
 */
const WORDS: Readonly<Record<'en' | 'ja', Readonly<Record<string, string>>>> = {
  en: {
    'simulation.event.ndpSolicit': 'NDP solicitation',
    'simulation.event.ndpAdvert': 'NDP advertisement',
    'simulation.stepCard.ndpSolicit': 'NS from {{node}} (who has {{ip}})',
    'simulation.stepCard.ndpAdvert': 'NA from {{node}}',
    'simulation.panelGloss.event.ndpSolicit': 'NS = who has this IPv6 address?',
    'simulation.panelGloss.event.ndpAdvert': 'NA = its owner answers with its MAC',
  },
  ja: {
    'simulation.event.ndpSolicit': 'NDP 要請',
    'simulation.event.ndpAdvert': 'NDP 通知',
    'simulation.stepCard.ndpSolicit': '{{node}} からの NS（{{ip}} の持ち主は？）',
    'simulation.stepCard.ndpAdvert': '{{node}} からの NA',
    'simulation.panelGloss.event.ndpSolicit': 'NS＝IPv6 の近隣要請（このアドレスの持ち主は？）',
    'simulation.panelGloss.event.ndpAdvert': 'NA＝IPv6 の近隣通知（持ち主が MAC アドレスを返す）',
  },
};

/** The step card's words for an NDP row, by event; read through `withNdpWords`. */
export const NDP_STEP_CARD_KEYS: Readonly<Record<'ndp-solicit' | 'ndp-advert', string>> = {
  'ndp-solicit': 'simulation.stepCard.ndpSolicit',
  'ndp-advert': 'simulation.stepCard.ndpAdvert',
};

/** `t`, knowing the NDP words as well. */
export function withNdpWords(t: TranslatorFn, locale: string): TranslatorFn {
  const words = locale === 'ja' ? WORDS.ja : WORDS.en;
  return (key, params) => {
    const word = words[key];
    return word === undefined ? t(key, params) : substitute(word, params);
  };
}

/** The reader's translator, knowing the NDP words as well. */
export function useNdpT(): TranslatorFn {
  const { t, locale } = useI18n();
  return useMemo(() => withNdpWords(t, locale), [t, locale]);
}
