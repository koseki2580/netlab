import type { Catalog } from '../../../../types';

/** The `loadbalancer` deck's questions (en); its name is in the core chunk. */
export const loadbalancer: Catalog = {
  'learning.concept.loadbalancer.q1.prompt':
    'Round robin shares twelve requests among web1, web2 and web3; every third request, starting with the first, stays open four times as long. Which server has the most connections open at once?',
  'learning.concept.loadbalancer.q1.a': 'None: four requests each means an equal load',
  'learning.concept.loadbalancer.q1.b': 'web1, as every long request falls on it',
  'learning.concept.loadbalancer.q1.c': 'web3, the last to get each round’s turn',
  'learning.concept.loadbalancer.q1.why':
    'Round robin counts requests, not work. The long requests come every third turn, and with three servers every third turn is web1’s, so it peaks at 3 open while the others stay at 1.',
  'learning.concept.loadbalancer.q2.prompt':
    'With the same requests, least connections leaves the busiest server with fewer connections open at once than round robin did. Why?',
  'learning.concept.loadbalancer.q2.a': 'It keeps one server apart for the long requests',
  'learning.concept.loadbalancer.q2.b': 'It refuses connections above a fixed limit',
  'learning.concept.loadbalancer.q2.c': 'It picks by what is still open, not by turn',
  'learning.concept.loadbalancer.q2.why':
    'Each request goes to the server with the fewest connections open at that moment, so the long ones spread out: the busiest server peaks at 2 instead of 3.',
  'learning.concept.loadbalancer.q3.prompt':
    'With a source-IP hash over three servers, web3 fails its health check and the hash now picks among two. What happens to the clients?',
  'learning.concept.loadbalancer.q3.a': 'Some clients that were on web1 or web2 move too',
  'learning.concept.loadbalancer.q3.b': 'Only web3’s clients move; the rest stay put',
  'learning.concept.loadbalancer.q3.c': 'All keep their server; web3’s get errors',
  'learning.concept.loadbalancer.q3.why':
    'The server is the hash modulo the number of servers left in. When that number changes, many clients map differently, not only web3’s; consistent hashing exists to limit this.',
  'learning.concept.loadbalancer.q4.prompt':
    'A client sends a SYN to the VIP 203.0.113.10, port 80, and the load balancer picks web2 (10.0.0.12). The SYN web2 receives is addressed to…',
  'learning.concept.loadbalancer.q4.a': 'The VIP, 203.0.113.10, just as the client sent it',
  'learning.concept.loadbalancer.q4.b': 'web2’s own 10.0.0.12, rewritten by the balancer',
  'learning.concept.loadbalancer.q4.c': 'The balancer’s inside address, 10.0.0.1',
  'learning.concept.loadbalancer.q4.why':
    'The load balancer rewrites the destination from the VIP to the server it chose (a destination NAT), so web2 receives a packet for its own address; the client only ever sees the VIP.',
  'learning.concept.loadbalancer.q1.a.why':
    'Equal counts are not equal load: connections that stay open longer pile up on whichever server they land on.',
  'learning.concept.loadbalancer.q1.c.why':
    'The long requests are the 1st, 4th, 7th and 10th, and with three servers in turn each of those is web1’s.',
  'learning.concept.loadbalancer.q2.a.why':
    'Least connections knows nothing about how long a request will be; it just looks at how many are open right now.',
  'learning.concept.loadbalancer.q2.b.why':
    'No request is refused; every one is placed, on the server with the fewest connections open when it arrives.',
  'learning.concept.loadbalancer.q3.b.why':
    'That is what consistent hashing achieves; a plain hash modulo the server count remaps clients that were not on web3 as well.',
  'learning.concept.loadbalancer.q3.c.why':
    'The health check takes web3 out of the choice, so its clients are sent elsewhere rather than to a dead server.',
  'learning.concept.loadbalancer.q4.a.why':
    'web2 does not hold the VIP; the load balancer rewrites the destination before sending the packet on.',
  'learning.concept.loadbalancer.q4.c.why':
    'That is the balancer’s own inside address; the packet’s destination becomes the server it chose, 10.0.0.12.',
};
