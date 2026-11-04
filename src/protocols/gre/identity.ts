import type { ProtocolIdentity } from '../pack/types';

/** GRE as the index knows it before its wire tier loads (REQ-312). */
export const greIdentity: ProtocolIdentity = {
  id: 'gre',
  name: { short: 'GRE', en: 'Generic Routing Encapsulation', ja: '汎用ルーティングカプセル化' },
  layer: 'L3',
  numbers: { ipProtocol: 47 },
};
