/**
 * ICMPv6, the wire tier. RFC 4443 §2.1 (type, code, checksum) and §4.1–4.2 (echo).
 * Types 133–136 belong to the Neighbour Discovery pack. The checksum covers the
 * IPv6 pseudo-header (RFC 4443 §2.3, RFC 8200 §8.1) and is computed, not stubbed.
 */
import type { Icmpv6Message, Ipv6Packet } from '../../types/packets';
import { computeIpv4Checksum } from '../../utils/checksum';
import { parseIpv6 } from '../../utils/ipv6';
import { ndToValues, ndWire } from '../nd/wire';
import { icmpv6Identity } from './identity';
import type { HeaderValues, ProtocolWire } from '../pack/types';
import { deriveLayout } from '../pack/wire';

const ECHO = { field: 'type', values: [128, 129] };

export const icmpv6Wire: ProtocolWire = {
  ...icmpv6Identity,
  defaultVersion: 'rfc4443',
  versions: [{ id: 'rfc4443' }],
  label: { field: 'type' },
  header: [
    {
      key: 'type',
      name: 'Type',
      type: 'enum',
      bits: 8,
      values: [
        { value: 1, name: 'Destination Unreachable' },
        { value: 2, name: 'Packet Too Big' },
        { value: 3, name: 'Time Exceeded' },
        { value: 4, name: 'Parameter Problem' },
        { value: 128, name: 'Echo Request' },
        { value: 129, name: 'Echo Reply' },
      ],
    },
    { key: 'code', name: 'Code', type: 'uint', bits: 8 },
    { key: 'checksum', name: 'Checksum', type: 'uint', bits: 16, hex: true },
    { key: 'identifier', name: 'Identifier', type: 'uint', bits: 16, when: ECHO },
    { key: 'sequence', name: 'Sequence Number', type: 'uint', bits: 16, when: ECHO },
    { key: 'body', name: 'Message Body', type: 'bytes' },
  ],
};

const isNd = (type: number) => type >= 133 && type <= 136;

/** The wire tier that writes this message: ND for 133–136, ICMPv6 otherwise. */
export const icmpv6WireFor = (message: Icmpv6Message): ProtocolWire =>
  isNd(message.type) ? ndWire : icmpv6Wire;

function toValues(message: Icmpv6Message, checksum: number): HeaderValues {
  if (isNd(message.type)) return ndToValues(message, checksum);
  return {
    type: message.type,
    code: message.code,
    checksum,
    identifier: message.identifier ?? 0,
    sequence: message.sequenceNumber ?? 0,
    body: Array.from(message.data ?? '', (char) => char.charCodeAt(0) & 0xff),
  };
}

const address = (ip: string) => parseIpv6(ip).hextets.flatMap((h) => [h >> 8, h & 0xff]);

/** RFC 4443 §2.3: the one's complement sum over the pseudo-header and the message. */
export function icmpv6Checksum(src: string, dst: string, message: readonly number[]): number {
  const n = message.length;
  const pseudo = [
    ...address(src),
    ...address(dst),
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
    0,
    0,
    0,
    58,
  ];
  return computeIpv4Checksum([...pseudo, ...message]);
}

/** The ICMPv6 message of an IPv6 packet, as values with its checksum computed (REQ-322). */
export function icmpv6Values(ip: Ipv6Packet & { payload: Icmpv6Message }): HeaderValues {
  const wire = icmpv6WireFor(ip.payload);
  const unsummed = deriveLayout(wire, toValues(ip.payload, 0)).bytes;
  return toValues(ip.payload, icmpv6Checksum(ip.srcIp, ip.dstIp, unsummed));
}

export function icmpv6MessageBytes(ip: Ipv6Packet & { payload: Icmpv6Message }): number[] {
  return deriveLayout(icmpv6WireFor(ip.payload), icmpv6Values(ip)).bytes;
}

/** What `packetLayout` and the views use once this tier has loaded (REQ-322). */
export const icmpv6Codec = {
  bytes: icmpv6MessageBytes,
  values: icmpv6Values,
  wireFor: icmpv6WireFor,
};
