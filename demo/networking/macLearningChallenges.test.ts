/** REQ-449 — The MAC learning lesson's challenges, checked by its model (TC-2646). */
import { describe, expect, it } from 'vitest';
import { AGEING_TIME_S, agedScene } from './macLearning';
import { macLearningChallenges, type MacLearningChallengeState } from './macLearningChallenges';

/** The ageing controls when they first appear. */
const INITIAL: MacLearningChallengeState = { idleS: 400, ageingS: AGEING_TIME_S };

const challenge = (state: Partial<MacLearningChallengeState>, id: string) =>
  macLearningChallenges({ ...INITIAL, ...state }).find((c) => c.id === id)!;

describe('TC-2646: the MAC learning challenges are reached only by settings the model says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(macLearningChallenges(INITIAL).map((c) => [c.id, c.reached])).toEqual([
      ['keep-entry', false],
      ['longest-silence', false],
      ['flood-soon', false],
    ]);
  });

  it('an ageing time above 400 s keeps A’s entry after 400 s of silence; exactly 400 s does not', () => {
    const reached = challenge({ ageingS: 420 }, 'keep-entry');
    expect(reached.reached).toBe(true);
    expect(agedScene(400, 420).egress).toEqual([1]);
    expect(reached.why.en).toContain('refreshed 400 s before');
    expect(reached.why.en).toContain('leaves by port 1 only');
    expect(challenge({ ageingS: 390 }, 'keep-entry').reached).toBe(false);
    // Shortening the silence instead breaks the stated limit.
    expect(challenge({ idleS: 120 }, 'keep-entry').reached).toBe(false);
  });

  it('with the 300 s ageing time, 290 s is the longest silence that still forwards; 280 s and 300 s are not', () => {
    const reached = challenge({ idleS: 290 }, 'longest-silence');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('After 300 s it has reached the ageing time');
    expect(reached.why.en).toContain('floods out of ports 1, 3, 4');
    expect(challenge({ idleS: 280 }, 'longest-silence').reached).toBe(false);
    expect(challenge({ idleS: 300 }, 'longest-silence').reached).toBe(false);
    expect(challenge({ idleS: 410, ageingS: 420 }, 'longest-silence').reached).toBe(false);
  });

  it('a 60 s ageing time floods B → A after 60 s of silence; a 90 s one does not', () => {
    const reached = challenge({ idleS: 60, ageingS: 60 }, 'flood-soon');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('60 s ageing time, 60 s of silence');
    expect(reached.why.ja).toContain('ポート 1, 3, 4 へフラッディング');
    expect(challenge({ idleS: 60, ageingS: 90 }, 'flood-soon').reached).toBe(false);
    expect(challenge({ idleS: 70, ageingS: 60 }, 'flood-soon').reached).toBe(false);
  });
});
