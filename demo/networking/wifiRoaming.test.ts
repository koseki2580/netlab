/** REQ-413 — Enterprise Wi-Fi roaming, CAPWAP and 802.11r (TC-2170..TC-2177). */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POLICY,
  callVerdict,
  packetPath,
  roamTime,
  rssiDbm,
  walk,
  wiredPath,
} from './wifiRoaming';

describe('TC-2170: the signal falls 30 dB per tenfold distance from −40 dBm at 1 m', () => {
  it('1 m: −40 dBm; 10 m: −70 dBm; 100 m: −100 dBm; closer than 1 m counts as 1 m', () => {
    expect(rssiDbm(10, 11)).toBeCloseTo(-40, 6);
    expect(rssiDbm(10, 20)).toBeCloseTo(-70, 6);
    expect(rssiDbm(0, 100)).toBeCloseTo(-100, 6);
    expect(rssiDbm(10, 10)).toBeCloseTo(-40, 6);
  });
});

describe('TC-2171: below −70 dBm with another AP 8 dB stronger, the client roams at 33 m and 68 m', () => {
  it('AP1 → AP2 at 33 m, AP2 → AP3 at 68 m, never connected below −80.3 dBm', () => {
    const result = walk(DEFAULT_POLICY);
    expect(result.roams.map((roam) => [roam.atM, roam.from, roam.to])).toEqual([
      [33, 'AP1', 'AP2'],
      [68, 'AP2', 'AP3'],
    ]);
    expect(result.roams[0]!.fromDbm).toBeCloseTo(-80.85, 2);
    expect(result.roams[0]!.toDbm).toBeCloseTo(-72.38, 2);
    expect(result.weakestDbm).toBeCloseTo(-80.27, 2);
    expect(result.connected[32]).toBe('AP1');
    expect(result.connected[33]).toBe('AP2');
  });
  it('at 32 m AP2 is only 6.9 dB stronger, so the client stays', () => {
    expect(rssiDbm(45, 32) - rssiDbm(10, 32)).toBeCloseTo(6.85, 2);
  });
});

describe('TC-2172: a sticky client with a −85 dBm threshold hangs on much longer', () => {
  it('roams at 42 m and 77 m, after sinking to −84.7 dBm', () => {
    const result = walk({ thresholdDbm: -85, marginDb: 8 });
    expect(result.roams.map((roam) => roam.atM)).toEqual([42, 77]);
    expect(result.weakestDbm).toBeCloseTo(-84.74, 2);
  });
});

describe('TC-2173: full 802.1X re-authentication takes 260 ms with a 30 ms RADIUS round trip', () => {
  it('auth 5 + reassociation 5 + 8 EAP round trips 240 + four-way handshake 10', () => {
    const full = roamTime('full-8021x');
    expect(full.steps.map((step) => [step.id, step.ms])).toEqual([
      ['open-auth', 5],
      ['reassoc', 5],
      ['eap', 240],
      ['four-way', 10],
    ]);
    expect(full.totalMs).toBe(260);
  });
  it('a RADIUS round trip of 10 ms brings it down to 100 ms', () => {
    expect(roamTime('full-8021x', 10).totalMs).toBe(100);
  });
});

describe('TC-2174: an 802.11r fast transition takes two exchanges, 10 ms, whatever RADIUS does', () => {
  it('FT authentication and reassociation only', () => {
    expect(roamTime('ft').steps.map((step) => step.id)).toEqual(['ft-auth', 'reassoc']);
    expect(roamTime('ft').totalMs).toBe(10);
    expect(roamTime('ft', 60).totalMs).toBe(10);
  });
});

describe('TC-2175: a call with a 150 ms gap budget survives FT but not full re-authentication', () => {
  it('260 ms breaks the call (13 voice packets), 10 ms does not (1 packet)', () => {
    expect(callVerdict(roamTime('full-8021x').totalMs)).toEqual({
      gapMs: 260,
      survives: false,
      packetsLost: 13,
    });
    expect(callVerdict(roamTime('ft').totalMs)).toEqual({
      gapMs: 10,
      survives: true,
      packetsLost: 1,
    });
    expect(callVerdict(150).survives).toBe(true);
  });
});

describe('TC-2176: in central switching every packet goes through the controller', () => {
  it('AP1 → AP2 hairpins through Core and the WLC, even though both APs share SW1', () => {
    expect(packetPath('central', 'AP2')).toEqual({
      hops: ['Phone A', 'AP1', 'SW1', 'Core', 'WLC', 'Core', 'SW1', 'AP2', 'Phone B'],
      viaController: true,
      wiredLinks: 6,
    });
    expect(packetPath('central', 'AP3').hops).toEqual([
      'Phone A',
      'AP1',
      'SW1',
      'Core',
      'WLC',
      'Core',
      'SW2',
      'AP3',
      'Phone B',
    ]);
  });
});

describe('TC-2177: in local switching the packet takes the shortest wired path', () => {
  it('AP1 → AP2 stays on SW1 (2 links); AP1 → AP3 crosses Core (4 links); neither touches the WLC', () => {
    expect(packetPath('local', 'AP2')).toEqual({
      hops: ['Phone A', 'AP1', 'SW1', 'AP2', 'Phone B'],
      viaController: false,
      wiredLinks: 2,
    });
    expect(packetPath('local', 'AP3').wiredLinks).toBe(4);
    expect(packetPath('local', 'AP3').viaController).toBe(false);
    expect(wiredPath('AP3', 'AP1')).toEqual(['AP3', 'SW2', 'Core', 'SW1', 'AP1']);
  });
});
