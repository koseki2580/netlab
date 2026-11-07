/**
 * DNS, the wire tier. RFC 1035 §4.1 (header, question, resource record); RFC 4035
 * §3.2 (AD and CD take two of the three Z bits). The text is in ./pack-dns.
 *
 *   |                      ID                       |
 *   |QR|   Opcode  |AA|TC|RD|RA| Z|AD|CD|   RCODE   |   (RFC 1035: Z is 3 bits)
 *   |        QDCOUNT, ANCOUNT, NSCOUNT, ARCOUNT     |
 */
import type { DnsMessage } from '../../types/packets';
import type { EnumValue, FieldValue, HeaderValues, ProtocolWire, WireField } from '../pack/types';

const named = (...names: (readonly [number, string])[]): readonly EnumValue[] =>
  names.map(([value, name]) => ({ value, name }));

const RR_TYPES = named(
  [1, 'A'],
  [2, 'NS'],
  [5, 'CNAME'],
  [6, 'SOA'],
  [12, 'PTR'],
  [15, 'MX'],
  [16, 'TXT'],
  [28, 'AAAA'],
);
const CLASSES = named([1, 'IN'], [3, 'CH'], [4, 'HS']);

const u16 = (key: string): WireField => ({
  key,
  name: key.toUpperCase(),
  type: 'uint',
  bits: 16,
});
const flag = (key: string, only?: string): WireField => ({
  key,
  name: key.toUpperCase(),
  type: 'flag',
  ...(only ? { in: [only] } : {}),
});
const enumerated = (key: string, bits: number, values: readonly EnumValue[]): WireField => ({
  key,
  name: key.toUpperCase(),
  type: 'enum',
  bits,
  values,
});
const reservedZ = (bits: number, version: string): WireField => ({
  key: 'z',
  name: 'Z',
  type: 'reserved',
  bits,
  in: [version],
});

/** The full record set, once installed (`./records`). */
let records: {
  readonly values: (message: DnsMessage) => HeaderValues;
  readonly rdata: (value: FieldValue, siblings: HeaderValues) => string;
} | null = null;

export function setDnsRecordCodec(codec: NonNullable<typeof records>): void {
  records = codec;
}

function formatRdata(value: FieldValue, siblings: HeaderValues): string {
  if (records) return records.rdata(value, siblings);
  const bytes = value as readonly number[];
  if (siblings['type'] === 1 && bytes.length === 4) return bytes.join('.');
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

const RESOURCE_RECORD: readonly WireField[] = [
  { key: 'name', name: 'NAME', type: 'domain-name' },
  enumerated('type', 16, RR_TYPES),
  enumerated('class', 16, CLASSES),
  { key: 'ttl', name: 'TTL', type: 'uint', bits: 32 },
  u16('rdlength'),
  { key: 'rdata', name: 'RDATA', type: 'bytes', lengthFrom: 'rdlength', format: formatRdata },
];

export const dnsWire: ProtocolWire = {
  id: 'dns',
  name: { short: 'DNS', en: 'Domain Name System', ja: 'ドメインネームシステム' },
  layer: 'L7',
  numbers: {
    ports: [
      { transport: 'udp', port: 53 },
      { transport: 'tcp', port: 53 },
    ],
  },
  defaultVersion: 'rfc4035',
  versions: [{ id: 'rfc1035' }, { id: 'rfc4035' }],
  label: { field: 'qr' },
  header: [
    { key: 'id', name: 'ID', type: 'uint', bits: 16, hex: true },
    enumerated('qr', 1, named([0, 'QUERY'], [1, 'RESPONSE'])),
    enumerated(
      'opcode',
      4,
      named([0, 'QUERY'], [1, 'IQUERY'], [2, 'STATUS'], [4, 'NOTIFY'], [5, 'UPDATE']),
    ),
    flag('aa'),
    flag('tc'),
    flag('rd'),
    flag('ra'),
    reservedZ(3, 'rfc1035'),
    reservedZ(1, 'rfc4035'),
    flag('ad', 'rfc4035'),
    flag('cd', 'rfc4035'),
    enumerated(
      'rcode',
      4,
      named(
        [0, 'NOERROR'],
        [1, 'FORMERR'],
        [2, 'SERVFAIL'],
        [3, 'NXDOMAIN'],
        [4, 'NOTIMP'],
        [5, 'REFUSED'],
      ),
    ),
    u16('qdcount'),
    u16('ancount'),
    u16('nscount'),
    u16('arcount'),
  ],
  sections: [
    {
      key: 'question',
      name: 'Question',
      countFrom: 'qdcount',
      fields: [
        { key: 'qname', name: 'QNAME', type: 'domain-name' },
        enumerated('qtype', 16, RR_TYPES),
        enumerated('qclass', 16, CLASSES),
      ],
    },
    { key: 'answer', name: 'Answer', countFrom: 'ancount', fields: RESOURCE_RECORD },
    { key: 'authority', name: 'Authority', countFrom: 'nscount', fields: RESOURCE_RECORD },
    { key: 'additional', name: 'Additional', countFrom: 'arcount', fields: RESOURCE_RECORD },
  ],
};

/**
 * A `DnsMessage` as a header object (REQ-140): A records only, unless the full
 * record set is installed (`./records`). A netlab DNS server
 * answers only from its own zones (AA = 1) and does not recurse (RA = 0); a response
 * without an answer is NXDOMAIN.
 */
export function dnsMessageToValues(message: DnsMessage): HeaderValues {
  if (records) return records.values(message);
  const response = message.isResponse ? 1 : 0;
  return {
    id: message.transactionId,
    qr: response,
    opcode: 0,
    aa: response,
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
