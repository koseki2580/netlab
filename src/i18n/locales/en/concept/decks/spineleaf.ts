import type { Catalog } from '../../../../types';

/** The `spineleaf` deck's questions (en); its name is in the core chunk. */
export const spineleaf: Catalog = {
  'learning.concept.spineleaf.q1.prompt':
    'A fabric grows from 8 leaves and 4 spines to 32 leaves and 6 spines. Between hosts on two different leaves, a packet now crosses…',
  'learning.concept.spineleaf.q1.a': 'More switches, roughly one per added tier of leaves',
  'learning.concept.spineleaf.q1.b': 'Three switches, leaf, spine, leaf, as before',
  'learning.concept.spineleaf.q1.c': 'Six switches, one for each spine on the way',
  'learning.concept.spineleaf.q1.why':
    'Every leaf links to every spine, so any two leaves are one spine apart: leaf, spine, leaf, however many leaves or spines there are.',
  'learning.concept.spineleaf.q2.prompt':
    'In a fabric of 8 leaves and 4 spines, one spine fails. What does traffic between two leaves lose?',
  'learning.concept.spineleaf.q2.a': 'Connectivity, until spanning tree unblocks a spare link',
  'learning.concept.spineleaf.q2.b': 'Nothing: the other spines carry it at full capacity',
  'learning.concept.spineleaf.q2.c': 'A quarter of the capacity; three paths remain',
  'learning.concept.spineleaf.q2.why':
    'Each leaf had one path per spine. With one spine gone it has three of four: 300 of 400 Gbit/s of uplink, still three switches to any other leaf.',
  'learning.concept.spineleaf.q3.prompt':
    'Each leaf has 48 host ports at 25 Gbit/s and one 100 Gbit/s uplink to each of 4 spines. Its oversubscription is…',
  'learning.concept.spineleaf.q3.a': '3:1, 1200 Gbit/s down against 400 up',
  'learning.concept.spineleaf.q3.b': '1:1, as each port has a path up',
  'learning.concept.spineleaf.q3.c': '12:1, 48 ports sharing 4 uplinks',
  'learning.concept.spineleaf.q3.why':
    'Oversubscription compares bandwidth, not port counts: 48 × 25 = 1200 Gbit/s of hosts over 4 × 100 = 400 Gbit/s of uplinks is 3:1.',
  'learning.concept.spineleaf.q4.prompt':
    'A leaf has an uplink to each of 4 spines. How many of them carry traffic to another leaf?',
  'learning.concept.spineleaf.q4.a': 'One; spanning tree blocks the other three',
  'learning.concept.spineleaf.q4.b': 'All four, shared by ECMP over routed links',
  'learning.concept.spineleaf.q4.c': 'Two, an active link and its standby pair',
  'learning.concept.spineleaf.q4.why':
    'Each uplink is a routed link, so the leaf has four equal-cost routes, one through each spine, and ECMP spreads flows over all of them.',
  'learning.concept.spineleaf.q1.a.why':
    'A spine-leaf fabric has two tiers only. Leaves are added side by side, not stacked, so the path never gets longer.',
  'learning.concept.spineleaf.q1.c.why':
    'A packet goes through just one spine, the one its flow is hashed to. More spines add paths, not hops.',
  'learning.concept.spineleaf.q2.a.why':
    'No link is blocked in a routed fabric; when the spine’s routes are withdrawn, traffic simply uses the remaining spines.',
  'learning.concept.spineleaf.q2.b.why':
    'Each spine gave every leaf one 100 Gbit/s uplink. That uplink is gone, so the leaf has less to send up with.',
  'learning.concept.spineleaf.q3.b.why':
    'Having a path is not having the bandwidth: 1200 Gbit/s of host ports share 400 Gbit/s of uplink.',
  'learning.concept.spineleaf.q3.c.why':
    'Counting ports ignores their speeds; an uplink is four times as fast as a host port, so the ratio is 3:1.',
  'learning.concept.spineleaf.q4.a.why':
    'Spanning tree blocks redundant links in a switched (L2) design; a spine-leaf fabric routes every link, so none is blocked.',
  'learning.concept.spineleaf.q4.c.why':
    'There is no standby: all four routes are equal, and every one of them carries traffic.',
};
