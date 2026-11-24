/** REQ-431 — DHCP lease lifecycle (TC-2420..TC-2424). */
import { describe, expect, it } from 'vitest';
import { leaseTimes, retryTimes, simulateLease } from './dhcpLease';

const H = 3600;

describe('TC-2420: an 8-hour lease renews at 4 h (T1), rebinds at 7 h (T2) and ends at 8 h', () => {
  it('T1 = 0.5 × lease and T2 = 0.875 × lease, counted from when the lease was granted', () => {
    expect(leaseTimes(8 * H)).toEqual({ t1S: 4 * H, t2S: 7 * H, expiryS: 8 * H });
    expect(leaseTimes(24 * H, 2 * H)).toEqual({ t1S: 14 * H, t2S: 23 * H, expiryS: 26 * H });
  });
});

describe('TC-2421: a server that dies 1 h into an 8 h lease is first missed at 4 h; the address goes at 8 h', () => {
  const outcome = simulateLease({ leaseS: 8 * H, serverDownS: 1 * H, serverB: false });
  it('the first unanswered request is the unicast renew at T1', () => {
    expect(outcome.firstUnansweredS).toBe(4 * H);
    expect(outcome.events.find((e) => e.kind === 'renew')).toEqual({
      atS: 4 * H,
      kind: 'renew',
      answeredBy: null,
    });
  });
  it('the first broadcast rebind is at T2, and at expiry the client drops the address and sends DISCOVER', () => {
    expect(outcome.events.find((e) => e.kind === 'rebind')?.atS).toBe(7 * H);
    expect(outcome.addressLostS).toBe(8 * H);
    expect(outcome.leaseFrom).toBeNull();
    expect(outcome.events.slice(-2).map((e) => e.kind)).toEqual(['expire', 'discover']);
  });
});

describe('TC-2422: unanswered requests are retried after half the time left, never sooner than 60 s', () => {
  it('renewing from 4 h to 7 h: 4 h, 5.5 h, 6.25 h, … nine requests in all', () => {
    const renews = retryTimes(4 * H, 7 * H);
    expect(renews.slice(0, 3)).toEqual([14_400, 19_800, 22_500]);
    expect(renews).toHaveLength(9);
    expect(renews[renews.length - 1]).toBe(25_175);
  });
  it('once half the time left is under 60 s the client waits 60 s', () => {
    const rebinds = retryTimes(7 * H, 8 * H);
    expect(rebinds).toEqual([25_200, 27_000, 27_900, 28_350, 28_575, 28_687, 28_747]);
  });
});

describe('TC-2423: a server that dies after T1 has already renewed the lease, so the client notices later', () => {
  it('dying at 5 h of an 8 h lease: renewed at 4 h, first missed at 8 h, address lost at 12 h', () => {
    const outcome = simulateLease({ leaseS: 8 * H, serverDownS: 5 * H, serverB: false });
    expect(outcome.events[1]).toEqual({ atS: 4 * H, kind: 'renew', answeredBy: 'A' });
    expect(outcome.firstUnansweredS).toBe(8 * H);
    expect(outcome.addressLostS).toBe(12 * H);
  });
});

describe('TC-2424: with a second server, the broadcast at T2 is answered and the address is kept', () => {
  it('server B answers the 7 h rebind; the new lease runs to 15 h and the address is never lost', () => {
    const outcome = simulateLease({ leaseS: 8 * H, serverDownS: 1 * H, serverB: true });
    expect(outcome.events[outcome.events.length - 1]).toEqual({
      atS: 7 * H,
      kind: 'rebind',
      answeredBy: 'B',
    });
    expect(outcome.events.filter((e) => e.kind === 'renew' && e.answeredBy === 'B')).toEqual([]);
    expect(outcome.addressLostS).toBeNull();
    expect(outcome.leaseFrom).toBe('B');
    expect(outcome.lastLease.expiryS).toBe(15 * H);
  });
});
