/**
 * Words the trace views load only when they need them (`useLazyDropWords`):
 * the drop reasons of an unanswered ARP (REQ-350) and of a tunnel or label
 * router that would not take the packet (REQ-353), and the Japanese names of
 * the hop fields (REQ-355). They stay out of the shared catalogue and out of
 * the bundles that never show them.
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

/** The hop fields in Japanese, the technical term beside the ones a learner meets as such. */
const FIELDS_JA: Readonly<Record<string, string>> = {
  'Src IP': '送信元 IP',
  'Dst IP': '宛先 IP',
  'Src MAC': '送信元 MAC',
  'Dst MAC': '宛先 MAC',
  'TTL In': '着いたときの TTL',
  'TTL Out': '送り出すときの TTL',
  TTL: 'TTL（寿命）',
  'Hop Limit': 'ホップ数の上限（Hop Limit）',
  'Sender MAC': '問い合わせた機器の MAC',
  'Sender IP': '問い合わせた機器の IP',
  'Target MAC': '探している機器の MAC',
  'Target IP': '探している IP',
  'Eth Dst': 'フレームの宛先 MAC',
  'Eth Src': 'フレームの送信元 MAC',
  EtherType: '中身の種類（EtherType）',
};

/** A hop field's name in the reader's language: Japanese where there is one, else as given. */
export function fieldLabel(label: string, locale: string): string {
  return (locale === 'ja' && FIELDS_JA[label]) || label;
}
