import type { ProtocolIdentity } from '../pack/types';

/** VXLAN as the index knows it before its wire tier loads (RFC 7348). */
export const vxlanIdentity: ProtocolIdentity = {
  id: 'vxlan',
  name: { short: 'VXLAN', en: 'Virtual eXtensible Local Area Network', ja: '仮想拡張 LAN' },
  layer: 'L2',
  numbers: { ports: [{ transport: 'udp', port: 4789 }] },
};
