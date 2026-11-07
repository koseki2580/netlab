import type { ProtocolIdentity } from '../pack/types';

/** IPv6 as the index knows it before its wire tier loads (RFC 8200). */
export const ipv6Identity: ProtocolIdentity = {
  id: 'ipv6',
  name: { short: 'IPv6', en: 'Internet Protocol version 6', ja: 'インターネットプロトコル第 6 版' },
  layer: 'L3',
  numbers: { etherType: 0x86dd },
};
