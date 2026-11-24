import type { Catalog } from '../../../../types';

/** The `timesync` deck's questions (en); its name is in the core chunk. */
export const timesync: Catalog = {
  'learning.concept.timesync.q1.prompt':
    'An NTP exchange gives t1 = 0, t2 = 110, t3 = 112, t4 = 22 (ms; t1 and t4 on the client’s clock, t2 and t3 on the server’s). What offset and delay does the client compute?',
  'learning.concept.timesync.q1.a': 'Offset +110 ms, delay 22 ms',
  'learning.concept.timesync.q1.b': 'Offset +100 ms, delay 20 ms',
  'learning.concept.timesync.q1.c': 'Offset +100 ms, delay 22 ms',
  'learning.concept.timesync.q1.why':
    'Offset = ((t2 − t1) + (t3 − t4)) / 2 = (110 + 90) / 2 = 100 ms: averaging the two differences cancels the trips. Delay = (t4 − t1) − (t3 − t2) = 22 − 2 = 20 ms.',
  'learning.concept.timesync.q1.a.why':
    't2 − t1 is the offset plus the trip out, and t4 − t1 still includes the 2 ms the server held the request.',
  'learning.concept.timesync.q1.c.why':
    'The offset is right, but the delay must leave out the 2 ms between t2 and t3, when the request sat in the server.',
  'learning.concept.timesync.q2.prompt':
    'The request takes 30 ms to reach the server and the reply 10 ms to come back. How wrong is the offset NTP computes?',
  'learning.concept.timesync.q2.a': 'Not at all: the delay measurement cancels it',
  'learning.concept.timesync.q2.b': '20 ms, the whole difference between directions',
  'learning.concept.timesync.q2.c': '10 ms, half the difference between directions',
  'learning.concept.timesync.q2.why':
    'NTP assumes half the round trip each way. With 30 ms out and 10 ms back, the estimate is off by (30 − 10) / 2 = 10 ms.',
  'learning.concept.timesync.q2.a.why':
    'The delay is measured right, 40 ms, but the timestamps cannot show how it splits, so the uneven part is left in the offset.',
  'learning.concept.timesync.q2.b.why':
    'The offset averages the two directions, so only half the difference ends up in it.',
  'learning.concept.timesync.q3.prompt':
    'An exchange measures a delay of 40 ms, and nothing is known about how it splits between the directions. How far off can the offset be?',
  'learning.concept.timesync.q3.a': 'At most 20 ms, half the delay',
  'learning.concept.timesync.q3.b': 'At most 40 ms, the whole delay',
  'learning.concept.timesync.q3.c': 'There is no limit at all',
  'learning.concept.timesync.q3.why':
    'The worst case is all 40 ms in one direction; then the error is (40 − 0) / 2 = 20 ms. That is why NTP clients trust the exchanges with the smallest delay.',
  'learning.concept.timesync.q3.b.why':
    'Even with the whole delay one way, the offset takes half the difference, so 20 ms.',
  'learning.concept.timesync.q3.c.why':
    'The two directions add up to the measured delay, which caps how uneven they can be: half the delay.',
  'learning.concept.timesync.q4.prompt':
    'PTP with hardware timestamps through one switch: Sync waits 400 µs in its queue, Delay_Req 20 µs; the fibres are equal each way. The switch is a transparent clock. What error do the queues leave?',
  'learning.concept.timesync.q4.a': 'About 190 µs, half the queueing difference',
  'learning.concept.timesync.q4.b': 'None: the switch reports each wait',
  'learning.concept.timesync.q4.c': 'About 10 µs, half the Delay_Req wait',
  'learning.concept.timesync.q4.why':
    'A transparent clock adds each message’s residence time to its correctionField and the slave subtracts it, so both waits drop out. Only asymmetry outside the switch, such as unequal fibres, would remain.',
  'learning.concept.timesync.q4.a.why':
    'That is what an ordinary switch would leave: (400 − 20) / 2 µs. The transparent clock removes it.',
  'learning.concept.timesync.q4.c.why':
    'Delay_Req’s wait is corrected exactly as Sync’s is; neither is left over.',
};
