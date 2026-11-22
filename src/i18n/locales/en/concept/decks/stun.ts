import type { Catalog } from '../../../../types';

/** The `stun` deck's questions (en); its name is in the core chunk. */
export const stun: Catalog = {
  'learning.concept.stun.q1.a.why':
    'Route selection is routing’s job; STUN tells a host its own public (NAT-mapped) IP and port.',
  'learning.concept.stun.q1.b.why':
    'Name lookup is DNS; STUN reveals the host’s NAT-mapped public address so peers can reach it.',
  'learning.concept.stun.q2.b.why':
    'DNS root servers resolve names, not media; when direct paths fail, a TURN relay forwards the traffic.',
  'learning.concept.stun.q2.c.why':
    'BGP routes between ASes; relaying media through a blocking NAT is TURN’s job, not BGP’s.',
  'learning.concept.stun.q3.a.why':
    'Encryption is SRTP/DTLS; ICE gathers candidate addresses and tests them to find a working path.',
  'learning.concept.stun.q3.c.why':
    'ICE does not assign numbers; it collects host/STUN/TURN candidates and probes them to pick a working pair.',
  'learning.concept.stun.q1.prompt': 'What does STUN let a host behind NAT discover?',
  'learning.concept.stun.q1.a': 'The fastest route to a media server',
  'learning.concept.stun.q1.b': 'The DNS name of the peer it is calling',
  'learning.concept.stun.q1.c': 'Its own public (NAT-mapped) IP address and port',
  'learning.concept.stun.q1.why':
    'A STUN server reflects back the source IP:port it sees, revealing the public mapping a NAT created — the basis of hole punching.',
  'learning.concept.stun.q2.prompt':
    'When direct connectivity fails (e.g. symmetric NAT), what carries the media?',
  'learning.concept.stun.q2.a': 'TURN — a relay server forwards the traffic',
  'learning.concept.stun.q2.b': 'The DNS root servers relay it',
  'learning.concept.stun.q2.c': 'BGP — the peers advertise a route',
  'learning.concept.stun.q2.why':
    'TURN is the fallback: when peers can’t reach each other directly, a relay forwards packets for both — reliable but costlier.',
  'learning.concept.stun.q3.prompt': 'What is ICE’s role?',
  'learning.concept.stun.q3.a': 'It encrypts the call so only the endpoints can hear it',
  'learning.concept.stun.q3.b':
    'It gathers candidate addresses and checks them to pick a working pair',
  'learning.concept.stun.q3.c': 'It assigns each endpoint a number to be dialled on',
  'learning.concept.stun.q3.why':
    'ICE coordinates STUN and TURN: it collects host, reflexive and relayed candidates from both ends and probes them to find the best path that actually works.',
};
