import type { HopTunnel } from '../../types/simulation';

const WORDS = {
  en: { outer: 'Outer header', inner: 'Inner packet', key: 'Tunnel key' },
  ja: { outer: '外側のヘッダ', inner: '内側のパケット', key: 'トンネルキー' },
};

/** A tunnel hop's rows. Here and not in the catalogue, which small bundles carry (L014). */
export function tunnelRows(tunnel: HopTunnel, locale: string) {
  const words = locale === 'ja' ? WORDS.ja : WORDS.en;
  const { outerSrc, outerDst, innerSrc, innerDst, key } = tunnel;
  return [
    { label: words.outer, value: `${outerSrc} → ${outerDst}` },
    { label: words.inner, value: `${innerSrc} → ${innerDst}` },
    ...(key === undefined
      ? []
      : [{ label: tunnel.protocol === 'vxlan' ? 'VNI' : words.key, value: String(key) }]),
  ];
}

const MPLS_WORDS = {
  en: { push: 'Labels pushed', swap: 'Label swapped', pop: 'Label popped', stack: 'Labels now' },
  ja: {
    push: 'ラベルを付けた',
    swap: 'ラベルを付け替えた',
    pop: 'ラベルを外した',
    stack: '今のラベル',
  },
};

/** An MPLS hop's rows (REQ-334): what was done, and the stack after it, top first. */
export function mplsRows(
  mpls: NonNullable<import('../../types/simulation').PacketHop['mpls']>,
  locale: string,
) {
  const words = locale === 'ja' ? MPLS_WORDS.ja : MPLS_WORDS.en;
  const list = (labels: readonly number[]) => (labels.length ? labels.join(' / ') : '—');
  return [
    { label: words[mpls.action], value: `${list(mpls.before)} → ${list(mpls.after)}` },
    { label: words.stack, value: list(mpls.after) },
  ];
}
