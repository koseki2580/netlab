/**
 * The DR and BDR of a multi-access segment (RFC 2328 §9.4).
 *
 * An election starts from who already holds a role, which is what makes it
 * non-preemptive: a router declaring itself DR or BDR is chosen ahead of any
 * better router that does not.
 */

import { ipToInt } from '../../utils/cidr';

export interface DrCandidate {
  readonly routerId: string;
  /** 0 never stands. */
  readonly priority: number;
}

export interface DesignatedRouters {
  readonly dr: string | null;
  readonly bdr: string | null;
}

function best(candidates: readonly DrCandidate[]): string | null {
  const [winner] = [...candidates].sort(
    (left, right) =>
      right.priority - left.priority || ipToInt(right.routerId) - ipToInt(left.routerId),
  );
  return winner?.routerId ?? null;
}

/** §9.4 steps 2 and 3, given who declares what. */
function round(eligible: readonly DrCandidate[], declared: DesignatedRouters): DesignatedRouters {
  const notDr = eligible.filter((router) => router.routerId !== declared.dr);
  const declaringBdr = notDr.filter((router) => router.routerId === declared.bdr);
  const bdr = best(declaringBdr.length > 0 ? declaringBdr : notDr);
  const dr = eligible.some((router) => router.routerId === declared.dr) ? declared.dr : bdr;
  return { dr, bdr };
}

/**
 * `previous` is the roles before this change; leave it out for routers that
 * start together. A router that has just become DR cannot also be BDR, so the
 * BDR is chosen again as §9.4 step 4 says.
 */
export function electDesignatedRouters(
  candidates: readonly DrCandidate[],
  previous: DesignatedRouters = { dr: null, bdr: null },
): DesignatedRouters {
  const eligible = candidates.filter((router) => router.priority > 0);
  const first = round(eligible, previous);
  return first.dr === first.bdr ? { dr: first.dr, bdr: round(eligible, first).bdr } : first;
}
