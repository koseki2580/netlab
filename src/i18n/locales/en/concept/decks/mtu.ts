import type { Catalog } from '../../../../types';

/** The `mtu` deck's questions (en); its name is in the core chunk. */
export const mtu: Catalog = {
  'learning.concept.mtu.q1.prompt': 'The MTU is…',
  'learning.concept.mtu.q1.a': 'The largest payload a link carries in one frame',
  'learning.concept.mtu.q1.b': 'The minimum packet size the link will accept',
  'learning.concept.mtu.q1.c': 'A routing metric used to pick paths',
  'learning.concept.mtu.q1.why':
    'Each link has a maximum transmission unit; packets larger than it must be fragmented or rejected.',
  'learning.concept.mtu.q2.prompt': 'Path MTU Discovery works by…',
  'learning.concept.mtu.q2.a': 'Pinging every host along the path',
  'learning.concept.mtu.q2.b': 'Sending DF packets and reading the ICMP replies',
  'learning.concept.mtu.q2.c': 'Asking DNS for the path MTU value',
  'learning.concept.mtu.q2.why':
    'The sender marks packets DF; a router that cannot forward returns ICMP with the next-hop MTU, so the sender shrinks packets.',
  'learning.concept.mtu.q3.prompt': 'A too-large packet with DF set is…',
  'learning.concept.mtu.q3.a': 'Fragmented by the router anyway',
  'learning.concept.mtu.q3.b': 'Silently delivered to the far end',
  'learning.concept.mtu.q3.c': 'Dropped, with an ICMP message returned',
  'learning.concept.mtu.q3.why':
    'With DF set the router cannot fragment, so it drops the packet and signals the problem via ICMP.',
  'learning.concept.mtu.q1.b.why':
    'It is the MAXIMUM, not minimum — the largest payload a link carries in one frame.',
  'learning.concept.mtu.q1.c.why':
    'A routing metric ranks paths; the MTU is the largest frame payload a link allows.',
  'learning.concept.mtu.q2.a.why':
    'PMTUD does not ping every host; it sends DF-set packets and reads back ICMP Fragmentation Needed.',
  'learning.concept.mtu.q2.c.why':
    'DNS resolves names, not path sizes; PMTUD probes with DF packets and ICMP feedback.',
  'learning.concept.mtu.q3.a.why':
    'Fragmenting would defeat DF’s whole purpose — Path MTU Discovery sets that bit precisely so the sender learns of the bottleneck instead.',
  'learning.concept.mtu.q3.b.why':
    'An oversized packet physically cannot fit through the smaller link — and far from silent, the sender is explicitly told so it can resend smaller.',
};
