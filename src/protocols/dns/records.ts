/**
 * DNS records beyond A, on the wire (RFC 1035 §3.3, RFC 3596): their RDATA and
 * how a message carrying them, its authority and additional sections and its
 * flags become header values. Installed into the wire tier (`setDnsRecordCodec`)
 * where such messages can appear: with the resolver, and in the page that
 * shows packets. Until then the wire tier writes the earlier A-only answers.
 */
import type { DnsMessage, DnsRecord } from '../../types/packets';
import { canonicalizeIpv6, parseIpv6 } from '../../utils/ipv6';
import type { FieldValue, HeaderValues } from '../pack/types';
import { setDnsRecordCodec } from './wire';

/** Labels as RFC 1035 §3.1 writes them, uncompressed; the root is one zero byte. */
function nameBytes(name: string): number[] {
  const labels = name
    .replace(/\.$/, '')
    .split('.')
    .filter((label) => label !== '');
  return [
    ...labels.flatMap((label) => [label.length, ...[...label].map((ch) => ch.charCodeAt(0))]),
    0,
  ];
}

/** The name written as labels from `offset` (SOA RDATA is shown as bytes). */
function readName(bytes: readonly number[], offset: number): string {
  const labels: string[] = [];
  for (let at = offset; (bytes[at] ?? 0) > 0; at += (bytes[at] ?? 0) + 1) {
    labels.push(String.fromCharCode(...bytes.slice(at + 1, at + 1 + (bytes[at] ?? 0))));
  }
  return labels.join('.') || '.';
}

function rdataText(value: FieldValue, siblings: HeaderValues): string {
  const bytes = value as readonly number[];
  const type = siblings['type'];
  if (type === 1 && bytes.length === 4) return bytes.join('.');
  if (type === 28 && bytes.length === 16) {
    const hextets = Array.from({ length: 8 }, (_, i) =>
      (((bytes[i * 2] ?? 0) << 8) | (bytes[i * 2 + 1] ?? 0)).toString(16),
    );
    return canonicalizeIpv6(hextets.join(':'));
  }
  if (type === 2 || type === 5) return readName(bytes, 0);
  if (type === 15 && bytes.length > 2) {
    return `${((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0)} ${readName(bytes, 2)}`;
  }
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

const TYPE_CODE: Readonly<Record<DnsRecord['type'], number>> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  AAAA: 28,
};

const u16Bytes = (value: number) => [(value >> 8) & 0xff, value & 0xff];
const u32Bytes = (value: number) => [...u16Bytes(value >>> 16), ...u16Bytes(value & 0xffff)];
/** SERIAL 1, REFRESH 7200, RETRY 3600, EXPIRE 1209600, as four 32-bit numbers. */
const SOA_TIMERS = [0, 0, 0, 1, 0, 0, 28, 32, 0, 0, 14, 16, 0, 18, 117, 0];

/**
 * RDATA by type (RFC 1035 §3.3, RFC 3596). An SOA carries only its primary
 * server and MINIMUM here; the mailbox, serial and timers are fixed values.
 */
function rdataOf(record: DnsRecord): number[] {
  switch (record.type) {
    case 'A':
      return record.address.split('.').map(Number);
    case 'AAAA':
      return parseIpv6(record.address).hextets.flatMap(u16Bytes);
    case 'NS':
    case 'CNAME':
      return nameBytes(record.address);
    case 'MX':
      return [...u16Bytes(record.preference ?? 0), ...nameBytes(record.address)];
    case 'SOA':
      return [
        ...nameBytes(record.address),
        ...nameBytes(record.name ? `hostmaster.${record.name}` : 'hostmaster'),
        ...SOA_TIMERS,
        ...u32Bytes(record.minimum ?? record.ttl),
      ];
  }
}

function recordValues(record: DnsRecord): HeaderValues {
  const rdata = rdataOf(record);
  return {
    name: record.name,
    type: TYPE_CODE[record.type],
    class: 1,
    ttl: record.ttl,
    rdlength: rdata.length,
    rdata,
  };
}

/**
 * A `DnsMessage` as a header object (REQ-140). A message that does not say
 * otherwise is an earlier netlab answer: from its own zones (AA = 1) to a
 * query that wanted recursion (RD = 1), with no recursion offered (RA = 0), and
 * NXDOMAIN when it has no answer. The resolution chain sets each flag itself.
 */
function messageValues(message: DnsMessage): HeaderValues {
  const response = message.isResponse ? 1 : 0;
  const bit = (value: boolean | undefined, fallback: number) =>
    value === undefined ? fallback : value ? 1 : 0;
  const authority = message.authority ?? [];
  const additional = message.additional ?? [];
  return {
    id: message.transactionId,
    qr: response,
    opcode: 0,
    aa: bit(message.authoritative, response),
    tc: 0,
    rd: bit(message.recursionDesired, 1),
    ra: bit(message.recursionAvailable, 0),
    ad: 0,
    cd: 0,
    rcode: message.rcode ?? (message.isResponse && message.answers.length === 0 ? 3 : 0),
    qdcount: message.questions.length,
    ancount: message.answers.length,
    nscount: authority.length,
    arcount: additional.length,
    question: message.questions.map((q) => ({
      qname: q.name,
      qtype: TYPE_CODE[q.type],
      qclass: 1,
    })),
    answer: message.answers.map(recordValues),
    ...(authority.length > 0 ? { authority: authority.map(recordValues) } : {}),
    ...(additional.length > 0 ? { additional: additional.map(recordValues) } : {}),
  };
}

/** Puts the full record set into the wire tier; safe to call more than once. */
export function installDnsRecords(): void {
  setDnsRecordCodec({ values: messageValues, rdata: rdataText });
}
