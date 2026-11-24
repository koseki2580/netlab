/** The websocket concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { websocket as en } from '../../src/i18n/locales/en/concept/decks/websocket';
import { websocket as ja } from '../../src/i18n/locales/ja/concept/decks/websocket';
import { DECK } from '../../src/learning/concept-check/lessonDecks/websocket';
import { ONE_WAY_MS, REQUESTS, cost, frameHeaderBytes, isIdempotent, retry } from './websocket';

const request = (id: string) => REQUESTS.find((entry) => entry.id === id)!;

describe('TC-2509: websocket deck facts', () => {
  it('q1: polling every 5 s, a message waits 2.5 s on average (2,525 ms with the trip back)', () => {
    const short = cost('short', 10, 5);
    expect(short.averageDelayMs - ONE_WAY_MS).toBe(2500);
    expect(short.averageDelayMs).toBe(2525);
  });

  it('q2: short polling costs 7,800 bytes in 12 requests; a WebSocket about 1,250 in one handshake', () => {
    expect(cost('short', 10, 5)).toMatchObject({ requests: 12, bytes: 7800 });
    const ws = cost('websocket', 10, 5);
    expect(ws.requests).toBe(1);
    expect(Math.round(ws.bytes / 50) * 50).toBe(1250);
    expect(frameHeaderBytes(100, false)).toBe(2);
  });

  it('q3: a 100-byte frame has a 2-byte header from the server and 6 from the client', () => {
    expect(frameHeaderBytes(100, false)).toBe(2);
    expect(frameHeaderBytes(100, true)).toBe(6);
    expect(frameHeaderBytes(65_536, false)).toBe(10);
  });

  it('q4: PUT is idempotent and a retry leaves the name Aiko; POST and PATCH change again', () => {
    expect(isIdempotent('PUT')).toBe(true);
    expect(retry(request('put-name'))).toMatchObject({
      sameAfterRetry: true,
      twice: { name: 'Aiko' },
    });
    expect(retry(request('post-order')).twice.orders).toBe(2);
    expect(
      retry(request('patch-points')).twice.points - retry(request('patch-points')).once.points,
    ).toBe(5);
    expect(isIdempotent('POST') || isIdempotent('PATCH')).toBe(false);
  });
});

describe('websocket deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.websocket.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('every wrong option has its own why, and the right one has none', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.websocket.${q}`;
        expect(catalog[`${base}.why`], base).toBeTruthy();
        for (const letter of ['a', 'b', 'c'] as const) {
          expect(catalog[`${base}.${letter}.why`] !== undefined, `${base}.${letter}`).toBe(
            letter !== answer,
          );
        }
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
