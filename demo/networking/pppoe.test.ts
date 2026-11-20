/** REQ-410 — PPPoE, the 1492 MTU, MSS clamping and IPoE (TC-2140..TC-2147). */
import { describe, expect, it } from 'vitest';
import {
  BROADCAST_MAC,
  CONCENTRATORS,
  HOST_MAC,
  accessOverhead,
  accessSummary,
  discovery,
  linkMtu,
  mssFor,
  pppSession,
  transfer,
} from './pppoe';

describe('TC-2140: PPPoE adds 8 bytes, so the link carries 1492-byte packets and MSS 1452', () => {
  it('6-byte PPPoE header + 2-byte PPP protocol = 8; 1500 − 8 = 1492; 1492 − 40 = 1452', () => {
    expect(accessOverhead('pppoe')).toBe(8);
    expect(linkMtu('pppoe')).toBe(1492);
    expect(mssFor(linkMtu('pppoe'))).toBe(1452);
    expect(mssFor(1500)).toBe(1460);
  });
});

describe('TC-2141: discovery is PADI broadcast, a PADO from each AC, PADR and PADS to the chosen one', () => {
  it('the chosen AC returns the session ID in the PADS; all else carries session 0', () => {
    const steps = discovery(CONCENTRATORS, 1, 0x2a17);
    expect(steps.map((s) => s.code)).toEqual(['PADI', 'PADO', 'PADO', 'PADR', 'PADS']);
    expect(steps.map((s) => s.codeValue)).toEqual([0x09, 0x07, 0x07, 0x19, 0x65]);
    expect(steps[0]).toMatchObject({ dst: BROADCAST_MAC, broadcast: true, ethertype: 0x8863 });
    expect(steps.slice(1).every((s) => !s.broadcast)).toBe(true);
    expect(steps[3]).toMatchObject({ src: HOST_MAC, dst: CONCENTRATORS[1]!.mac });
    expect(steps[4]).toMatchObject({ src: CONCENTRATORS[1]!.mac, sessionId: 0x2a17 });
    expect(steps.slice(0, 4).map((s) => s.sessionId)).toEqual([0, 0, 0, 0]);
  });
  it('with one AC there is one PADO, and the PADR goes to it', () => {
    const steps = discovery(CONCENTRATORS.slice(0, 1), 0, 1);
    expect(steps.map((s) => s.code)).toEqual(['PADI', 'PADO', 'PADR', 'PADS']);
    expect(steps[2]!.dst).toBe(CONCENTRATORS[0]!.mac);
  });
});

describe('TC-2142: LCP agrees MRU 1492, CHAP authenticates, IPCP assigns the address', () => {
  it('IPCP asks for 0.0.0.0, is Nak-ed with the address, asks again and is Ack-ed', () => {
    const session = pppSession(7, '203.0.113.45');
    expect(session.every((p) => p.ethertype === 0x8864 && p.sessionId === 7)).toBe(true);
    expect(session.filter((p) => p.protocol === 'LCP').map((p) => p.mru)).toEqual([
      1492, 1492, 1492, 1492,
    ]);
    const ipcp = session.filter((p) => p.protocol === 'IPCP');
    expect(ipcp.map((p) => [p.from, p.message, p.address])).toEqual([
      ['router', 'configure-request', '0.0.0.0'],
      ['ac', 'configure-nak', '203.0.113.45'],
      ['router', 'configure-request', '203.0.113.45'],
      ['ac', 'configure-ack', '203.0.113.45'],
    ]);
    expect(session.map((p) => p.protocol).indexOf('IPCP')).toBeGreaterThan(
      session.map((p) => p.protocol).lastIndexOf('CHAP'),
    );
  });
});

