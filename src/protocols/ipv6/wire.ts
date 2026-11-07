/**
 * IPv6, the wire tier. RFC 8200 §3, the 40-byte fixed header. Extension headers are
 * not modelled. The engine writes these bytes with its own builder (packetLayout),
 * pinned to this tier by TC-1266; the views read the rows from here.
 *
 *   |Version| Traffic Class |           Flow Label                  |
 *   |         Payload Length        |  Next Header  |   Hop Limit   |
 *   |                  Source Address (128)                         |
 *   |               Destination Address (128)                       |
 */
import type { ProtocolWire } from '../pack/types';
import { ipv6Identity } from './identity';

export const ipv6Wire: ProtocolWire = {
  ...ipv6Identity,
  defaultVersion: 'rfc8200',
  versions: [{ id: 'rfc8200' }],
  header: [
    { key: 'version', name: 'Version', type: 'uint', bits: 4 },
    { key: 'trafficClass', name: 'Traffic Class', type: 'uint', bits: 8, hex: true },
    { key: 'flowLabel', name: 'Flow Label', type: 'uint', bits: 20, hex: true },
    { key: 'payloadLength', name: 'Payload Length', type: 'uint', bits: 16 },
    {
      key: 'nextHeader',
      name: 'Next Header',
      type: 'enum',
      bits: 8,
      values: [
        { value: 0, name: 'Hop-by-Hop Options' },
        { value: 6, name: 'TCP' },
        { value: 17, name: 'UDP' },
        { value: 43, name: 'Routing' },
        { value: 44, name: 'Fragment' },
        { value: 58, name: 'ICMPv6' },
        { value: 59, name: 'No Next Header' },
        { value: 60, name: 'Destination Options' },
      ],
    },
    { key: 'hopLimit', name: 'Hop Limit', type: 'uint', bits: 8 },
    { key: 'source', name: 'Source Address', type: 'ipv6' },
    { key: 'destination', name: 'Destination Address', type: 'ipv6' },
  ],
};

export { ipv6ToValues } from './values';
