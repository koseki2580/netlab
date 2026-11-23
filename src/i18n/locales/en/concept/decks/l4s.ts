import type { Catalog } from '../../../../types';

/** The `l4s` deck's questions (en); its name is in the core chunk. */
export const l4s: Catalog = {
  'learning.concept.l4s.q1.prompt':
    'A classic TCP sender shares a bottleneck that has a deep buffer (a whole round trip of packets). What does it get?',
  'learning.concept.l4s.q1.a': 'Low delay, because halving empties the queue each time',
  'learning.concept.l4s.q1.b': 'A nearly full line, but delay that climbs to the whole buffer',
  'learning.concept.l4s.q1.c': 'An idle line, because the deep buffer slows every packet',
  'learning.concept.l4s.q1.why':
    'Classic TCP keeps growing until a drop, and a drop comes only once the buffer is full — so a deep buffer keeps the line busy but lets the queue, and the delay, reach the whole buffer: bufferbloat.',
  'learning.concept.l4s.q1.a.why':
    'Halving happens only after the buffer overflows, so before each drop the queue has already filled it and the delay is at its worst.',
  'learning.concept.l4s.q1.c.why':
    'A buffer holds packets; it does not slow the line. With a deep buffer the line stays busy almost all the time.',
  'learning.concept.l4s.q2.prompt':
    'Same classic sender, but now the buffer is shallow. What changes?',
  'learning.concept.l4s.q2.a': 'Both get better: low delay and a full line',
  'learning.concept.l4s.q2.b': 'Nothing: the sender adapts to any buffer size',
  'learning.concept.l4s.q2.c': 'Delay stays low, but the line sits partly idle',
  'learning.concept.l4s.q2.why':
    'With little buffer the queue, and so the delay, stays short — but each halving leaves the sender below what the line can carry until it grows back. Here only about 85 % of the line is used.',
  'learning.concept.l4s.q2.a.why':
    'A shallow buffer overflows sooner, and halving then cuts the window below the line’s capacity, so the line goes idle for a while.',
  'learning.concept.l4s.q2.b.why':
    'Classic TCP reacts only to drops, so the buffer size decides where the trade-off lands: utilisation falls from about 97 % to 85 %.',
  'learning.concept.l4s.q3.prompt': 'How does an L4S sender learn that it should slow down?',
  'learning.concept.l4s.q3.a': 'Its packets are marked CE once the queue passes a small threshold',
  'learning.concept.l4s.q3.b': 'One of its packets is dropped when the buffer overflows',
  'learning.concept.l4s.q3.c': 'The router tells it the bottleneck’s exact spare capacity',
  'learning.concept.l4s.q3.why':
    'L4S packets carry ECT(1); the router marks them CE as soon as its queue passes a shallow threshold (5 packets, 1 ms here), so the sender hears early, long before any drop.',
  'learning.concept.l4s.q3.b.why':
    'That is how classic TCP learns — late, once the buffer is full. In the lesson the L4S sender loses no packet at all.',
  'learning.concept.l4s.q3.c.why':
    'Routers do not report capacity; L4S signals with the CE mark on packets the sender already sent, echoed back to it in the ACKs.',
  'learning.concept.l4s.q4.prompt':
    'An L4S sender sees some of its packets marked. How does it respond?',
  'learning.concept.l4s.q4.a': 'It halves its window, just as classic TCP does on a drop',
  'learning.concept.l4s.q4.b': 'It pauses until the router’s queue is empty again',
  'learning.concept.l4s.q4.c': 'It backs off in proportion to how many were marked',
  'learning.concept.l4s.q4.why':
    'Like DCTCP and Prague, it cuts its window by a share tied to the marked fraction: a few marks, a small cut. Many small, early cuts keep the queue short and the line full at once.',
  'learning.concept.l4s.q4.a.why':
    'Halving on every signal would leave the line idle; L4S cuts by only a fraction tied to the marks, so the line stays full.',
  'learning.concept.l4s.q4.b.why':
    'Pausing would leave the line idle; the sender keeps sending, just slightly less, and here uses 100 % of the line.',
};
