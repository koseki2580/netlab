import type { RouteEntry } from '../../types/routing';

/** A longest-prefix-match question: a destination plus a routing table. */
export interface RouteProblem {
  readonly id: string;
  readonly dstIp: string;
  readonly routes: readonly RouteEntry[];
  readonly prompt: string;
}

/** The outcome of grading a chosen next-hop against the LPM winner. */
export interface RouteGradeResult {
  readonly correct: boolean;
  /** The next-hop of the longest-prefix-match route. */
  readonly expected: string;
  /** A one-line "why" naming the winning route. */
  readonly explanation: string;
}
