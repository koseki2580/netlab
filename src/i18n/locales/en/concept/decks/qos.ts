import type { Catalog } from '../../../../types';

/** The `qos` deck's questions (en); its name is in the core chunk. */
export const qos: Catalog = {
  'learning.concept.qos.q1.prompt': 'DSCP marks priority in…',
  'learning.concept.qos.q1.a': 'The IP header',
  'learning.concept.qos.q1.b': 'The Ethernet preamble',
  'learning.concept.qos.q1.c': 'The TCP payload',
  'learning.concept.qos.q1.why':
    'DSCP uses 6 bits of the IPv4/IPv6 ToS/Traffic-Class field to classify each packet for per-hop treatment.',
  'learning.concept.qos.q2.prompt': 'QoS is most useful when…',
  'learning.concept.qos.q2.a': 'Links are always idle and unused',
  'learning.concept.qos.q2.b': 'Links are congested and traffic is delay-sensitive',
  'learning.concept.qos.q2.c': 'There is only one host on the link',
  'learning.concept.qos.q2.why':
    'Under congestion, QoS lets a router prioritize voice/video over bulk traffic instead of treating all equally.',
  'learning.concept.qos.q3.prompt': 'A router acts on DSCP by…',
  'learning.concept.qos.q3.a': 'Encrypting the packet before queuing',
  'learning.concept.qos.q3.b': 'Dropping every marked packet',
  'learning.concept.qos.q3.c': 'Applying a per-hop behavior such as priority queuing',
  'learning.concept.qos.q3.why':
    'Each hop maps the DSCP value to a queue/scheduling policy (per-hop behavior); end-to-end QoS needs consistent marking.',
  'learning.concept.qos.q1.b.why':
    'The preamble just syncs the receiver’s clock; DSCP priority lives in the IP header’s DS field.',
  'learning.concept.qos.q1.c.why':
    'The TCP payload is application data; DSCP marks priority in the IP header, read by every router.',
  'learning.concept.qos.q2.a.why':
    'On idle links there is nothing to prioritize; QoS matters when links are congested and some traffic is latency-sensitive.',
  'learning.concept.qos.q2.c.why':
    'With one host there is no contention to manage; QoS earns its keep when traffic competes on congested links.',
  'learning.concept.qos.q3.a.why':
    'DSCP is about scheduling, not security; a router applies a per-hop behavior such as priority queuing.',
  'learning.concept.qos.q3.b.why':
    'Marked packets are prioritized, not dropped; the router applies a per-hop behavior like priority queuing.',
};
