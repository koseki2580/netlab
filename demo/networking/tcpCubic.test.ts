/** REQ-436 — Modern congestion control and loss recovery (TC-2470..TC-2477). */
import { describe, expect, it } from 'vitest';
import {
  cubicK,
  cubicRecovery,
  cubicWindow,
  curves,
  renoRecovery,
  renoWindow,
  tailLoss,
  windowPackets,
} from './tcpCubic';

const W = windowPackets(10e9, 100);

describe('TC-2470: the window that fills a path is its bandwidth-delay product in packets', () => {
  it('10 Gb/s × 100 ms in 1500-byte packets is 83,333 packets; 1 Gb/s × 20 ms is 1,667', () => {
    expect(W).toBe(83_333);
    expect(windowPackets(1e9, 20)).toBe(1_667);
  });
});

describe('TC-2471: Reno halves and gains one packet per round trip', () => {
  it('on 10 Gb/s, 100 ms it needs about 4,167 s (69 min) to regain the window', () => {
    const reno = renoRecovery(W, 100);
    expect(reno.after).toBeCloseTo(41_666.5, 1);
    expect(reno.seconds).toBeCloseTo(4_166.65, 1);
  });
  it('doubling the RTT doubles the time', () => {
    expect(renoRecovery(W, 200).seconds).toBeCloseTo(2 * renoRecovery(W, 100).seconds, 6);
  });
});

describe('TC-2472: CUBIC drops to 70% and is back at W_max after K = ∛(W_max·0.3/0.4) s', () => {
  it('on 10 Gb/s, 100 ms: 58,333 packets after the loss, back after 39.7 s', () => {
    const cubic = cubicRecovery(W, 100);
    expect(cubic.after).toBeCloseTo(58_333.1, 1);
    expect(cubic.seconds).toBeCloseTo(39.685, 2);
    expect(cubicWindow(W, 100, cubicK(W))).toBeCloseTo(W, 6);
  });
  it('for the same W_max, K does not depend on the RTT', () => {
    expect(cubicRecovery(W, 50).seconds).toBeCloseTo(cubicRecovery(W, 200).seconds, 9);
  });
});

describe('TC-2473: CUBIC never falls below its Reno-friendly estimate', () => {
  it('on a small, short path W_est gets back first: 10 packets at 10 ms recover in 57 ms, not K = 1.96 s', () => {
    expect(cubicK(10)).toBeCloseTo(1.957, 3);
    expect(cubicRecovery(10, 10).seconds).toBeCloseTo(0.0567, 4);
  });
});

describe('TC-2474: the chart curves start at the post-loss windows and CUBIC overtakes Reno', () => {
  it('starts at 41,666.5 and 58,333.1; at K CUBIC is at W_max while Reno has gained 397 packets', () => {
    const points = curves(W, 100, 2 * cubicK(W), 2);
    expect(points[0]!.reno).toBeCloseTo(41_666.5, 1);
    expect(points[0]!.cubic).toBeCloseTo(58_333.1, 1);
    expect(points[1]!.cubic).toBeCloseTo(W, 3);
    expect(points[1]!.reno).toBeCloseTo(41_666.5 + 396.85, 1);
    expect(renoWindow(W, 100, 10_000)).toBe(W);
  });
});

describe('TC-2475: with RACK-TLP a lost tail is probed after PTO = 2·SRTT', () => {
  it('SRTT 50 ms, last 2 of 10 lost: PTO 100 ms, probe at 150 ms, both resent by 200 ms', () => {
    const result = tailLoss(50, 2);
    expect(result.ptoMs).toBe(100);
    expect(result.tlp).toEqual({ firstResendMs: 150, allResentMs: 200, windowAfter: 7 });
  });
  it('one segment in flight adds the 200 ms worst-case delayed-ACK time', () => {
    expect(tailLoss(50, 1).ptoMs).toBe(300);
    expect(tailLoss(50, 1).tlp.firstResendMs).toBe(350);
  });
});

describe('TC-2476: without TLP the sender waits for the RTO (at least 1 s) and restarts from one segment', () => {
  it('SRTT 50 ms, last 2 of 10 lost: first resent at 1,050 ms, all by 1,100 ms, window 1', () => {
    const result = tailLoss(50, 2);
    expect(result.rtoMs).toBe(1000);
    expect(result.rtoOnly).toEqual({ firstResendMs: 1050, allResentMs: 1100, windowAfter: 1 });
  });
});

describe('TC-2477: the PTO is never longer than the RTO, so TLP helps most on short round trips', () => {
  it('SRTT 500 ms: RTO 1 s, PTO capped at 1 s, both resend at 1.5 s', () => {
    const result = tailLoss(500, 2);
    expect(result.rtoMs).toBe(1000);
    expect(result.ptoMs).toBe(1000);
    expect(result.tlp.firstResendMs).toBe(result.rtoOnly.firstResendMs);
  });
});
