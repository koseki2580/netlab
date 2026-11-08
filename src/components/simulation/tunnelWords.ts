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
