import type { Catalog } from '../../../../types';

/** The `lossless` deck's questions (en); its name is in the core chunk. */
export const lossless: Catalog = {
  'learning.concept.lossless.q1.prompt':
    'Eight servers each send 64 frames at the same moment to one receiver behind a switch port with room for 160 frames. The switch is plain Ethernet. What happens?',
  'learning.concept.lossless.q1.a': 'Nothing is lost: the switch queues every frame',
  'learning.concept.lossless.q1.b': 'Only the first few frames are lost',
  'learning.concept.lossless.q1.c': 'About half are tail-dropped: 257 of 512',
  'learning.concept.lossless.q1.why':
    'Frames arrive about eight times faster than the port can send them, so the buffer is full within a few dozen frame times and everything after that is dropped until the senders finish: 257 of 512 frames.',
  'learning.concept.lossless.q1.a.why':
    '512 frames do not fit in 160, and the port drains only one frame per frame time while eight arrive.',
  'learning.concept.lossless.q1.b.why':
    'The first frames are the ones that fit; the drops start once the buffer is full and go on for as long as the burst lasts.',
  'learning.concept.lossless.q2.prompt':
    'With PFC on, nothing is dropped. Yet flow V, which goes to an idle port but shares a link with one of the incast senders, slows down. Why?',
  'learning.concept.lossless.q2.a': 'PAUSE stops the whole priority on that link, not one flow',
  'learning.concept.lossless.q2.b': 'The idle port runs out of buffer as well',
  'learning.concept.lossless.q2.c': 'PFC drops V’s frames to make room for the incast',
  'learning.concept.lossless.q2.why':
    'PFC pauses a link per priority. V shares the link and the priority with the paused sender, so it is stopped too, although its own port is idle: head-of-line blocking. In the lesson V got only 174 of its 350 turns.',
  'learning.concept.lossless.q2.b.why':
    'V’s port stays idle; V is held back before it ever reaches the switch, on the paused link.',
  'learning.concept.lossless.q2.c.why':
    'With PFC nothing is dropped. V is not dropped but paused, along with everything else in its priority on that link.',
  'learning.concept.lossless.q3.prompt':
    'The cable to the senders goes from 96 m to 192 m, and the PFC headroom stays at 10 frames per port. What happens?',
  'learning.concept.lossless.q3.a': 'Nothing: headroom depends only on link speed',
  'learning.concept.lossless.q3.b': 'Frames are dropped despite PFC',
  'learning.concept.lossless.q3.c': 'PFC has to pause less often',
  'learning.concept.lossless.q3.why':
    'Headroom must hold what is still on the cable while a PAUSE travels out and the last frames travel back: about 2 × rate × cable delay + 2 × MTU. At 192 m that is 18 frames; with only 10, the lesson drops 65 frames.',
  'learning.concept.lossless.q3.a.why':
    'The cable delay is in the formula: a longer cable holds more frames in flight that keep arriving after the PAUSE.',
  'learning.concept.lossless.q3.c.why':
    'The cable does not change how fast the buffer fills; it changes how much arrives after the PAUSE is sent.',
  'learning.concept.lossless.q4.prompt':
    'ECN marking (with a DCQCN-style rate cut at the senders) is added on top of PFC. What does it change?',
  'learning.concept.lossless.q4.a': 'Senders slow down before PFC needs to pause',
  'learning.concept.lossless.q4.b': 'Dropped frames get resent sooner',
  'learning.concept.lossless.q4.c': 'PAUSE frames reach the senders sooner',
  'learning.concept.lossless.q4.why':
    'The switch marks frames while the queue is still short; the senders cut their rate, and the buffer seldom reaches the PAUSE level. In the lesson PFC fired once instead of 6 times, and V got almost all its turns.',
  'learning.concept.lossless.q4.b.why':
    'With PFC nothing is dropped in the first place; ECN acts on rate, not on retransmission.',
  'learning.concept.lossless.q4.c.why':
    'ECN does not speed up PAUSE; it makes PAUSE rarely needed, by slowing the senders early.',
};
