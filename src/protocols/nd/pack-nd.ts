/** Neighbor Discovery, the learn tier: loaded on demand, never in an eager closure (REQ-301, REQ-321). */
import type { ProtocolLearn } from '../pack/types';

const learn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
  specs: [
    {
      id: 'RFC 4861',
      title: 'Neighbor Discovery for IP version 6 (IPv6)',
      year: 2007,
      status: 'draft-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc4861',
    },
  ],
  versions: [{ id: 'rfc4861', specs: ['RFC 4861'], default: true }],
  sections: {
    options: {
      en: 'Options after the message, each a type, a length and data, to the end.',
      ja: 'メッセージの後に終わりまで続くオプション。種類・長さ・データの組。',
    },
  },
  fields: {
    type: {
      meaning: {
        en: 'Which Neighbour Discovery message this is (ICMPv6 type).',
        ja: 'どの近隣探索メッセージか（ICMPv6 の種類）。',
      },
      example: 135,
      values: {
        133: {
          en: 'A host asks routers to advertise now',
          ja: 'ホストがルータに今すぐ広告を求める',
        },
        134: {
          en: 'A router announces itself and its prefixes',
          ja: 'ルータが自分とプレフィックスを知らせる',
        },
        135: {
          en: 'Asks who has an address, or checks a neighbour is there',
          ja: 'アドレスの持ち主を尋ねる、または近隣がいるか確かめる',
        },
        136: {
          en: 'Answers a solicitation, giving the link-layer address',
          ja: '要請に答え、リンク層アドレスを伝える',
        },
      },
    },
    code: {
      meaning: { en: 'Always 0 for Neighbour Discovery.', ja: '近隣探索では常に 0。' },
      example: 0,
    },
    checksum: {
      meaning: {
        en: 'The ICMPv6 checksum over the pseudo-header and the message.',
        ja: '疑似ヘッダとメッセージ全体の ICMPv6 チェックサム。',
      },
      example: 0,
    },
    rsReserved: { meaning: { en: 'Unused; sent as 0.', ja: '未使用。0 で送る。' }, example: 0 },
    curHopLimit: {
      meaning: {
        en: 'The hop limit hosts should put on the packets they send.',
        ja: 'ホストが送るパケットに付けるべきホップ制限。',
      },
      example: 64,
    },
    managed: {
      meaning: { en: 'M: get addresses from DHCPv6.', ja: 'M：アドレスを DHCPv6 で得る。' },
      example: 0,
    },
    other: {
      meaning: {
        en: 'O: get other settings, such as DNS servers, from DHCPv6.',
        ja: 'O：DNS サーバーなどほかの設定を DHCPv6 で得る。',
      },
      example: 0,
    },
    raReserved: { meaning: { en: 'Unused; sent as 0.', ja: '未使用。0 で送る。' }, example: 0 },
    routerLifetime: {
      meaning: {
        en: 'Seconds this router may serve as a default router; 0 means not at all.',
        ja: 'このルータをデフォルトルータとして使える秒数。0 は使えない。',
      },
      example: 1800,
    },
    reachableTime: {
      meaning: {
        en: 'Milliseconds a neighbour stays reachable after a confirmation; 0 leaves it to the host.',
        ja: '確認後に近隣を到達可能とみなすミリ秒。0 はホストに任せる。',
      },
      example: 0,
    },
    retransTimer: {
      meaning: {
        en: 'Milliseconds between solicitations; 0 leaves it to the host.',
        ja: '要請を送り直す間隔（ミリ秒）。0 はホストに任せる。',
      },
      example: 0,
    },
    nsReserved: { meaning: { en: 'Unused; sent as 0.', ja: '未使用。0 で送る。' }, example: 0 },
    router: {
      meaning: { en: 'R: the sender is a router.', ja: 'R：送り手はルータ。' },
      example: 0,
    },
    solicited: {
      meaning: { en: 'S: this answers a solicitation.', ja: 'S：要請への応答。' },
      example: 1,
    },
    override: {
      meaning: {
        en: 'O: replace an address already in the neighbour cache.',
        ja: 'O：近隣キャッシュの既存のアドレスを置き換える。',
      },
      example: 1,
    },
    naReserved: { meaning: { en: 'Unused; sent as 0.', ja: '未使用。0 で送る。' }, example: 0 },
    target: {
      meaning: {
        en: 'The address asked about (NS) or answered for (NA).',
        ja: '尋ねる（NS）または答える（NA）対象のアドレス。',
      },
      example: '2001:db8::2',
    },
    optionType: {
      meaning: { en: 'What the option carries.', ja: 'オプションが運ぶ内容。' },
      example: 1,
      values: {
        1: { en: "The sender's link-layer (MAC) address", ja: '送り手のリンク層（MAC）アドレス' },
        2: { en: "The target's link-layer (MAC) address", ja: '対象のリンク層（MAC）アドレス' },
        3: {
          en: 'A prefix for on-link use and address autoconfiguration',
          ja: 'リンク上の判定とアドレス自動設定に使うプレフィックス',
        },
        4: { en: 'Part of a redirected packet', ja: '転送し直したパケットの一部' },
        5: { en: "The link's MTU", ja: 'リンクの MTU' },
      },
    },
    optionLength: {
      meaning: {
        en: "The option's length in units of 8 bytes, its type and length included.",
        ja: 'オプションの長さ。種類と長さの欄を含め、8 バイト単位。',
      },
      example: 1,
    },
    optionData: {
      meaning: {
        en: "The option's content: a MAC address, or prefix length, flags, lifetimes and prefix.",
        ja: 'オプションの中身。MAC アドレス、またはプレフィックス長・フラグ・有効期間・プレフィックス。',
      },
      example: [2, 0, 0, 0, 0, 1],
    },
  },
};

export default learn;
