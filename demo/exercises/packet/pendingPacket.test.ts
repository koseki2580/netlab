// @vitest-environment node
/**
 * TC-1604 — a packet exercise left without a Check is the one offered again,
 * as the device exercises already do: leaving used to give another problem.
 */
import { describe, expect, it } from 'vitest';
import type { AttemptRecord } from '../store/types';
import { nextPacketFor, tracked } from './packetSource';

const attempt = (exerciseId: string, over: Partial<AttemptRecord> = {}): AttemptRecord =>
  ({
    id: `${tracked(exerciseId)}@1`,
    exerciseId: tracked(exerciseId),
    templateId: tracked(exerciseId.split('~')[0] ?? ''),
    level: 1,
    kind: 'read-packet',
    context: 'practice',
    startedAt: 1,
    outcome: 'abandoned',
    checkPresses: 0,
    hintsUsed: 0,
    revealed: false,
    ...over,
  }) as AttemptRecord;

describe('a packet problem left unanswered comes back (TC-1604)', () => {
  it('offers the problem opened and left without a Check', () => {
    expect(nextPacketFor(1, [attempt('p1-which~7')])).toBe('p1-which~7');
  });

  it('offers a new one once that problem was checked', () => {
    const judged = attempt('p1-which~7', { checkPresses: 1, outcome: 'passed' });
    expect(nextPacketFor(1, [judged])).not.toBe('p1-which~7');
  });

  it('does not offer the problem the learner is leaving by "next"', () => {
    expect(nextPacketFor(1, [attempt('p1-which~7')], 'p1-which~7')).not.toBe('p1-which~7');
  });
});
