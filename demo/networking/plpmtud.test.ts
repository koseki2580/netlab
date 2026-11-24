/** REQ-440 — Packetization Layer Path MTU Discovery (TC-2510..TC-2516). */
import { describe, expect, it } from 'vitest';
import { MAX_PLPMTU, classic, fits, search, searchByteByByte } from './plpmtud';

const sizes = (pathMtu: number) =>
  search(pathMtu).probes.map((probe) => `${probe.size}${probe.acked ? '+' : '-'}`);

describe('TC-2510: classic PMTUD stalls when Packet Too Big is filtered', () => {
  it('a 1400-byte tunnel with ICMP filtered never delivers a full-size packet and learns nothing', () => {
    expect(classic(1400, false)).toEqual({ delivers: false, learnedMtu: null, sizes: [1452] });
  });
  it('with ICMP delivered it learns 1400 and resends at 1352', () => {
    expect(classic(1400, true)).toEqual({ delivers: true, learnedMtu: 1400, sizes: [1452, 1352] });
  });
  it('a path as large as the link needs no discovery', () => {
    expect(classic(1500, false).delivers).toBe(true);
  });
});

describe('TC-2511: a datagram fits when it plus 48 bytes of IPv6 and UDP headers fits the path MTU', () => {
  it('1352 fits a 1400 path, 1353 does not; the 1500-byte link allows 1452', () => {
    expect(fits(1352, 1400)).toBe(true);
    expect(fits(1353, 1400)).toBe(false);
    expect(MAX_PLPMTU).toBe(1452);
  });
});

describe('TC-2512: on a 1400-byte path the search takes 6 probe sizes and settles at 1349', () => {
  it('lists each probe and the result', () => {
    expect(sizes(1400)).toEqual(['1452-', '1326+', '1389-', '1357-', '1341+', '1349+']);
    const result = search(1400);
    expect(result.plpmtu).toBe(1349);
    expect(result.largestFitting).toBe(1352);
  });
  it('each lost size costs 3 datagrams (MAX_PROBES), so 12 probe datagrams in all', () => {
    expect(search(1400).datagrams).toBe(3 * 3 + 3);
  });
});

describe('TC-2513: the result never exceeds what fits and is within the 8-byte step of it', () => {
  it('holds for every path MTU from 1280 to 1500', () => {
    for (let mtu = 1280; mtu <= 1500; mtu += 1) {
      const result = search(mtu);
      expect(result.plpmtu).toBeLessThanOrEqual(result.largestFitting);
      expect(result.largestFitting - result.plpmtu).toBeLessThan(8);
    }
  });
});

describe('TC-2514: a path as big as the link is confirmed with a single probe', () => {
  it('1500 → one probe, 1452', () => {
    expect(sizes(1500)).toEqual(['1452+']);
    expect(search(1500).plpmtu).toBe(1452);
  });
});

describe('TC-2515: the smallest IPv6 path still works from the 1200-byte base', () => {
  it('1280 → settles at 1231 of 1232 after 6 probe sizes', () => {
    expect(search(1280).plpmtu).toBe(1231);
    expect(search(1280).probes).toHaveLength(6);
  });
  it('PPPoE’s 1492 → 1444, exactly what fits', () => {
    expect(search(1492).plpmtu).toBe(1444);
  });
});

describe('TC-2516: probing one byte at a time finds the exact size but needs far more probes', () => {
  it('1400 → 153 probe sizes, 1352', () => {
    const slow = searchByteByByte(1400);
    expect(slow.probes).toHaveLength(153);
    expect(slow.plpmtu).toBe(1352);
  });
});
