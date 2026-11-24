/** REQ-439 — Real-time web: polling, long polling, WebSocket, and safe retries (TC-2500..TC-2507). */
import { describe, expect, it } from 'vitest';
import { REQUESTS, cost, frameHeaderBytes, isIdempotent, retry } from './websocket';

const request = (id: string) => REQUESTS.find((entry) => entry.id === id)!;

describe('TC-2500: short polling asks every P seconds whether or not there is news', () => {
  it('events every 10 s, polls every 5 s: 12 requests, 7,800 bytes, 2,525 ms average delay', () => {
    expect(cost('short', 10, 5)).toEqual({
      events: 6,
      requests: 12,
      bytes: 7_800,
      averageDelayMs: 2_525,
    });
  });
});

describe('TC-2501: polling faster cuts the delay but multiplies the requests', () => {
  it('polling every 1 s: 60 requests, 36,600 bytes, 525 ms delay', () => {
    expect(cost('short', 10, 1)).toMatchObject({
      requests: 60,
      bytes: 36_600,
      averageDelayMs: 525,
    });
  });
});

describe('TC-2502: long polling sends one request per event and delivers at once', () => {
  it('events every 10 s: 6 requests, 4,200 bytes, 25 ms', () => {
    expect(cost('long', 10, 5)).toEqual({
      events: 6,
      requests: 6,
      bytes: 4_200,
      averageDelayMs: 25,
    });
  });
  it('events every 60 s with a 30 s hold: one empty answer per gap, so 2 requests for 1 event', () => {
    expect(cost('long', 60, 5)).toMatchObject({ events: 1, requests: 2, bytes: 1_300 });
  });
});

describe('TC-2503: a WebSocket pays one Upgrade handshake, then 2 bytes per small server frame', () => {
  it('events every 10 s: 1 request, 400 + 113 + 129 + 6 × 102 = 1,254 bytes, 25 ms', () => {
    expect(cost('websocket', 10, 5)).toEqual({
      events: 6,
      requests: 1,
      bytes: 1_254,
      averageDelayMs: 25,
    });
  });
});

describe('TC-2504: frame headers are 2 to 14 bytes; client frames carry a 4-byte mask', () => {
  it('100 B: 2 from the server, 6 from the client; 1,000 B: 4 / 8; 70,000 B: 10 / 14', () => {
    expect(
      [100, 1_000, 70_000].map((n) => [frameHeaderBytes(n, false), frameHeaderBytes(n, true)]),
    ).toEqual([
      [2, 6],
      [4, 8],
      [10, 14],
    ]);
  });
  it('125 bytes still fit the 7-bit length; 126 need the 16-bit one', () => {
    expect(frameHeaderBytes(125, false)).toBe(2);
    expect(frameHeaderBytes(126, false)).toBe(4);
  });
});

describe('TC-2505: GET, PUT and DELETE are idempotent; POST and PATCH are not', () => {
  it('classifies the five requests', () => {
    expect(REQUESTS.map((r) => [r.method, isIdempotent(r.method)])).toEqual([
      ['GET', true],
      ['PUT', true],
      ['DELETE', true],
      ['POST', false],
      ['PATCH', false],
    ]);
  });
});

describe('TC-2506: a retried idempotent request leaves the server as one request would', () => {
  it('PUT sets the name to Aiko either way; DELETE leaves the cart as [3] either way', () => {
    expect(retry(request('put-name'))).toMatchObject({
      sameAfterRetry: true,
      twice: { name: 'Aiko' },
    });
    expect(retry(request('delete-item'))).toMatchObject({
      sameAfterRetry: true,
      twice: { cart: [3] },
    });
  });
});

describe('TC-2507: a retried POST or PATCH applies twice', () => {
  it('POST /orders makes 2 orders; PATCH +5 points ends at 20 instead of 15', () => {
    expect(retry(request('post-order'))).toMatchObject({
      sameAfterRetry: false,
      once: { orders: 1 },
      twice: { orders: 2 },
    });
    expect(retry(request('patch-points'))).toMatchObject({
      sameAfterRetry: false,
      once: { points: 15 },
      twice: { points: 20 },
    });
  });
  it('every request’s retry outcome matches its method’s idempotency', () => {
    for (const r of REQUESTS) expect(retry(r).sameAfterRetry, r.id).toBe(isIdempotent(r.method));
  });
});
