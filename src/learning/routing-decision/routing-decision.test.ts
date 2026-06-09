import { describe, expect, it } from 'vitest';
import { bestRoute } from '../../simulation/pipeline/dispatch/routingHelpers';
import { prefixLength } from '../../utils/cidr';
import { generateRouteProblem, generateRouteSet } from './generator';
import { chosenRoute, expectedNextHop, gradeRoute } from './grader';
import type { RouteProblem } from './types';

describe('generateRouteProblem', () => {
  it('is deterministic for a given (seed, seq)', () => {
    expect(generateRouteProblem(0xfeed, 2)).toEqual(generateRouteProblem(0xfeed, 2));
    expect(generateRouteProblem(0xfeed, 2)).not.toEqual(generateRouteProblem(0xfeed, 3));
  });

  it('always offers a default plus three nested prefixes', () => {
    const problem = generateRouteProblem(123, 0);
    const lengths = problem.routes.map((r) => prefixLength(r.destination)).sort((a, b) => a - b);
    expect(lengths).toEqual([0, 8, 16, 24]);
    expect(problem.id).toBe('route-123-0');
  });

  it('grades its own expected next-hop as correct (round-trip)', () => {
    for (let seq = 0; seq < 200; seq += 1) {
      const problem = generateRouteProblem(0xabc, seq);
      expect(gradeRoute(problem, expectedNextHop(problem)).correct).toBe(true);
    }
  });

  it('matches the simulation engine bestRoute for every generated problem', () => {
    for (let seq = 0; seq < 200; seq += 1) {
      const problem = generateRouteProblem(0xbeef, seq);
      const mine = chosenRoute(problem.dstIp, problem.routes);
      const engine = bestRoute(problem.dstIp, [...problem.routes]);
      expect(mine?.nextHop).toBe(engine?.nextHop);
      expect(mine?.destination).toBe(engine?.destination);
    }
  });

  it('exercises every match depth across a set (default, /8, /16, /24 all win)', () => {
    const winners = new Set(
      generateRouteSet(55, 300).map((problem) =>
        prefixLength(chosenRoute(problem.dstIp, problem.routes)!.destination),
      ),
    );
    expect(winners).toEqual(new Set([0, 8, 16, 24]));
  });
});

describe('gradeRoute', () => {
  it('accepts the longest-prefix next-hop and rejects a less-specific one', () => {
    const problem: RouteProblem = {
      id: 'r',
      dstIp: '10.1.2.3',
      routes: [
        {
          destination: '0.0.0.0/0',
          nextHop: '192.0.2.1',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'r1',
        },
        {
          destination: '10.0.0.0/8',
          nextHop: '192.0.2.2',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'r1',
        },
        {
          destination: '10.1.2.0/24',
          nextHop: '192.0.2.3',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'r1',
        },
      ],
      prompt: 'which?',
    };
    expect(gradeRoute(problem, '192.0.2.3').correct).toBe(true);
    expect(gradeRoute(problem, ' 192.0.2.3 ').correct).toBe(true);
    expect(gradeRoute(problem, '192.0.2.2').correct).toBe(false);
    expect(gradeRoute(problem, '192.0.2.3').explanation).toContain('10.1.2.0/24');
  });

  it('treats a destination with no matching route as a drop', () => {
    const problem: RouteProblem = {
      id: 'r',
      dstIp: '203.0.113.9',
      routes: [
        {
          destination: '10.0.0.0/8',
          nextHop: '192.0.2.2',
          metric: 0,
          protocol: 'static',
          adminDistance: 1,
          nodeId: 'r1',
        },
      ],
      prompt: 'which?',
    };
    expect(expectedNextHop(problem)).toBe('drop');
    expect(gradeRoute(problem, 'drop').correct).toBe(true);
    expect(gradeRoute(problem, 'none').correct).toBe(true);
    expect(gradeRoute(problem, '192.0.2.2').correct).toBe(false);
  });
});
