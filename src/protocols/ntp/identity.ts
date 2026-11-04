import type { ProtocolIdentity } from '../pack/types';

/** NTP as the index knows it before its wire tier loads (RFC 5905). */
export const ntpIdentity: ProtocolIdentity = {
  id: 'ntp',
  name: { short: 'NTP', en: 'Network Time Protocol', ja: 'ネットワーク時刻プロトコル' },
  layer: 'L7',
  numbers: { ports: [{ transport: 'udp', port: 123 }] },
};
