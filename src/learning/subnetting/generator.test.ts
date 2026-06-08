import { describe, expect, it } from 'vitest';
import { parseCidr } from '../../utils/cidr';
import { generateProblem, generateSet } from './generator';
import { expectedAnswer, grade } from './grader';

describe('generateProblem', () => {
  it('is deterministic for a given (seed, seq)', () => {
    expect(generateProblem(0xc0ffee, 3)).toEqual(generateProblem(0xc0ffee, 3));
    expect(generateProblem(0xc0ffee, 3)).not.toEqual(generateProblem(0xc0ffee, 4));
  });

  it('produces a well-formed, parseable problem', () => {
    const problem = generateProblem(42, 0);
    expect(problem.id).toBe('subnet-42-0');
    expect(problem.prompt.length).toBeGreaterThan(0);
    const { length } = parseCidr(problem.givenCidr);
    expect(length).toBeGreaterThanOrEqual(8);
    expect(length).toBeLessThanOrEqual(30);
    if (problem.kind === 'contains-host') {
      expect(problem.probeHost).toBeDefined();
    }
    if (problem.kind === 'prefix-from-mask') {
      expect(problem.givenMask).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }
  });

  it('grades its own canonical answer as correct (generator/solver/grader round-trip)', () => {
    for (let seq = 0; seq < 200; seq += 1) {
      const problem = generateProblem(0x12345, seq);
      const { expected } = expectedAnswer(problem);
      const result = grade(problem, expected);
      expect(result.correct, `${problem.kind} "${problem.prompt}" expected "${expected}"`).toBe(
        true,
      );
    }
  });

  it('covers every question kind across a large set', () => {
    const kinds = new Set(generateSet(7, 400).map((problem) => problem.kind));
    expect(kinds.size).toBe(8);
  });

  it('generateSet returns the requested count with stable ids', () => {
    const set = generateSet(99, 5);
    expect(set).toHaveLength(5);
    expect(set.map((p) => p.id)).toEqual([
      'subnet-99-0',
      'subnet-99-1',
      'subnet-99-2',
      'subnet-99-3',
      'subnet-99-4',
    ]);
    expect(generateSet(99, 0)).toEqual([]);
  });
});
