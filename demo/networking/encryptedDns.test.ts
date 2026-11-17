/** REQ-384 — encrypted DNS: what the network can read and do, per method (TC-1880, TC-1881). */
import { describe, expect, it } from 'vitest';
import { METHODS, networkCan, TRANSPORT } from './encryptedDns';

describe('TC-1880: classic DNS can be read and forged; every encrypted method cannot', () => {
  it('UDP 53 shows the name and accepts a forged answer; DoT, DoH and DoQ do neither', () => {
    expect(networkCan('do53')).toMatchObject({ readName: true, forgeAnswer: true });
    for (const method of ['dot', 'doh', 'doq'] as const) {
      expect(networkCan(method)).toMatchObject({ readName: false, forgeAnswer: false });
    }
  });
});

describe('TC-1881: DoT and DoQ can be blocked by port 853; DoH looks like any HTTPS', () => {
  it('only DoH shares its port with the web', () => {
    expect(TRANSPORT.dot).toMatchObject({ proto: 'tcp', port: 853 });
    expect(TRANSPORT.doq).toMatchObject({ proto: 'udp', port: 853 });
    expect(METHODS.filter((m) => !networkCan(m).blockByPortAlone)).toEqual(['doh']);
  });
});
