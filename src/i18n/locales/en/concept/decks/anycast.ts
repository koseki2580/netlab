import type { Catalog } from '../../../../types';

/** The `anycast` deck's questions (en); its name is in the core chunk. */
export const anycast: Catalog = {
  'learning.concept.anycast.q1.prompt':
    'A CDN announces 192.0.2.0/24 from Tokyo, Frankfurt and New York. A Singapore user’s requests reach Frankfurt, although Tokyo answers much faster. Why?',
  'learning.concept.anycast.q1.a': 'BGP prefers the shorter AS path and knows nothing of latency',
  'learning.concept.anycast.q1.b': 'Anycast sends each request to a random site to spread load',
  'learning.concept.anycast.q1.c': 'Frankfurt is the site with the most spare capacity',
  'learning.concept.anycast.q1.why':
    'The global carrier hears the prefix straight from Frankfurt (2 ASes) and via the Asia transit (3 ASes). BGP picks the shorter AS path, so Singapore reaches Frankfurt at 162 ms instead of Tokyo at 74 ms.',
  'learning.concept.anycast.q1.b.why':
    'Anycast is not random: every packet follows the route the user’s network chose, so they all reach the same site.',
  'learning.concept.anycast.q1.c.why':
    'BGP carries no load or capacity information; the choice comes from the AS paths the user’s network heard.',
  'learning.concept.anycast.q2.prompt':
    'Frankfurt is taken down for maintenance and withdraws its announcement. What else has to change before its users are served by another site?',
  'learning.concept.anycast.q2.a': 'The CDN’s DNS must hand out a new address',
  'learning.concept.anycast.q2.b': 'Nothing: each network falls back to its next best route',
  'learning.concept.anycast.q2.c': 'Users’ resolvers must flush their cached answers',
  'learning.concept.anycast.q2.why':
    'With anycast the withdrawal is the whole failover: Singapore’s network now hears only Tokyo and New York, and the same address takes it to Tokyo.',
  'learning.concept.anycast.q2.a.why':
    'Every site uses the same address, 192.0.2.1; only the route to it changes.',
  'learning.concept.anycast.q2.c.why':
    'Nothing in DNS changed, so there is no stale answer to flush; the same address is simply routed to another site.',
  'learning.concept.anycast.q3.prompt':
    'Another CDN steers with DNS: each site has its own unicast address. A user in Osaka asks through a public resolver in London that sends no ECS. Which server is the user given?',
  'learning.concept.anycast.q3.a': 'Frankfurt’s, the one nearest the London resolver',
  'learning.concept.anycast.q3.b': 'Tokyo’s, the one nearest the user in Osaka',
  'learning.concept.anycast.q3.c': 'Each of the three in turn, round-robin',
  'learning.concept.anycast.q3.why':
    'The authoritative server steers for whoever asks, the resolver in London, so the Osaka user gets Frankfurt: a 252 ms round trip instead of Tokyo’s 12 ms. ECS fixes this by passing on part of the user’s address.',
  'learning.concept.anycast.q3.b.why':
    'The authoritative server sees only the resolver’s address, not the user’s; without ECS it steers for London.',
  'learning.concept.anycast.q3.c.why':
    'Steering by location answers with the site nearest whoever asks; rotating through sites would ignore location entirely.',
  'learning.concept.anycast.q4.prompt':
    'Why does anycast suit DNS queries better than a long TCP download?',
  'learning.concept.anycast.q4.a': 'TCP packets are too large to be sent to anycast',
  'learning.concept.anycast.q4.b': 'An anycast address can carry only UDP, never TCP',
  'learning.concept.anycast.q4.c': 'If the route shifts, a new site gets a connection it never saw',
  'learning.concept.anycast.q4.why':
    'When routing changes mid-connection, the packets reach another site, which has no state for that connection, and the connection breaks. A DNS query is over in one exchange.',
  'learning.concept.anycast.q4.a.why':
    'Packet size has nothing to do with it; anycast is ordinary routing to an address announced in several places.',
  'learning.concept.anycast.q4.b.why':
    'Anycast works with any transport; many CDNs serve HTTP over TCP from anycast addresses. The risk is a route change during a long connection.',
};
