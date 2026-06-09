import type { RouteEntry } from '../../types/routing';
import { isInSubnet, prefixLength } from '../../utils/cidr';
import type { RouteGradeResult, RouteProblem } from './types';

/**
 * Longest-prefix match: the most specific route whose subnet contains `dstIp`.
 * This is the same algorithm the simulation engine uses in `bestRoute`
 * (an equivalence test guards against drift); kept local so the learning
 * module stays decoupled from the simulation pipeline.
 */
export function chosenRoute(dstIp: string, routes: readonly RouteEntry[]): RouteEntry | null {
  return (
    [...routes]
      .sort((a, b) => prefixLength(b.destination) - prefixLength(a.destination))
      .find((route) => isInSubnet(dstIp, route.destination)) ?? null
  );
}

/** The next-hop the router will use, or `'drop'` when no route matches. */
export function expectedNextHop(problem: RouteProblem): string {
  return chosenRoute(problem.dstIp, problem.routes)?.nextHop ?? 'drop';
}

/** Grade a learner's chosen next-hop against the longest-prefix-match winner. */
export function gradeRoute(problem: RouteProblem, answer: string): RouteGradeResult {
  const winner = chosenRoute(problem.dstIp, problem.routes);
  const expected = winner?.nextHop ?? 'drop';
  const normalized = answer.trim().toLowerCase();

  const correct =
    winner === null
      ? ['drop', 'none', 'no route', 'discard'].includes(normalized)
      : normalized === expected.toLowerCase();

  const explanation = winner
    ? `Longest-prefix match: ${winner.destination} → ${winner.nextHop} — more specific than the other matching routes.`
    : `No route matches ${problem.dstIp}, so the packet is dropped.`;

  return { correct, expected, explanation };
}
