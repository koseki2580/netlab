/** GRE, the learn tier: loaded on demand, never in an eager closure (REQ-301, REQ-302). */
import type { LearnField, ProtocolLearn } from '../pack/types';

const field = (en: string, ja: string, example: LearnField['example']): LearnField => ({
  meaning: { en, ja },
  example,
});

const greLearn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
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
  fields: {
    c: field(
      'When 1, the Checksum and Reserved1 fields follow the first four bytes.',
      '1 のとき、先頭 4 バイトの後に Checksum と Reserved1 の欄が続く。',
      0,
    ),
    'reserved0@rfc2784': field(
      'Bits 1–12, sent as 0. A receiver discards the packet if bits 1–5 are not 0, unless it implements RFC 1701.',
      'ビット 1〜12。0 で送る。ビット 1〜5 が 0 でなければ、RFC 1701 を実装していない受信側はパケットを捨てる。',
      0,
    ),
    reserved0a: field(
      'Bit 1, the Routing Present bit of RFC 1701. Sent as 0; a receiver discards the packet if it is set.',
      'ビット 1。RFC 1701 では Routing Present だったビット。0 で送る。1 なら受信側はパケットを捨てる。',
      0,
    ),
    k: field(
      'When 1, the four-byte Key field is present.',
      '1 のとき、4 バイトの Key 欄がある。',
      1,
    ),
    s: field(
      'When 1, the four-byte Sequence Number field is present.',
      '1 のとき、4 バイトの Sequence Number 欄がある。',
      0,
    ),
    'reserved0@rfc2890': field(
      'Bits 4–12, sent as 0. A receiver discards the packet if bit 4 or 5 is set, and ignores bits 6–12.',
      'ビット 4〜12。0 で送る。ビット 4 か 5 が 1 なら受信側はパケットを捨て、ビット 6〜12 は無視する。',
      0,
    ),
    ver: {
      ...field('GRE version. Must be 0.', 'GRE の版。0 でなければならない。', 0),
      values: {
        0: { en: 'GRE (must be 0)', ja: 'GRE（0 でなければならない）' },
        1: { en: 'PPTP enhanced GRE (RFC 2637)', ja: 'PPTP の拡張 GRE（RFC 2637）' },
      },
    },
    protocolType: field(
      'The EtherType of the packet carried inside.',
      '中に入っているパケットの種類（EtherType）。',
      0x0800,
    ),
    checksum: field(
      "The one's complement checksum of the GRE header and the payload.",
      'GRE ヘッダーと中身を合わせた 1 の補数のチェックサム。',
      0,
    ),
    reserved1: field(
      'Reserved, sent as 0. Present only with the Checksum.',
      '予約。0 で送る。Checksum があるときだけ存在する。',
      0,
    ),
    key: field(
      'A number both tunnel ends agree on, telling apart flows within one tunnel.',
      'トンネルの両端で決めた番号。1 本のトンネルの中の流れを見分ける。',
      42,
    ),
    sequence: field(
      'Counts the packets sent in this flow, so the receiver can keep them in order.',
      'この流れで送ったパケットの通し番号。受信側が順番を保つのに使う。',
      1,
    ),
  },
};

export default greLearn;
