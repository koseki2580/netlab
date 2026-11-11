import type { ProtocolIdentity } from '../pack/types';

/** MPLS as the index knows it before its wire tier loads (RFC 3031, RFC 3032). */
export const mplsIdentity: ProtocolIdentity = {
  id: 'mpls',
  name: {
    short: 'MPLS',
    en: 'Multiprotocol Label Switching',
    ja: 'マルチプロトコル・ラベル・スイッチング',
  },
  layer: 'L2',
  numbers: { etherType: 0x8847 },
};
