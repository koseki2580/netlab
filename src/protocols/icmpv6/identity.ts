import type { ProtocolIdentity } from '../pack/types';

/** ICMPv6 as the index knows it before its wire tier loads (RFC 4443). */
export const icmpv6Identity: ProtocolIdentity = {
  id: 'icmpv6',
  name: {
    short: 'ICMPv6',
    en: 'Internet Control Message Protocol for IPv6',
    ja: 'IPv6 用インターネット制御メッセージプロトコル',
  },
  layer: 'L3',
  numbers: { ipProtocol: 58 },
};
