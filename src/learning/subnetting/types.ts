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

export type { SubnetFacts } from '../../utils/cidr';

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
