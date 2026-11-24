import type { Catalog } from '../../../../types';

/** The `cubic` deck's questions (en); its name is in the core chunk. */
export const cubic: Catalog = {
  'learning.concept.cubic.q1.prompt':
    'A Reno sender fills a 10 Gb/s path with a 100 ms round trip (83,333 packets in flight) and loses one packet. About how long until its window is back?',
  'learning.concept.cubic.q1.a': 'A few seconds: it halves, then doubles back',
  'learning.concept.cubic.q1.b': 'Over an hour: one packet per round trip',
  'learning.concept.cubic.q1.c': 'About 40 s, the same as CUBIC',
  'learning.concept.cubic.q1.why':
    'Reno halves to 41,667 packets and adds one packet per 100 ms round trip, so it needs 41,667 round trips: about 69 minutes.',
  'learning.concept.cubic.q1.a.why':
    'Doubling each round trip is slow start; after fast recovery Reno is in congestion avoidance and adds only one packet per round trip.',
  'learning.concept.cubic.q1.c.why':
    'About 40 s is CUBIC’s K on this path. Reno’s growth is counted in round trips, so a large window takes it far longer.',
  'learning.concept.cubic.q2.prompt':
    'On a path with a large window, like the 83,333-packet one, why does a longer round trip not slow CUBIC’s return to the old window?',
  'learning.concept.cubic.q2.a': 'Its window is a function of time since the loss',
  'learning.concept.cubic.q2.b': 'It sends larger packets when the RTT is long',
  'learning.concept.cubic.q2.c': 'It measures the RTT and scales its steps to it',
  'learning.concept.cubic.q2.why':
    'W(t) = 0.4·(t − K)³ + W_max with t in seconds since the loss, and K = ∛(W_max·0.3/0.4) has no RTT in it. Reno’s time to recover grows with the RTT.',
  'learning.concept.cubic.q2.b.why':
    'The packet size is set by the path’s MTU, not by the congestion control; CUBIC changes how many packets are in flight.',
  'learning.concept.cubic.q2.c.why':
    'CUBIC does not scale its cubic curve by the RTT; the curve depends only on clock time and W_max. That is exactly why the RTT drops out.',
  'learning.concept.cubic.q3.prompt':
    'The last 2 of 10 segments are lost; SRTT is 50 ms. With RACK-TLP, when is lost data first sent again?',
  'learning.concept.cubic.q3.a': 'At about 1 s, when the minimum RTO fires',
  'learning.concept.cubic.q3.b': 'Never: it waits for three duplicate ACKs',
  'learning.concept.cubic.q3.c': 'At 150 ms: one RTT, then a 2 × SRTT probe timer',
  'learning.concept.cubic.q3.why':
    'The surviving segments are acknowledged at 50 ms; then nothing comes, and the probe timeout of 2 × SRTT = 100 ms fires at 150 ms. The probe resends the last segment, and its SACK lets RACK resend the other at once.',
  'learning.concept.cubic.q3.a.why':
    'That is what happens without TLP (first resend at 1,050 ms). The probe timeout is far shorter than RFC 6298’s 1 s minimum RTO.',
  'learning.concept.cubic.q3.b.why':
    'Duplicate ACKs come only from segments that arrive after a hole; with a lost tail there are none. That is the problem TLP solves.',
  'learning.concept.cubic.q4.prompt':
    'If the tail is repaired by an RTO instead of a probe, what window does the sender continue with?',
  'learning.concept.cubic.q4.a': 'One segment, growing again from there',
  'learning.concept.cubic.q4.b': 'The same window as before the loss',
  'learning.concept.cubic.q4.c': 'Its window cut to 70%, as after fast recovery',
  'learning.concept.cubic.q4.why':
    'After a retransmission timeout RFC 5681 sets the window to one segment (the loss window). A loss found by the probe goes through fast recovery instead, keeping 7 of 10 with CUBIC.',
  'learning.concept.cubic.q4.b.why':
    'A timeout is the strongest sign of congestion TCP has; it never keeps the window after one.',
  'learning.concept.cubic.q4.c.why':
    'That cut is for a loss found by duplicate ACKs, SACK or a probe. An RTO starts again from one segment.',
};
