import type { Catalog } from '../../../../types';

/** The `plpmtud` deck's questions (en); its name is in the core chunk. */
export const plpmtud: Catalog = {
  'learning.concept.plpmtud.q1.prompt':
    'A tunnel on the path carries 1400-byte packets, and a firewall drops all ICMP. Why does a sender using classic PMTUD stall on its full-size packets?',
  'learning.concept.plpmtud.q1.a': 'No Packet Too Big gets back, so it resends the same size',
  'learning.concept.plpmtud.q1.b': 'The tunnel fragments the packets and the receiver drops them',
  'learning.concept.plpmtud.q1.c': 'The firewall drops every packet that has DF set',
  'learning.concept.plpmtud.q1.why':
    'Classic PMTUD learns the path MTU only from the router’s Packet Too Big. With it filtered, the sender never learns 1400, and every resend is too big again: a black hole.',
  'learning.concept.plpmtud.q1.b.why':
    'With DF set (and always in IPv6) routers do not fragment; they drop the packet and send Packet Too Big — the message the firewall removes.',
  'learning.concept.plpmtud.q1.c.why':
    'Small packets with DF set get through; only those bigger than 1400 bytes are dropped, by the tunnel.',
  'learning.concept.plpmtud.q2.prompt':
    'A QUIC sender uses DPLPMTUD. What size does it start from, sure that it fits?',
  'learning.concept.plpmtud.q2.a': '1500 bytes, the Ethernet MTU of its own link',
  'learning.concept.plpmtud.q2.b': '576 bytes, the old IPv4 minimum',
  'learning.concept.plpmtud.q2.c': '1200 bytes of UDP payload',
  'learning.concept.plpmtud.q2.why':
    'Every QUIC path must carry 1200-byte datagrams (RFC 9000 §14), so that is BASE_PLPMTU; on IPv6 it is a 1248-byte packet, below the 1280 minimum.',
  'learning.concept.plpmtud.q2.a.why':
    'Its own link allows 1500, but a tunnel further on may not; that is the largest it may try, not one it knows works.',
  'learning.concept.plpmtud.q2.b.why':
    'QUIC refuses paths below 1200 bytes, so it can start there; going lower would waste most of every packet.',
  'learning.concept.plpmtud.q3.prompt':
    'A DPLPMTUD probe of 1389 bytes is never acknowledged. What does the sender conclude?',
  'learning.concept.plpmtud.q3.a': 'The path is congested, so it halves its sending rate',
  'learning.concept.plpmtud.q3.b': 'After 3 such losses, that 1389 does not fit',
  'learning.concept.plpmtud.q3.c': 'The connection has failed and must restart',
  'learning.concept.plpmtud.q3.why':
    'A size is ruled out after MAX_PROBES (3 by default) unacknowledged probes, and the search moves to a smaller size; ordinary traffic is never at risk.',
  'learning.concept.plpmtud.q3.a.why':
    'Probes are bigger than anything confirmed and are expected to be lost sometimes; RFC 9000 says their loss should not trigger a congestion response.',
  'learning.concept.plpmtud.q3.c.why':
    'Only the probe was too big; normal packets stay at the confirmed size and keep flowing.',
  'learning.concept.plpmtud.q4.prompt':
    'Starting at 1200, the lesson’s halving search on a 1400-byte IPv6 path stops when the gap is 8 bytes or less. Where does it settle?',
  'learning.concept.plpmtud.q4.a': '1352 bytes, exactly what fits',
  'learning.concept.plpmtud.q4.b': '1349 bytes, a little under what fits',
  'learning.concept.plpmtud.q4.c': '1400 bytes, the path MTU',
  'learning.concept.plpmtud.q4.why':
    'The search stops when known-good and known-bad are within 8 bytes, at 1349 after 6 probe sizes; only 1352 would fit, so it ends 3 bytes short, never over.',
  'learning.concept.plpmtud.q4.a.why':
    'Reaching the exact size takes more probes, one byte at a time near the end; this search stops within 8 bytes of it.',
  'learning.concept.plpmtud.q4.c.why':
    '1400 is the whole IPv6 packet; the datagram size leaves out 48 bytes of IPv6 and UDP headers, so at most 1352 fits.',
};
