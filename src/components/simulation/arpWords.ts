/**
 * The words for a send that stopped because the sender's ARP went unanswered
 * (REQ-350). Loaded only when a view has one to show (`useArpWords`), so they
 * stay out of the shared catalogue and out of the bundles that never show one.
 */
const SAID = {
  en: 'nobody in its VLAN answered the ARP, so nothing was sent',
  ja: '同じ VLAN の中で ARP に答える機器がなく、何も送られませんでした',
} as const;

const said = (locale: string) => (locale === 'ja' ? SAID.ja : SAID.en);

/** The plain words for a drop reason the trace views explain here, or null for the others. */
export function dropWords(reason: string | undefined, locale: string): string | null {
  return reason === 'arp-no-reply' ? said(locale) : null;
}

/** The canvas bubble at the host whose ARP went unanswered. */
export function bubbleWords(locale: string): string {
  return locale === 'ja' ? `ここで止まりました：${SAID.ja}` : `Stopped here: ${SAID.en}`;
}
