/**
 * TEMPLATE learn tier: specs, versions and text for every field, in English and
 * Japanese. Loaded on demand; the file must be named `pack-<id>.ts`.
 */
import type { ProtocolLearn } from '../pack/types';

const templateLearn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
  specs: [{ id: 'RFC 0000', title: 'The specification', year: 2026, status: 'proposed-standard' }],
  versions: [{ id: 'v1', specs: ['RFC 0000'], default: true }],
  fields: {
    kind: {
      meaning: { en: 'What the message is.', ja: 'メッセージの種類。' },
      example: 1,
      values: {
        1: { en: 'A request', ja: '要求' },
        2: { en: 'A reply', ja: '応答' },
      },
    },
    flag: { meaning: { en: 'A one-bit switch.', ja: '1 ビットの切り替え。' }, example: 0 },
    reserved: { meaning: { en: 'Sent as 0.', ja: '0 で送る。' }, example: 0 },
    length: { meaning: { en: 'The length in bytes.', ja: 'バイト数。' }, example: 4 },
  },
};

export default templateLearn;