describe('TC-2143: with ICMP filtered and no clamping, the full-size segments vanish and the page hangs', () => {
  const run = transfer({ clamp: false, icmpFiltered: true, responseBytes: 10_000 });
  it('the handshake and the request get through', () => {
    const early = run.packets.filter((p) => p.kind !== 'data' && p.kind !== 'resend');
    expect(early.filter((p) => p.kind !== 'icmp').map((p) => [p.kind, p.ipBytes, p.fate])).toEqual([
      ['syn', 44, 'delivered'],
      ['syn-ack', 44, 'delivered'],
      ['ack', 40, 'delivered'],
      ['request', 440, 'delivered'],
    ]);
  });
  it('six 1500-byte segments are dropped, their ICMP is filtered, only the 1280-byte tail arrives', () => {
    const data = run.packets.filter((p) => p.kind === 'data');
    expect(data.map((p) => [p.ipBytes, p.fate])).toEqual([
      ...Array.from({ length: 6 }, () => [1500, 'dropped']),
      [1280, 'delivered'],
    ]);
    expect(run.packets.filter((p) => p.kind === 'icmp').every((p) => p.fate === 'filtered')).toBe(
      true,
    );
    expect(run.packets.filter((p) => p.kind === 'resend').map((p) => p.fate)).toEqual([
      'dropped',
      'dropped',
      'dropped',
    ]);
    expect(run).toMatchObject({ completed: false, inOrderBytes: 0, receivedBytes: 1240 });
    expect(run.dropped).toBe(9);
  });
});

describe('TC-2144: clamping the MSS to 1452 makes every segment fit', () => {
  it('the server sees MSS 1452 and sends 1492-byte packets; the page completes with no drop', () => {
    const run = transfer({ clamp: true, icmpFiltered: true, responseBytes: 10_000 });
    expect(run.announcedMss).toBe(1460);
    expect(run.serverSeesMss).toBe(1452);
    expect(run.packets.find((p) => p.kind === 'syn')!.mss).toBe(1452);
    expect(run.packets.filter((p) => p.kind === 'data').map((p) => p.ipBytes)).toEqual([
      1492, 1492, 1492, 1492, 1492, 1492, 1328,
    ]);
    expect(run).toMatchObject({ completed: true, dropped: 0, inOrderBytes: 10_000 });
  });
});

describe('TC-2145: when ICMP gets through, PMTUD recovers at the cost of one round trip', () => {
  it('six drops, six ICMPs delivered, the lost data resent at 1452 + 8, and the page completes', () => {
    const run = transfer({ clamp: false, icmpFiltered: false, responseBytes: 10_000 });
    expect(run.packets.filter((p) => p.kind === 'icmp').map((p) => p.fate)).toEqual(
      Array.from({ length: 6 }, () => 'delivered'),
    );
    const resent = run.packets.filter((p) => p.kind === 'resend');
    expect(resent.slice(0, 2).map((p) => p.ipBytes)).toEqual([1492, 48]);
    expect(resent.every((p) => p.fate === 'delivered')).toBe(true);
    expect(run).toMatchObject({ completed: true, extraRoundTrips: 1, dropped: 6 });
  });
});

describe('TC-2146: a small page loads even through the black hole', () => {
  it('a 1000-byte response is one 1040-byte packet that fits', () => {
    const run = transfer({ clamp: false, icmpFiltered: true, responseBytes: 1000 });
    expect(run.packets.filter((p) => p.kind === 'data').map((p) => p.ipBytes)).toEqual([1040]);
    expect(run).toMatchObject({ completed: true, dropped: 0 });
  });
});

describe('TC-2147: IPoE carries 1500-byte packets; IPv4 over IPv6 loses 40 bytes', () => {
  it('MTU/MSS: PPPoE 1492/1452, IPoE 1500/1460, IPv4-over-IPv6 1460/1420; packets for 1 MB', () => {
    expect(
      (['pppoe', 'ipoe', 'ipv4-over-ipv6'] as const).map((access) => {
        const s = accessSummary(access, 1_000_000);
        return [s.overhead, s.mtu, s.mss, s.packets, s.efficiency];
      }),
    ).toEqual([
      [8, 1492, 1452, 689, 96.8],
      [0, 1500, 1460, 685, 97.3],
      [40, 1460, 1420, 705, 94.7],
    ]);
  });
});
