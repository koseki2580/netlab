/**
 * GRE descriptor (test fixture for the W1 trial).
 * RFC 2784 §2 and RFC 2890 §2:
 *
 *   |C| |K|S| Reserved0       | Ver |         Protocol Type         |   (RFC 2890)
 *   |C|       Reserved0       | Ver |         Protocol Type         |   (RFC 2784)
 *   |      Checksum (optional)      |       Reserved1 (Optional)    |
 *   |                         Key (optional)                        |
 *   |                 Sequence Number (Optional)                    |
 */
import type { GreHeader } from '../../../types/tunneling';
import { defineProtocol } from '../define';
import type { HeaderValues } from '../types';

const V2890 = ['rfc2890'] as const;

export const grePack = defineProtocol({
  apiVersion: 1,
  id: 'gre',
  name: { short: 'GRE', en: 'Generic Routing Encapsulation', ja: '汎用ルーティングカプセル化' },
  layer: 'L3',
  numbers: { ipProtocol: 47 },
  specs: [
    {
      id: 'RFC 2784',
      title: 'Generic Routing Encapsulation (GRE)',
      year: 2000,
      status: 'proposed-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc2784',
    },
    {
      id: 'RFC 2890',
      title: 'Key and Sequence Number Extensions to GRE',
      year: 2000,
      status: 'proposed-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc2890',
    },
  ],
  versions: [
    { id: 'rfc2784', specs: ['RFC 2784'] },
    {
      id: 'rfc2890',
      specs: ['RFC 2784', 'RFC 2890'],
      extends: 'rfc2784',
      default: true,
      whatsNew: {
        en: 'Adds the optional Key and Sequence Number fields (K and S bits).',
        ja: '省略可能な Key と Sequence Number の欄（K ビットと S ビット）を追加。',
      },
    },
  ],
  header: [
    {
      key: 'c',
      name: 'Checksum Present',
      type: 'flag',
      meaning: {
        en: 'When 1, the Checksum and Reserved1 fields follow the first four bytes.',
        ja: '1 のとき、先頭 4 バイトの後に Checksum と Reserved1 の欄が続く。',
      },
      example: 0,
    },
    {
      key: 'reserved0',
      name: 'Reserved0',
      type: 'reserved',
      bits: 12,
      in: ['rfc2784'],
      meaning: {
        en: 'Bits 1–12, sent as 0. A receiver discards the packet if bits 1–5 are not 0, unless it implements RFC 1701.',
        ja: 'ビット 1〜12。0 で送る。ビット 1〜5 が 0 でなければ、RFC 1701 を実装していない受信側はパケットを捨てる。',
      },
      example: 0,
    },
    {
      key: 'reserved0a',
      name: 'Reserved0 (bit 1)',
      type: 'reserved',
      bits: 1,
      in: V2890,
      meaning: {
        en: 'Bit 1, the Routing Present bit of RFC 1701. Sent as 0; a receiver discards the packet if it is set.',
        ja: 'ビット 1。RFC 1701 では Routing Present だったビット。0 で送る。1 なら受信側はパケットを捨てる。',
      },
      example: 0,
    },
    {
      key: 'k',
      name: 'Key Present',
      type: 'flag',
      in: V2890,
      meaning: {
        en: 'When 1, the four-byte Key field is present.',
        ja: '1 のとき、4 バイトの Key 欄がある。',
      },
      example: 1,
    },
    {
      key: 's',
      name: 'Sequence Number Present',
      type: 'flag',
      in: V2890,
      meaning: {
        en: 'When 1, the four-byte Sequence Number field is present.',
        ja: '1 のとき、4 バイトの Sequence Number 欄がある。',
      },
      example: 0,
    },
    {
      key: 'reserved0',
      name: 'Reserved0',
      type: 'reserved',
      bits: 9,
      in: V2890,
      meaning: {
        en: 'Bits 4–12, sent as 0. A receiver discards the packet if bit 4 or 5 is set, and ignores bits 6–12.',
        ja: 'ビット 4〜12。0 で送る。ビット 4 か 5 が 1 なら受信側はパケットを捨て、ビット 6〜12 は無視する。',
      },
      example: 0,
    },
    {
      key: 'ver',
      name: 'Version Number',
      type: 'enum',
      bits: 3,
      values: [
        {
          value: 0,
          name: 'GRE',
          meaning: { en: 'GRE (must be 0)', ja: 'GRE（0 でなければならない）' },
        },
        {
          value: 1,
          name: 'Enhanced GRE',
          meaning: { en: 'PPTP enhanced GRE (RFC 2637)', ja: 'PPTP の拡張 GRE（RFC 2637）' },
        },
      ],
      meaning: {
        en: 'GRE version. Must be 0.',
        ja: 'GRE の版。0 でなければならない。',
      },
      example: 0,
    },
    {
      key: 'protocolType',
      name: 'Protocol Type',
      type: 'enum',
      bits: 16,
      hex: true,
      values: [
        { value: 0x0800, name: 'IPv4' },
        { value: 0x86dd, name: 'IPv6' },
        { value: 0x6558, name: 'Transparent Ethernet Bridging' },
      ],
      meaning: {
        en: 'The EtherType of the packet carried inside.',
        ja: '中に入っているパケットの種類（EtherType）。',
      },
      example: 0x0800,
    },
    {
      key: 'checksum',
      name: 'Checksum',
      type: 'uint',
      bits: 16,
      hex: true,
      presentIf: 'c',
      meaning: {
        en: "The one's complement checksum of the GRE header and the payload.",
        ja: 'GRE ヘッダーと中身を合わせた 1 の補数のチェックサム。',
      },
      example: 0,
    },
    {
      key: 'reserved1',
      name: 'Reserved1',
      type: 'reserved',
      bits: 16,
      presentIf: 'c',
      meaning: {
        en: 'Reserved, sent as 0. Present only with the Checksum.',
        ja: '予約。0 で送る。Checksum があるときだけ存在する。',
      },
      example: 0,
    },
    {
      key: 'key',
      name: 'Key',
      type: 'uint',
      bits: 32,
      presentIf: 'k',
      in: V2890,
      meaning: {
        en: 'A number both tunnel ends agree on, telling apart flows within one tunnel.',
        ja: 'トンネルの両端で決めた番号。1 本のトンネルの中の流れを見分ける。',
      },
      example: 42,
    },
    {
      key: 'sequence',
      name: 'Sequence Number',
      type: 'uint',
      bits: 32,
      presentIf: 's',
      in: V2890,
      meaning: {
        en: 'Counts the packets sent in this flow, so the receiver can keep them in order.',
        ja: 'この流れで送ったパケットの通し番号。受信側が順番を保つのに使う。',
      },
      example: 1,
    },
  ],
});

/** Today's `GreHeader` (src/types/tunneling.ts) as a pack header object. */
export function greHeaderToValues(header: GreHeader): HeaderValues {
  return {
    c: header.hasChecksum ? 1 : 0,
    k: header.hasKey ? 1 : 0,
    s: header.hasSequence ? 1 : 0,
    ver: header.version,
    protocolType: header.protocolType,
    ...(header.hasChecksum ? { checksum: header.checksum ?? 0 } : {}),
    ...(header.hasKey ? { key: header.key ?? 0 } : {}),
    ...(header.hasSequence ? { sequence: header.sequence ?? 0 } : {}),
  };
}
