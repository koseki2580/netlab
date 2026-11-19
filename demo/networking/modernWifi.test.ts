/** REQ-395 — modern Wi-Fi: OFDMA airtime, channels per band, WPA2 vs WPA3 guessing (TC-1990..TC-1995). */
import { describe, expect, it } from 'vitest';
import { airtime, channelCount, crackTime, nonOverlapping24 } from './modernWifi';

describe('TC-1990: one phone per transmission pays the overhead 30 times', () => {
  it('30 × 200-byte packets: 30 transmissions, 6480 µs; twice the rate saves only 240 µs', () => {
    expect(airtime('single', 30, 200)).toEqual({
      transmissions: 30,
      totalUs: 6480,
      overheadUs: 6000,
    });
    expect(airtime('faster', 30, 200)).toEqual({
      transmissions: 30,
      totalUs: 6240,
      overheadUs: 6000,
    });
  });
});

describe('TC-1991: OFDMA serves up to 9 phones per transmission on resource units', () => {
  it('30 phones: 9 + 9 + 9 on 26-tone RUs, the last 3 on 52-tone RUs, 4 transmissions, 1346 µs', () => {
    expect(airtime('ofdma', 30, 200)).toEqual({
      transmissions: 4,
      totalUs: 1346,
      overheadUs: 800,
    });
  });
  it('one phone gets the whole channel, so OFDMA is no faster than Wi-Fi 5', () => {
    expect(airtime('ofdma', 1, 200).totalUs).toBe(airtime('single', 1, 200).totalUs);
    expect(airtime('ofdma', 1, 200).totalUs).toBe(216);
  });
  it('nine phones fit in one transmission', () => {
    expect(airtime('ofdma', 9, 200)).toEqual({ transmissions: 1, totalUs: 356, overheadUs: 200 });
  });
});

describe('TC-1992: 2.4 GHz has 3 non-overlapping channels in both regions', () => {
  it('1, 6 and 11, also where channels go up to 13', () => {
    expect(nonOverlapping24('us')).toEqual([1, 6, 11]);
    expect(nonOverlapping24('jp')).toEqual([1, 6, 11]);
    expect(channelCount('us', '2.4', 20)).toEqual({ count: 3, dfs: 0 });
    expect(channelCount('us', '2.4', 40)).toBeNull();
  });
});

describe('TC-1993: 5 GHz channels per width, and how many need DFS', () => {
  const counts = (region: 'us' | 'jp') =>
    [20, 40, 80, 160, 320].map((w) => channelCount(region, '5', w));
  it('US: 25 / 12 / 6 / 2 / 0, of which 16 / 8 / 4 / 2 / 0 need DFS', () => {
    expect(counts('us')).toEqual([
      { count: 25, dfs: 16 },
      { count: 12, dfs: 8 },
      { count: 6, dfs: 4 },
      { count: 2, dfs: 2 },
      { count: 0, dfs: 0 },
    ]);
  });
  it('Japan (no 144, no 149–165): 19 / 9 / 4 / 2 / 0', () => {
    expect(counts('jp').map((c) => c!.count)).toEqual([19, 9, 4, 2, 0]);
    expect(channelCount('jp', '5', 20)!.dfs).toBe(15);
  });
});

describe('TC-1994: 6 GHz channels per width depend on how much of the band a country opens', () => {
  it('US 1200 MHz: 59 / 29 / 14 / 7 / 3; Japan 500 MHz: 24 / 12 / 6 / 3 / 1; none need DFS', () => {
    const counts = (region: 'us' | 'jp') =>
      [20, 40, 80, 160, 320].map((w) => channelCount(region, '6', w));
    expect(counts('us').map((c) => c!.count)).toEqual([59, 29, 14, 7, 3]);
    expect(counts('jp').map((c) => c!.count)).toEqual([24, 12, 6, 3, 1]);
    expect([...counts('us'), ...counts('jp')].every((c) => c!.dfs === 0)).toBe(true);
  });
});

describe('TC-1995: guessing offline against a captured WPA2 handshake vs online against SAE', () => {
  it('10 000 words: 0.01 s offline, 10 000 s (about 2.8 h) online', () => {
    expect(crackTime(10_000)).toEqual({ offlineS: 0.01, onlineS: 10_000, ratio: 1_000_000 });
  });
  it('100 million words: 100 s offline, over 3 years online', () => {
    const time = crackTime(100_000_000);
    expect(time.offlineS).toBe(100);
    expect(time.onlineS / (365 * 24 * 3600)).toBeGreaterThan(3);
  });
});
