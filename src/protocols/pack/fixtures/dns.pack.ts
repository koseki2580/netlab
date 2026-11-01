/**
 * DNS descriptor (test fixture for the W1 trial).
 * RFC 1035 §4.1 (header, question, resource record); RFC 4035 §3.2 (AD and CD
 * take two of the three Z bits); RFC 2181 §8 (TTL is an unsigned 32-bit number).
 *
 *   |                      ID                       |
 *   |QR|   Opcode  |AA|TC|RD|RA| Z|AD|CD|   RCODE   |   (RFC 4035; RFC 1035 has Z as 3 bits)
 *   |                    QDCOUNT                    |
 *   |                    ANCOUNT                    |
 *   |                    NSCOUNT                    |
 *   |                    ARCOUNT                    |
 */
import type { DnsMessage } from '../../../types/packets';
import { defineProtocol } from '../define';
import type { EnumValue, HeaderField, HeaderValues } from '../types';

const RR_TYPES: readonly EnumValue[] = [
  { value: 1, name: 'A', meaning: { en: 'An IPv4 address', ja: 'IPv4 アドレス' } },
  {
    value: 2,
    name: 'NS',
    meaning: { en: 'A name server for the zone', ja: 'ゾーンのネームサーバー' },
  },
  {
    value: 5,
    name: 'CNAME',
    meaning: { en: 'Another name for the same host', ja: '同じホストの別名' },
  },
  {
    value: 6,
    name: 'SOA',
    meaning: { en: 'Start of a zone of authority', ja: '権威ゾーンの始まり' },
  },
  {
    value: 12,
    name: 'PTR',
    meaning: { en: 'A pointer to a name (reverse lookup)', ja: '名前への参照（逆引き）' },
  },
  { value: 15, name: 'MX', meaning: { en: 'A mail exchanger', ja: 'メールの受け取り先' } },
  { value: 16, name: 'TXT', meaning: { en: 'Text strings', ja: '文字列' } },
  {
    value: 28,
    name: 'AAAA',
    meaning: { en: 'An IPv6 address (RFC 3596)', ja: 'IPv6 アドレス（RFC 3596）' },
  },
];

const CLASSES: readonly EnumValue[] = [
  { value: 1, name: 'IN', meaning: { en: 'The Internet', ja: 'インターネット' } },
  { value: 3, name: 'CH', meaning: { en: 'Chaos', ja: 'Chaos' } },
  { value: 4, name: 'HS', meaning: { en: 'Hesiod', ja: 'Hesiod' } },
];

const u16 = (key: string, name: string, en: string, ja: string, example: number): HeaderField => ({
  key,
  name,
  type: 'uint',
  bits: 16,
  meaning: { en, ja },
  example,
});

const flag = (key: string, name: string, en: string, ja: string, example: number): HeaderField => ({
  key,
  name,
  type: 'flag',
  meaning: { en, ja },
  example,
});

