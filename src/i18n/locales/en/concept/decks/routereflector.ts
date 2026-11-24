import type { Catalog } from '../../../../types';

/** The `routereflector` deck's questions (en); its name is in the core chunk. */
export const routereflector: Catalog = {
  'learning.concept.routereflector.q1.prompt':
    'An AS running an iBGP full mesh grows from 10 routers to 20. How many iBGP sessions does the mesh need now?',
  'learning.concept.routereflector.q1.a': '40, twice as many as before',
  'learning.concept.routereflector.q1.b': '190, about four times as many',
  'learning.concept.routereflector.q1.c': '380, one for each direction',
  'learning.concept.routereflector.q1.why':
    'Every pair needs its own session: 20 × 19 / 2 = 190, against 10 × 9 / 2 = 45. The count grows with the square of the number of routers.',
  'learning.concept.routereflector.q1.a.why':
    'Doubling the routers more than doubles the pairs: each new router needs a session with every router already there.',
  'learning.concept.routereflector.q1.c.why':
    'One TCP session carries updates both ways, so a pair needs one session, not two.',
  'learning.concept.routereflector.q2.prompt':
    'Three routers have iBGP sessions A–B and B–C only, and B is a plain iBGP router. A learns a prefix from its eBGP neighbour. Does C learn it?',
  'learning.concept.routereflector.q2.a': 'Yes: B passes it on as it would any route',
  'learning.concept.routereflector.q2.b': 'Yes, with B’s AS added to the AS_PATH',
  'learning.concept.routereflector.q2.c': 'No: B keeps routes learned over iBGP from iBGP peers',
  'learning.concept.routereflector.q2.why':
    'A route learned from an iBGP peer is not advertised to another iBGP peer (RFC 4271 §9.2). Inside one AS the AS_PATH does not grow, so this rule is what prevents loops, and it is why iBGP needs a full mesh or reflectors.',
  'learning.concept.routereflector.q2.a.why':
    'That is what B does with a route from eBGP. A route it heard over iBGP stops at B.',
  'learning.concept.routereflector.q2.b.why':
    'Routers inside one AS do not add their AS to the AS_PATH; that only happens on eBGP. And B does not pass the route on at all.',
  'learning.concept.routereflector.q3.prompt':
    'B is made a route reflector with A and C as its clients, and now reflects A’s route to C. What NEXT_HOP does C see?',
  'learning.concept.routereflector.q3.a': 'A’s eBGP neighbour, unchanged',
  'learning.concept.routereflector.q3.b': 'B’s own address, as the reflector',
  'learning.concept.routereflector.q3.c': 'A’s router ID, from ORIGINATOR_ID',
  'learning.concept.routereflector.q3.why':
    'A reflector passes the route on without changing NEXT_HOP, so C sees 198.51.100.1, the address A learned it from, and must reach it through the IGP. The reflector does not put itself in the forwarding path.',
  'learning.concept.routereflector.q3.b.why':
    'A reflector only relays the route; it leaves NEXT_HOP alone, so traffic does not have to pass through it.',
  'learning.concept.routereflector.q3.c.why':
    'ORIGINATOR_ID is a separate attribute used to catch loops; it does not replace NEXT_HOP.',
  'learning.concept.routereflector.q4.prompt':
    'Two reflectors with different cluster IDs both serve client A. RR2 reflects the copy of A’s route it got from RR1 back to A. What does A do with it?',
  'learning.concept.routereflector.q4.a': 'Keeps it as a backup path to the prefix',
  'learning.concept.routereflector.q4.b': 'Drops it: its ORIGINATOR_ID is A’s own router ID',
  'learning.concept.routereflector.q4.c': 'Drops it: A’s cluster ID is in CLUSTER_LIST',
  'learning.concept.routereflector.q4.why':
    'RR1 set ORIGINATOR_ID to A’s router ID when it first reflected the route. A router drops a route carrying its own router ID there, so the copy that came back is discarded.',
  'learning.concept.routereflector.q4.a.why':
    'The copy only leads back to A itself; keeping it would be a loop, which ORIGINATOR_ID exists to stop.',
  'learning.concept.routereflector.q4.c.why':
    'CLUSTER_LIST is checked by reflectors against their own cluster ID. A is a client, has no cluster ID, and the list holds RR2’s and RR1’s.',
};
