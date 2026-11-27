/** REQ-444 — SCTP multihoming and multi-streaming (TC-2560..TC-2567). */
import { describe, expect, it } from 'vitest';
import { defaultFailoverParams, delayed, deliver, failover, rtoFrom } from './sctp';

describe('TC-2560: a short round trip gives an RTO of RTO.Min', () => {
  it('50 ms + 4 × 10 ms = 90 ms is raised to 1 s; a 2 s + 4 × 0.5 s path gives 4 s', () => {
    expect(rtoFrom(defaultFailoverParams())).toBe(1000);
    expect(rtoFrom({ ...defaultFailoverParams(), srttMs: 2000, rttvarMs: 500 })).toBe(4000);
  });
});

describe('TC-2561: with the RFC 9260 defaults the primary is abandoned after 63 s', () => {
  it('six timeouts of 1, 2, 4, 8, 16 and 32 s: the counter exceeds Path.Max.Retrans = 5', () => {
    const result = failover(defaultFailoverParams());
    expect(result.timeouts.map((entry) => entry.rtoMs)).toEqual([
      1000, 2000, 4000, 8000, 16_000, 32_000,
    ]);
    expect(result.timeouts.map((entry) => entry.atMs)).toEqual([
      1000, 3000, 7000, 15_000, 31_000, 63_000,
    ]);
    expect(result.failoverMs).toBe(63_000);
  });
});

describe('TC-2562: a lower Path.Max.Retrans fails over sooner', () => {
  it('Path.Max.Retrans = 2 fails over after 1 + 2 + 4 = 7 s; = 1 after 3 s', () => {
    expect(failover({ ...defaultFailoverParams(), pathMaxRetrans: 2 }).failoverMs).toBe(7000);
    expect(failover({ ...defaultFailoverParams(), pathMaxRetrans: 1 }).failoverMs).toBe(3000);
  });
});

describe('TC-2563: the backoff stops at RTO.Max', () => {
  it('with Path.Max.Retrans = 10 the 7th timeout on is 60 s each', () => {
    const result = failover({ ...defaultFailoverParams(), pathMaxRetrans: 10 });
    expect(result.timeouts.slice(5).map((entry) => entry.rtoMs)).toEqual([
      32_000, 60_000, 60_000, 60_000, 60_000, 60_000,
    ]);
    expect(result.failoverMs).toBe(363_000);
  });
  it('a lower RTO.Min of 200 ms fails over after 12.6 s with Path.Max.Retrans = 5', () => {
    expect(failover({ ...defaultFailoverParams(), rtoMinMs: 200 }).failoverMs).toBe(12_600);
  });
});

describe('TC-2564: a loss on stream 1 delays only stream 1', () => {
  it('A1 lost: A1, A2 and A3 wait for the retransmission at 250 ms; B1..B3 arrive on time', () => {
    expect(delayed('sctp', 'A1')).toEqual(['A1', 'A2', 'A3']);
    const rows = deliver('sctp', 'A1');
    expect(rows.find((row) => row.id === 'A3')!.deliveredMs).toBe(250);
    expect(rows.find((row) => row.id === 'B1')!.deliveredMs).toBe(60);
  });
});

describe('TC-2565: one TCP connection holds back everything after the loss', () => {
  it('A1 lost: all six messages are handed over at 250 ms', () => {
    expect(delayed('tcp', 'A1')).toEqual(['A1', 'B1', 'A2', 'B2', 'A3', 'B3']);
    expect(deliver('tcp', 'A1').map((row) => row.deliveredMs)).toEqual([
      250, 250, 250, 250, 250, 250,
    ]);
  });
});

describe('TC-2566: only messages after the loss can be held back', () => {
  it('B2 lost: SCTP delays B2 and B3, TCP delays B2, A3 and B3', () => {
    expect(delayed('sctp', 'B2')).toEqual(['B2', 'B3']);
    expect(delayed('tcp', 'B2')).toEqual(['B2', 'A3', 'B3']);
  });
  it('the last message lost delays only itself on both', () => {
    expect(delayed('sctp', 'B3')).toEqual(['B3']);
    expect(delayed('tcp', 'B3')).toEqual(['B3']);
  });
});

describe('TC-2567: the delay shrinks for messages that arrive later', () => {
  it('A1 lost: A2 waits 180 ms, A3 waits 160 ms', () => {
    const rows = deliver('sctp', 'A1');
    expect(rows.find((row) => row.id === 'A2')!.delayMs).toBe(180);
    expect(rows.find((row) => row.id === 'A3')!.delayMs).toBe(160);
  });
});
