import type { ProtocolIdentity } from '../pack/types';

/** Neighbour Discovery as the index knows it before its wire tier loads (RFC 4861). */
export const ndIdentity: ProtocolIdentity = {
  id: 'nd',
  name: { short: 'ND', en: 'Neighbor Discovery', ja: '近隣探索' },
  layer: 'L3',
  numbers: { icmpTypes: { v6: [133, 134, 135, 136] } },
};
