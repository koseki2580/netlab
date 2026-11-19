/** REQ-388 — QoS queuing: policing vs shaping, FIFO vs LLQ (TC-1920..TC-1925). */
import { describe, expect, it } from 'vitest';
import {
  BC_BITS,
  BUFFER_BYTES,
  BURST_PERIOD_US,
  CIR_BPS,
  LINK_BPS,
  PRIORITY_BPS,
  RUN_US,
  customerTraffic,
  offeredPerTick,
  police,
  runLink,
  sentPerTick,
  shape,
  type Packet,
} from './qosQueuing';

const bitsIn = (departures: ReturnType<typeof police>['departures'], from: number, to: number) =>
  departures.filter((d) => d.left >= from && d.left < to).reduce((s, d) => s + d.bytes * 8, 0);

describe('TC-1920: a policer drops what exceeds the contract, and only that', () => {
  it('bursts of 15 Mbit/s against 5 Mbit/s: 245 of 625 packets pass, none is delayed', () => {
    const result = police(customerTraffic());
    expect(result.offeredPackets).toBe(625);
    expect(result.deliveredPackets).toBe(245);
    expect(result.droppedPackets).toBe(380);
    expect(result.maxDelayUs).toBe(0);
    expect(result.maxQueueBytes).toBe(0);
  });
  it('no 100 ms burst gets more than the bucket plus 5 Mbit/s × 100 ms through', () => {
    const { departures } = police(customerTraffic());
    for (let start = 0; start < RUN_US; start += BURST_PERIOD_US)
      expect(bitsIn(departures, start, start + 100_000)).toBeLessThanOrEqual(
        BC_BITS + (CIR_BPS / 1_000_000) * 100_000,
      );
  });
  it('traffic that keeps to 5 Mbit/s loses nothing', () => {
    const steady: Packet[] = [];
    for (let t = 0; t < RUN_US; t += 2400) steady.push({ t, bytes: 1500, cls: 'bulk' });
    expect(police(steady).droppedPackets).toBe(0);
  });
});

describe('TC-1921: a shaper delivers the same bytes later, from a bounded queue', () => {
  it('every byte arrives; held up to 180.8 ms; at most 114 000 bytes waiting; empty before the next burst', () => {
    const traffic = customerTraffic();
    const result = shape(traffic);
    expect(result.droppedPackets).toBe(0);
    expect(result.deliveredBytes).toBe(result.offeredBytes);
    expect(result.maxDelayUs).toBe(180_800);
    expect(result.maxQueueBytes).toBe(114_000);
    for (let start = 0; start < RUN_US; start += BURST_PERIOD_US) {
      const burst = result.departures.filter((d) => d.t >= start && d.t < start + BURST_PERIOD_US);
      expect(Math.max(...burst.map((d) => d.left))).toBeLessThan(start + BURST_PERIOD_US);
    }
  });
  it('it never sends faster than the bucket allows', () => {
    const { departures } = shape(customerTraffic());
    for (let from = 0; from < RUN_US; from += 50_000)
      expect(bitsIn(departures, from, from + 200_000)).toBeLessThanOrEqual(
        BC_BITS + (CIR_BPS / 1_000_000) * 200_000,
      );
  });
});

describe('TC-1922: in one FIFO queue, voice waits behind the bulk transfer', () => {
  it('voice delay grows from 0.16 ms to about 120 ms (the full buffer), and some calls lose packets', () => {
    const { voice, voiceDelayPerTick } = runLink({ scheduler: 'fifo', rogueEf: false });
    expect(voice.minDelayUs).toBe(160);
    expect(voice.maxDelayUs).toBeGreaterThan(115_000);
    expect(voice.maxDelayUs).toBeLessThanOrEqual(((BUFFER_BYTES + 1500) * 8 * 1e6) / LINK_BPS);
    expect(voice.jitterUs).toBeGreaterThan(100_000);
    expect(voice.dropped).toBeGreaterThan(0);
    // Before the transfer voice waits for nothing; while it runs, its wait climbs.
    expect(voiceDelayPerTick[10]).toBeLessThan(1);
    expect(voiceDelayPerTick[60]!).toBeGreaterThan(voiceDelayPerTick[52]!);
    expect(voiceDelayPerTick[100]).toBeGreaterThan(100);
  });
});

describe('TC-1923: with LLQ, voice waits only for the packet already on the wire', () => {
  it('voice under 2 ms with no loss; bulk still gets the other 9 Mbit/s', () => {
    const { voice, bulk } = runLink({ scheduler: 'llq', rogueEf: false });
    expect(voice.maxDelayUs).toBeLessThan(2000);
    expect(voice.dropped).toBe(0);
    expect(bulk.mbpsDuringTransfer).toBeGreaterThan(9);
  });
});

describe('TC-1924: the priority policer keeps EF from taking the whole link', () => {
  it('8 Mbit/s more marked EF: policed, EF gets ~2 Mbit/s and bulk ~8; unpoliced, bulk is left ~1', () => {
    const policed = runLink({ scheduler: 'llq', rogueEf: true });
    const ef = policed.voice.mbpsDuringTransfer + policed.rogue.mbpsDuringTransfer;
    expect(ef).toBeLessThanOrEqual(PRIORITY_BPS / 1e6 + 0.01);
    expect(policed.bulk.mbpsDuringTransfer).toBeGreaterThan(7.5);
    // The policer cannot tell the calls from the impostor: voice loses packets too.
    expect(policed.voice.dropped).toBeGreaterThan(0);
    const unpoliced = runLink({ scheduler: 'priority-unpoliced', rogueEf: true });
    expect(unpoliced.bulk.mbpsDuringTransfer).toBeLessThan(1.5);
    expect(unpoliced.voice.dropped).toBe(0);
  });
});

describe('TC-1925: the 10 ms chart series add up to the packets', () => {
  it('sent per tick sums to the delivered bits; offered per tick to the offered bits', () => {
    const traffic = customerTraffic();
    const total = (series: number[]) => series.reduce((s, x) => s + x * 10_000, 0);
    for (const result of [police(traffic), shape(traffic)])
      expect(total(sentPerTick(result))).toBeCloseTo(result.deliveredBytes * 8, 3);
    expect(total(offeredPerTick(traffic))).toBeCloseTo(937_500 * 8, 3);
    // 12.5 packets per 10 ms: single ticks read 14.4 or 15.6, the 100 ms burst 15 Mbit/s.
    const burst = offeredPerTick(traffic).slice(0, 10);
    expect(burst.reduce((s, x) => s + x, 0) / 10).toBeCloseTo(15, 6);
  });
});
