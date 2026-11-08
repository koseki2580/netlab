/**
 * VXLAN, the wire tier. RFC 7348 §5: an 8-byte header after UDP port 4789, then the
 * inner Ethernet frame.
 *
 *   |R|R|R|R|I|R|R|R|            Reserved                           |
 *   |                VXLAN Network Identifier (VNI) |   Reserved    |
 */
import { decapVxlan, encapVxlan } from '../../layers/l3-network/tunneling/VxlanEncap';
import type { HeaderValues, ProtocolBehaviour, ProtocolWire } from '../pack/types';
import { vxlanIdentity } from './identity';

export const vxlanWire: ProtocolWire = {
  ...vxlanIdentity,
  defaultVersion: 'rfc7348',
  versions: [{ id: 'rfc7348' }],
  behaviour: {
    encapsulation: { push: encapVxlan, pop: decapVxlan },
  } as unknown as ProtocolBehaviour,
  header: [
    { key: 'reservedFlags', name: 'Reserved (flags)', type: 'reserved', bits: 4 },
    { key: 'i', name: 'I (VNI valid)', type: 'flag' },
    { key: 'reservedFlags2', name: 'Reserved (flags)', type: 'reserved', bits: 3 },
    { key: 'reserved1', name: 'Reserved', type: 'reserved', bits: 24 },
    { key: 'vni', name: 'VNI', type: 'uint', bits: 24 },
    { key: 'reserved2', name: 'Reserved', type: 'reserved', bits: 8 },
  ],
};

export const vxlanToValues = (vni: number): HeaderValues => ({ i: 1, vni });
