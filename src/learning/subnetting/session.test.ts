import { describe, expect, it } from 'vitest';
import {
  currentIndex,
  isComplete,
  recordAnswer,
  sessionProblem,
  sessionSummary,
  startSession,
} from './session';
import type { SubnetProblem } from './types';

function fakeProblem(kind: SubnetProblem['kind']): SubnetProblem {
  return { id: `x-${kind}`, kind, givenCidr: '10.0.0.0/24', prompt: kind };
}

describe('drill session', () => {
  it('starts empty and tracks the current question index', () => {
    const session = startSession(42, 3);
    expect(currentIndex(session)).toBe(0);
    expect(isComplete(session)).toBe(false);
    expect(session.length).toBe(3);
  });

  it('serves a stable problem per index from the seed', () => {
    const session = startSession(42, 5);
    expect(sessionProblem(session)).toEqual(sessionProblem(startSession(42, 5)));
  });

  it('advances and completes after `length` answers, ignoring extra answers', () => {
    let session = startSession(7, 2);
    session = recordAnswer(session, fakeProblem('network-address'), true);
    expect(currentIndex(session)).toBe(1);
    expect(isComplete(session)).toBe(false);
    session = recordAnswer(session, fakeProblem('broadcast-address'), false);
    expect(isComplete(session)).toBe(true);

    const afterComplete = recordAnswer(session, fakeProblem('subnet-mask'), true);
    expect(afterComplete).toBe(session);
    expect(afterComplete.answers).toHaveLength(2);
  });

  it('summarizes overall score and splits kinds into mastered vs review', () => {
    let session = startSession(7, 4);
    session = recordAnswer(session, fakeProblem('network-address'), true);
    session = recordAnswer(session, fakeProblem('network-address'), true);
    session = recordAnswer(session, fakeProblem('broadcast-address'), false);
    session = recordAnswer(session, fakeProblem('subnet-mask'), true);

    const summary = sessionSummary(session);
    expect(summary.correct).toBe(3);
    expect(summary.total).toBe(4);
    expect(summary.mastered).toEqual(['network-address', 'subnet-mask']);
    expect(summary.review).toEqual(['broadcast-address']);
    expect(summary.perKind).toContainEqual({ kind: 'network-address', correct: 2, total: 2 });
  });

  it('treats an empty session as nothing mastered or to review', () => {
    const summary = sessionSummary(startSession(1, 5));
    expect(summary).toEqual({ correct: 0, total: 0, perKind: [], mastered: [], review: [] });
  });
});
