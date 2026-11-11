/**
 * MPLS, the wire tier. RFC 3032 §2.1: the label stack, one 4-byte entry per label,
 * top first, between the Ethernet header (EtherType 0x8847) and the IP packet.
 *
 *   |                Label                  | TC  |S|       TTL     |
 */
import { registerMplsCodec } from '../../utils/packetLayout';
import type { MplsLabel } from '../../types/tunneling';
import type { HeaderValues, ProtocolWire } from '../pack/types';
import { deriveLayout } from '../pack/wire';
import { mplsIdentity } from './identity';

export const mplsWire: ProtocolWire = {
  ...mplsIdentity,
  defaultVersion: 'rfc3032',
  versions: [{ id: 'rfc3032' }],
  header: [],
  sections: [
    {
      key: 'stack',
      name: 'Label Stack',
      fields: [
        { key: 'label', name: 'Label', type: 'uint', bits: 20 },
        { key: 'tc', name: 'TC', type: 'uint', bits: 3 },
        { key: 's', name: 'S (bottom of stack)', type: 'flag' },
        { key: 'ttl', name: 'TTL', type: 'uint', bits: 8 },
      ],
    },
  ],
};

export const mplsToValues = (stack: readonly MplsLabel[]): HeaderValues => ({
  stack: stack.map((entry) => ({
    label: entry.label,
    tc: entry.tc,
    s: entry.endOfStack ? 1 : 0,
    ttl: entry.ttl,
  })),
});

registerMplsCodec((stack) => deriveLayout(mplsWire, mplsToValues(stack)).bytes);
