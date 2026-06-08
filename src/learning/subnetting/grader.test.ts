import { describe, expect, it } from 'vitest';
import { expectedAnswer, grade } from './grader';
import type { SubnetProblem } from './types';

const networkProblem: SubnetProblem = {
  id: 'p1',
  kind: 'network-address',
  givenCidr: '192.168.1.37/24',
  prompt: 'network?',
};

describe('grade', () => {
  it('accepts the exact network address and tolerates surrounding whitespace', () => {
    expect(grade(networkProblem, '192.168.1.0').correct).toBe(true);
    expect(grade(networkProblem, '  192.168.1.0  ').correct).toBe(true);
    expect(grade(networkProblem, '192.168.1.255').correct).toBe(false);
  });

  it('reveals the canonical answer and an explanation regardless of correctness', () => {
    const result = grade(networkProblem, 'wrong');
    expect(result.correct).toBe(false);
    expect(result.expected).toBe('192.168.1.0');
    expect(result.explanation).toContain('255.255.255.0');
  });

  it('parses usable-host counts with commas and spaces', () => {
    const problem: SubnetProblem = {
      id: 'p2',
      kind: 'usable-host-count',
      givenCidr: '10.0.0.0/16',
      prompt: 'hosts?',
    };
    expect(grade(problem, '65534').correct).toBe(true);
    expect(grade(problem, '65,534').correct).toBe(true);
    expect(grade(problem, '65 534').correct).toBe(true);
    expect(grade(problem, '65535').correct).toBe(false);
    expect(grade(problem, 'lots').correct).toBe(false);
  });

  it('accepts a prefix answer with or without the slash', () => {
    const problem: SubnetProblem = {
      id: 'p3',
      kind: 'prefix-from-mask',
      givenCidr: '192.168.0.0/26',
      givenMask: '255.255.255.192',
      prompt: 'prefix?',
    };
    expect(grade(problem, '/26').correct).toBe(true);
    expect(grade(problem, '26').correct).toBe(true);
    expect(grade(problem, '24').correct).toBe(false);
  });

  it('accepts yes/no variants for membership questions', () => {
    const inside: SubnetProblem = {
      id: 'p4',
      kind: 'contains-host',
      givenCidr: '192.168.1.0/24',
      probeHost: '192.168.1.50',
      prompt: 'in?',
    };
    expect(grade(inside, 'yes').correct).toBe(true);
    expect(grade(inside, 'Y').correct).toBe(true);
    expect(grade(inside, 'true').correct).toBe(true);
    expect(grade(inside, 'no').correct).toBe(false);

    const outside: SubnetProblem = { ...inside, id: 'p5', probeHost: '192.168.2.50' };
    expect(expectedAnswer(outside).expected).toBe('no');
    expect(grade(outside, 'n').correct).toBe(true);
    expect(grade(outside, 'yes').correct).toBe(false);
  });

  it('returns false (not a throw) for unrecognized boolean input', () => {
    const problem: SubnetProblem = {
      id: 'p6',
      kind: 'contains-host',
      givenCidr: '192.168.1.0/24',
      probeHost: '192.168.1.50',
      prompt: 'in?',
    };
    expect(grade(problem, 'maybe').correct).toBe(false);
  });
});
