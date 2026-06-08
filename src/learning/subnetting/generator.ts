import { intToIp, ipToInt, networkAddress } from '../../utils/cidr';
import { splitmix64 } from '../../utils/prng';
import { maskInt, subnetFacts } from './solver';
import type { SubnetProblem, SubnetQuestionKind } from './types';

const KINDS: readonly SubnetQuestionKind[] = [
  'network-address',
  'broadcast-address',
  'subnet-mask',
  'prefix-from-mask',
  'usable-host-count',
  'first-usable-host',
  'last-usable-host',
  'contains-host',
];

/** Inclusive prefix range each question kind draws from. */
const PREFIX_RANGE: Record<SubnetQuestionKind, readonly [number, number]> = {
  'network-address': [8, 30],
  'broadcast-address': [8, 30],
  'subnet-mask': [8, 30],
  'prefix-from-mask': [8, 30],
  'usable-host-count': [16, 30],
  'first-usable-host': [16, 30],
  'last-usable-host': [16, 30],
  'contains-host': [16, 28],
};

function intIn(draw: number, loInclusive: number, hiInclusive: number): number {
  const span = hiInclusive - loInclusive + 1;
  return loInclusive + Math.min(span - 1, Math.floor(draw * span));
}

function randomHostInt(rng: () => number): number {
  const o1 = 1 + intIn(rng(), 0, 222); // 1..223, avoid 0.x and 224+ (multicast/reserved)
  const o2 = intIn(rng(), 0, 255);
  const o3 = intIn(rng(), 0, 255);
  const o4 = intIn(rng(), 0, 255);
  return ((o1 << 24) | (o2 << 16) | (o3 << 8) | o4) >>> 0;
}

/**
 * Produce a reproducible subnetting problem from `(seed, seq)`. The same pair
 * always yields the same problem (shared `splitmix64` PRNG), so drills are
 * shareable and property-testable.
 */
export function generateProblem(seed: number, seq = 0): SubnetProblem {
  const rng = splitmix64((BigInt(seed >>> 0) << 32n) ^ BigInt(seq >>> 0));

  const kind = KINDS[intIn(rng(), 0, KINDS.length - 1)] as SubnetQuestionKind;
  const [lo, hi] = PREFIX_RANGE[kind];
  const prefix = intIn(rng(), lo, hi);

  const baseInt = randomHostInt(rng);
  const network = networkAddress(intToIp(baseInt), prefix);
  const facts = subnetFacts(network, prefix);
  const id = `subnet-${seed >>> 0}-${seq >>> 0}`;

  if (kind === 'subnet-mask') {
    return {
      id,
      kind,
      givenCidr: `${network}/${prefix}`,
      prompt: `What is the subnet mask (dotted decimal) for a /${prefix} network?`,
    };
  }

  if (kind === 'prefix-from-mask') {
    return {
      id,
      kind,
      givenCidr: `${network}/${prefix}`,
      givenMask: facts.mask,
      prompt: `What prefix length (/n) does the subnet mask ${facts.mask} represent?`,
    };
  }

  if (kind === 'contains-host') {
    const networkInt = ipToInt(network);
    const mask = maskInt(prefix);
    const inside = rng() < 0.5;
    let hostInt: number;
    if (inside) {
      const offset = intIn(rng(), 0, facts.totalAddresses - 1);
      hostInt = (networkInt + offset) >>> 0;
    } else {
      const candidate = randomHostInt(rng);
      // Force it outside the block by toggling the bit just above the prefix.
      hostInt =
        (candidate & mask) === (networkInt & mask)
          ? (candidate ^ (1 << (32 - prefix))) >>> 0
          : candidate;
    }
    return {
      id,
      kind,
      givenCidr: `${network}/${prefix}`,
      probeHost: intToIp(hostInt),
      prompt: `Is the host ${intToIp(hostInt)} part of the subnet ${network}/${prefix}? (yes/no)`,
    };
  }

  // Address / count questions are posed about a non-trivial host in the block.
  const hostOffset = intIn(rng(), 1, Math.max(1, facts.totalAddresses - 1));
  const givenHost = intToIp((ipToInt(network) + hostOffset) >>> 0);
  const PROMPTS: Partial<Record<SubnetQuestionKind, string>> = {
    'network-address': `What is the network address of ${givenHost}/${prefix}?`,
    'broadcast-address': `What is the broadcast address of ${givenHost}/${prefix}?`,
    'usable-host-count': `How many usable hosts are in ${givenHost}/${prefix}?`,
    'first-usable-host': `What is the first usable host of ${givenHost}/${prefix}?`,
    'last-usable-host': `What is the last usable host of ${givenHost}/${prefix}?`,
  };

  return {
    id,
    kind,
    givenCidr: `${givenHost}/${prefix}`,
    prompt: PROMPTS[kind] ?? `Subnet question about ${givenHost}/${prefix}.`,
  };
}

/** Generate `count` problems with stable per-index seeds. */
export function generateSet(seed: number, count: number): SubnetProblem[] {
  return Array.from({ length: Math.max(0, count) }, (_, seq) => generateProblem(seed, seq));
}
