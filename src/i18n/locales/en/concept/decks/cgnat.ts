import type { Catalog } from '../../../../types';

/** The `cgnat` deck's questions (en); its name is in the core chunk. */
export const cgnat: Catalog = {
  'learning.concept.cgnat.q1.prompt':
    'A CGN hands out one public IPv4 address’s ports in blocks of 1,024, one block per subscriber, and leaves ports below 1024 out. How many subscribers share the address?',
  'learning.concept.cgnat.q1.a': '64: 65,536 ports ÷ 1,024',
  'learning.concept.cgnat.q1.b': '63: ports 1024–65535 ÷ 1,024',
  'learning.concept.cgnat.q1.c': '1,024: one per port in a block',
  'learning.concept.cgnat.q1.why':
    'Ports 1024–65535 are 64,512 ports, and 64,512 ÷ 1,024 = 63 blocks exactly, so 63 subscribers.',
  'learning.concept.cgnat.q1.a.why':
    '65,536 counts ports 0–1023 too, which are left out; without them only 63 blocks fit.',
  'learning.concept.cgnat.q1.c.why':
    'Each subscriber holds a whole block of 1,024 ports, not one port, so the address holds 63 subscribers, not 1,024.',
  'learning.concept.cgnat.q2.prompt':
    'A subscriber with one 1,024-port block opens 1,200 connections at once. What happens?',
  'learning.concept.cgnat.q2.a': 'From the 1,025th on they fail; the rest work',
  'learning.concept.cgnat.q2.b': 'All work: ports are reused per destination',
  'learning.concept.cgnat.q2.c': 'The CGN borrows ports from the neighbours',
  'learning.concept.cgnat.q2.why':
    'Each flow needs its own outside port, so 1,024 ports carry 1,024 flows; the other 176 are refused, while the first 1,024 and the other subscribers are untouched.',
  'learning.concept.cgnat.q2.b.why':
    'A CGN uses endpoint-independent mapping (RFC 6888 requires it): an inside address and port keep one outside port whatever the destination, so ports are not shared between flows.',
  'learning.concept.cgnat.q2.c.why':
    'Each subscriber’s ports are in its own block; another block can be given only from free ones, and only if the operator allows more than one per subscriber.',
  'learning.concept.cgnat.q3.prompt':
    'Why do many CGNs give out ports in blocks instead of one port per flow?',
  'learning.concept.cgnat.q3.a': 'A block makes each translation faster',
  'learning.concept.cgnat.q3.b': 'Standards forbid two flows on one port',
  'learning.concept.cgnat.q3.c': 'One log record per block, not per flow',
  'learning.concept.cgnat.q3.why':
    'An ISP must be able to say who used a public address and port at a given time. Logging each block given out, rather than each flow, cuts the records from 1,200 to 1 for a busy household.',
  'learning.concept.cgnat.q3.a.why':
    'Translation speed is not the reason; blocks are about how much the CGN must log to trace a port back to a subscriber.',
  'learning.concept.cgnat.q3.b.why':
    'Per-flow allocation also gives each flow its own port; what blocks change is the logging, one record per block.',
  'learning.concept.cgnat.q4.prompt':
    'With MAP-E (RFC 7597), a 6-bit PSID and the default 6 offset bits, how many ports does each subscriber get?',
  'learning.concept.cgnat.q4.a': '1,024: 65,536 ÷ 64 subscribers',
  'learning.concept.cgnat.q4.b': '64: one port per PSID value',
  'learning.concept.cgnat.q4.c': '1,008: 63 runs of 16 ports',
  'learning.concept.cgnat.q4.why':
    'The 6 offset bits leave out the runs with value 0, which hold ports 0–1023, so 63 remain; the 4 bits left after the PSID give 16 ports per run: 63 × 16 = 1,008, for 64 subscribers.',
  'learning.concept.cgnat.q4.a.why':
    '65,536 ÷ 64 counts ports 0–1023 too; the offset bits keep them out of every set, leaving 1,008.',
  'learning.concept.cgnat.q4.b.why':
    'The PSID picks which ports a subscriber has; its 6 bits give 64 subscribers, each with 63 runs of 16 ports.',
};
