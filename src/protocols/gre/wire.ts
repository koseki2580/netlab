/**
 * GRE, the wire tier. RFC 2784 §2 and RFC 2890 §2:
 *
 *   |C| |K|S| Reserved0       | Ver |         Protocol Type         |   (RFC 2890)
 *   |C|       Reserved0       | Ver |         Protocol Type         |   (RFC 2784)
 *   |      Checksum (optional)      |       Reserved1 (Optional)    |
 *   |                         Key (optional)                        |
 *   |                 Sequence Number (Optional)                    |
 */
import { decapGre, encapGre } from '../../layers/l3-network/tunneling/GreEncap';
import type { GreHeader } from '../../types/tunneling';
import { greIdentity } from './identity';
import type { HeaderValues, ProtocolBehaviour, ProtocolWire } from '../pack/types';

const V2890 = ['rfc2890'];

export const greWire: ProtocolWire = {
  ...greIdentity,
  defaultVersion: 'rfc2890',
  versions: [{ id: 'rfc2784' }, { id: 'rfc2890' }],
  behaviour: { encapsulation: { push: encapGre, pop: decapGre } } as unknown as ProtocolBehaviour,
  header: [
    { key: 'c', name: 'Checksum Present', type: 'flag' },
    { key: 'reserved0', name: 'Reserved0', type: 'reserved', bits: 12, in: ['rfc2784'] },
    { key: 'reserved0a', name: 'Reserved0 (bit 1)', type: 'reserved', bits: 1, in: V2890 },
    { key: 'k', name: 'Key Present', type: 'flag', in: V2890 },
    { key: 's', name: 'Sequence Number Present', type: 'flag', in: V2890 },
    { key: 'reserved0', name: 'Reserved0', type: 'reserved', bits: 9, in: V2890 },
    {
      key: 'ver',
      name: 'Version Number',
      type: 'enum',
      bits: 3,
      values: [
        { value: 0, name: 'GRE' },
        { value: 1, name: 'Enhanced GRE' },
      ],
    },
    {
      key: 'protocolType',
      name: 'Protocol Type',
      type: 'enum',
      bits: 16,
      hex: true,
      values: [
        { value: 0x0800, name: 'IPv4' },
        { value: 0x86dd, name: 'IPv6' },
        { value: 0x6558, name: 'Transparent Ethernet Bridging' },
      ],
    },
    { key: 'checksum', name: 'Checksum', type: 'uint', bits: 16, hex: true, presentIf: 'c' },
    { key: 'reserved1', name: 'Reserved1', type: 'reserved', bits: 16, presentIf: 'c' },
    { key: 'key', name: 'Key', type: 'uint', bits: 32, presentIf: 'k', in: V2890 },
    { key: 'sequence', name: 'Sequence Number', type: 'uint', bits: 32, presentIf: 's', in: V2890 },
  ],
};

/** A `GreHeader` (src/types/tunneling.ts) as a header object. */
export function greHeaderToValues(header: GreHeader): HeaderValues {
  return {
    c: header.hasChecksum ? 1 : 0,
    k: header.hasKey ? 1 : 0,
    s: header.hasSequence ? 1 : 0,
    ver: header.version,
    protocolType: header.protocolType,
    ...(header.hasChecksum ? { checksum: header.checksum ?? 0 } : {}),
    ...(header.hasKey ? { key: header.key ?? 0 } : {}),
    ...(header.hasSequence ? { sequence: header.sequence ?? 0 } : {}),
  };
}
