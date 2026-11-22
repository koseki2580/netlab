import type { Catalog } from '../../../../types';

/** The `ospf` deck's questions (en); its name is in the core chunk. */
export const ospf: Catalog = {
  'learning.concept.ospf.q1.prompt': 'OSPF is a…',
  'learning.concept.ospf.q1.a': 'Link-state protocol',
  'learning.concept.ospf.q1.b': 'Distance-vector protocol',
  'learning.concept.ospf.q1.c': 'Path-vector protocol',
  'learning.concept.ospf.q1.why':
    'OSPF floods link-state advertisements so every router builds the same map and runs SPF (Dijkstra).',
  'learning.concept.ospf.q2.prompt': 'OSPF picks the best path by…',
  'learning.concept.ospf.q2.a': 'The lowest hop count',
  'learning.concept.ospf.q2.b': 'The lowest total link cost',
  'learning.concept.ospf.q2.c': 'The shortest AS-path length',
  'learning.concept.ospf.q2.why':
    'OSPF sums per-link costs; the lowest total cost wins, unlike RIP’s hop count.',
  'learning.concept.ospf.q3.prompt': 'When a link fails, OSPF…',
  'learning.concept.ospf.q3.a': 'Waits for the next periodic timer to fire',
  'learning.concept.ospf.q3.b': 'Does nothing until the next update',
  'learning.concept.ospf.q3.c': 'Re-floods LSAs and recomputes the shortest path',
  'learning.concept.ospf.q3.why':
    'Topology changes trigger new LSAs and a fresh SPF run, so OSPF reconverges around failures.',
  'learning.concept.ospf.q1.b.why':
    'Distance-vector is RIP/EIGRP; OSPF is link-state — every router builds a full map and runs SPF.',
  'learning.concept.ospf.q1.c.why':
    'Path-vector is BGP; OSPF is a link-state IGP that floods LSAs and computes shortest paths.',
  'learning.concept.ospf.q2.a.why':
    'Hop count is RIP’s metric; OSPF sums link costs (often bandwidth-based), not raw hops.',
  'learning.concept.ospf.q2.c.why':
    'AS-path length is BGP’s; within an AS, OSPF chooses by total link cost.',
  'learning.concept.ospf.q3.a.why':
    'OSPF reacts to the topology change immediately by re-flooding LSAs, not by passively waiting on a timer.',
  'learning.concept.ospf.q3.b.why':
    'Doing nothing would keep sending traffic into the dead link — link-state protocols react by design, flooding the change to every router.',
};
