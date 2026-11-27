/** REQ-449 — The real-time web lesson's challenges, checked by its model (TC-2642). */
import { describe, expect, it } from 'vitest';
import { cost } from './websocket';
import { websocketChallenges, type WebSocketChallengeState } from './websocketChallenges';

/** The lesson's controls when the results first appear. */
const INITIAL: WebSocketChallengeState = {
  everyS: 10,
  pollS: 5,
  frameSize: 100,
  fromClient: false,
};

const challenge = (state: Partial<WebSocketChallengeState>, id: string) =>
  websocketChallenges({ ...INITIAL, ...state }).find((c) => c.id === id)!;

describe('TC-2642: the real-time web challenges are reached only by settings the model says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(websocketChallenges(INITIAL).map((c) => [c.id, c.reached])).toEqual([
      ['long-costs-more', false],
      ['slowest-poll', false],
      ['largest-header', false],
    ]);
  });

  it('long polling costs more requests once messages come faster than the 5 s polls', () => {
    const reached = challenge({ everyS: 4 }, 'long-costs-more');
    expect(reached.reached).toBe(true);
    expect(cost('long', 4, 5).requests).toBe(15);
    expect(reached.why.en).toContain('15 requests');
    expect(reached.why.ja).toContain('15 回');
    // As many messages as polls is not more.
    expect(challenge({ everyS: 5 }, 'long-costs-more').reached).toBe(false);
    // Polling faster instead breaks the stated limit.
    expect(challenge({ everyS: 4, pollS: 1 }, 'long-costs-more').reached).toBe(false);
  });

  it('3 s is the slowest poll with an average delay under 2 s; 4 s and 2 s are not', () => {
    const reached = challenge({ pollS: 3 }, 'slowest-poll');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain(`${cost('short', 10, 3).averageDelayMs} ms`);
    expect(reached.why.en).toContain('1525 ms');
    expect(challenge({ pollS: 4 }, 'slowest-poll').reached).toBe(false);
    expect(challenge({ pollS: 2 }, 'slowest-poll').reached).toBe(false);
  });

  it('the 14-byte header needs both the 64-bit length and the client’s mask', () => {
    const reached = challenge({ frameSize: 70_000, fromClient: true }, 'largest-header');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('14 bytes');
    expect(challenge({ frameSize: 70_000, fromClient: false }, 'largest-header').reached).toBe(
      false,
    );
    expect(challenge({ frameSize: 1_000, fromClient: true }, 'largest-header').reached).toBe(false);
  });
});
