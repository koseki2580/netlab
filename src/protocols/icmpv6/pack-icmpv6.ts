/** ICMPv6, the learn tier: loaded on demand, never in an eager closure (REQ-301, REQ-321). */
import type { ProtocolLearn } from '../pack/types';

const learn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
  specs: [
    {
      id: 'RFC 4443',
      title:
        'Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification',
      year: 2006,
      status: 'internet-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc4443',
    },
  ],
  versions: [{ id: 'rfc4443', specs: ['RFC 4443'], default: true }],
  fields: {
    type: {
      meaning: {
        en: 'What the message is: errors are 0–127, information 128–255.',
        ja: 'メッセージの種類。0〜127 はエラー、128〜255 は情報。',
      },
      example: 128,
      values: {
        1: { en: 'The destination cannot be reached', ja: '宛先に届けられない' },
        2: {
          en: "The packet is larger than the next link's MTU",
          ja: '次のリンクの MTU より大きい',
        },
        3: { en: 'The hop limit reached 0', ja: 'ホップ制限が 0 になった' },
        4: { en: 'A header field could not be read', ja: 'ヘッダの欄を解釈できない' },
        128: { en: 'A ping asks for a reply', ja: 'ping の問い合わせ' },
        129: { en: 'The reply to a ping', ja: 'ping への応答' },
      },
    },
    code: {
      meaning: {
        en: 'Detail for the type, such as why a destination is unreachable.',
        ja: '種類の詳細。宛先に届かない理由など。',
      },
      example: 0,
    },
    checksum: {
      meaning: {
        en: "The one's complement sum over the IPv6 pseudo-header (addresses, length, next header 58) and the message.",
        ja: 'IPv6 疑似ヘッダ（アドレス、長さ、次ヘッダ 58）とメッセージ全体の 1 の補数の和。',
      },
      example: 0,
    },
    identifier: {
      meaning: {
        en: 'Matches replies to requests, like a session number.',
        ja: '応答と問い合わせを対応付ける番号。',
      },
      example: 1,
    },
    sequence: {
      meaning: {
        en: 'Counts the requests of one ping session.',
        ja: '1 回の ping で送った問い合わせの通し番号。',
      },
      example: 1,
    },
    body: {
      meaning: {
        en: 'The rest of the message: echo data, or the start of the packet that caused an error.',
        ja: '残りのメッセージ。echo のデータか、エラーの原因になったパケットの先頭。',
      },
      example: [],
    },
  },
};

export default learn;
