import type { Catalog } from '../../../../types';

/** The `mpls` deck's questions (en); its name is in the core chunk. */
export const mpls: Catalog = {
  'learning.concept.mpls.q1.prompt': 'MPLS forwards packets by…',
  'learning.concept.mpls.q1.a': 'Swapping short labels instead of an IP lookup',
  'learning.concept.mpls.q1.b': 'Broadcasting the packet to every interface',
  'learning.concept.mpls.q1.c': 'Resolving the next hop with ARP each time',
  'learning.concept.mpls.q1.why':
    'An edge router pushes a label; core routers swap labels along a pre-set path, avoiding a full routing-table lookup per hop.',
  'learning.concept.mpls.q2.prompt': 'The path a labeled packet follows is called…',
  'learning.concept.mpls.q2.a': 'A broadcast domain',
  'learning.concept.mpls.q2.b': 'A Label Switched Path (LSP)',
  'learning.concept.mpls.q2.c': 'An autonomous system',
  'learning.concept.mpls.q2.why':
    'Labels define an LSP through the MPLS core, set up independently of per-hop destination lookups.',
  'learning.concept.mpls.q3.prompt': 'MPLS sits…',
  'learning.concept.mpls.q3.a': 'Above HTTP, in the application',
  'learning.concept.mpls.q3.b': 'Below Ethernet, on the physical link',
  'learning.concept.mpls.q3.c': 'Between L2 and L3 (often called layer 2.5)',
  'learning.concept.mpls.q3.why':
    'MPLS adds a shim label between the link header and the network header, so it is described as layer 2.5.',
  'learning.concept.mpls.q1.b.why':
    'MPLS does not broadcast; it swaps short labels along a pre-set path instead of a per-hop IP lookup.',
  'learning.concept.mpls.q1.c.why':
    'ARP resolves IP→MAC; MPLS forwards by swapping labels, skipping the IP routing lookup.',
  'learning.concept.mpls.q2.a.why':
    'A broadcast domain is an L2 concept; the label-switched route through an MPLS network is the LSP.',
  'learning.concept.mpls.q2.c.why':
    'An AS is a BGP routing domain; within MPLS the labeled path is the Label Switched Path (LSP).',
  'learning.concept.mpls.q3.a.why':
    'HTTP is an L7 application; MPLS sits low, between L2 and L3 (often called layer 2.5).',
  'learning.concept.mpls.q3.b.why':
    'MPLS rides on top of L2 links (like Ethernet), not below them — it sits between L2 and L3.',
};
