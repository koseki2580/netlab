/** REQ-386 — Happy Eyeballs v2 and NAT64/DNS64 (TC-1900..TC-1902). */
import { describe, expect, it } from 'vitest';
import { embeddedIpv4, happyEyeballs, oneAtATime, synthesize, translate } from './happyEyeballs';

describe('TC-1900: Happy Eyeballs connects over IPv4 250 ms after a silent IPv6 path', () => {
  it('working IPv6 wins at 20 ms; broken IPv6 → IPv4 at 280 ms; slow IPv6 (300 ms) loses to IPv4 at 280 ms', () => {
    expect(happyEyeballs('v6-ok')).toEqual({ family: 'IPv6', connectedMs: 20 });
    expect(happyEyeballs('v6-broken')).toEqual({ family: 'IPv4', connectedMs: 280 });
    expect(happyEyeballs('v6-slow')).toEqual({ family: 'IPv4', connectedMs: 280 });
  });
});

describe('TC-1901: a client that tries one address at a time waits out the dead one', () => {
  it('broken IPv6 costs it 21 s before IPv4; slow IPv6 keeps it on IPv6 at 300 ms', () => {
    expect(oneAtATime('v6-broken')).toEqual({ family: 'IPv4', connectedMs: 21_030 });
    expect(oneAtATime('v6-slow')).toEqual({ family: 'IPv6', connectedMs: 300 });
  });
});

describe('TC-1902: DNS64 embeds the IPv4 address in 64:ff9b::/96, and the NAT64 takes it back out', () => {
  it('192.0.2.33 → 64:ff9b::c000:221, 198.51.100.7 → 64:ff9b::c633:6407, and back', () => {
    expect(synthesize('192.0.2.33')).toBe('64:ff9b::c000:221');
    expect(synthesize('198.51.100.7')).toBe('64:ff9b::c633:6407');
    for (const ip of ['192.0.2.33', '198.51.100.7', '203.0.113.255', '8.8.8.8']) {
      expect(embeddedIpv4(synthesize(ip))).toBe(ip);
    }
  });
  it('the packet leaves the NAT64 from its IPv4 pool address to the site’s IPv4 address', () => {
    expect(translate('192.0.2.33')).toEqual({
      v6: { src: '2001:db8:1::10', dst: '64:ff9b::c000:221' },
      v4: { src: '203.0.113.1', dst: '192.0.2.33' },
    });
  });
});
