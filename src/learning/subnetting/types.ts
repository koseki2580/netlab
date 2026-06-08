/**
 * The skills a subnetting drill exercises. Each maps to one computed fact (or a
 * yes/no membership test) about an IPv4 subnet.
 */
export type SubnetQuestionKind =
  | 'network-address'
  | 'broadcast-address'
  | 'subnet-mask'
  | 'prefix-from-mask'
  | 'usable-host-count'
  | 'first-usable-host'
  | 'last-usable-host'
  | 'contains-host';

/**
 * Every derivable fact about an IPv4 subnet. `firstUsableHost`/`lastUsableHost`
 * are `null` and `usableHostCount` is `0` for `/31` and `/32`, matching the
 * host-count convention taught in introductory courses.
 */
export interface SubnetFacts {
  readonly cidr: string;
  readonly prefix: number;
  readonly mask: string;
  readonly wildcard: string;
  readonly networkAddress: string;
  readonly broadcastAddress: string;
  readonly firstUsableHost: string | null;
  readonly lastUsableHost: string | null;
  readonly usableHostCount: number;
  readonly totalAddresses: number;
}

/** A single reproducible practice question, identified by its `(seed, seq)`. */
export interface SubnetProblem {
  readonly id: string;
  readonly kind: SubnetQuestionKind;
  readonly prompt: string;
  /** The subnet the question is about, in network/prefix form. */
  readonly givenCidr: string;
  /** Present only for `prefix-from-mask`: the dotted mask the learner reads. */
  readonly givenMask?: string;
  /** Present only for `contains-host`: the host being tested for membership. */
  readonly probeHost?: string;
}

/** The outcome of grading a learner's answer to a {@link SubnetProblem}. */
export interface GradeResult {
  readonly correct: boolean;
  /** The canonical correct answer, so a UI can reveal it. */
  readonly expected: string;
  /** A one-line "why" that turns a wrong answer into a learning moment. */
  readonly explanation: string;
}
