import type { Catalog } from '../../../../types';

/** The `tcpoptions` deck's questions (en); its name is in the core chunk. */
export const tcpoptions: Catalog = {
  'learning.concept.tcpoptions.q1.prompt':
    'A 1 Gbit/s path with a 150 ms round trip, no loss, and no window scaling. About how fast can one TCP connection go?',
  'learning.concept.tcpoptions.q1.a': 'About 3.5 Mbit/s: one 64 KB window per round trip',
  'learning.concept.tcpoptions.q1.b': 'The full 1 Gbit/s, once slow start has finished',
  'learning.concept.tcpoptions.q1.c': 'About 500 Mbit/s: half the time goes to waiting for ACKs',
  'learning.concept.tcpoptions.q1.why':
    'Without scaling the window is at most 65,535 bytes, and the sender must then wait a round trip for ACKs: 65,535 × 8 ÷ 0.15 s ≈ 3.5 Mbit/s, about 0.35 % of the link. Filling it needs 18.75 MB in flight (the bandwidth-delay product).',
  'learning.concept.tcpoptions.q1.b.why':
    'Slow start only grows the congestion window; the 16-bit receive window still caps what may be in flight at 65,535 bytes, so the rate stays at one window per round trip.',
  'learning.concept.tcpoptions.q1.c.why':
    'The sender does not lose a fixed fraction: it sends 64 KB in a moment and then waits the whole 150 ms, so the rate is window ÷ RTT, far below half the link.',
  'learning.concept.tcpoptions.q2.prompt':
    'A firewall strips the window scale option from the client’s SYN. What happens to the connection?',
  'learning.concept.tcpoptions.q2.a': 'The server notices the missing option and resets it',
  'learning.concept.tcpoptions.q2.b': 'Scaling starts a little later, once the server learns of it',
  'learning.concept.tcpoptions.q2.c': 'It works, silently held to a 65,535-byte window',
  'learning.concept.tcpoptions.q2.why':
    'Scaling is used only if both the SYN and the SYN-ACK carry the option, and the server may send it only if the SYN did. So the whole connection runs unscaled, with no warning: far transfers are just slow.',
  'learning.concept.tcpoptions.q2.a.why':
    'The option is optional; a SYN without it is an ordinary SYN. The server simply does not scale, and nothing signals an error.',
  'learning.concept.tcpoptions.q2.b.why':
    'Window scale can be agreed only in the SYN and SYN-ACK. Once the handshake is over it can never be turned on for that connection.',
  'learning.concept.tcpoptions.q3.prompt':
    'Segments 5, 9 and 14 of one window are lost. How many round trips does recovery take, without SACK (NewReno) and with SACK?',
  'learning.concept.tcpoptions.q3.a': 'One each: fast retransmit resends all the holes',
  'learning.concept.tcpoptions.q3.b': 'NewReno 3, one hole per ACK; SACK 1, all holes together',
  'learning.concept.tcpoptions.q3.c': 'Three each: SACK saves bandwidth, not time',
  'learning.concept.tcpoptions.q3.why':
    'A cumulative ACK only says where the first hole is; NewReno learns the next hole from the partial ACK of each retransmission, one per round trip. SACK blocks show every hole at once, so all three are resent in the first round trip.',
  'learning.concept.tcpoptions.q3.a.why':
    'Without SACK the sender knows only the first hole (the cumulative ACK). It finds the next one only when the ACK for its retransmission comes back.',
  'learning.concept.tcpoptions.q3.c.why':
    'SACK saves time as well: the sender sees all the blocks the receiver holds, so it can resend every hole together in one round trip.',
  'learning.concept.tcpoptions.q4.prompt':
    'Next to the timestamps option, how many SACK blocks can one ACK carry?',
  'learning.concept.tcpoptions.q4.a': 'At most 3: options get only 40 bytes',
  'learning.concept.tcpoptions.q4.b': 'As many as there are holes in the window',
  'learning.concept.tcpoptions.q4.c': 'Only 1, the block received most recently',
  'learning.concept.tcpoptions.q4.why':
    'TCP options have 40 bytes. SACK takes 2 plus 8 per block and timestamps take 12 with padding, leaving room for 3 blocks (4 without timestamps). The newest block goes first; older ones may be left out.',
  'learning.concept.tcpoptions.q4.b.why':
    'The option space is fixed at 40 bytes, so the number of blocks is capped; when more would be needed the oldest are left out, and the sender keeps what earlier ACKs told it.',
  'learning.concept.tcpoptions.q4.c.why':
    'The most recent block comes first, but it is not alone: the rest of the 40-byte space holds more blocks, 3 with timestamps.',
};
