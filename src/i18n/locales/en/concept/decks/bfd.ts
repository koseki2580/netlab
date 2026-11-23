import type { Catalog } from '../../../../types';

/** The `bfd` deck's questions (en); its name is in the core chunk. */
export const bfd: Catalog = {
  'learning.concept.bfd.q1.prompt':
    'R1 and R2 are OSPF neighbours through a switch, on default timers. R2 dies just after a hello; R1’s own port stays up. R1’s traffic is lost for about…',
  'learning.concept.bfd.q1.a': 'No time: R1 sees its port go down at once',
  'learning.concept.bfd.q1.b': '40 s, until the dead timer runs out',
  'learning.concept.bfd.q1.c': '10 s, as soon as one hello is missed',
  'learning.concept.bfd.q1.why':
    'R1 can only notice R2 is gone when it stops hearing hellos: the 40 s dead interval after the last one, plus the time to recompute routes.',
  'learning.concept.bfd.q2.prompt':
    'BFD runs between them at a 50 ms interval with a detect multiplier of 3. A failure just after a BFD packet is detected after…',
  'learning.concept.bfd.q2.a': '50 ms, one interval of silence',
  'learning.concept.bfd.q2.b': '3 s, BFD’s shortest timer',
  'learning.concept.bfd.q2.c': '150 ms, interval × multiplier',
  'learning.concept.bfd.q2.why':
    'BFD declares the neighbour down after as many silent intervals as the multiplier says: 50 ms × 3 = 150 ms, instead of OSPF’s 40 s.',
  'learning.concept.bfd.q3.prompt':
    'On default OSPF timers (hello 10 s, dead 40 s), R2 dies 9 s after its last hello. R1 declares it down…',
  'learning.concept.bfd.q3.a': '31 s later: the dead timer runs from the last hello',
  'learning.concept.bfd.q3.b': '40 s later: the dead timer starts at the failure',
  'learning.concept.bfd.q3.c': '1 s later, when the next hello fails to come',
  'learning.concept.bfd.q3.why':
    'The dead timer restarts at each hello heard, so it was already 9 s into its 40 s: detection takes between 30 and 40 s, depending on where in the cycle the failure falls.',
  'learning.concept.bfd.q1.a.why':
    'Only a failure of R1’s own link is seen at once. Here the switch keeps R1’s port up, so R1 has to notice the silence.',
  'learning.concept.bfd.q1.c.why':
    'One missed hello is not enough; OSPF waits the whole dead interval, four hellos’ worth, before declaring the neighbour down.',
  'learning.concept.bfd.q2.a.why':
    'One missing packet could just be lost; BFD waits for as many as the multiplier says, here three, before declaring a failure.',
  'learning.concept.bfd.q2.b.why':
    'BFD has no 3 s floor; its timers are set per session, and 50 ms × 3 gives 150 ms.',
  'learning.concept.bfd.q3.b.why':
    'Nothing happens at the moment of failure; the timer started at the last hello heard, 9 s before.',
  'learning.concept.bfd.q3.c.why':
    'A missing hello alone does not end the neighbourship; only the dead timer, counted from the last hello, does.',
};
