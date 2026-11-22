import type { Catalog } from '../../../../types';

/** The `eigrp` deck's questions (en); its name is in the core chunk. */
export const eigrp: Catalog = {
  'learning.concept.eigrp.q1.b.why':
    'EIGRP is not pure link-state (that is OSPF/IS-IS); it is an advanced distance-vector protocol using DUAL.',
  'learning.concept.eigrp.q1.c.why':
    'EIGRP is a routing protocol, not an application; it is advanced distance-vector with the DUAL algorithm.',
  'learning.concept.eigrp.q2.a.why':
    'A feasible successor is a pre-computed backup route, not encryption; it enables instant reconvergence.',
  'learning.concept.eigrp.q2.c.why':
    'IP assignment is DHCP; a feasible successor is a loop-free backup so EIGRP reconverges without recomputing.',
  'learning.concept.eigrp.q3.a.why':
    'Hop-count-only is RIP; EIGRP uses a composite metric of bandwidth and delay.',
  'learning.concept.eigrp.q3.b.why':
    'AS-path is BGP’s; EIGRP’s composite metric is based on bandwidth and delay.',
  'learning.concept.eigrp.q1.prompt': 'EIGRP is…',
  'learning.concept.eigrp.q1.a': 'An advanced distance-vector protocol',
  'learning.concept.eigrp.q1.b': 'A pure link-state protocol',
  'learning.concept.eigrp.q1.c': 'An application-layer protocol',
  'learning.concept.eigrp.q1.why':
    'EIGRP is advanced distance-vector; its DUAL algorithm gives fast, loop-free convergence.',
  'learning.concept.eigrp.q2.prompt': 'A feasible successor lets EIGRP…',
  'learning.concept.eigrp.q2.a': 'Encrypt traffic between neighbors',
  'learning.concept.eigrp.q2.b': 'Reconverge fast without recomputation',
  'learning.concept.eigrp.q2.c': 'Assign IP addresses to interfaces',
  'learning.concept.eigrp.q2.why':
    'A precomputed backup route lets EIGRP switch instantly when the primary fails.',
  'learning.concept.eigrp.q3.prompt': 'EIGRP metric is based on…',
  'learning.concept.eigrp.q3.a': 'Hop count only, as RIP does',
  'learning.concept.eigrp.q3.b': 'AS-path length, as BGP does',
  'learning.concept.eigrp.q3.c': 'Bandwidth and delay (composite)',
  'learning.concept.eigrp.q3.why':
    'EIGRP composites bandwidth and delay (optionally load/reliability), unlike RIP hop count.',
};
