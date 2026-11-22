import type { Catalog } from '../../../../types';

/** The `rip` deck's questions (en); its name is in the core chunk. */
export const rip: Catalog = {
  'learning.concept.rip.q1.prompt': 'RIP selects routes by…',
  'learning.concept.rip.q1.a': 'Hop count (distance vector)',
  'learning.concept.rip.q1.b': 'Link cost, as OSPF does',
  'learning.concept.rip.q1.c': 'AS path length, as BGP does',
  'learning.concept.rip.q1.why':
    'RIP counts router hops; the fewest-hops path wins, regardless of link speed.',
  'learning.concept.rip.q2.prompt': 'RIP’s maximum usable hop count is…',
  'learning.concept.rip.q2.a': '255 hops',
  'learning.concept.rip.q2.b': '15 hops',
  'learning.concept.rip.q2.c': 'No limit at all',
  'learning.concept.rip.q2.why':
    'RIP caps at 15 hops; 16 counts as infinity, which bounds its use to small networks.',
  'learning.concept.rip.q3.prompt': 'Compared with OSPF, RIP…',
  'learning.concept.rip.q3.a': 'Converges faster after a change',
  'learning.concept.rip.q3.b': 'Scales to much larger networks',
  'learning.concept.rip.q3.c': 'Is simpler but slower and size-limited',
  'learning.concept.rip.q3.why':
    'RIP’s periodic distance-vector updates are easy but converge slowly and don’t scale like link-state OSPF.',
  'learning.concept.rip.q1.b.why':
    'Link cost is OSPF’s metric; RIP is distance-vector and simply counts hops.',
  'learning.concept.rip.q1.c.why': 'AS-path is BGP’s; RIP picks routes by hop count.',
  'learning.concept.rip.q2.a.why':
    'RIP caps far lower than 255 — 15 hops are usable and 16 means unreachable (limiting loops).',
  'learning.concept.rip.q2.c.why':
    'RIP is deliberately limited: 15 hops max, with 16 marking unreachable — it does not scale unbounded.',
  'learning.concept.rip.q3.a.why':
    'RIP converges slower than OSPF (periodic updates, counting to infinity), not faster.',
  'learning.concept.rip.q3.b.why':
    'RIP’s 15-hop limit keeps it small; OSPF is the one that scales to large networks.',
};
