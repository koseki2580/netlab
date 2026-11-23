import type { Catalog } from '../../../../types';

/** The `redistribution` deck's questions (en); its name is in the core chunk. */
export const redistribution: Catalog = {
  'learning.concept.redistribution.q1.prompt':
    'With the common Cisco default distances, a router learns 10.5.0.0/16 from OSPF (cost 20) and from RIP (2 hops). Which route does it install?',
  'learning.concept.redistribution.q1.a': 'The RIP route, because 2 is less than 20',
  'learning.concept.redistribution.q1.b': 'The OSPF route: its distance, 110, beats RIP’s 120',
  'learning.concept.redistribution.q1.c': 'Both, sharing the load as equal-cost paths',
  'learning.concept.redistribution.q1.why':
    'Between protocols the router compares administrative distance, not metrics: OSPF (110) is trusted over RIP (120). Metrics are compared only between routes of the same protocol.',
  'learning.concept.redistribution.q1.a.why':
    'A RIP hop count and an OSPF cost are different units, so “2 is smaller than 20” says nothing; the lower administrative distance decides.',
  'learning.concept.redistribution.q1.c.why':
    'Load sharing needs equal routes from one protocol; routes from different protocols never tie, because the lower administrative distance wins outright.',
  'learning.concept.redistribution.q2.prompt':
    'RA (RIP) hangs off border routers R1 and R2, which redistribute both ways with no fix. R1 goes first. How does R2 then reach RA’s 10.5.0.0/16?',
  'learning.concept.redistribution.q2.a': 'Straight to RA over its own RIP link, in 1 hop',
  'learning.concept.redistribution.q2.b': 'It loops between R2 and O2 until the TTL expires',
  'learning.concept.redistribution.q2.c': 'Through O2, O1 and R1 to RA: 4 hops instead of 1',
  'learning.concept.redistribution.q2.why':
    'R1 puts the RIP route into OSPF. It reaches R2 as an OSPF external route with distance 110, which beats R2’s own RIP route (120), so R2 sends the traffic the long way round.',
  'learning.concept.redistribution.q2.a.why':
    'R2 still hears RA over RIP, but that route has distance 120. The copy R1 fed into OSPF arrives with 110 and wins, even though its path is longer.',
  'learning.concept.redistribution.q2.b.why':
    'In this design the feedback only lengthens the path: R2 → O2 → O1 → R1 → RA still reaches RA, because R1 keeps its own RIP route. Loops can happen in larger designs or while routes are withdrawn.',
  'learning.concept.redistribution.q3.prompt':
    'The tag fix: how does it keep R2 on its own RIP route?',
  'learning.concept.redistribution.q3.a':
    'R1 tags what it takes from RIP; R2 refuses OSPF routes with that tag',
  'learning.concept.redistribution.q3.b': 'The tag raises the OSPF cost until RIP’s metric wins',
  'learning.concept.redistribution.q3.c': 'The tag tells RA to stop advertising the prefix to R1',
  'learning.concept.redistribution.q3.why':
    'A route tag marks where a route came from. R2 filters out the OSPF route carrying R1’s tag (100), so it installs RIP via RA and does not feed the prefix back into RIP.',
  'learning.concept.redistribution.q3.b.why':
    'A tag is only a label; it changes no metric. And a higher OSPF cost would still not lose to RIP, since distance, not metric, decides between protocols.',
  'learning.concept.redistribution.q3.c.why':
    'RA never sees the tag: it is set on the OSPF external route inside the OSPF domain, and it is the border router R2 that acts on it.',
  'learning.concept.redistribution.q4.prompt':
    'The other fix: R1 and R2 give OSPF external routes distance 125 instead of 110. What does R2 do now?',
  'learning.concept.redistribution.q4.a': 'It drops the prefix from OSPF everywhere in the domain',
  'learning.concept.redistribution.q4.b': 'Keeps its RIP route (120 < 125) and reaches RA in 1 hop',
  'learning.concept.redistribution.q4.c': 'Still uses OSPF, as its E2 metric of 20 beats RIP',
  'learning.concept.redistribution.q4.why':
    'With the OSPF external distance raised above RIP’s 120 on the border routers, their own RIP route wins, so R2 sends traffic straight to RA. OSPF’s internal routes keep 110.',
  'learning.concept.redistribution.q4.a.why':
    'Distance is local to each router: it changes which route R2 installs, not what OSPF floods. The other OSPF routers still learn the prefix.',
  'learning.concept.redistribution.q4.c.why':
    'Metrics are not compared across protocols; with 125 against RIP’s 120, the RIP route has the lower distance and wins.',
};
