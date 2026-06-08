import { isInSubnet, parseCidr } from '../../utils/cidr';
import { subnetFacts } from './solver';
import type { GradeResult, SubnetProblem } from './types';

function factsFor(problem: SubnetProblem) {
  // parseCidr returns { prefix: <ip string>, length: <prefix length> } — the
  // numeric prefix is `length`.
  const { length } = parseCidr(problem.givenCidr);
  const ip = problem.givenCidr.split('/')[0] ?? '0.0.0.0';
  return subnetFacts(ip, length);
}

/** Collapse whitespace and trim — addresses and masks compare exactly after this. */
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Pull the first integer out of an answer, tolerating commas and spaces. */
function normalizeInt(value: string): number | null {
  const digits = value.replace(/[\s,]/g, '');
  if (!/^-?\d+$/.test(digits)) return null;
  return Number.parseInt(digits, 10);
}

/** Map yes/no-style input to a canonical 'yes' | 'no', or null if unrecognized. */
function normalizeBoolean(value: string): 'yes' | 'no' | null {
  const v = value.trim().toLowerCase();
  if (['yes', 'y', 'true', 't', 'in'].includes(v)) return 'yes';
  if (['no', 'n', 'false', 'f', 'out'].includes(v)) return 'no';
  return null;
}

/**
 * The canonical expected answer plus a one-line explanation for a problem.
 * Exported so a UI can reveal the answer without re-deriving it.
 */
export function expectedAnswer(problem: SubnetProblem): { expected: string; explanation: string } {
  const facts = factsFor(problem);

  switch (problem.kind) {
    case 'network-address':
      return {
        expected: facts.networkAddress,
        explanation: `AND the host with the mask ${facts.mask} to clear the host bits.`,
      };
    case 'broadcast-address':
      return {
        expected: facts.broadcastAddress,
        explanation: `Set every host bit: network OR the wildcard ${facts.wildcard}.`,
      };
    case 'subnet-mask':
      return {
        expected: facts.mask,
        explanation: `/${facts.prefix} turns on the ${facts.prefix} highest bits → ${facts.mask}.`,
      };
    case 'prefix-from-mask':
      return {
        expected: `/${facts.prefix}`,
        explanation: `${facts.mask} is ${facts.prefix} contiguous 1-bits, so /${facts.prefix}.`,
      };
    case 'usable-host-count':
      return {
        expected: String(facts.usableHostCount),
        explanation: `2^(32-${facts.prefix}) - 2 = ${facts.usableHostCount} usable hosts.`,
      };
    case 'first-usable-host':
      return {
        expected: facts.firstUsableHost ?? facts.networkAddress,
        explanation: `One above the network ${facts.networkAddress}.`,
      };
    case 'last-usable-host':
      return {
        expected: facts.lastUsableHost ?? facts.broadcastAddress,
        explanation: `One below the broadcast ${facts.broadcastAddress}.`,
      };
    case 'contains-host': {
      const inside = problem.probeHost ? isInSubnet(problem.probeHost, problem.givenCidr) : false;
      return {
        expected: inside ? 'yes' : 'no',
        explanation: inside
          ? `${problem.probeHost} falls within ${facts.networkAddress}–${facts.broadcastAddress}.`
          : `${problem.probeHost} is outside ${facts.networkAddress}–${facts.broadcastAddress}.`,
      };
    }
  }
}

/** Grade a learner's `answer` to `problem`, returning the canonical answer and why. */
export function grade(problem: SubnetProblem, answer: string): GradeResult {
  const { expected, explanation } = expectedAnswer(problem);

  let correct: boolean;
  if (problem.kind === 'usable-host-count') {
    correct = normalizeInt(answer) === Number.parseInt(expected, 10);
  } else if (problem.kind === 'prefix-from-mask') {
    const got = normalizeInt(answer.replace('/', ''));
    correct = got === Number.parseInt(expected.replace('/', ''), 10);
  } else if (problem.kind === 'contains-host') {
    correct = normalizeBoolean(answer) === expected;
  } else {
    correct = normalizeText(answer) === normalizeText(expected);
  }

  return { correct, expected, explanation };
}
