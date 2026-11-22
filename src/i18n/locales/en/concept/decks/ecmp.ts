import type { Catalog } from '../../../../types';

/** The `ecmp` deck's questions (en); its name is in the core chunk. */
export const ecmp: Catalog = {
  'learning.concept.ecmp.q1.prompt': 'ECMP is used when…',
  'learning.concept.ecmp.q1.a': 'Several paths to a destination have equal cost',
  'learning.concept.ecmp.q1.b': 'There is only one path to the destination',
  'learning.concept.ecmp.q1.c': 'A link to the destination is down',
  'learning.concept.ecmp.q1.why':
    'When the routing protocol finds multiple equal-cost next-hops, ECMP spreads traffic across them.',
  'learning.concept.ecmp.q2.prompt': 'ECMP usually keeps a flow on one path by…',
  'learning.concept.ecmp.q2.a': 'Random per-packet choice',
  'learning.concept.ecmp.q2.b': 'Hashing the 5-tuple to pick a next-hop',
  'learning.concept.ecmp.q2.c': 'Always using the lowest IP',
  'learning.concept.ecmp.q2.why':
    'Per-flow hashing keeps a connection on one path to avoid reordering, while different flows balance across paths.',
  'learning.concept.ecmp.q3.prompt': 'The benefit of ECMP is…',
  'learning.concept.ecmp.q3.a': 'Encryption of the forwarded traffic',
  'learning.concept.ecmp.q3.b': 'Fewer routes in the table',
  'learning.concept.ecmp.q3.c': 'Load sharing and more total bandwidth',
  'learning.concept.ecmp.q3.why':
    'ECMP uses parallel links simultaneously, increasing throughput and providing redundancy.',
  'learning.concept.ecmp.q1.b.why':
    'With one path there is nothing to balance; ECMP applies when several paths share the same lowest cost.',
  'learning.concept.ecmp.q1.c.why':
    'A down link is failover’s concern; ECMP spreads traffic across multiple equal-cost paths that are up.',
  'learning.concept.ecmp.q2.a.why':
    'Per-packet randomness would reorder a flow; ECMP hashes the 5-tuple so each flow sticks to one path.',
  'learning.concept.ecmp.q2.c.why':
    'It does not just pick the lowest IP; ECMP hashes the flow’s 5-tuple to choose a consistent next-hop.',
  'learning.concept.ecmp.q3.a.why':
    'ECMP does not encrypt; it shares load across equal-cost paths for more aggregate bandwidth.',
  'learning.concept.ecmp.q3.b.why':
    'ECMP uses MORE paths, not fewer routes; the payoff is load sharing and greater total bandwidth.',
};
