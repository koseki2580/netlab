/** REQ-434 — NTP's four timestamps and PTP's transparent clock (TC-2450..TC-2455). */
import { describe, expect, it } from 'vitest';
import {
  ASYMMETRIC,
  PTP_SCENE,
  SYMMETRIC,
  estimate,
  exchange,
  measure,
  ptp,
  withForward,
  withSyncWait,
} from './timeSync';

describe('TC-2450: offset and delay come from the four timestamps (RFC 5905 §8)', () => {
  it('t1 1000, t2 1035, t3 1040, t4 1025 give offset +25 ms and delay 20 ms', () => {
    expect(estimate({ t1: 1000, t2: 1035, t3: 1040, t4: 1025 })).toEqual({
      offset: 25,
      delay: 20,
    });
  });
  it('a server behind the client gives a negative offset', () => {
    expect(estimate({ t1: 0, t2: -90, t3: -88, t4: 22 }).offset).toBe(-100);
  });
});

describe('TC-2451: on an even path the estimate is exact', () => {
  it('the first scene: 10 ms each way, server 25 ms ahead, held 5 ms', () => {
    expect(exchange(SYMMETRIC)).toEqual({ t1: 1000, t2: 1035, t3: 1040, t4: 1025 });
    expect(measure(SYMMETRIC)).toMatchObject({ offset: 25, delay: 20, error: 0 });
  });
});

describe('TC-2452: an uneven path leaves an error of half the asymmetry', () => {
  it('14 ms out and 4 ms back: offset reads 30 ms, 5 ms more than the true 25 ms', () => {
    expect(measure(ASYMMETRIC)).toMatchObject({ offset: 30, delay: 18, error: 5 });
  });
  it('the delay is measured right but cannot show how it is split', () => {
    expect(measure(withForward(24)).delay).toBe(28);
    expect(measure(withForward(24)).error).toBe(10);
    expect(measure(withForward(4)).error).toBe(0);
  });
});

describe('TC-2453: the error is never more than half the measured delay', () => {
  it('all the delay in one direction reaches the bound', () => {
    const allOut = measure({ ...ASYMMETRIC, forward: 18, backward: 0 });
    expect(allOut.error).toBe(9);
    expect(allOut.bound).toBe(9);
    for (const forward of [4, 10, 20, 40]) {
      const result = measure(withForward(forward));
      expect(Math.abs(result.error)).toBeLessThanOrEqual(result.bound);
    }
  });
});

describe('TC-2454: PTP through an ordinary switch: queueing is asymmetry', () => {
  it('Sync waits 400 µs, Delay_Req 20 µs: the slave is off by 189 950 ns', () => {
    expect(ptp(PTP_SCENE, 'ordinary').errorNs).toBe(189_950);
  });
});

describe('TC-2455: a transparent clock removes the queues, not the fibres', () => {
  it('only half the 100 ns fibre asymmetry remains: −50 ns', () => {
    expect(ptp(PTP_SCENE, 'transparent')).toEqual({ errorNs: -50, meanPathDelayNs: 5_050 });
  });
  it('however long Sync waits, the transparent clock’s result does not move', () => {
    expect(ptp(withSyncWait(1_000_000), 'transparent').errorNs).toBe(-50);
    expect(ptp(withSyncWait(1_000_000), 'ordinary').errorNs).toBe(489_950);
  });
});
