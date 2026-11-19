/** REQ-391 — site-to-site VPNs: GRE, IPsec ESP tunnel mode, WireGuard (TC-1950..TC-1958). */
import { describe, expect, it } from 'vitest';
import {
  DESTINATIONS,
  INNER_SRC,
  ipsecDecision,
  maxInner,
  observerView,
  wireguardDecision,
  wrap,
} from './vpnTunnel';

describe('TC-1950: without a tunnel the private packet is not routed; GRE adds 24 bytes', () => {
  it('no tunnel adds nothing but cannot cross the internet', () => {
    expect(wrap('none', 1500, 1500)).toMatchObject({ overhead: 0, outer: 1500, routable: false });
  });
  it('GRE: 20 outer IPv4 + 4 GRE, so the largest inner packet on a 1500-byte path is 1476', () => {
    expect(wrap('gre', 1400, 1500)).toMatchObject({ overhead: 24, outer: 1424, fits: true });
    expect(maxInner('gre', 1500)).toBe(1476);
    expect(wrap('gre', 1500, 1500)).toMatchObject({ outer: 1524, fits: false });
  });
});

describe('TC-1951: ESP tunnel mode with AES-GCM adds 54 bytes plus padding to 4', () => {
  it('a 1400-byte inner packet gets 2 bytes of padding: 56 bytes of overhead, 1456 on the wire', () => {
    expect(wrap('ipsec', 1400, 1500)).toMatchObject({
      padding: 2,
      overhead: 56,
      outer: 1456,
      fits: true,
    });
  });
  it('the largest inner packet on a 1500-byte path is 1446; 1447 no longer fits', () => {
    expect(maxInner('ipsec', 1500)).toBe(1446);
    expect(wrap('ipsec', 1446, 1500)).toMatchObject({ padding: 0, outer: 1500, fits: true });
    expect(wrap('ipsec', 1447, 1500).fits).toBe(false);
    expect(wrap('ipsec', 1500, 1500)).toMatchObject({ outer: 1556, fits: false });
  });
});

describe('TC-1952: WireGuard adds 60 bytes and pads to 16, never past its MTU', () => {
  it('the largest inner packet on a 1500-byte path is 1440', () => {
    expect(maxInner('wireguard', 1500)).toBe(1440);
    expect(wrap('wireguard', 1440, 1500)).toMatchObject({ padding: 0, outer: 1500, fits: true });
  });
  it('a 100-byte packet is padded to 112: 72 bytes of overhead; 1430 is padded only to 1440', () => {
    expect(wrap('wireguard', 100, 1500)).toMatchObject({ padding: 12, overhead: 72, outer: 172 });
    expect(wrap('wireguard', 1430, 1500)).toMatchObject({ padding: 10, outer: 1500 });
  });
  it('a full 1500-byte LAN packet becomes 1560 bytes and does not fit', () => {
    expect(wrap('wireguard', 1500, 1500)).toMatchObject({ outer: 1560, fits: false });
  });
});

describe('TC-1953: a smaller path MTU (PPPoE, 1492) lowers every maximum by 8', () => {
  it('GRE 1468, ESP 1438, WireGuard 1432', () => {
    expect([maxInner('gre', 1492), maxInner('ipsec', 1492), maxInner('wireguard', 1492)]).toEqual([
      1468, 1438, 1432,
    ]);
  });
});

describe('TC-1954: segments add up to the packet on the wire', () => {
  it('for every method the segment bytes sum to the outer size', () => {
    for (const method of ['none', 'gre', 'ipsec', 'wireguard'] as const) {
      const wrapped = wrap(method, 777, 1500);
      expect(wrapped.segments.reduce((sum, segment) => sum + segment.bytes, 0)).toBe(wrapped.outer);
    }
  });
});

describe('TC-1955: what an observer on the internet can read', () => {
  it('GRE hides nothing: the inner addresses, ports and data are readable', () => {
    expect(observerView('gre')).toMatchObject({
      publicAddresses: true,
      innerAddresses: true,
      innerPorts: true,
      data: true,
    });
  });
  it('ESP and WireGuard show only the public addresses and their own header', () => {
    for (const method of ['ipsec', 'wireguard'] as const) {
      expect(observerView(method)).toEqual({
        publicAddresses: true,
        innerAddresses: false,
        innerPorts: false,
        data: false,
        tunnelId: true,
        tamperDetected: true,
      });
    }
  });
});

describe('TC-1956: only the encrypting methods detect a change made on the path', () => {
  it('GRE does not; ESP (ICV) and WireGuard (Poly1305 tag) do', () => {
    expect(
      ['gre', 'ipsec', 'wireguard'].map((m) => observerView(m as 'gre').tamperDetected),
    ).toEqual([false, true, true]);
  });
});

describe('TC-1957: IPsec protects only what its traffic selectors match', () => {
  it('10.2/16 to B, 10.3/16 to C, anything else leaves unprotected', () => {
    expect(DESTINATIONS.map((dst) => ipsecDecision(INNER_SRC, dst))).toEqual([
      { action: 'protect', peer: 'B' },
      { action: 'protect', peer: 'C' },
      { action: 'bypass' },
      { action: 'bypass' },
    ]);
  });
  it('a source outside the local selector is not protected either', () => {
    expect(ipsecDecision('10.9.0.1', '10.2.0.20')).toEqual({ action: 'bypass' });
  });
});

describe('TC-1958: WireGuard sends through the peer whose AllowedIPs contain the destination', () => {
  it('10.2.0.20 to B, 10.3.1.7 to C, 10.4.0.9 has no peer and is dropped, 192.0.2.80 is not tunnelled', () => {
    expect(DESTINATIONS.map((dst) => wireguardDecision(dst))).toEqual([
      { action: 'peer', peer: 'B' },
      { action: 'peer', peer: 'C' },
      { action: 'no-peer' },
      { action: 'not-tunnelled' },
    ]);
  });
});
