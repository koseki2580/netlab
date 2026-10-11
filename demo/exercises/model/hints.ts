/**
 * Whether what a hint says is still so.
 *
 * A hint is written about the exercise as it starts ("this router has no
 * route for that network"). A learner who has since added the route, with a
 * wrong next router, was told something false. A hint may therefore carry the
 * fact it rests on (`holdsWhile`) and a line for when that fact no longer
 * holds (`instead`).
 */

import type { TopologySnapshot } from '../../../src/types/topology';
import type { ExerciseHint, HintFact, Localised } from './types';

export function factHolds(fact: HintFact, topology: TopologySnapshot): boolean {
  const routes = topology.nodes.find((node) => node.id === fact.nodeId)?.data.staticRoutes ?? [];
  const toThere = routes.filter((route) => route.destination === fact.destination);
  switch (fact.kind) {
    case 'no-route':
      return toThere.length === 0;
    case 'route-via':
      return toThere.some((route) => route.nextHop === fact.nextHop);
  }
}

/** What the hint says for the topology as it is now. */
export function hintText(hint: ExerciseHint, topology: TopologySnapshot): Localised {
  if (hint.holdsWhile && hint.instead && !factHolds(hint.holdsWhile, topology)) return hint.instead;
  return hint.text;
}
