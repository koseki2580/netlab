/**
 * The words for drop reasons the views load only when a trace has one
 * (`useLazyDropWords`): an unanswered ARP (REQ-350), and a tunnel or label
 * router that would not take the packet (REQ-353). They stay out of the shared
 * catalogue and out of the bundles that never show one.
 */
const SAID: Readonly<Record<string, { readonly en: string; readonly ja: string }>> = {
  'arp-no-reply': {
    en: 'nobody in its VLAN answered the ARP, so nothing was sent',
    ja: '同じ VLAN の中で ARP に答える機器がなく、何も送られませんでした',
  },
  'vxlan-vni-mismatch': {
    en: 'the far end of the VXLAN tunnel has another VNI, so it did not take it',
    ja: 'VXLAN トンネルの向こう端は VNI がちがうので、受け取りませんでした',
  },
  'mpls-no-label': {
    en: 'this router has no entry for the label on top, so it threw it away',
    ja: 'このルータには上のラベルの登録がないので、捨てました',
  },
};

/** The plain words for a drop reason the trace views explain here, or null for the others. */
export function dropWords(reason: string | undefined, locale: string): string | null {
  const said = reason === undefined ? undefined : SAID[reason];
  if (!said) return null;
  return locale === 'ja' ? said.ja : said.en;
}

/** The canvas bubble where such a drop happened. */
export function bubbleWords(reason: string, locale: string): string {
  const said = dropWords(reason, locale) ?? '';
  return locale === 'ja' ? `ここで止まりました：${said}` : `Stopped here: ${said}`;
}
