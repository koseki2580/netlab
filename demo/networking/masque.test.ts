/** REQ-379 — MASQUE: who learns what, read from the layers a proxy chain adds (TC-1850..TC-1852). */
import { describe, expect, it } from 'vitest';
import { anyoneLinks, knows, segments } from './masque';

describe('TC-1850: going direct, the café’s Wi-Fi learns both who you are and which site', () => {
  it('the Wi-Fi sees your address and the site’s; only the site reads the request', () => {
    expect(knows('direct', 'wifi')).toEqual({ clientIp: true, site: true, content: false });
    expect(knows('direct', 'site')).toEqual({ clientIp: true, site: true, content: true });
    expect(anyoneLinks('direct')).toBe('wifi');
  });
});

describe('TC-1851: one proxy hides the site from the Wi-Fi and you from the site, but it knows both', () => {
  it('the proxy links you and the site; the site sees only the proxy’s address', () => {
    expect(knows('one-proxy', 'wifi')).toEqual({ clientIp: true, site: false, content: false });
    expect(knows('one-proxy', 'relay2')).toEqual({ clientIp: true, site: true, content: false });
    expect(knows('one-proxy', 'site')).toEqual({ clientIp: false, site: true, content: true });
    expect(anyoneLinks('one-proxy')).toBe('relay2');
  });
});

describe('TC-1852: with two relays nobody but you knows both', () => {
  it('the ingress knows you, the egress knows the site, neither reads the request', () => {
    expect(knows('two-hop', 'relay1')).toEqual({ clientIp: true, site: false, content: false });
    expect(knows('two-hop', 'relay2')).toEqual({ clientIp: false, site: true, content: false });
    expect(knows('two-hop', 'site').clientIp).toBe(false);
    expect(anyoneLinks('two-hop')).toBeNull();
  });
  it('each stretch is sent from the previous hop’s own address', () => {
    expect(segments('two-hop').map((s) => `${s.srcIp}>${s.dstIp}`)).toEqual([
      '192.0.2.10>198.51.100.7',
      '198.51.100.7>203.0.113.9',
      '203.0.113.9>203.0.113.80',
    ]);
  });
});
