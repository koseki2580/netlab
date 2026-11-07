/** DNS, the learn tier: loaded on demand, never in an eager closure (REQ-301, REQ-302). */
import type { Bilingual, LearnField, ProtocolLearn } from '../pack/types';

const text = (en: string, ja: string): Bilingual => ({ en, ja });
const field = (en: string, ja: string, example: LearnField['example']): LearnField => ({
  meaning: text(en, ja),
  example,
});

const RR_TYPES = {
  1: text('An IPv4 address', 'IPv4 アドレス'),
  2: text('A name server for the zone', 'ゾーンのネームサーバー'),
  5: text('Another name for the same host', '同じホストの別名'),
  6: text('Start of a zone of authority', '権威ゾーンの始まり'),
  12: text('A pointer to a name (reverse lookup)', '名前への参照（逆引き）'),
  15: text('A mail exchanger', 'メールの受け取り先'),
  16: text('Text strings', '文字列'),
  28: text('An IPv6 address (RFC 3596)', 'IPv6 アドレス（RFC 3596）'),
};
const CLASSES = {
  1: text('The Internet', 'インターネット'),
  3: text('Chaos', 'Chaos'),
  4: text('Hesiod', 'Hesiod'),
};

const dnsLearn: ProtocolLearn = {
  tier: '__netlab_learn_tier__',
  specs: [
    {
      id: 'RFC 1035',
      title: 'Domain Names - Implementation and Specification',
      year: 1987,
      status: 'internet-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc1035',
    },
    {
      id: 'RFC 2181',
      title: 'Clarifications to the DNS Specification',
      year: 1997,
      status: 'proposed-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc2181',
    },
    {
      id: 'RFC 4035',
      title: 'Protocol Modifications for the DNS Security Extensions',
      year: 2005,
      status: 'proposed-standard',
      url: 'https://www.rfc-editor.org/rfc/rfc4035',
    },
  ],
  versions: [
    { id: 'rfc1035', specs: ['RFC 1035'] },
    {
      id: 'rfc4035',
      specs: ['RFC 1035', 'RFC 2181', 'RFC 4035'],
      extends: 'rfc1035',
      default: true,
      whatsNew: text(
        'Two of the three Z bits become AD (authentic data) and CD (checking disabled) for DNSSEC.',
        '3 ビットの Z のうち 2 ビットが、DNSSEC 用の AD（検証済み）と CD（検証しない）になる。',
      ),
    },
  ],
  sections: {
    question: text('What is being asked.', '問い合わせの中身。'),
    answer: text('Records that answer the question.', '質問に答えるレコード。'),
    authority: text(
      'Records naming the servers to ask next (NS, a referral), or the zone’s SOA when the name does not exist, which a resolver may cache as a negative answer (RFC 2308).',
      '次に問い合わせるサーバーを示すレコード（NS、委任）。名前が存在しないときは、そのゾーンの SOA。リゾルバはこれを否定の答えとしてキャッシュできる（RFC 2308）。',
    ),
    additional: text(
      'Records that help use the answer, such as the addresses of the servers named in the authority section (glue).',
      '回答を使うのに役立つレコード。権威セクションに挙がったサーバーのアドレス（グルー）など。',
    ),
  },
  fields: {
    id: field(
      'Chosen by the asker and copied into the reply, to match replies to questions.',
      '問い合わせ側が決め、応答にそのまま写す番号。応答と質問を対応付ける。',
      0x1234,
    ),
    qr: {
      ...field(
        'Whether this message is a query (0) or a response (1).',
        '問い合わせ（0）か応答（1）か。',
        0,
      ),
      values: { 0: text('A question', '問い合わせ'), 1: text('An answer', '応答') },
    },
    opcode: {
      ...field('The kind of query.', '問い合わせの種類。', 0),
      values: {
        0: text('A standard query', '通常の問い合わせ'),
        1: text('Inverse query (obsolete, RFC 3425)', '逆問い合わせ（廃止、RFC 3425）'),
        2: text('Server status request', 'サーバー状態の問い合わせ'),
        4: text('Zone change notice (RFC 1996)', 'ゾーン変更の通知（RFC 1996）'),
        5: text('Dynamic update (RFC 2136)', '動的更新（RFC 2136）'),
      },
    },
    aa: field(
      'Authoritative Answer: the responding server is an authority for the name asked.',
      '権威ある応答：応答したサーバーがその名前の権威を持つ。',
      0,
    ),
    tc: field(
      'TrunCation: the message was cut short to fit the transport.',
      '切り詰め：転送路に収まるようメッセージが切り詰められた。',
      0,
    ),
    rd: field(
      'Recursion Desired: asks the server to find the answer on the asker’s behalf.',
      '再帰要求：代わりに答えを探してほしいとサーバーに頼む。',
      1,
    ),
    ra: field(
      'Recursion Available: the server offers recursive queries.',
      '再帰可能：サーバーが再帰問い合わせを受け付ける。',
      0,
    ),
    'z@rfc1035': field(
      'Reserved for future use; must be 0.',
      '将来のための予約。0 でなければならない。',
      0,
    ),
    'z@rfc4035': field('Reserved; must be 0.', '予約。0 でなければならない。', 0),
    ad: field(
      'Authentic Data: the server verified the answer with DNSSEC.',
      '検証済みデータ：サーバーが DNSSEC で答えを検証した。',
      0,
    ),
    cd: field(
      'Checking Disabled: the asker will check DNSSEC itself.',
      '検証しない：問い合わせ側が自分で DNSSEC を検証する。',
      0,
    ),
    rcode: {
      ...field('The result of a response.', '応答の結果。', 0),
      values: {
        0: text('No error', 'エラーなし'),
        1: text('The server could not read the query', '問い合わせを解釈できない'),
        2: text('The server failed', 'サーバーの障害'),
        3: text('The name does not exist', 'その名前は存在しない'),
        4: text('Not implemented', '未実装'),
        5: text('Refused by policy', '方針により拒否'),
      },
    },
    qdcount: field('The number of questions.', '質問の数。', 1),
    ancount: field('The number of answer records.', '回答レコードの数。', 0),
    nscount: field('The number of authority records.', '権威レコードの数。', 0),
    arcount: field('The number of additional records.', '追加レコードの数。', 0),
    qname: field(
      'The name asked for, as length-prefixed labels ending in a zero byte.',
      '問い合わせる名前。長さ付きのラベルを並べ、0 のバイトで終わる。',
      'example.com',
    ),
    qtype: {
      ...field('The record type asked for.', '問い合わせるレコードの種類。', 1),
      values: RR_TYPES,
    },
    qclass: {
      ...field('The class asked for, almost always IN.', '問い合わせるクラス。ほぼ常に IN。', 1),
      values: CLASSES,
    },
    name: field(
      'The domain name this record is about.',
      'このレコードが説明するドメイン名。',
      'example.com',
    ),
    type: {
      ...field('What kind of data RDATA holds.', 'RDATA に入っているデータの種類。', 1),
      values: RR_TYPES,
    },
    class: {
      ...field('The class of the data, almost always IN.', 'データのクラス。ほぼ常に IN。', 1),
      values: CLASSES,
    },
    ttl: field(
      'Seconds the record may be cached before it must be asked for again. An answer from a cache carries the seconds left.',
      'このレコードをキャッシュしてよい秒数。過ぎたら問い合わせ直す。キャッシュからの回答には、残りの秒数が入る。',
      300,
    ),
    rdlength: field('The length of RDATA in bytes.', 'RDATA のバイト数。', 4),
    rdata: field(
      'The data itself, shaped by TYPE: A a four-byte IPv4 address, AAAA sixteen bytes of IPv6 (RFC 3596), NS and CNAME a name, MX a preference (lower first) and a name, SOA the zone’s primary server, mailbox, serial, timers and the negative-caching time.',
      'データそのもの。形は TYPE で決まる。A は 4 バイトの IPv4 アドレス、AAAA は 16 バイトの IPv6 アドレス（RFC 3596）、NS と CNAME は名前、MX は優先度（小さいほうが先）と名前、SOA はゾーンの主サーバー、管理者のメール、シリアル、各種タイマー、否定キャッシュの時間。',
      [93, 184, 216, 34],
    ),
  },
};

export default dnsLearn;
