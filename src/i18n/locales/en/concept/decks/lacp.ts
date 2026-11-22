import type { Catalog } from '../../../../types';

/** The `lacp` deck's questions (en); its name is in the core chunk. */
export const lacp: Catalog = {
  'learning.concept.lacp.q1.b.why':
    'Loop prevention is STP; LACP bundles several physical links into one logical link.',
  'learning.concept.lacp.q1.c.why':
    'VLAN assignment is switch config (802.1Q); LACP aggregates multiple links into one.',
  'learning.concept.lacp.q2.a.why':
    'Aggregation is an L2 bandwidth/redundancy feature, not a new subnet (that is L3 addressing).',
  'learning.concept.lacp.q2.c.why':
    'LACP does not encrypt; bundling links gives more aggregate bandwidth and link redundancy.',
  'learning.concept.lacp.q3.a.why':
    'Just the opposite — without aggregation those parallel links would be a loop for STP to block; LACP’s negotiation is what makes them one logical link.',
  'learning.concept.lacp.q3.b.why':
    'A port-channel is still L2, not a router; STP treats the correct bundle as a single logical link.',
  'learning.concept.lacp.q1.prompt': 'LACP is used to…',
  'learning.concept.lacp.q1.a': 'Bundle several links into one logical link',
  'learning.concept.lacp.q1.b': 'Prevent loops between switches',
  'learning.concept.lacp.q1.c': 'Assign VLANs to switch ports',
  'learning.concept.lacp.q1.why':
    'LACP negotiates a Link Aggregation Group, combining links for bandwidth and redundancy.',
  'learning.concept.lacp.q2.prompt': 'An aggregated port-channel gives…',
  'learning.concept.lacp.q2.a': 'A new IP subnet for the links',
  'learning.concept.lacp.q2.b': 'More bandwidth and link redundancy',
  'learning.concept.lacp.q2.c': 'Encryption across the bundled links',
  'learning.concept.lacp.q2.why':
    'Traffic is hashed across member links; if one fails the others carry on.',
  'learning.concept.lacp.q3.prompt': 'STP treats a correct LACP bundle as…',
  'learning.concept.lacp.q3.a': 'Multiple loops that must be blocked',
  'learning.concept.lacp.q3.b': 'A router on the segment',
  'learning.concept.lacp.q3.c': 'A single logical link, not a loop',
  'learning.concept.lacp.q3.why':
    'The bundle appears as one link to STP, so it does not block the redundant members.',
};
