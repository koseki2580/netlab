/** REQ-389 — Network operations: syslog PRI, why clocks need NTP, SNMP polls vs traps (TC-1930..TC-1934). */
import { describe, expect, it } from 'vitest';
import {
  EVENTS,
  FLAP_SEC,
  LAST_POLL_BEFORE_SEC,
  POLL_INTERVAL_SEC,
  clockSpreadSec,
  decodePri,
  pollDetection,
  pri,
  sortedByTimestamp,
  syslogLine,
  trapDetection,
  trueOrder,
} from './netOps';

const devices = (events: readonly { device: string }[]) => events.map((event) => event.device);

describe('TC-1930: PRI is facility × 8 + severity, and decodes back', () => {
  it('computes the PRI for several facility/severity pairs', () => {
    expect(pri('local7', 'err')).toBe(187);
    expect(pri('local7', 'notice')).toBe(189);
    expect(pri('local4', 'warning')).toBe(164);
    expect(pri('user', 'err')).toBe(11);
    expect(pri('kern', 'emerg')).toBe(0);
    expect(pri('local7', 'debug')).toBe(191);
  });
  it('splits a PRI into its facility code and severity', () => {
    expect(decodePri(187)).toEqual({ facilityCode: 23, severity: 'err' });
    expect(decodePri(164)).toEqual({ facilityCode: 20, severity: 'warning' });
  });
});

describe('TC-1931: a collected line follows the RFC 5424 layout with the device’s own time', () => {
  it('the switch’s line, 3 minutes fast without NTP and 2 ms off with it', () => {
    const sw = EVENTS.find((event) => event.device === 'switch')!;
    expect(syslogLine(sw, 'no-ntp')).toBe(
      '<187>1 2026-11-17T09:17:00.000Z sw-core1 ifmgr - - - Interface Te1/0/49 (uplink) changed state to down',
    );
    expect(syslogLine(sw, 'ntp')).toMatch(/^<187>1 2026-11-17T09:14:00\.002Z sw-core1 /);
  });
});

describe('TC-1932: without NTP, sorting by timestamp names the wrong first event', () => {
  it('the router appears first and the switch, which really started it, appears last', () => {
    expect(devices(sortedByTimestamp('no-ntp'))).toEqual([
      'router',
      'server',
      'firewall',
      'switch',
    ]);
    expect(devices(trueOrder())).toEqual(['switch', 'router', 'firewall', 'server']);
    expect(clockSpreadSec('no-ntp')).toBe(275);
  });
});

describe('TC-1933: with NTP-synced clocks, the timestamp order is what really happened', () => {
  it('sorting by timestamp gives the true order, and the clocks agree within a few ms', () => {
    expect(devices(sortedByTimestamp('ntp'))).toEqual(devices(trueOrder()));
    expect(clockSpreadSec('ntp')).toBeCloseTo(0.005, 6);
  });
});

describe('TC-1934: a 5-minute poll misses a 40 s flap that a linkDown trap reports at once', () => {
  it('the poll after the flap finds the link up again; the trap is sent at 0 s', () => {
    expect(pollDetection(FLAP_SEC, POLL_INTERVAL_SEC, LAST_POLL_BEFORE_SEC).learnsAfterSec).toBe(
      null,
    );
    expect(trapDetection().learnsAfterSec).toBe(0);
  });
  it('a flap still down at the next poll is seen, 60 s after it began', () => {
    expect(pollDetection(90, POLL_INTERVAL_SEC, LAST_POLL_BEFORE_SEC).learnsAfterSec).toBe(60);
    expect(pollDetection(60, POLL_INTERVAL_SEC, LAST_POLL_BEFORE_SEC).learnsAfterSec).toBe(null);
  });
});