function formatRdata(value: unknown, siblings: HeaderValues): string {
  const bytes = Array.isArray(value) ? (value as number[]) : [];
  if (siblings['type'] === 1 && bytes.length === 4) return bytes.join('.');
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

const RESOURCE_RECORD: readonly HeaderField[] = [
  {
    key: 'name',
    name: 'NAME',
    type: 'domain-name',
    meaning: {
      en: 'The domain name this record is about.',
      ja: 'このレコードが説明するドメイン名。',
    },
    example: 'example.com',
  },
  {
    key: 'type',
    name: 'TYPE',
    type: 'enum',
    bits: 16,
    values: RR_TYPES,
    meaning: { en: 'What kind of data RDATA holds.', ja: 'RDATA に入っているデータの種類。' },
    example: 1,
  },
  {
    key: 'class',
    name: 'CLASS',
    type: 'enum',
    bits: 16,
    values: CLASSES,
    meaning: {
      en: 'The class of the data, almost always IN.',
      ja: 'データのクラス。ほぼ常に IN。',
    },
    example: 1,
  },
  {
    key: 'ttl',
    name: 'TTL',
    type: 'uint',
    bits: 32,
    meaning: {
      en: 'Seconds the record may be cached before it must be asked for again.',
      ja: 'このレコードをキャッシュしてよい秒数。過ぎたら問い合わせ直す。',
    },
    example: 300,
  },
  {
    key: 'rdlength',
    name: 'RDLENGTH',
    type: 'uint',
    bits: 16,
    meaning: { en: 'The length of RDATA in bytes.', ja: 'RDATA のバイト数。' },
    example: 4,
  },
  {
    key: 'rdata',
    name: 'RDATA',
    type: 'bytes',
    lengthFrom: 'rdlength',
    format: formatRdata,
    meaning: {
      en: 'The data itself; for TYPE A, a four-byte IPv4 address.',
      ja: 'データそのもの。TYPE が A なら 4 バイトの IPv4 アドレス。',
    },
    example: [93, 184, 216, 34],
  },
];

export const dnsPack = defineProtocol({
  apiVersion: 1,
  id: 'dns',
  name: { short: 'DNS', en: 'Domain Name System', ja: 'ドメインネームシステム' },
  layer: 'L7',
  numbers: {
    ports: [
      { transport: 'udp', port: 53 },
      { transport: 'tcp', port: 53 },
    ],
  },
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
      whatsNew: {
        en: 'Two of the three Z bits become AD (authentic data) and CD (checking disabled) for DNSSEC.',
        ja: '3 ビットの Z のうち 2 ビットが、DNSSEC 用の AD（検証済み）と CD（検証しない）になる。',
      },
    },
  ],
  label: { field: 'qr' },
  header: [
    {
      key: 'id',
      name: 'ID',
      type: 'uint',
      bits: 16,
      hex: true,
      meaning: {
        en: 'Chosen by the asker and copied into the reply, to match replies to questions.',
        ja: '問い合わせ側が決め、応答にそのまま写す番号。応答と質問を対応付ける。',
      },
      example: 0x1234,
    },
    {
      key: 'qr',
      name: 'QR',
      type: 'enum',
      bits: 1,
      values: [
        { value: 0, name: 'QUERY', meaning: { en: 'A question', ja: '問い合わせ' } },
        { value: 1, name: 'RESPONSE', meaning: { en: 'An answer', ja: '応答' } },
      ],
      meaning: {
        en: 'Whether this message is a query (0) or a response (1).',
        ja: '問い合わせ（0）か応答（1）か。',
      },
      example: 0,
    },
    {
      key: 'opcode',
      name: 'OPCODE',
      type: 'enum',
      bits: 4,
      values: [
        { value: 0, name: 'QUERY', meaning: { en: 'A standard query', ja: '通常の問い合わせ' } },
        {
          value: 1,
          name: 'IQUERY',
          meaning: {
            en: 'Inverse query (obsolete, RFC 3425)',
            ja: '逆問い合わせ（廃止、RFC 3425）',
          },
        },
        {
          value: 2,
          name: 'STATUS',
          meaning: { en: 'Server status request', ja: 'サーバー状態の問い合わせ' },
        },
        {
          value: 4,
          name: 'NOTIFY',
          meaning: { en: 'Zone change notice (RFC 1996)', ja: 'ゾーン変更の通知（RFC 1996）' },
        },
        {
          value: 5,
          name: 'UPDATE',
          meaning: { en: 'Dynamic update (RFC 2136)', ja: '動的更新（RFC 2136）' },
        },
      ],
      meaning: { en: 'The kind of query.', ja: '問い合わせの種類。' },
      example: 0,
    },
    flag(
      'aa',
      'AA',
      'Authoritative Answer: the responding server is an authority for the name asked.',
      '権威ある応答：応答したサーバーがその名前の権威を持つ。',
      0,
    ),
    flag(
      'tc',
      'TC',
      'TrunCation: the message was cut short to fit the transport.',
      '切り詰め：転送路に収まるようメッセージが切り詰められた。',
      0,
    ),
    flag(
      'rd',
      'RD',
      'Recursion Desired: asks the server to find the answer on the asker’s behalf.',
      '再帰要求：代わりに答えを探してほしいとサーバーに頼む。',
      1,
    ),
    flag(
      'ra',
      'RA',
      'Recursion Available: the server offers recursive queries.',
      '再帰可能：サーバーが再帰問い合わせを受け付ける。',
      0,
    ),
    {
      key: 'z',
      name: 'Z',
      type: 'reserved',
      bits: 3,
      in: ['rfc1035'],
      meaning: {
        en: 'Reserved for future use; must be 0.',
        ja: '将来のための予約。0 でなければならない。',
      },
      example: 0,
    },
    {
      key: 'z',
      name: 'Z',
      type: 'reserved',
      bits: 1,
      in: ['rfc4035'],
      meaning: { en: 'Reserved; must be 0.', ja: '予約。0 でなければならない。' },
      example: 0,
    },
    {
      ...flag(
        'ad',
        'AD',
        'Authentic Data: the server verified the answer with DNSSEC.',
        '検証済みデータ：サーバーが DNSSEC で答えを検証した。',
        0,
      ),
      in: ['rfc4035'],
    },
    {
      ...flag(
        'cd',
        'CD',
        'Checking Disabled: the asker will check DNSSEC itself.',
        '検証しない：問い合わせ側が自分で DNSSEC を検証する。',
        0,
      ),
      in: ['rfc4035'],
    },
    {
      key: 'rcode',
      name: 'RCODE',
      type: 'enum',
      bits: 4,
      values: [
        { value: 0, name: 'NOERROR', meaning: { en: 'No error', ja: 'エラーなし' } },
        {
          value: 1,
          name: 'FORMERR',
          meaning: { en: 'The server could not read the query', ja: '問い合わせを解釈できない' },
        },
        { value: 2, name: 'SERVFAIL', meaning: { en: 'The server failed', ja: 'サーバーの障害' } },
        {
          value: 3,
          name: 'NXDOMAIN',
          meaning: { en: 'The name does not exist', ja: 'その名前は存在しない' },
        },
        { value: 4, name: 'NOTIMP', meaning: { en: 'Not implemented', ja: '未実装' } },
        { value: 5, name: 'REFUSED', meaning: { en: 'Refused by policy', ja: '方針により拒否' } },
      ],
      meaning: { en: 'The result of a response.', ja: '応答の結果。' },
      example: 0,
    },
    u16('qdcount', 'QDCOUNT', 'The number of questions.', '質問の数。', 1),
    u16('ancount', 'ANCOUNT', 'The number of answer records.', '回答レコードの数。', 0),
    u16('nscount', 'NSCOUNT', 'The number of authority records.', '権威レコードの数。', 0),
    u16('arcount', 'ARCOUNT', 'The number of additional records.', '追加レコードの数。', 0),
  ],
  sections: [
    {
      key: 'question',
      name: 'Question',
      countFrom: 'qdcount',
      meaning: { en: 'What is being asked.', ja: '問い合わせの中身。' },
      fields: [
        {
          key: 'qname',
          name: 'QNAME',
          type: 'domain-name',
          meaning: {
            en: 'The name asked for, as length-prefixed labels ending in a zero byte.',
            ja: '問い合わせる名前。長さ付きのラベルを並べ、0 のバイトで終わる。',
          },
          example: 'example.com',
        },
        {
          key: 'qtype',
          name: 'QTYPE',
          type: 'enum',
          bits: 16,
          values: RR_TYPES,
          meaning: { en: 'The record type asked for.', ja: '問い合わせるレコードの種類。' },
          example: 1,
        },
        {
          key: 'qclass',
          name: 'QCLASS',
          type: 'enum',
          bits: 16,
          values: CLASSES,
          meaning: {
            en: 'The class asked for, almost always IN.',
            ja: '問い合わせるクラス。ほぼ常に IN。',
          },
          example: 1,
        },
      ],
    },
    {
      key: 'answer',
      name: 'Answer',
      countFrom: 'ancount',
      meaning: { en: 'Records that answer the question.', ja: '質問に答えるレコード。' },
      fields: RESOURCE_RECORD,
    },
    {
      key: 'authority',
      name: 'Authority',
      countFrom: 'nscount',
      meaning: {
        en: 'Records naming the authoritative servers.',
        ja: '権威サーバーを示すレコード。',
      },
      fields: RESOURCE_RECORD,
    },
    {
      key: 'additional',
      name: 'Additional',
      countFrom: 'arcount',
      meaning: { en: 'Records that help use the answer.', ja: '回答を使うのに役立つレコード。' },
      fields: RESOURCE_RECORD,
    },
  ],
});

/**
 * Today's `DnsMessage` (A records only) as a pack header object (REQ-140). A
 * netlab DNS server answers only from its own zones (AA = 1) and does not
 * recurse (RA = 0); a response without an answer is NXDOMAIN.
 */
export function dnsMessageToValues(message: DnsMessage): HeaderValues {
  return {
    id: message.transactionId,
    qr: message.isResponse ? 1 : 0,
    opcode: 0,
    aa: message.isResponse ? 1 : 0,
    tc: 0,
    rd: 1,
    ra: 0,
    ad: 0,
    cd: 0,
    rcode: message.isResponse && message.answers.length === 0 ? 3 : 0,
    qdcount: message.questions.length,
    ancount: message.answers.length,
    nscount: 0,
    arcount: 0,
    question: message.questions.map((q) => ({ qname: q.name, qtype: 1, qclass: 1 })),
    answer: message.answers.map((a) => ({
      name: a.name,
      type: 1,
      class: 1,
      ttl: a.ttl,
      rdlength: 4,
      rdata: a.address.split('.').map(Number),
    })),
  };
}
