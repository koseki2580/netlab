import { describe, expect, it } from 'vitest';
import { answerArpFromEvpnCache } from './ArpSuppression';

describe('EVPN ARP suppression', () => {
  it('answers locally when Type-2 cache has the requested IP', () => {
    expect(
      answerArpFromEvpnCache(
        [{ vni: 10000, mac: '02:00:00:00:00:0b', ip: '10.0.0.20', remoteVtepIp: '192.0.2.2' }],
        { vni: 10000, targetIp: '10.0.0.20' },
      ),
    ).toEqual({ action: 'reply', mac: '02:00:00:00:00:0b', remoteVtepIp: '192.0.2.2' });
  });
});
