import type { Catalog } from '../../../../types';

/** The `stp` deck's questions (en); its name is in the core chunk. */
export const stp: Catalog = {
  'learning.concept.stp.q1.prompt': 'What problem does Spanning Tree prevent?',
  'learning.concept.stp.q1.a': 'IP address exhaustion',
  'learning.concept.stp.q1.b': 'Layer-2 forwarding loops',
  'learning.concept.stp.q1.c': 'Routing loops',
  'learning.concept.stp.q1.why':
    'Redundant switch links would loop broadcasts forever; STP blocks ports to form a loop-free tree.',
  'learning.concept.stp.q2.prompt': 'The switch chosen as the reference point of the tree is the…',
  'learning.concept.stp.q2.a': 'Root bridge',
  'learning.concept.stp.q2.b': 'Designated router',
  'learning.concept.stp.q2.c': 'Default gateway',
  'learning.concept.stp.q2.why':
    'The bridge with the lowest priority/MAC becomes the root; all path costs are measured toward it.',
  'learning.concept.stp.q3.prompt': 'A blocked STP port…',
  'learning.concept.stp.q3.a': 'Is physically disconnected from the switch',
  'learning.concept.stp.q3.b': 'Forwards data but ignores BPDUs',
  'learning.concept.stp.q3.c': 'Listens to BPDUs but forwards no data',
  'learning.concept.stp.q3.why':
    'Blocked ports still listen to BPDUs so STP can reactivate them if the topology changes.',
  'learning.concept.stp.q1.a.why':
    'IP exhaustion is solved by NAT/IPv6; STP prevents Layer-2 forwarding loops in a switched network.',
  'learning.concept.stp.q1.c.why':
    'Routing loops are an L3 concern (TTL, routing protocols); STP stops L2 forwarding loops between switches.',
  'learning.concept.stp.q2.b.why':
    'A designated router is an OSPF (L3) role; STP’s reference point is the elected root bridge.',
  'learning.concept.stp.q2.c.why':
    'The default gateway is the exit router for a subnet (L3); STP’s anchor is the root bridge.',
  'learning.concept.stp.q3.a.why':
    'A blocked port is still physically up; it just stops forwarding data while listening to BPDUs.',
  'learning.concept.stp.q3.b.why':
    'It is the opposite — a blocked port drops data frames but still processes BPDUs to watch the topology.',
};
