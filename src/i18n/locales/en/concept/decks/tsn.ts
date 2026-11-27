import type { Catalog } from '../../../../types';

/** The `tsn` deck's questions (en); its name is in the core chunk. */
export const tsn: Catalog = {
  'learning.concept.tsn.q1.prompt':
    'A 1 Gb/s egress port uses strict priority; a 64-byte control frame is in the top class and alone in it. Best-effort frames are up to 1518 bytes. Counting 8 bytes of preamble and SFD and the 12-byte gap per frame, and no propagation, what is the control frame’s worst-case delay at this port?',
  'learning.concept.tsn.q1.a': '0.672 µs: the top class always goes first',
  'learning.concept.tsn.q1.b': '12.976 µs: one whole frame, then its own',
  'learning.concept.tsn.q1.c': 'No bound: best effort can delay it forever',
  'learning.concept.tsn.q1.why':
    'Priority only picks the next frame to start; a 1518-byte frame already on the wire finishes first. 1538 bytes × 8 ÷ 1 Gb/s = 12.304 µs, plus the control frame’s own 84 bytes, 0.672 µs.',
  'learning.concept.tsn.q1.a.why':
    'That is the best case. Ethernet does not stop a frame it has started, so the control frame can arrive just behind one.',
  'learning.concept.tsn.q1.c.why':
    'With strict priority it waits for at most the one frame already started; after that it is picked first. The bound exists, it is just large and varies.',
  'learning.concept.tsn.q2.prompt':
    'The same port, strict priority and frames, but now at 10 Gb/s. How long can a 1518-byte best-effort frame already on the wire hold the control frame back (preamble, SFD and gap counted)?',
  'learning.concept.tsn.q2.a': '12.304 µs, as at 1 Gb/s',
  'learning.concept.tsn.q2.b': '0.123 µs, a hundredth of it',
  'learning.concept.tsn.q2.c': '1.2304 µs, a tenth of it',
  'learning.concept.tsn.q2.why':
    'A frame’s time on the wire is its bits divided by the rate: 12 304 bits ÷ 10 Gb/s = 1.2304 µs. Ten times the rate, a tenth of the blocking.',
  'learning.concept.tsn.q2.a.why':
    'The frame has the same number of bits, but they go out ten times faster.',
  'learning.concept.tsn.q2.b.why':
    'The rate went up ten times, not a hundred: the blocking shrinks by ten.',
  'learning.concept.tsn.q3.prompt':
    'An 802.1Qbv gate control list opens a window for the control class at the start of each 250 µs cycle on a 1 Gb/s port. Best-effort frames are up to 1518 bytes and cannot be preempted. How long a guard band, with every best-effort gate closed, must come before the window so the link is idle when it opens?',
  'learning.concept.tsn.q3.a': '12.304 µs, about 4.9 % of each cycle',
  'learning.concept.tsn.q3.b': '0.672 µs, the control frame’s own time',
  'learning.concept.tsn.q3.c': 'None: closing a gate stops its frame',
  'learning.concept.tsn.q3.why':
    'A closed gate only stops new frames from starting. The largest frame that started just before needs 12.304 µs to finish, so the guard band is that long: 12.304 ÷ 250 = 4.9 % of the cycle best effort cannot use.',
  'learning.concept.tsn.q3.b.why':
    'The guard band protects against the frame that might be on the wire, a best-effort one, not against the control frame itself.',
  'learning.concept.tsn.q3.c.why':
    'A gate decides only whether a queue may start a frame; one already being sent runs to its end.',
  'learning.concept.tsn.q4.prompt':
    'The same 1 Gb/s port adds frame preemption (802.1Qbu / 802.3br). Assume the longest piece of a best-effort frame that cannot be split is 127 bytes, plus 20 bytes of preamble, SFD and gap. How long must the guard band be now?',
  'learning.concept.tsn.q4.a': '12.304 µs: preemption does not change it',
  'learning.concept.tsn.q4.b': '1.176 µs, the unsplittable piece',
  'learning.concept.tsn.q4.c': 'Zero: an express frame interrupts at once',
  'learning.concept.tsn.q4.why':
    'Preemption lets the express frame cut in, so only the piece that cannot be split can still be in the way: 147 bytes × 8 ÷ 1 Gb/s = 1.176 µs. The guard band shrinks to that, giving best effort back most of the time.',
  'learning.concept.tsn.q4.a.why':
    'Without preemption a whole frame must finish; with it only the unsplittable piece must, so the guard band can be much shorter.',
  'learning.concept.tsn.q4.c.why':
    'A frame cannot be cut at any byte: the piece that cannot be split still has to finish.',
};
