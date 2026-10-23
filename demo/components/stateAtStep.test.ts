import { describe, expect, it } from 'vitest';
import type { PacketTrace } from '../../src/types/simulation';
import { atLastHop, BEFORE_FIRST_STEP, shownStep } from './stateAtStep';

const hop = (step: number) => ({
  step,
  nodeId: `n${step}`,
  nodeLabel: `N${step}`,
  srcIp: '10.0.0.1',
  dstIp: '10.0.0.2',
  ttl: 64,
  protocol: 'ICMP',
  event: 'forward' as const,
  timestamp: step,
});
const TRACE: PacketTrace = {
  packetId: 'ping',
  srcNodeId: 'n0',
  dstNodeId: 'n3',
  status: 'delivered',
  hops: [hop(0), hop(1), hop(2), hop(3)],
};

// TC-731: one rule decides what is on screen at a step: nothing a hop changed
// shows before the learner has stepped to it, so before the first step and
// after Reset only what was there at start-up shows.
describe('the step on screen (TC-731)', () => {
  const state = (currentTraceId: string | null, currentStep: number) => ({
    traces: [TRACE, { ...TRACE, packetId: 'later' }],
    currentTraceId,
    currentStep,
  });

  it('reads the selected trace, or the latest one when asked to', () => {
    expect(shownStep(state('ping', 2))).toEqual({ trace: TRACE, step: 2 });
    expect(shownStep(state(null, BEFORE_FIRST_STEP)).trace).toBeNull();
    expect(
      shownStep(state(null, BEFORE_FIRST_STEP), { fallBackToLast: true }).trace?.packetId,
    ).toBe('later');
  });

  it('has reached the last hop only when stepped to it', () => {
    expect(atLastHop({ trace: TRACE, step: BEFORE_FIRST_STEP })).toBe(false);
    expect(atLastHop({ trace: TRACE, step: TRACE.hops.length - 2 })).toBe(false);
    expect(atLastHop({ trace: TRACE, step: TRACE.hops.length - 1 })).toBe(true);
    expect(atLastHop({ trace: null, step: 3 })).toBe(false);
  });
});
