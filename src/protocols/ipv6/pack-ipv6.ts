/** IPv6, the learn tier: loaded on demand, never in an eager closure (REQ-301, REQ-321). */
import type { ProtocolLearn } from '../pack/types';

const learn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
  specs: [
    {
      id: 'RFC 8200',
      title: 'Internet Protocol, Version 6 (IPv6) Specification',
      year: 2017,
      status: 'internet-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc8200',
    },
  ],
  versions: [{ id: 'rfc8200', specs: ['RFC 8200'], default: true }],
  fields: {
    version: { meaning: { en: 'The IP version: always 6.', ja: 'IP の版。常に 6。' }, example: 6 },
    trafficClass: {
      meaning: {
        en: "Priority and congestion marks: the DSCP and ECN bits, as in IPv4's DS field.",
        ja: '優先度と輻輳の印。IPv4 の DS 欄と同じ DSCP と ECN のビット。',
      },
      example: 0,
    },
    flowLabel: {
      meaning: {
        en: 'Marks packets of one flow so routers can keep them on one path; 0 when unused.',
        ja: '同じ流れのパケットに付ける印。ルータが同じ経路に乗せられる。使わないときは 0。',
      },
      example: 0,
    },
    payloadLength: {
      meaning: {
        en: 'The bytes after this 40-byte header, extension headers included.',
        ja: 'この 40 バイトのヘッダの後に続くバイト数（拡張ヘッダを含む）。',
      },
      example: 8,
    },
    nextHeader: {
      meaning: {
        en: 'What follows this header: an extension header or the upper-layer protocol.',
        ja: 'このヘッダの次に来るもの。拡張ヘッダか上位層のプロトコル。',
      },
      example: 58,
      values: {
        0: { en: 'Hop-by-Hop Options header', ja: 'ホップバイホップオプションヘッダ' },
        6: { en: 'TCP', ja: 'TCP' },
        17: { en: 'UDP', ja: 'UDP' },
        43: { en: 'Routing header', ja: 'ルーティングヘッダ' },
        44: { en: 'Fragment header', ja: 'フラグメントヘッダ' },
        58: { en: 'ICMPv6', ja: 'ICMPv6' },
        59: { en: 'Nothing follows', ja: '後に何も続かない' },
        60: { en: 'Destination Options header', ja: '宛先オプションヘッダ' },
      },
    },
    hopLimit: {
      meaning: {
        en: "How many more routers may forward it; each takes 1, and 0 means drop (IPv4's TTL).",
        ja: 'あと何台のルータが転送できるか。1 台ごとに 1 減り、0 で捨てられる（IPv4 の TTL）。',
      },
      example: 64,
    },
    source: {
      meaning: { en: "The sender's IPv6 address.", ja: '送り手の IPv6 アドレス。' },
      example: '2001:db8::1',
    },
    destination: {
      meaning: { en: "The receiver's IPv6 address.", ja: '受け手の IPv6 アドレス。' },
      example: '2001:db8::2',
    },
  },
};

export default learn;
