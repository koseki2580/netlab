import type { RouteProblem } from '../../learning/routing-decision';
import { chosenRoute } from '../../learning/routing-decision';
import type { SubnetFacts, SubnetProblem } from '../../learning/subnetting';
import type { TranslatorParams } from '../../i18n/types';

/**
 * Single source for how the drill panels turn problems into translator
 * key/params pairs. Pure, so the en output can be asserted equal to the
 * logic-layer graders' English — locking the catalog and the graders together.
 */

/** Catalog key segments per question kind (keys must be camelCase, no hyphens). */
const KIND_SEGMENT: Record<SubnetProblem['kind'], string> = {
  'network-address': 'networkAddress',
  'broadcast-address': 'broadcastAddress',
  'subnet-mask': 'subnetMask',
  'prefix-from-mask': 'prefixFromMask',
  'usable-host-count': 'usableHostCount',
  'first-usable-host': 'firstUsableHost',
  'last-usable-host': 'lastUsableHost',
  'contains-host': 'containsHost',
};

/** Translator key for a question kind's display label. */
export function subnetKindLabelKey(kind: SubnetProblem['kind']): string {
  return `learning.subnet.kind.${KIND_SEGMENT[kind]}`;
}

export function subnetPrompt(problem: SubnetProblem): {
  key: string;
  params: TranslatorParams;
} {
  return {
    key: `learning.subnet.prompt.${KIND_SEGMENT[problem.kind]}`,
    params: {
      cidr: problem.givenCidr,
      prefix: problem.givenCidr.split('/')[1] ?? '',
      mask: problem.givenMask ?? '',
      probe: problem.probeHost ?? '',
    },
  };
}

export function subnetExplanation(
  problem: SubnetProblem,
  facts: SubnetFacts,
  expected: string,
): { key: string; params: TranslatorParams } {
  const key =
    problem.kind === 'contains-host'
      ? `learning.subnet.explain.containsHost${expected === 'yes' ? 'Inside' : 'Outside'}`
      : `learning.subnet.explain.${KIND_SEGMENT[problem.kind]}`;
  return {
    key,
    params: {
      mask: facts.mask,
      wildcard: facts.wildcard,
      prefix: facts.prefix,
      count: facts.usableHostCount,
      network: facts.networkAddress,
      broadcast: facts.broadcastAddress,
      probe: problem.probeHost ?? '',
    },
  };
}

export function routePrompt(problem: RouteProblem): { key: string; params: TranslatorParams } {
  return { key: 'learning.route.prompt', params: { dst: problem.dstIp } };
}

export function routeExplanation(problem: RouteProblem): {
  key: string;
  params: TranslatorParams;
} {
  const winner = chosenRoute(problem.dstIp, problem.routes);
  return winner
    ? {
        key: 'learning.route.explain.matched',
        params: { destination: winner.destination, nextHop: winner.nextHop },
      }
    : { key: 'learning.route.explain.dropped', params: { dst: problem.dstIp } };
}
