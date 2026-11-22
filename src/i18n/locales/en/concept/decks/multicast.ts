import type { Catalog } from '../../../../types';

/** The `multicast` deck's questions (en); its name is in the core chunk. */
export const multicast: Catalog = {
  'learning.concept.multicast.q1.prompt': 'Multicast delivers traffic…',
  'learning.concept.multicast.q1.a': 'From one source to interested receivers',
  'learning.concept.multicast.q1.b': 'To every host on the internet',
  'learning.concept.multicast.q1.c': 'Only between exactly two hosts',
  'learning.concept.multicast.q1.why':
    'One copy is sent and the network replicates it only toward members of the multicast group — efficient one-to-many.',
  'learning.concept.multicast.q2.prompt': 'Hosts join a multicast group using…',
  'learning.concept.multicast.q2.a': 'ARP',
  'learning.concept.multicast.q2.b': 'IGMP',
  'learning.concept.multicast.q2.c': 'BGP',
  'learning.concept.multicast.q2.why':
    'IGMP lets a host tell its local router which multicast groups it wants, so traffic is only forwarded where needed.',
  'learning.concept.multicast.q3.prompt': 'A multicast destination address identifies…',
  'learning.concept.multicast.q3.a': 'One specific host only',
  'learning.concept.multicast.q3.b': 'A physical port on a switch',
  'learning.concept.multicast.q3.c': 'A group (e.g. 224.0.0.0/4 in IPv4)',
  'learning.concept.multicast.q3.why':
    'Multicast uses a dedicated group address range; receivers subscribe rather than being addressed individually.',
  'learning.concept.multicast.q1.b.why':
    'Sending to everyone is broadcast (and broadcasts don’t cross the internet); multicast targets only interested receivers.',
  'learning.concept.multicast.q1.c.why':
    'Two-host delivery is unicast; multicast sends one stream to a group that opted in.',
  'learning.concept.multicast.q2.a.why':
    'ARP resolves IP→MAC; hosts signal multicast group membership with IGMP.',
  'learning.concept.multicast.q2.c.why':
    'BGP routes between ASes; joining a multicast group on the LAN uses IGMP.',
  'learning.concept.multicast.q3.a.why':
    'A single host is a unicast address; a multicast address (224.0.0.0/4) names a group of receivers.',
  'learning.concept.multicast.q3.b.why':
    'A physical port is hardware; a multicast destination is a logical group address like 224.0.0.0/4.',
};
