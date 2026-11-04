/** NTP, the learn tier: loaded on demand, never in an eager closure (REQ-301, REQ-314). */
import type { ProtocolLearn } from '../pack/types';

const ntpLearn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
  specs: [
    {
      id: 'RFC 5905',
      title: 'Network Time Protocol Version 4: Protocol and Algorithms Specification',
      year: 2010,
      status: 'proposed-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc5905',
    },
  ],
  versions: [{ id: 'rfc5905', specs: ['RFC 5905'], default: true }],
  fields: {
    li: {
      meaning: {
        en: 'Warns of a leap second at the end of the day; 3 means the clock is not synchronized.',
        ja: 'その日の終わりのうるう秒を予告する。3 は時計が同期していないことを示す。',
      },
      example: 0,
      values: {
        0: { en: 'No warning', ja: '予告なし' },
        1: { en: 'The last minute of the day has 61 seconds', ja: 'その日の最後の 1 分が 61 秒' },
        2: { en: 'The last minute of the day has 59 seconds', ja: 'その日の最後の 1 分が 59 秒' },
        3: { en: 'Unknown: the clock is not synchronized', ja: '不明（時計が同期していない）' },
      },
    },
    vn: {
      meaning: { en: 'The NTP version; 4 for RFC 5905.', ja: 'NTP の版。RFC 5905 では 4。' },
      example: 4,
    },
    mode: {
      meaning: {
        en: 'What the sender is doing: a client asks (3), a server answers (4).',
        ja: '送り手の役割。クライアントは問い合わせ（3）、サーバーは応答（4）。',
      },
      example: 3,
      values: {
        0: { en: 'Reserved', ja: '予約' },
        1: { en: 'Symmetric active', ja: '対称アクティブ' },
        2: { en: 'Symmetric passive', ja: '対称パッシブ' },
        3: { en: 'Client', ja: 'クライアント' },
        4: { en: 'Server', ja: 'サーバー' },
        5: { en: 'Broadcast', ja: 'ブロードキャスト' },
        6: { en: 'NTP control message', ja: 'NTP 制御メッセージ' },
        7: { en: 'Reserved for private use', ja: '私的利用のための予約' },
      },
    },
    stratum: {
      meaning: {
        en: "How many steps the server is from a reference clock: 1 is a primary server, 2–15 secondary, 16 unsynchronized; 0 in a reply is a kiss-o'-death.",
        ja: '基準時計から何段離れているか。1 は一次サーバー、2〜15 は二次、16 は非同期。応答での 0 は「キス・オブ・デス」。',
      },
      example: 2,
    },
    poll: {
      meaning: {
        en: 'The longest interval between messages, as a power of two seconds (signed).',
        ja: 'メッセージを送る最長の間隔。2 の何乗秒かで表す（符号付き）。',
      },
      example: 6,
    },
    precision: {
      meaning: {
        en: "How finely the sender's clock reads, as a power of two seconds (signed; −20 is about a microsecond).",
        ja: '送り手の時計の細かさ。2 の何乗秒かで表す（符号付き。−20 は約 1 マイクロ秒）。',
      },
      example: 236,
    },
    rootDelay: {
      meaning: {
        en: 'The round-trip delay to the reference clock, in seconds (16.16).',
        ja: '基準時計までの往復の遅延（秒、16.16 形式）。',
      },
      example: 0,
    },
    rootDispersion: {
      meaning: {
        en: 'The total error the server may have relative to the reference clock, in seconds (16.16).',
        ja: 'サーバーが基準時計に対して持ちうる誤差の合計（秒、16.16 形式）。',
      },
      example: 0,
    },
    referenceId: {
      meaning: {
        en: "Who the server syncs to: four ASCII letters such as GPS at stratum 1, otherwise the upstream server's IPv4 address.",
        ja: 'サーバーの同期元。階層 1 では GPS などの 4 文字の ASCII、それ以外は上位サーバーの IPv4 アドレス。',
      },
      example: [71, 80, 83, 0],
    },
    referenceSeconds: {
      meaning: {
        en: "Seconds since 1 January 1900: when the server's clock was last set.",
        ja: '1900 年 1 月 1 日からの秒数：サーバーの時計が最後に合わせられた時刻。',
      },
      example: 3940000000,
    },
    referenceFraction: {
      meaning: {
        en: "The fraction of a second, in units of 2^-32 s: when the server's clock was last set.",
        ja: '1 秒未満の端数（2^-32 秒単位）：サーバーの時計が最後に合わせられた時刻。',
      },
      example: 0,
    },
    originSeconds: {
      meaning: {
        en: 'Seconds since 1 January 1900: when the client sent the request, copied back by the server.',
        ja: '1900 年 1 月 1 日からの秒数：クライアントが要求を送った時刻。サーバーがそのまま返す。',
      },
      example: 3940000000,
    },
    originFraction: {
      meaning: {
        en: 'The fraction of a second, in units of 2^-32 s: when the client sent the request, copied back by the server.',
        ja: '1 秒未満の端数（2^-32 秒単位）：クライアントが要求を送った時刻。サーバーがそのまま返す。',
      },
      example: 0,
    },
    receiveSeconds: {
      meaning: {
        en: 'Seconds since 1 January 1900: when the server received the request.',
        ja: '1900 年 1 月 1 日からの秒数：サーバーが要求を受け取った時刻。',
      },
      example: 3940000000,
    },
    receiveFraction: {
      meaning: {
        en: 'The fraction of a second, in units of 2^-32 s: when the server received the request.',
        ja: '1 秒未満の端数（2^-32 秒単位）：サーバーが要求を受け取った時刻。',
      },
      example: 0,
    },
    transmitSeconds: {
      meaning: {
        en: 'Seconds since 1 January 1900: when this packet left its sender.',
        ja: '1900 年 1 月 1 日からの秒数：このパケットを送り手が送り出した時刻。',
      },
      example: 3940000000,
    },
    transmitFraction: {
      meaning: {
        en: 'The fraction of a second, in units of 2^-32 s: when this packet left its sender.',
        ja: '1 秒未満の端数（2^-32 秒単位）：このパケットを送り手が送り出した時刻。',
      },
      example: 0,
    },
  },
};

export default ntpLearn;
