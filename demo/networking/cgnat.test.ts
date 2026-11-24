/** REQ-433 — carrier-grade NAT and IPv4 address sharing (TC-2440..TC-2444). */
import { describe, expect, it } from 'vitest';
import {
  USABLE_PORTS,
  blockRange,
  blocksPerAddress,
  heavySubscriber,
  inSharedSpace,
  mapPortSet,
  sharedSpaceSize,
} from './cgnat';

describe('TC-2440: one public address holds 64,512 ports, so 1,024-port blocks serve 63 subscribers', () => {
  it('ports 1024–65535 are handed out', () => {
    expect(USABLE_PORTS).toBe(64_512);
    expect(blockRange(1024, 0)).toEqual({ first: 1024, last: 2047 });
    expect(blockRange(1024, 62)).toEqual({ first: 64_512, last: 65_535 });
  });
  it('subscribers per address and ports left over, for several block sizes', () => {
    expect(blocksPerAddress(1024)).toEqual({ blocks: 63, unused: 0 });
    expect(blocksPerAddress(512)).toEqual({ blocks: 126, unused: 0 });
    expect(blocksPerAddress(2048)).toEqual({ blocks: 31, unused: 1024 });
    expect(blocksPerAddress(4096)).toEqual({ blocks: 15, unused: 3072 });
  });
});

describe('TC-2441: with one 1,024-port block, a subscriber’s 1,025th concurrent flow is refused', () => {
  it('1,200 flows: 176 refused, starting at flow 1,025; the address still serves 63', () => {
    expect(heavySubscriber(1024, 1, 1200)).toMatchObject({
      blocks: 1,
      ports: 1024,
      firstRefusedFlow: 1025,
      refusedFlows: 176,
      subscribersServed: 63,
    });
  });
  it('1,000 flows all get a port', () => {
    expect(heavySubscriber(1024, 1, 1000).firstRefusedFlow).toBeNull();
  });
});

describe('TC-2442: a second block lets the heavy subscriber through, at one subscriber’s cost, logged per block', () => {
  it('up to 2 blocks: 2,048 ports, nothing refused, 62 subscribers served; 2 log records instead of 1,200', () => {
    expect(heavySubscriber(1024, 2, 1200)).toEqual({
      blocks: 2,
      ports: 2048,
      firstRefusedFlow: null,
      refusedFlows: 0,
      subscribersServed: 62,
      blockLogRecords: 2,
      flowLogRecords: 1200,
    });
  });
});

describe('TC-2443: subscribers’ WAN addresses come from 100.64.0.0/10', () => {
  it('it holds 4,194,304 addresses, from 100.64.0.0 to 100.127.255.255', () => {
    expect(sharedSpaceSize()).toBe(4_194_304);
    expect(inSharedSpace('100.64.0.0')).toBe(true);
    expect(inSharedSpace('100.127.255.255')).toBe(true);
    expect(inSharedSpace('100.128.0.0')).toBe(false);
    expect(inSharedSpace('10.0.0.1')).toBe(false);
  });
});

describe('TC-2444: MAP-E port sets from PSID bits (RFC 7597, a = 6)', () => {
  it('a 6-bit PSID: 64 subscribers per address, 1,008 ports each, in 63 runs of 16', () => {
    const set = mapPortSet(6, 1);
    expect(set.sharing).toBe(64);
    expect(set.portsPerSubscriber).toBe(1008);
    expect(set.ranges.slice(0, 2)).toEqual([
      { first: 1040, last: 1055 },
      { first: 2064, last: 2079 },
    ]);
    expect(set.ranges).toHaveLength(63);
  });
  it('an 8-bit PSID: 256 subscribers, 252 ports each', () => {
    expect(mapPortSet(8, 0)).toMatchObject({ sharing: 256, portsPerSubscriber: 252 });
  });
  it('the 64 port sets never overlap and never use a port below 1024', () => {
    const ports = new Set<number>();
    for (let psid = 0; psid < 64; psid += 1)
      for (const { first, last } of mapPortSet(6, psid).ranges)
        for (let port = first; port <= last; port += 1) ports.add(port);
    expect(ports.size).toBe(64 * 1008);
    expect(Math.min(...ports)).toBe(1024);
  });
});
